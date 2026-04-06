import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import type { ExportPayload, ExportOptions } from './buildExportPayload'

const extensions = [StarterKit]

export function toHtml(payload: ExportPayload, options: ExportOptions): string {
    const { nodes, projectTitle } = payload
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectTitle || 'Storyline Export'}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }
        h1 { font-family: 'Georgia', serif; font-size: 2.5em; text-align: center; margin-bottom: 50px; }
        h2 { font-family: 'Georgia', serif; font-size: 1.8em; margin-top: 40px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        h3 { font-family: 'Georgia', serif; font-size: 1.3em; color: #666; margin-top: 30px; }
        .scene { margin-bottom: 40px; }
        .summary { font-style: italic; color: #777; margin-bottom: 20px; padding-left: 20px; border-left: 3px solid #eee; }
        .prose { margin-top: 10px; }
    </style>
</head>
<body>
`

    if (options.includeProjectTitle) {
        html += `    <h1>${projectTitle}</h1>\n`
    }

    nodes.forEach(node => {
        if (node.type === 'chapter' || node.type === 'episode') {
            if (options.includeChapterTitles) {
                html += `    <h2>${node.title}</h2>\n`
            }
        } else if (node.type === 'act') {
            html += `    <h3>${node.title}</h3>\n`
        } else if (node.type === 'scene') {
            html += `    <div class="scene">\n`
            if (options.includeSceneSubtitles) {
                html += `        <h3>${node.title}</h3>\n`
            }
            if (node.summary && (options.contentMode === 'summaries_only' || options.contentMode === 'both')) {
                html += `        <div class="summary">${node.summary}</div>\n`
            }
            if (node.content && (options.contentMode === 'prose_only' || options.contentMode === 'both')) {
                const proseHtml = generateHTML(node.content, extensions)
                html += `        <div class="prose">${proseHtml}</div>\n`
            }
            html += `    </div>\n`
        }
    })

    html += `</body>\n</html>`
    return html
}
