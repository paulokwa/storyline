import { Node, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    storyImage: {
      /**
       * Add an image
       */
      setImage: (options: { assetId: string; src: string; alt?: string; caption?: string; width?: string; alignment?: string }) => ReturnType
    }
  }
}

/**
 * Story Image Node
 * A controlled block for project illustrations. 
 * Stores asset references rather than raw data.
 */
export const StoryImage = Node.create({
  name: 'storyImage',
  group: 'block',
  content: 'inline*', // Optional caption
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      allowInlineImages: true,
    }
  },

  addAttributes() {
    return {
      assetId: {
        default: null,
      },
      src: {
        default: null,
      },
      alt: {
        default: '',
      },
      width: {
        default: '100%',
      },
      alignment: {
        default: 'center', // 'left', 'center', 'right'
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="story-image"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { alignment, width, ...rest } = HTMLAttributes
    
    return [
      'div',
      mergeAttributes(rest, { 
        'data-type': 'story-image', 
        class: `story-image-container align-${alignment}`,
        style: `width: ${width}; max-width: 100%; margin: 1.5rem ${alignment === 'center' ? 'auto' : '0'};`
      }),
      ['img', { 
        src: HTMLAttributes.src, 
        alt: HTMLAttributes.alt,
        class: 'story-image-img rounded-2xl shadow-sm border border-slate-100'
      }],
      ['div', { class: 'story-image-caption-wrapper' }, 0],
    ]
  },

  addCommands() {
    return {
      setImage: (options: { assetId: string; src: string; alt?: string; caption?: string; width?: string; alignment?: string }) => ({ chain }) => {
        if (!this.options.allowInlineImages) return false

        return chain()
          .insertContent({
            type: this.name,
            attrs: options,
            content: options.caption ? [{ type: 'text', text: options.caption }] : []
          })
          .run()
      },
    }
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const { alignment, width, src, alt } = node.attrs

      // Container
      const dom = document.createElement('div')
      dom.setAttribute('data-type', 'story-image')
      dom.className = `story-image-container align-${alignment}`
      dom.style.cssText = `width: ${width}; max-width: 100%; margin: 1.5rem ${alignment === 'center' ? 'auto' : '0'};`

      // Image wrapper (for positioning the delete button)
      const imgWrapper = document.createElement('div')
      imgWrapper.className = 'story-image-wrapper'

      const img = document.createElement('img')
      img.src = src
      img.alt = alt || ''
      img.className = 'story-image-img rounded-2xl shadow-sm border border-slate-100'
      img.draggable = false

      // Delete button
      const deleteBtn = document.createElement('button')
      deleteBtn.className = 'story-image-delete-btn'
      deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`
      deleteBtn.title = 'Remove image'
      deleteBtn.contentEditable = 'false'
      deleteBtn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const pos = typeof getPos === 'function' ? getPos() : null
        if (pos != null) {
          editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
        }
      })

      imgWrapper.appendChild(img)
      imgWrapper.appendChild(deleteBtn)
      dom.appendChild(imgWrapper)

      // Caption area (editable content hole)
      const contentDOM = document.createElement('div')
      contentDOM.className = 'story-image-caption-wrapper'
      dom.appendChild(contentDOM)

      return { dom, contentDOM }
    }
  },
})
