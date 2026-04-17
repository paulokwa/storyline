import { Node, mergeAttributes, InputRule } from '@tiptap/core'
import { Fragment } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'

/**
 * Screenplay Scene Heading (Slugline)
 * Example: INT. COFFEE SHOP - DAY
 */
export const ScreenplaySceneHeading = Node.create({
  name: 'screenplaySceneHeading',
  group: 'block',
  content: 'inline*',
  defining: true,
  priority: 1000,
  parseHTML() {
    return [{ tag: 'p[data-type="scene-heading"]', priority: 1000 }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { 'data-type': 'scene-heading', class: 'screenplay-scene-heading' }), 0]
  },
  addInputRules() {
    return [
      new InputRule({
        find: /^(INT|EXT|I\/E|INT\/EXT)\.\s$/i,
        handler: ({ state, chain }) => {
          // Use state to check node type instead of editor (safer for hot reload/undefined editor)
          if (state.selection.$from.parent.type.name === this.name) return
          chain()
            .setNode(this.name)
            .run()
        },
      }),
    ]
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions, oldState, newState) => {
          if (!transactions.some(transaction => transaction.docChanged)) {
            return null
          }

          let tr = newState.tr
          let hasChanges = false

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== this.name || node.textContent === node.textContent.toUpperCase()) {
              return
            }

            const uppercasedContent = Fragment.fromArray(
              node.content.content.map(child => {
                if (!child.isText || !child.text) {
                  return child
                }

                return newState.schema.text(child.text.toUpperCase(), child.marks)
              })
            )

            tr = tr.replaceWith(pos + 1, pos + node.nodeSize - 1, uppercasedContent)
            hasChanges = true
          })

          return hasChanges ? tr : null
        },
      }),
    ]
  },
})

/**
 * Screenplay Action (Description)
 * Standard descriptive text.
 */
export const ScreenplayAction = Node.create({
  name: 'screenplayAction',
  group: 'block',
  content: 'inline*',
  defining: true,
  priority: 1000, // Higher than standard paragraph (50) to capture <p> tags
  parseHTML() {
    return [
      { tag: 'p[data-type="action"]' },
      { tag: 'p', priority: 100 }, // Priority higher than specific nodes to handle fallback
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { 'data-type': 'action', class: 'screenplay-action' }), 0]
  },
})

/**
 * Screenplay Character Name
 */
export const ScreenplayCharacter = Node.create({
  name: 'screenplayCharacter',
  group: 'block',
  content: 'inline*',
  defining: true,
  priority: 1000,
  parseHTML() {
    return [{ tag: 'p[data-type="character"]', priority: 1000 }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { 'data-type': 'character', class: 'screenplay-character' }), 0]
  },
  addInputRules() {
    return [
      new InputRule({
        // When user types something in ALL CAPS followed by a space at the start of a line
        // We use a negative lookahead to ignore common screenplay keywords like "CUT" or "INT"
        // This prevents the rule from interfering with other markers like "CUT TO:"
        find: /^(?!(?:INT|EXT|CUT|FADE|SMASH|MATCH)\s?)[A-Z0-9\s]{2,}\s$/,
        handler: ({ chain, state }) => {
          if (state.selection.$from.parent.type.name === this.name) return
          
          // Convert the current block
          chain()
            .setNode(this.name)
            .run()
        },
      }),
    ]
  },
})

/**
 * Screenplay Parenthetical
 * Example: (smiling)
 */
export const ScreenplayParenthetical = Node.create({
  name: 'screenplayParenthetical',
  group: 'block',
  content: 'inline*',
  defining: true,
  priority: 1000,
  parseHTML() {
    return [{ tag: 'p[data-type="parenthetical"]', priority: 1000 }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { 'data-type': 'parenthetical', class: 'screenplay-parenthetical' }), 0]
  },
  addInputRules() {
    return [
      new InputRule({
        // Support both starting with "(" + space OR finishing a bracketed phrase (text) + space
        find: /^\(.*\)\s$/,
        handler: ({ state, chain }) => {
          if (state.selection.$from.parent.type.name === this.name) return
          chain()
            .setNode(this.name)
            .run()
        },
      }),
      new InputRule({
        // Also support immediate conversion when typing "(" and then space
        find: /^\(\s$/,
        handler: ({ state, chain }) => {
          if (state.selection.$from.parent.type.name === this.name) return
          chain()
            .setNode(this.name)
            .run()
        },
      }),
    ]
  },
})

/**
 * Screenplay Dialogue
 */
export const ScreenplayDialogue = Node.create({
  name: 'screenplayDialogue',
  group: 'block',
  content: 'inline*',
  defining: true,
  priority: 1000,
  parseHTML() {
    return [{ tag: 'p[data-type="dialogue"]', priority: 1000 }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { 'data-type': 'dialogue', class: 'screenplay-dialogue' }), 0]
  },
})

/**
 * Screenplay Transition
 * Example: CUT TO:
 */
export const ScreenplayTransition = Node.create({
  name: 'screenplayTransition',
  group: 'block',
  content: 'inline*',
  defining: true,
  priority: 1000,
  parseHTML() {
    return [{ tag: 'p[data-type="transition"]', priority: 1000 }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { 'data-type': 'transition', class: 'screenplay-transition' }), 0]
  },
  addInputRules() {
    return [
      new InputRule({
        // Typical transition markers
        find: /^(CUT TO:|FADE OUT:|FADE TO:|SMASH CUT:|MATCH CUT:)\s$/i,
        handler: ({ state, chain }) => {
          if (state.selection.$from.parent.type.name === this.name) return
          chain()
            .setNode(this.name)
            .run()
        },
      }),
    ]
  },
})
