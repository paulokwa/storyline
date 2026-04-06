import { 
    Document, 
    Packer, 
    Paragraph, 
    TextRun, 
    HeadingLevel, 
    AlignmentType
} from 'docx'
import type { ExportPayload, ExportOptions } from './buildExportPayload'

// Helper to convert TipTap JSON nodes to docx elements
function jsonToDocxElements(json: any): Paragraph[] {
    if (!json || !json.content) return []
    
    return json.content.map((node: any) => {
        const children = node.content?.map((c: any) => {
            if (c.type === 'text') {
                return new TextRun({
                    text: c.text,
                    bold: c.marks?.some((m: any) => m.type === 'bold'),
                    italics: c.marks?.some((m: any) => m.type === 'italic'),
                })
            }
            return null
        }).filter(Boolean) || []

        switch (node.type) {
            case 'heading':
                return new Paragraph({
                    children,
                    heading: node.attrs?.level === 1 ? HeadingLevel.HEADING_1 : node.attrs?.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
                    spacing: { before: 400, after: 200 }
                })
            case 'bulletList':
            case 'orderedList':
                // Simple version for lists
                return new Paragraph({
                    children: [new TextRun({ text: "• " + (node.content?.map((li: any) => jsonToDocxElements(li)).join('\n') || '') })]
                })
            case 'paragraph':
            default:
                return new Paragraph({
                    children,
                    spacing: { after: 120 }
                })
        }
    })
}

export async function toDocx(payload: ExportPayload, options: ExportOptions): Promise<Blob> {
    const { nodes, projectTitle } = payload
    const sections: any[] = []

    // 1. Title Page or Header
    if (options.includeProjectTitle) {
        sections.push(new Paragraph({
            text: projectTitle,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 1000 }
        }))
    }

    // 2. Content
    nodes.forEach(node => {
        if (node.type === 'chapter' || node.type === 'episode') {
            if (options.includeChapterTitles) {
                sections.push(new Paragraph({
                    text: node.title,
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 800, after: 400 }
                }))
            }
        } else if (node.type === 'act') {
            sections.push(new Paragraph({
                text: node.title,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 }
            }))
        } else if (node.type === 'scene') {
            if (options.includeSceneSubtitles) {
                sections.push(new Paragraph({
                    text: node.title,
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 300, after: 150 }
                }))
            }
            if (node.summary && (options.contentMode === 'summaries_only' || options.contentMode === 'both')) {
                sections.push(new Paragraph({
                    children: [
                        new TextRun({ text: "Summary: ", bold: true, italics: true }),
                        new TextRun({ text: node.summary, italics: true })
                    ],
                    spacing: { after: 200 }
                }))
            }
            if (node.content && (options.contentMode === 'prose_only' || options.contentMode === 'both')) {
                sections.push(...jsonToDocxElements(node.content))
            }
            // Add spacing between scenes
            sections.push(new Paragraph({ text: "" }))
        }
    })

    const doc = new Document({
        sections: [{
            properties: {},
            children: sections
        }]
    })

    return Packer.toBlob(doc)
}
