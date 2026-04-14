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
 * A robust multiline editor based on Tiptap.
 * Resolves mobile keyboard input issues (cursor jumping, character deletion) 
 * by using ProseMirror's industrial-grade state management.
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
  const isUpdatingRef = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({}),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
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
      const text = editor.getText()
      isUpdatingRef.current = true
      onValueChange(text)
      setTimeout(() => {
        isUpdatingRef.current = false
      }, 0)
    },
  })

  // Sync value from props if it changes externally
  useEffect(() => {
    if (editor && value !== editor.getText() && !isUpdatingRef.current) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [value, editor])

  // Cleanup
  useEffect(() => {
    return () => {
      editor?.destroy()
    }
  }, [editor])

  return (
    <div 
      className={cn(
        "cursor-text premium-editor-container",
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
          color: #adb5bd;
          pointer-events: none;
          height: 0;
          font-style: italic;
        }
        .premium-editor-container .ProseMirror {
          min-height: ${minHeight};
          padding: 0;
        }
      `}</style>
    </div>
  )
}
