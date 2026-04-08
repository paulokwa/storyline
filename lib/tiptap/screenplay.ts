import { Node, mergeAttributes } from '@tiptap/core'

/**
 * Screenplay Scene Heading (Slugline)
 * Example: INT. COFFEE SHOP - DAY
 */
export const ScreenplaySceneHeading = Node.create({
  name: 'screenplaySceneHeading',
  group: 'block',
  content: 'inline*',
  priority: 1000,
  parseHTML() {
    return [{ tag: 'p[data-type="scene-heading"]', priority: 1000 }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { 'data-type': 'scene-heading', class: 'screenplay-scene-heading' }), 0]
  },
  addInputRules() {
    return [
      {
        find: /^(INT|EXT|I\/E|INT\/EXT)\.\s$/i,
        handler: ({ state, range, chain }) => {
          const text = state.doc.textBetween(range.from, range.to)
          chain()
            .deleteRange(range)
            .setNode(this.name)
            .insertContent(text)
            .run()
        },
      },
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
  priority: 1000,
  parseHTML() {
    return [{ tag: 'p[data-type="character"]', priority: 1000 }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { 'data-type': 'character', class: 'screenplay-character' }), 0]
  },
  addInputRules() {
    return [
      {
        // When user types something in ALL CAPS followed by a space at the start of a line
        // Only trigger if it's clearly a name (2-3 words max, all caps) and NOT a slugline
        find: /^[A-Z0-9\s]{2,}\s$/,
        handler: ({ state, range, chain }) => {
          const text = state.doc.textBetween(range.from, range.to)
          const trimmed = text.trim().toUpperCase()
          
          // Basic exclusion list for common screenplay markers
          const exclusions = ['INT.', 'EXT.', 'CUT TO:', 'FADE IN', 'FADE OUT', 'CUT', 'FADE']
          if (exclusions.some(exc => trimmed.startsWith(exc))) {
            return null
          }

          // Convert but keep the text
          chain()
            .deleteRange(range)
            .setNode(this.name)
            .insertContent(text)
            .run()
        },
      },
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
  priority: 1000,
  parseHTML() {
    return [{ tag: 'p[data-type="parenthetical"]', priority: 1000 }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { 'data-type': 'parenthetical', class: 'screenplay-parenthetical' }), 0]
  },
  addInputRules() {
    return [
      {
        // Automatically convert when typing starting with '('
        find: /^\(\s$/,
        handler: ({ state, range, chain }) => {
          const text = state.doc.textBetween(range.from, range.to)
          chain()
            .deleteRange(range)
            .setNode(this.name)
            .insertContent(text)
            .run()
        },
      },
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
  priority: 1000,
  parseHTML() {
    return [{ tag: 'p[data-type="transition"]', priority: 1000 }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { 'data-type': 'transition', class: 'screenplay-transition' }), 0]
  },
  addInputRules() {
    return [
      {
        // Typical transition markers
        find: /^(CUT TO:|FADE OUT:|FADE TO:|SMASH CUT:|MATCH CUT:)\s$/i,
        handler: ({ state, range, chain }) => {
          const text = state.doc.textBetween(range.from, range.to)
          chain()
            .deleteRange(range)
            .setNode(this.name)
            .insertContent(text)
            .run()
        },
      },
    ]
  },
})
