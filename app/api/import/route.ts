import { NextRequest, NextResponse } from 'next/server'
import * as mammoth from 'mammoth'
import JSZip from 'jszip'
import { PDFParse } from 'pdf-parse'
import { createClient } from '@/lib/supabase/server'

const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 MB
const PDF_TIMEOUT_MS = 30_000 // 30 seconds

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Failed to parse document'
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
            const zip = await JSZip.loadAsync(buffer)
            let content = ''
            
            // To ensure chapters stay roughly ordered, we'll try sorting the keys
            const files = Object.keys(zip.files).sort()
            for (const path of files) {
                if (path.endsWith('.html') || path.endsWith('.htm') || path.endsWith('.xhtml')) {
                    const html = await zip.files[path].async("string")
                    // Basic HTML to plaintext conversion
                    const plain = html
                        .replace(/<style[^>]*>[\s\S]*?<\/style>/ig, '')
                        .replace(/<script[^>]*>[\s\S]*?<\/script>/ig, '')
                        .replace(/<\/p>|<br\s*\/?>/ig, '\n')
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/&nbsp;/g, ' ')
                    content += plain + '\n\n***\n\n'
                }
            }
            text = content
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
