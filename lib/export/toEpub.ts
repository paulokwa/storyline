import JSZip from 'jszip'
import type { ExportPayload, ExportOptions } from './buildExportPayload'
import { generateHTML } from '@tiptap/html'
import { exportExtensionsNoComments } from './normalize'
import { escapeMarkupAttribute, escapeMarkupText } from './escape'

export async function toEpub(payload: ExportPayload, options: ExportOptions): Promise<Blob> {
    const { nodes, projectTitle, metadata } = payload
    const zip = new JSZip()
    const safeProjectTitle = escapeMarkupText(projectTitle || 'Storyline Export')
    const safeLanguage = escapeMarkupAttribute(metadata?.language || 'en')
    const safeCreator = escapeMarkupText(metadata?.penName || metadata?.authorName || 'Storyline')
    const safeIdentifier = escapeMarkupText(metadata?.isbn || `storyline-${Date.now()}`)

    // 1. mimetype (first file, uncompressed)
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

    // 2. container.xml
    zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`)

    let contentHtml = ''

    if (options.includeProjectTitle) {
        contentHtml += `<h1>${safeProjectTitle}</h1>`
    }

    nodes.forEach((node) => {
        // Heading level derived from tree depth so nested chapters render below root chapters.
        const hl = Math.min(node.depth + 2, 6)

        if (node.type === 'chapter' || node.type === 'episode') {
            if (options.includeChapterTitles) {
                contentHtml += `<h${hl}>${escapeMarkupText(node.title)}</h${hl}>`
            }
        } else if (node.type === 'act') {
            if (options.includeChapterTitles) {
                contentHtml += `<h${hl}>${escapeMarkupText(node.title)}</h${hl}>`
            }
        } else if (node.type === 'scene') {
            if (options.includeSceneSubtitles) {
                contentHtml += `<h${hl}>${escapeMarkupText(node.title)}</h${hl}>`
            }
            if (node.content && (options.contentMode === 'prose_only' || options.contentMode === 'both')) {
                contentHtml += generateHTML(node.content, exportExtensionsNoComments)
            }
        }
    })

    // For simplicity, we bundle everything into one single content.xhtml for V1
    zip.file('OEBPS/content.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${safeLanguage}" lang="${safeLanguage}">
<head>
    <title>${safeProjectTitle}</title>
    <style>
        body { font-family: serif; line-height: 1.5; margin: 5%; }
        h1 { text-align: center; }
        .byline { text-align: center; font-style: italic; margin-bottom: 2em; }
        h2 { margin-top: 2em; border-bottom: 1px solid #ccc; }
        h3 { margin-top: 1em; font-style: italic; }
        p { margin: 1em 0; }
        .copyright { text-align: center; font-size: 0.8em; margin-top: 3em; }
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
    ${options.includeProjectTitle ? `<h1>${safeProjectTitle}</h1>` : ''}
    ${(metadata?.penName || metadata?.authorName) ? `<div class="byline">by ${escapeMarkupText(metadata.penName || metadata.authorName)}</div>` : ''}
    
    ${contentHtml}

    ${metadata?.copyrightHolder ? `<div class="copyright">&#169; ${escapeMarkupText(metadata.copyrightYear || '')} ${escapeMarkupText(metadata.copyrightHolder)}</div>` : ''}
</body>
</html>`)

    zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="pub-id" version="3.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>${safeProjectTitle}</dc:title>
        <dc:language>${safeLanguage}</dc:language>
        <dc:creator>${safeCreator}</dc:creator>
        ${metadata?.description ? `<dc:description>${escapeMarkupText(metadata.description)}</dc:description>` : ''}
        ${metadata?.publisher ? `<dc:publisher>${escapeMarkupText(metadata.publisher)}</dc:publisher>` : ''}
        ${metadata?.copyrightHolder ? `<dc:rights>&#169; ${escapeMarkupText(metadata.copyrightYear || '')} ${escapeMarkupText(metadata.copyrightHolder)}</dc:rights>` : ''}
        <dc:identifier id="pub-id">${safeIdentifier}</dc:identifier>
    </metadata>
    <manifest>
        <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
        <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    </manifest>
    <spine toc="toc">
        <itemref idref="content"/>
    </spine>
</package>`)

    // 4. toc.ncx (Table of Contents)
    zip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
        <meta name="dtb:uid" content="storyline-${Date.now()}"/>
        <meta name="dtb:depth" content="1"/>
    </head>
    <docTitle><text>${safeProjectTitle}</text></docTitle>
    <navMap>
        <navPoint id="navpoint-1" playOrder="1">
            <navLabel><text>Start</text></navLabel>
            <content src="content.xhtml"/>
        </navPoint>
    </navMap>
</ncx>`)

    return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })
}
