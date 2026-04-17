type SceneTextNode = {
    type?: string
    text?: string
    attrs?: {
        alt?: string
    }
    content?: SceneTextNode[]
}

function toNodeArray(value: unknown): SceneTextNode[] {
    return Array.isArray(value) ? (value as SceneTextNode[]) : []
}

function getNodeText(nodes?: SceneTextNode[]) {
    if (!nodes) return ''
    return nodes.map((child) => child.text || '').join('')
}

export function getSceneTextForAi(content: unknown): string {
    if (!content || typeof content !== 'object') return ''

    const rootNode = content as SceneTextNode
    const rootChildren = toNodeArray(rootNode.content)
    if (rootChildren.length === 0) return ''

    return rootChildren
        .map((node) => {

            switch (node.type) {
                case 'storyImage': {
                    const alt = node.attrs?.alt || 'Illustration'
                    const caption = getNodeText(node.content)
                    return `[Illustration: ${alt}${caption ? ` - Caption: ${caption}` : ''}]`
                }
                case 'screenplaySceneHeading':
                    return `SCENE HEADING: ${getNodeText(node.content).toUpperCase()}`
                case 'screenplayCharacter':
                    return `CHARACTER: ${getNodeText(node.content).toUpperCase()}`
                case 'screenplayDialogue':
                    return `DIALOGUE: ${getNodeText(node.content)}`
                case 'screenplayAction':
                    return `ACTION: ${getNodeText(node.content)}`
                case 'screenplayTransition':
                    return `TRANSITION: ${getNodeText(node.content).toUpperCase()}`
                default:
                    if (node.content) {
                        return node.content.map((child) => child.text || '').join('')
                    }
                    return ''
            }
        })
        .filter((text: string) => text.length > 0)
        .join('\n\n')
}
