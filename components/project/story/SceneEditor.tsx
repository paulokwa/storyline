'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database, WritingMode } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

type Scene = Database['public']['Tables']['scenes']['Row']

interface SceneEditorProps {
    scene: Scene
    writingMode: WritingMode
    onUpdate: (scene: Scene) => void
}

const SIMPLE_PLACEHOLDER = 'Start writing… your words go here.'
const SCREENPLAY_PLACEHOLDER = 'INT. LOCATION — DAY\n\nAction begins here.'

export default function SceneEditor({ scene, writingMode, onUpdate }: SceneEditorProps) {
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const sceneRef = useRef(scene)
    sceneRef.current = scene

    const save = useCallback(async (content: object) => {
        const supabase = createClient()
        const { data } = await supabase
            .from('scenes')
            .update({ content, writing_mode: writingMode })
            .eq('id', sceneRef.current.id)
            .select()
            .single()
        if (data) onUpdate(data)
    }, [writingMode, onUpdate])

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                bulletList: { keepMarks: true },
                orderedList: { keepMarks: true },
            }),
            Placeholder.configure({
                placeholder: writingMode === 'screenplay' ? SCREENPLAY_PLACEHOLDER : SIMPLE_PLACEHOLDER,
                emptyEditorClass: 'is-editor-empty',
            }),
        ],
        content: scene.content as object ?? null,
        autofocus: 'end',
        onUpdate: ({ editor }) => {
            if (saveTimer.current) clearTimeout(saveTimer.current)
            saveTimer.current = setTimeout(() => {
                save(editor.getJSON())
            }, 1000)
        },
        editorProps: {
            attributes: {
                class: 'outline-none focus:outline-none min-h-full editor-content',
            },
        },
    })

    // When scene changes, update editor content
    useEffect(() => {
        if (editor && scene.content) {
            const currentContent = JSON.stringify(editor.getJSON())
            const newContent = JSON.stringify(scene.content)
            if (currentContent !== newContent) {
                editor.commands.setContent(scene.content as object)
            }
        }
    }, [scene.id]) // eslint-disable-line react-hooks/exhaustive-deps

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveTimer.current) clearTimeout(saveTimer.current)
        }
    }, [])

    return (
        <div className={cn(
            'h-full pt-16 pb-32 transition-all duration-500 font-serif',
            writingMode === 'screenplay'
                ? 'screenplay-mode px-8'
                : 'editor-content max-w-4xl pl-32 pr-12 text-[#31332f]'
        )}>
            <EditorContent editor={editor} className="min-h-[600px] selection:bg-[#ffdbcb]/30" />

            {/* Auto-save indicator */}
            <div className="fixed bottom-6 right-8 text-[10px] font-sans tracking-widest uppercase text-slate-300 pointer-events-none flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400/50 animate-pulse" />
                The Manuscript is safe
            </div>
        </div>
    )
}
