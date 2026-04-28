import JSZip from 'jszip'
import type { ExportPayload, ExportOptions } from './buildExportPayload'
import { generateHTML } from '@tiptap/html'
import { exportExtensions } from './normalize'

export async function toEpub(payload: ExportPayload, options: ExportOptions): Promise<Blob> {
    const { nodes, projectTitle, metadata } = payload
    const zip = new JSZip()

    // 1. mimetype (first file, uncompressed)
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

    // 2. container.xml
    zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`)

    // 3. content.opf (manifest and spine)
    let manifestItems = ''
    let spineItems = ''
    let contentHtml = ''

    if (options.includeProjectTitle) {
        contentHtml += `<h1>${projectTitle}</h1>`
    }

    nodes.forEach((node, index) => {
        if (node.type === 'chapter' || node.type === 'episode') {
            if (options.includeChapterTitles) {
                contentHtml += `<h2>${node.title}</h2>`
            }
        } else if (node.type === 'scene') {
            if (options.includeSceneSubtitles) {
                contentHtml += `<h3>${node.title}</h3>`
            }
            if (node.summary && (options.contentMode === 'summaries_only' || options.contentMode === 'both')) {
                contentHtml += `<p><i>Summary: ${node.summary}</i></p>`
            }
            if (node.content && (options.contentMode === 'prose_only' || options.contentMode === 'both')) {
                contentHtml += generateHTML(node.content, exportExtensions)
            }
        }
    })

    // For simplicity, we bundle everything into one single content.xhtml for V1
    zip.file('OEBPS/content.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${metadata?.language || 'en'}" lang="${metadata?.language || 'en'}">
<head>
    <title>${projectTitle}</title>
    <style>
        body { font-family: serif; line-height: 1.5; margin: 5%; }
        h1 { text-align: center; }
        .byline { text-align: center; font-style: italic; margin-bottom: 2em; }
        h2 { margin-top: 2em; border-bottom: 1px solid #ccc; }
        h3 { margin-top: 1em; font-style: italic; }
        p { margin: 1em 0; }
        .copyright { text-align: center; font-size: 0.8em; margin-top: 3em; }
    </style>
</head>
<body>
    ${options.includeProjectTitle ? `<h1>${projectTitle}</h1>` : ''}
    ${(metadata?.penName || metadata?.authorName) ? `<div class="byline">by ${metadata.penName || metadata.authorName}</div>` : ''}
    
    ${contentHtml}

    ${metadata?.copyrightHolder ? `<div class="copyright">© ${metadata.copyrightYear || ''} ${metadata.copyrightHolder}</div>` : ''}
</body>
</html>`)

    zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="pub-id" version="3.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>${projectTitle}</dc:title>
        <dc:language>${metadata?.language || 'en'}</dc:language>
        <dc:creator>${metadata?.penName || metadata?.authorName || 'Storyline'}</dc:creator>
        ${metadata?.description ? `<dc:description>${metadata.description}</dc:description>` : ''}
        ${metadata?.publisher ? `<dc:publisher>${metadata.publisher}</dc:publisher>` : ''}
        ${metadata?.copyrightHolder ? `<dc:rights>© ${metadata.copyrightYear || ''} ${metadata.copyrightHolder}</dc:rights>` : ''}
        <dc:identifier id="pub-id">${metadata?.isbn || `storyline-${Date.now()}`}</dc:identifier>
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
    <docTitle><text>${projectTitle}</text></docTitle>
    <navMap>
        <navPoint id="navpoint-1" playOrder="1">
            <navLabel><text>Start</text></navLabel>
            <content src="content.xhtml"/>
        </navPoint>
    </navMap>
</ncx>`)

    return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })
}
