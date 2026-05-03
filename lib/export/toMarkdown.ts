import type { ExportPayload, ExportOptions } from './buildExportPayload'

// Helper to convert TipTap JSON to Markdown-like text
function jsonToMarkdown(json: any): string {
    if (!json || !json.content || !Array.isArray(json.content)) return ''
    
    return json.content.map((node: any) => {
        // Collect children text with marks
        const getText = (content?: any[]) => {
            if (!content || !Array.isArray(content)) return ''
            return content.map((c: any) => {
                if (c.type === 'text') {
                    let t = c.text
                    if (c.marks?.some((m: any) => m.type === 'bold')) t = `**${t}**`
                    if (c.marks?.some((m: any) => m.type === 'italic')) t = `_${t}_`
                    if (c.marks?.some((m: any) => m.type === 'underline')) t = `<u>${t}</u>`
                    if (c.marks?.some((m: any) => m.type === 'strike')) t = `~~${t}~~`
                    if (c.marks?.some((m: any) => m.type === 'highlight')) t = `<mark>${t}</mark>`
                    const linkMark = c.marks?.find((m: any) => m.type === 'link')
                    if (linkMark) {
                        const href = linkMark.attrs?.href
                        if (href && /^https?:\/\//i.test(href)) t = `[${t}](${href})`
                    }
                    return t
                }
                if (c.type === 'hardBreak') return '\n'
                return ''
            }).join('')
        }

        switch (node.type) {
            case 'paragraph':
            case 'screenplayAction':
            case 'screenplayDialogue':
                return getText(node.content)
            
            case 'heading':
                const level = '#'.repeat(node.attrs?.level || 1)
                return `${level} ${getText(node.content)}`
            
            case 'screenplaySceneHeading':
                return `### ${getText(node.content).toUpperCase()}`
            
            case 'screenplayCharacter':
                return `**${getText(node.content).toUpperCase()}**`
            
            case 'screenplayParenthetical':
                return `(${getText(node.content)})`
            
            case 'screenplayTransition':
                return `\n> ${getText(node.content).toUpperCase()}`

            case 'blockquote': {
                const inner = node.content
                    ?.map((child: any) => getText(child.content))
                    .join('\n') || ''
                return inner.split('\n').map((line: string) => `> ${line}`).join('\n')
            }

            case 'horizontalRule':
                return '---'

            case 'bulletList':
                return node.content?.map((item: any) => `- ${jsonToMarkdown(item).trim()}`).join('\n')
            case 'orderedList':
                return node.content?.map((item: any, i: number) => `${i + 1}. ${jsonToMarkdown(item).trim()}`).join('\n')
            case 'listItem':
                return jsonToMarkdown(node)
            case 'storyImage':
                const imageAlt = node.attrs?.alt || 'Illustration'
                const imageSrc = node.attrs?.src || ''
                const imageCaption = getText(node.content)
                return `\n![${imageAlt}](${imageSrc})${imageCaption ? `\n\n*${imageCaption}*` : ''}\n`

            default:
                // Fallback for unknown nodes: try to extract text anyway
                const fallback = getText(node.content)
                return fallback || ''
        }
    }).filter(Boolean).join('\n\n')
}

export function toMarkdown(payload: ExportPayload, options: ExportOptions): string {
    const { nodes, projectTitle, metadata } = payload
    let md = ''

    if (metadata) {
        md += '---\n'
        md += `title: "${projectTitle}"\n`
        if (metadata.authorName) md += `author: "${metadata.authorName}"\n`
        if (metadata.penName) md += `pen_name: "${metadata.penName}"\n`
        if (metadata.copyrightHolder) md += `copyright: "© ${metadata.copyrightYear || ''} ${metadata.copyrightHolder}"\n`
        if (metadata.language) md += `language: "${metadata.language}"\n`
        if (metadata.publisher) md += `publisher: "${metadata.publisher}"\n`
        if (metadata.description) md += `description: "${metadata.description.replace(/"/g, '\\"')}"\n`
        if (metadata.keywords) md += `keywords: "${metadata.keywords}"\n`
        if (metadata.isbn) md += `isbn: "${metadata.isbn}"\n`
        md += '---\n\n'
    }

    if (options.includeProjectTitle) {
        md += `# ${projectTitle}\n\n`
    }

    nodes.forEach(node => {
        if (node.type === 'chapter' || node.type === 'episode') {
            if (options.includeChapterTitles) {
                md += `## ${node.title}\n\n`
            }
        } else if (node.type === 'act') {
            if (options.includeChapterTitles) {
                md += `### ${node.title}\n\n`
            }
        } else if (node.type === 'scene') {
            if (options.includeSceneSubtitles) {
                md += `#### ${node.title}\n\n`
            }
            if (node.summary && (options.contentMode === 'summaries_only' || options.contentMode === 'both')) {
                md += `> _Summary:_ ${node.summary}\n\n`
            }
            if (node.content && (options.contentMode === 'prose_only' || options.contentMode === 'both')) {
                md += `${jsonToMarkdown(node.content)}\n\n`
            }
        }
    })

    return md.trim()
}
