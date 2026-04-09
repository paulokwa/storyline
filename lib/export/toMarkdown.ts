import type { ExportPayload, ExportOptions } from './buildExportPayload'

// Helper to convert TipTap JSON to Markdown-like text
function jsonToMarkdown(json: any): string {
    if (!json || !json.content) return ''
    
    return json.content.map((node: any) => {
        switch (node.type) {
            case 'paragraph':
                return node.content?.map((c: any) => c.text).join('') || '\n'
            case 'heading':
                const level = '#'.repeat(node.attrs?.level || 1)
                const text = node.content?.map((c: any) => c.text).join('') || ''
                return `${level} ${text}\n`
            case 'bulletList':
                return node.content?.map((item: any) => `- ${jsonToMarkdown(item)}`).join('\n')
            case 'listItem':
                return jsonToMarkdown(node)
            default:
                return ''
        }
    }).join('\n\n')
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
            md += `### ${node.title}\n\n`
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
