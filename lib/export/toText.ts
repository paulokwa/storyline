import type { ExportPayload, ExportOptions } from './buildExportPayload'

function jsonToText(json: any): string {
    if (!json || !json.content) return ''
    
    return json.content.map((node: any) => {
        const getText = (content?: any[]) => {
            if (!content) return ''
            return content.map((c: any) => c.text || '').join('')
        }

        switch (node.type) {
            case 'storyImage':
                const alt = node.attrs?.alt || 'Illustration'
                const caption = getText(node.content)
                return `\n[Illustration: ${alt}${caption ? ` - Caption: ${caption}` : ''}]\n`
            default:
                if (node.content) {
                    return node.content.map((c: any) => c.text || '').join('')
                }
                return ''
        }
    }).filter((s: string) => s.length > 0).join('\n\n')
}

export function toText(payload: ExportPayload, options: ExportOptions): string {
    const { nodes, projectTitle, metadata } = payload
    let txt = ''

    if (metadata) {
        if (metadata.authorName || metadata.penName) {
            txt += `BY: ${metadata.penName || metadata.authorName}\n`
        }
        if (metadata.copyrightHolder) {
            txt += `COPYRIGHT: © ${metadata.copyrightYear || ''} ${metadata.copyrightHolder}\n`
        }
        if (metadata.publisher) {
            txt += `PUBLISHER: ${metadata.publisher}\n`
        }
        if (metadata.isbn) {
            txt += `ISBN: ${metadata.isbn}\n`
        }
        txt += '\n'
    }

    if (options.includeProjectTitle) {
        txt += `${projectTitle.toUpperCase()}\n`
        txt += '='.repeat(projectTitle.length) + '\n\n'
    }

    nodes.forEach(node => {
        if (node.type === 'chapter' || node.type === 'episode') {
            if (options.includeChapterTitles) {
                if (node.depth === 0) {
                    txt += `\n${node.title.toUpperCase()}\n`
                    txt += '-'.repeat(node.title.length) + '\n\n'
                } else {
                    txt += `[ ${node.title} ]\n\n`
                }
            }
        } else if (node.type === 'act') {
            if (options.includeChapterTitles) {
                txt += `[ ${node.title} ]\n\n`
            }
            if (node.content && (options.contentMode === 'prose_only' || options.contentMode === 'both')) {
                txt += `${jsonToText(node.content)}\n\n`
            }
        } else if (node.type === 'scene') {
            if (options.includeSceneSubtitles) {
                txt += `[ ${node.title} ]\n\n`
            }
            if (node.content && (options.contentMode === 'prose_only' || options.contentMode === 'both')) {
                txt += `${jsonToText(node.content)}\n\n`
            }
        }
    })

    return txt.trim()
}
