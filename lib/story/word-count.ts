type RichTextNode = {
    text?: string
    content?: RichTextNode[]
}

export function countWordsFromText(text: string): number {
    const normalizedText = text.replace(/\s+/g, ' ').trim()
    return normalizedText ? normalizedText.split(' ').length : 0
}

export function extractPlainTextFromRichContent(content: RichTextNode | null | undefined): string {
    if (!content) return ''

    const textParts: string[] = []

    const visitNode = (node: RichTextNode) => {
        if (typeof node.text === 'string' && node.text.length > 0) {
            textParts.push(node.text)
        }

        node.content?.forEach(visitNode)
    }

    visitNode(content)

    return textParts.join(' ')
}

export function countWordsFromRichContent(content: RichTextNode | null | undefined): number {
    return countWordsFromText(extractPlainTextFromRichContent(content))
}
