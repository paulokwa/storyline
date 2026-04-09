import { Extension } from '@tiptap/core'

/**
 * ScreenplayKeyboard extension handles the structured writing flow
 * of a screenplay by intercepting Enter and Tab keys.
 */
export const ScreenplayKeyboard = Extension.create({
  name: 'screenplayKeyboard',

  addKeyboardShortcuts() {
    return {
      // Logic for Enter key: Predictive next block type
      'Enter': ({ editor }) => {
        const { state } = editor
        const { selection } = state
        const { $from } = selection
        const node = $from.parent

        // We only care about screenplay nodes
        const screenplayNodes = [
          'screenplaySceneHeading',
          'screenplayAction',
          'screenplayCharacter',
          'screenplayParenthetical',
          'screenplayDialogue',
          'screenplayTransition'
        ]

        if (!screenplayNodes.includes(node.type.name)) {
          return false
        }

        // If block is empty, Enter might mean switching back to Action (industry standard)
        if (node.content.size === 0) {
          if (node.type.name !== 'screenplayAction') {
            return editor.commands.setNode('screenplayAction')
          }
        }

        // Predictive flow on Enter
        let nextType = 'screenplayAction'

        if (node.type.name === 'screenplaySceneHeading') {
          nextType = 'screenplayAction'
        } else if (node.type.name === 'screenplayCharacter') {
          nextType = 'screenplayDialogue'
        } else if (node.type.name === 'screenplayParenthetical') {
          nextType = 'screenplayDialogue'
        } else if (node.type.name === 'screenplayDialogue') {
          nextType = 'screenplayAction'
        } else if (node.type.name === 'screenplayTransition') {
          nextType = 'screenplaySceneHeading'
        } else {
          // Action stays Action
          nextType = 'screenplayAction'
        }

        return editor
          .chain()
          .splitBlock()
          .setNode(nextType)
          .run()
      },

      // Logic for Tab key: Cycling through element types
      'Tab': ({ editor }) => {
        const { state } = editor
        const { selection } = state
        const { $from } = selection
        const node = $from.parent

        const cycle: Record<string, string> = {
          'screenplayAction': 'screenplayCharacter',
          'screenplayCharacter': 'screenplayParenthetical',
          'screenplayParenthetical': 'screenplayTransition',
          'screenplayTransition': 'screenplayAction',
          'screenplayDialogue': 'screenplayParenthetical', // Tab in dialogue usually means adding a parenthetical
          'screenplaySceneHeading': 'screenplayAction'
        }

        const nextType = cycle[node.type.name]
        if (nextType) {
          return editor.commands.setNode(nextType)
        }

        return false
      },

      // Shift-Tab: Cycle backwards
      'Shift-Tab': ({ editor }) => {
        const { state } = editor
        const { selection } = state
        const { $from } = selection
        const node = $from.parent

        const reverseCycle: Record<string, string> = {
          'screenplayCharacter': 'screenplayAction',
          'screenplayParenthetical': 'screenplayCharacter',
          'screenplayTransition': 'screenplayParenthetical',
          'screenplayAction': 'screenplayTransition',
          'screenplayDialogue': 'screenplayCharacter',
          'screenplaySceneHeading': 'screenplayTransition'
        }

        const nextType = reverseCycle[node.type.name]
        if (nextType) {
          return editor.commands.setNode(nextType)
        }

        return false
      },

      // Backspace: If at start of empty block, revert to Action or standard behavior
      'Backspace': ({ editor }) => {
        const { state } = editor
        const { selection } = state
        const { $from, empty } = selection

        if (!empty || $from.parentOffset !== 0) {
          return false
        }

        const node = $from.parent
        if (node.type.name !== 'screenplayAction' && node.content.size === 0) {
          return editor.commands.setNode('screenplayAction')
        }

        return false
      }
    }
  },
})
