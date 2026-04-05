import { NextRequest, NextResponse } from 'next/server'
import * as mammoth from 'mammoth'
import JSZip from 'jszip'

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
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
            const pdfParse = require('pdf-parse')
            const result = await pdfParse(buffer)
            text = result.text
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
    } catch (error: any) {
        console.error('Import expansion error:', error)
        return NextResponse.json({ error: error.message || 'Failed to parse document' }, { status: 500 })
    }
}
