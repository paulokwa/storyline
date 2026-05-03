import { generateHTML } from '@tiptap/html'
import type { ExportPayload, ExportOptions } from './buildExportPayload'

import { exportExtensionsNoComments } from './normalize'

export function toHtml(payload: ExportPayload, options: ExportOptions): string {
    const { nodes, projectTitle, metadata } = payload
    
    let metaTags = ''
    if (metadata) {
        if (metadata.description) metaTags += `<meta name="description" content="${metadata.description.replace(/"/g, '&quot;')}">\n    `
        if (metadata.authorName || metadata.penName) metaTags += `<meta name="author" content="${(metadata.penName || metadata.authorName || '').replace(/"/g, '&quot;')}">\n    `
        if (metadata.keywords) metaTags += `<meta name="keywords" content="${metadata.keywords.replace(/"/g, '&quot;')}">\n    `
    }

    let html = `<!DOCTYPE html>
<html lang="${metadata?.language || 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectTitle || 'Storyline Export'}</title>
    ${metaTags}
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }
        h1 { font-family: 'Georgia', serif; font-size: 2.5em; text-align: center; margin-bottom: 50px; }
        .byline { text-align: center; font-style: italic; color: #666; margin-top: -40px; margin-bottom: 50px; }
        h2 { font-family: 'Georgia', serif; font-size: 1.8em; margin-top: 40px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        h3 { font-family: 'Georgia', serif; font-size: 1.3em; color: #666; margin-top: 30px; }
        .scene { margin-bottom: 40px; }
        .summary { font-style: italic; color: #777; margin-bottom: 20px; padding-left: 20px; border-left: 3px solid #eee; }
        .prose { margin-top: 10px; }
        .story-image-container { margin: 2rem 0; text-align: center; }
        .story-image-img { max-width: 100%; height: auto; border-radius: 8px; }
        .story-image-caption-wrapper { font-size: 0.9em; color: #666; font-style: italic; margin-top: 8px; }
        blockquote { border-left: 3px solid #ccc; margin: 1em 0; padding-left: 1em; color: #555; }
        hr { border: none; border-top: 1px solid #ccc; margin: 2em 0; }
        mark { background: #fff3a3; padding: 0 2px; }
        a { color: #2563eb; text-decoration: underline; }
        s { text-decoration: line-through; }
        u { text-decoration: underline; }
        .screenplay-scene-heading, .screenplay-action, .screenplay-character,
        .screenplay-parenthetical, .screenplay-dialogue, .screenplay-transition {
            font-family: 'Courier New', Courier, monospace; font-size: 1rem; line-height: 1.5; margin: 0 0 0.25em 0;
        }
        .screenplay-scene-heading { font-weight: bold; text-transform: uppercase; margin-top: 1.5em; }
        .screenplay-action { margin-bottom: 0.5em; }
        .screenplay-character { margin-left: 35%; text-transform: uppercase; margin-top: 1em; margin-bottom: 0; }
        .screenplay-parenthetical { margin-left: 25%; margin-right: 20%; }
        .screenplay-dialogue { margin-left: 20%; margin-right: 15%; margin-bottom: 0.5em; }
        .screenplay-transition { text-align: right; text-transform: uppercase; margin-top: 1em; margin-bottom: 1em; }
    </style>
</head>
<body>
`

    if (options.includeProjectTitle) {
        html += `    <h1>${projectTitle}</h1>\n`
        if (metadata?.penName || metadata?.authorName) {
            html += `    <div class="byline">by ${metadata.penName || metadata.authorName}</div>\n`
        }
    }

    nodes.forEach(node => {
        if (node.type === 'chapter' || node.type === 'episode') {
            if (options.includeChapterTitles) {
                html += `    <h2>${node.title}</h2>\n`
            }
        } else if (node.type === 'act') {
            if (options.includeChapterTitles) {
                html += `    <h3>${node.title}</h3>\n`
            }
        } else if (node.type === 'scene') {
            html += `    <div class="scene">\n`
            if (options.includeSceneSubtitles) {
                html += `        <h3>${node.title}</h3>\n`
            }
            if (node.summary && (options.contentMode === 'summaries_only' || options.contentMode === 'both')) {
                html += `        <div class="summary">${node.summary}</div>\n`
            }
            if (node.content && (options.contentMode === 'prose_only' || options.contentMode === 'both')) {
                const proseHtml = generateHTML(node.content, exportExtensionsNoComments)
                html += `        <div class="prose">${proseHtml}</div>\n`
            }
            html += `    </div>\n`
        }
    })

    html += `</body>\n</html>`
    return html
}
