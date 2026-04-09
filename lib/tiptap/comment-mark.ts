import { Mark, mergeAttributes } from '@tiptap/core'

export interface CommentOptions {
  HTMLAttributes: Record<string, any>,
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      /**
       * Set a comment mark
       */
      setComment: (commentId: string) => ReturnType,
      /**
       * Toggle a comment mark
       */
      toggleComment: (commentId: string) => ReturnType,
      /**
       * Unset a comment mark
       */
      unsetComment: () => ReturnType,
    }
  }
}

export const CommentMark = Mark.create<CommentOptions>({
  name: 'comment',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'comment-highlight',
      },
    }
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: element => element.getAttribute('data-comment-id'),
        renderHTML: attributes => {
          if (!attributes.commentId) {
            return {}
          }

          return {
            'data-comment-id': attributes.commentId,
          }
        },
      },
      status: {
        default: 'open',
        parseHTML: element => element.getAttribute('data-comment-status'),
        renderHTML: attributes => {
          return {
            'data-comment-status': attributes.status,
          }
        },
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setComment: (commentId: string) => ({ commands }) => {
        return commands.setMark(this.name, { commentId })
      },
      toggleComment: (commentId: string) => ({ commands }) => {
        return commands.toggleMark(this.name, { commentId })
      },
      unsetComment: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
    }
  },
})
