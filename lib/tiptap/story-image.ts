import { Node, mergeAttributes } from '@tiptap/core'

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
      setImage: options => ({ chain }) => {
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
})
