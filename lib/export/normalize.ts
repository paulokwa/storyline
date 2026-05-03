import { generateJSON } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import { 
    ScreenplaySceneHeading,
    ScreenplayAction,
    ScreenplayCharacter,
    ScreenplayParenthetical,
    ScreenplayDialogue, 
    ScreenplayTransition 
} from '@/lib/tiptap/screenplay'
import { StoryImage } from '@/lib/tiptap/story-image'

import { CommentMark } from '@/lib/tiptap/comment-mark'

/**
 * Standard set of extensions used for both parsing HTML -> JSON 
 * and rendering JSON -> HTML during export.
 */
export const exportExtensions = [
    StarterKit,
    Underline,
    Highlight,
    ScreenplaySceneHeading,
    ScreenplayAction,
    ScreenplayCharacter,
    ScreenplayParenthetical,
    ScreenplayDialogue,
    ScreenplayTransition,
    StoryImage,
    CommentMark
]

export const exportExtensionsNoComments = exportExtensions.filter(ext => ext !== CommentMark)

/**
 * Ensures scene content is in valid TipTap JSON format.
 * If the input is HTML (legacy), converts it to JSON.
 * If the input is already JSON, ensures it has the doc-type structure.
 */
export function normalizeContent(content: any): any {
    if (!content) return { type: 'doc', content: [] }

    // If it's already a TipTap JSON object (detect by 'type' property)
    if (typeof content === 'object' && content.type === 'doc') {
        return content
    }

    // If it's a legacy HTML string
    if (typeof content === 'string') {
        try {
            // Check if it looks like JSON stringified by mistake
            if (content.startsWith('{')) {
                const parsed = JSON.parse(content)
                if (parsed.type === 'doc') return parsed
            }
            
            // It's HTML, convert to JSON
            // Note: generateJSON will use our extensions to map HTML classes/tags back to node types
            return generateJSON(content, exportExtensions)
        } catch (e) {
            console.error('Failed to normalize content:', e)
            // Fallback: Create a single paragraph with the raw text (minimal tags)
            const plainText = content.replace(/<[^>]*>/g, '').trim()
            return {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: plainText ? [{ type: 'text', text: plainText }] : []
                    }
                ]
            }
        }
    }

    // Default empty doc
    return { type: 'doc', content: [] }
}
