import { NextRequest, NextResponse } from 'next/server'
import * as mammoth from 'mammoth'
import JSZip from 'jszip'
import { createClient } from '@/lib/supabase/server'

const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 MB
const PDF_TIMEOUT_MS = 30_000 // 30 seconds

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Failed to parse document'
}

function decodeXmlAttribute(value: string) {
    return value
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
}

function getTagAttribute(tag: string, attribute: string) {
    const match = tag.match(new RegExp(`${attribute}\\s*=\\s*["']([^"']*)["']`, 'i'))
    return match ? decodeXmlAttribute(match[1]) : null
}

function stripHrefFragment(href: string) {
    return href.split('#')[0].split('?')[0]
}

function tryDecodeUri(value: string) {
    try {
        return decodeURIComponent(value)
    } catch {
        return value
    }
}

function normalizeEpubPath(pathValue: string) {
    const normalized = stripHrefFragment(pathValue)
        .replace(/\\/g, '/')
        .replace(/^\/+/, '')
    const parts: string[] = []

    for (const part of normalized.split('/')) {
        if (!part || part === '.') continue
        if (part === '..') {
            parts.pop()
            continue
        }
        parts.push(part)
    }

    return parts.join('/')
}

function resolveEpubHref(baseDir: string, href: string) {
    const cleanHref = stripHrefFragment(href)
    return normalizeEpubPath(baseDir ? `${baseDir}/${cleanHref}` : cleanHref)
}

function getZipEntry(zip: JSZip, targetPath: string) {
    const normalizedTarget = normalizeEpubPath(targetPath)
    const decodedTarget = normalizeEpubPath(tryDecodeUri(normalizedTarget))
    const direct = zip.file(normalizedTarget) ?? zip.file(decodedTarget)
    if (direct) return direct

    const lowerTargets = new Set([normalizedTarget.toLowerCase(), decodedTarget.toLowerCase()])
    const match = Object.keys(zip.files).find((path) => lowerTargets.has(normalizeEpubPath(path).toLowerCase()))
    return match ? zip.file(match) : null
}

function isHtmlishEpubPath(pathValue: string) {
    const lower = normalizeEpubPath(pathValue).toLowerCase()
    return lower.endsWith('.html') || lower.endsWith('.htm') || lower.endsWith('.xhtml')
}

function htmlToPlainText(html: string) {
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/ig, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/ig, '')
        .replace(/<\/p>|<br\s*\/?>/ig, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
}

async function getEpubSpinePaths(zip: JSZip) {
    const containerEntry = getZipEntry(zip, 'META-INF/container.xml')
    if (!containerEntry) return []

    const containerXml = await containerEntry.async('string')
    const rootfileTags = containerXml.match(/<rootfile\b[^>]*>/gi) ?? []
    const rootfilePath = rootfileTags
        .map((tag) => getTagAttribute(tag, 'full-path'))
        .find(Boolean)

    if (!rootfilePath) return []

    const opfPath = normalizeEpubPath(rootfilePath)
    const opfEntry = getZipEntry(zip, opfPath)
    if (!opfEntry) return []

    const opfXml = await opfEntry.async('string')
    const opfBaseDir = opfPath.includes('/') ? opfPath.split('/').slice(0, -1).join('/') : ''
    const manifest = new Map<string, string>()

    for (const tag of opfXml.match(/<item\b[^>]*>/gi) ?? []) {
        const id = getTagAttribute(tag, 'id')
        const href = getTagAttribute(tag, 'href')
        const mediaType = getTagAttribute(tag, 'media-type')?.toLowerCase() ?? ''
        if (!id || !href) continue

        const resolvedPath = resolveEpubHref(opfBaseDir, href)
        if (mediaType.includes('html') || isHtmlishEpubPath(resolvedPath)) {
            manifest.set(id, resolvedPath)
        }
    }

    const orderedPaths: string[] = []
    const seen = new Set<string>()
    for (const tag of opfXml.match(/<itemref\b[^>]*>/gi) ?? []) {
        const idref = getTagAttribute(tag, 'idref')
        if (!idref) continue

        const path = manifest.get(idref)
        const entry = path ? getZipEntry(zip, path) : null
        if (!path || !entry || seen.has(path)) continue

        seen.add(path)
        orderedPaths.push(path)
    }

    return orderedPaths
}

async function extractEpubText(buffer: Buffer) {
    const zip = await JSZip.loadAsync(buffer)
    const spinePaths = await getEpubSpinePaths(zip)
    const fallbackPaths = Object.keys(zip.files)
        .filter((path) => !zip.files[path].dir && isHtmlishEpubPath(path))
        .sort()
    const files = spinePaths.length > 0 ? spinePaths : fallbackPaths
    let content = ''

    for (const path of files) {
        const entry = getZipEntry(zip, path)
        if (!entry) continue

        const html = await entry.async('string')
        content += `${htmlToPlainText(html)}\n\n***\n\n`
    }

    return content
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const formData = await req.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        if (file.size > MAX_FILE_BYTES) {
            return NextResponse.json({ error: 'File too large. Please upload a manuscript under 50MB.' }, { status: 413 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const filename = file.name.toLowerCase()

        let text = ''

        if (filename.endsWith('.docx')) {
            const result = await mammoth.extractRawText({ buffer })
            text = result.value
        } else if (filename.endsWith('.txt') || filename.endsWith('.md')) {
            text = buffer.toString('utf-8')
        } else if (filename.endsWith('.pdf')) {
            const { PDFParse } = await import('pdf-parse')
            const parser = new PDFParse({ data: buffer })
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(
                    () => reject(new Error('PDF import took too long. Please try a smaller PDF or export your manuscript as DOCX or TXT.')),
                    PDF_TIMEOUT_MS
                )
            )
            try {
                const result = await Promise.race([parser.getText(), timeoutPromise])
                text = result.text
            } finally {
                await parser.destroy()
            }
        } else if (filename.endsWith('.epub')) {
            text = await extractEpubText(buffer)
        } else {
            return NextResponse.json({ error: 'Unsupported file format. Please upload .docx, .txt, .md, .pdf, or .epub' }, { status: 400 })
        }

        // Standardize newlines
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

        return NextResponse.json({ text })
    } catch (error: unknown) {
        console.error('Import expansion error:', error)
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
    }
}
