'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface PremiumEditorProps {
  value: string
  onValueChange: (value: string) => void
  onKeyDown?: (e: KeyboardEvent) => void
  placeholder?: string
  className?: string
  editorClassName?: string
  minHeight?: string
}

/**
 * A robust multiline editor based on Tiptap/ProseMirror.
 *
 * ARCHITECTURE NOTE — why it's designed this way:
 * The standard "controlled component" pattern (parent sets value → child reads it → child
 * calls onChange → parent updates state → parent re-renders → child receives new value)
 * creates a feedback loop that interrupts the Android IME composition session.
 * When `editor.commands.setContent()` is called while the keyboard is in the middle of
 * composing a swipe-typed or predictive word, the composition is reset, making the text
 * flicker, disappear, or duplicate.
 *
 * The fix mirrors what `SceneEditor` does:
 *   - The editor treats `value` as **initial content only** (like an uncontrolled input).
 *   - It never syncs back from props while the user is typing.
 *   - External prop changes (e.g. switching to a different entity) are detected by comparing
 *     a stable identity key and replacing content only at that point.
 *   - `onValueChange` is called on each internal update so the parent can debounce-save,
 *     but the parent must NOT feed that value back as a new prop during active typing.
 */
export function PremiumEditor({
  value,
  onValueChange,
  onKeyDown,
  placeholder = 'Start writing...',
  className,
  editorClassName,
  minHeight = '150px',
}: PremiumEditorProps) {
  // We store the initial value so we can detect when the parent genuinely
  // switches to a *different* entity (e.g. user clicks a different character).
  // In that case we DO want to replace the content.
  const initialValueRef = useRef(value)
  const isUserTypingRef = useRef(false)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({}),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    // Treat the initial value as seed content — never overwrite from props after mount.
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-stone max-w-none focus:outline-none focus:border-none prose-p:leading-relaxed prose-p:my-0',
          editorClassName
        ),
      },
      handleKeyDown: (view, event) => {
        if (onKeyDown) {
          onKeyDown(event)
          return event.defaultPrevented
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      // Mark that the user is actively typing so we suppress external syncs.
      isUserTypingRef.current = true
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => {
        isUserTypingRef.current = false
      }, 1000)

      onValueChange(editor.getText())
    },
  })

  // Sync ONLY when the parent genuinely switches to a different entity.
  // We detect this by comparing the new `value` against what we seeded.
  // If the user is currently typing, we never interrupt them.
  useEffect(() => {
    if (!editor) return

    // If value matches what we think we have, nothing to do.
    if (value === initialValueRef.current) return

    // A genuinely different record has been selected — replace content,
    // but only if the user is idle (not mid-composition).
    if (!isUserTypingRef.current) {
      initialValueRef.current = value
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [value, editor])

  // Cleanup
  useEffect(() => {
    return () => {
      editor?.destroy()
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [editor])

  return (
    <div
      className={cn(
        'cursor-text premium-editor-container',
        className
      )}
      style={{ minHeight }}
      onClick={() => editor?.commands.focus()}
    >
      <EditorContent editor={editor} />
      <style jsx global>{`
        .premium-editor-container .is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #c8c4bb;
          pointer-events: none;
          height: 0;
          font-style: italic;
        }
        .premium-editor-container .ProseMirror {
          min-height: ${minHeight};
        }
      `}</style>
    </div>
  )
}
