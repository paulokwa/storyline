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
    if (!json || !json.content || !Array.isArray(json.content)) return []
    
    return json.content.map((node: any) => {
        // Safely extract text runs
        const children: TextRun[] = []
        
        if (node.content && Array.isArray(node.content)) {
            node.content.forEach((c: any) => {
                if (c.type === 'text') {
                    children.push(new TextRun({
                        text: c.text,
                        bold: c.marks?.some((m: any) => m.type === 'bold'),
                        italics: c.marks?.some((m: any) => m.type === 'italic'),
                        underline: c.marks?.some((m: any) => m.type === 'underline') ? {} : undefined,
                    }))
                } else if (c.type === 'hardBreak') {
                    children.push(new TextRun({ text: "", break: 1 }))
                }
            })
        }

        // Helper to get raw text for capitalized elements
        const getRawText = () => {
             if (!node.content || !Array.isArray(node.content)) return ''
             return node.content.map((c: any) => c.text || '').join('')
        }

        switch (node.type) {
            case 'heading':
                return new Paragraph({
                    children,
                    heading: node.attrs?.level === 1 ? HeadingLevel.HEADING_1 : node.attrs?.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
                    spacing: { before: 400, after: 200 }
                })
            
            // Screenplay specific nodes
            case 'screenplaySceneHeading':
                return new Paragraph({
                    children: [new TextRun({ text: getRawText().toUpperCase(), bold: true })],
                    spacing: { before: 400, after: 200 },
                    alignment: AlignmentType.LEFT
                })
            case 'screenplayCharacter':
                return new Paragraph({
                    children: [new TextRun({ text: getRawText().toUpperCase() })],
                    indent: { left: 2400 }, // Rough equivalent of centered character name
                    spacing: { before: 200 }
                })
            case 'screenplayDialogue':
                return new Paragraph({
                    children,
                    indent: { left: 1400, right: 1400 },
                    spacing: { after: 120 }
                })
            case 'screenplayParenthetical':
                return new Paragraph({
                    children,
                    indent: { left: 1800, right: 1800 },
                })
            case 'screenplayTransition':
                return new Paragraph({
                    children: [new TextRun({ text: getRawText().toUpperCase() })],
                    alignment: AlignmentType.RIGHT,
                    spacing: { before: 200, after: 200 }
                })
            case 'screenplayAction':
                return new Paragraph({
                    children,
                    spacing: { after: 120 }
                })

            case 'bulletList':
            case 'orderedList':
                // For lists in docx, it's often better to flatten them into paragraphs if simple
                // but for now we'll just return the children of list items
                const listItems: Paragraph[] = []
                node.content?.forEach((li: any) => {
                    if (li.type === 'listItem') {
                        listItems.push(...jsonToDocxElements(li))
                    }
                })
                return listItems
            
            case 'listItem':
                return new Paragraph({
                    children,
                    bullet: { level: 0 },
                    spacing: { after: 120 }
                })

            case 'storyImage':
                const imageAlt = node.attrs?.alt || 'Illustration'
                const imageCaption = getRawText()
                return new Paragraph({
                    children: [
                        new TextRun({ 
                            text: `[ILLUSTRATION: ${imageAlt.toUpperCase()}]`, 
                            bold: true,
                            color: '666666',
                            size: 20
                        }),
                        ...(imageCaption ? [
                            new TextRun({ 
                                text: `\nCaption: ${imageCaption}`, 
                                italics: true, 
                                color: '888888',
                                size: 18
                            })
                        ] : [])
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 400, after: 400 }
                })

            case 'paragraph':
            default:
                // If it's an empty paragraph, add a spacing run
                if (children.length === 0) {
                    return new Paragraph({ children: [new TextRun({ text: "" })], spacing: { after: 120 } })
                }
                return new Paragraph({
                    children,
                    spacing: { after: 120 }
                })
        }
    }).flat()
}

export async function toDocx(payload: ExportPayload, options: ExportOptions): Promise<Blob> {
    const { nodes, projectTitle, metadata } = payload
    const sections: any[] = []

    // 1. Title Page or Header
    if (options.includeProjectTitle) {
        sections.push(new Paragraph({
            text: projectTitle,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        }))

        if (metadata?.penName || metadata?.authorName) {
            sections.push(new Paragraph({
                children: [new TextRun({ text: `by ${metadata.penName || metadata.authorName}`, italics: true })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 800 }
            }))
        }

        if (metadata?.copyrightHolder) {
            sections.push(new Paragraph({
                children: [new TextRun({ text: `© ${metadata.copyrightYear || ''} ${metadata.copyrightHolder}`, size: 20 })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 1000 }
            }))
        }
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
            if (options.includeChapterTitles) {
                sections.push(new Paragraph({
                    text: node.title,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 400, after: 200 }
                }))
            }
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
        title: projectTitle,
        creator: metadata?.penName || metadata?.authorName || 'Storyline',
        description: metadata?.description || '',
        keywords: metadata?.keywords || '',
        sections: [{
            properties: {},
            children: sections
        }]
    })

    return Packer.toBlob(doc)
}
