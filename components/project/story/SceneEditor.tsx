'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useCallback, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database, WritingMode } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

import FirstTimeGuidance from './FirstTimeGuidance'

type Scene = Database['public']['Tables']['scenes']['Row']

interface SceneEditorProps {
    scene: Scene
    writingMode: WritingMode
    onUpdate: (scene: Scene) => void
    isProjectEmpty?: boolean
    projectType?: 'tv_script' | 'novel'
}

const SIMPLE_PLACEHOLDER = 'Start your story here. Use the panel on the left to add episodes and scenes, or begin writing in this scene.'
const SCREENPLAY_PLACEHOLDER = 'INT. LOCATION — DAY\n\nAction begins here.'

export default function SceneEditor({ scene, writingMode, onUpdate, isProjectEmpty, projectType }: SceneEditorProps) {
    const [isSaving, setIsSaving] = useState(false)
    const [manualDismiss, setManualDismiss] = useState(false)
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const sceneRef = useRef(scene)
    sceneRef.current = scene

    const save = useCallback(async (content: object) => {
        setIsSaving(true)
        const supabase = createClient()
        const { data } = await (supabase as any)
            .from('scenes')
            .update({ content, writing_mode: writingMode })
            .eq('id', sceneRef.current.id)
            .select()
            .single()
        if (data) onUpdate(data)

        setIsSaving(false)
    }, [writingMode, onUpdate])

    const editor = useEditor({
        immediatelyRender: false,
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
            setIsSaving(true)
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
    }, [scene.id, editor])

    // State for temporary "Saved" tag
    const [justSaved, setJustSaved] = useState(false)
    useEffect(() => {
        if (!isSaving && editor?.commands) {
            setJustSaved(true)
            const timer = setTimeout(() => setJustSaved(false), 2000)
            return () => clearTimeout(timer)
        }
    }, [isSaving, editor])

    // Guidance visibility logic
    const showGuidance = isProjectEmpty && editor?.isEmpty && !manualDismiss

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveTimer.current) clearTimeout(saveTimer.current)
        }
    }, [])

    return (
        <div className={cn(
            'min-h-full pt-12 pb-80 transition-all duration-700 ease-in-out px-12 md:px-24 relative',
            writingMode === 'screenplay' ? 'screenplay-mode' : 'max-w-6xl mx-auto'
        )}>
            <div className={cn(
                "transition-all duration-700 p-8 md:p-16 rounded-[3rem] border border-transparent hover:border-[#546354]/5 focus-within:border-[#546354]/10 focus-within:shadow-[0_40px_100px_rgba(0,0,0,0.02)] relative",
                writingMode === 'simple' && "editor-content text-[#31332f]/90 leading-[2.2] bg-white/10"
            )}>
                <EditorContent
                    editor={editor}
                    className={cn(
                        "w-full min-h-[800px] selection:bg-[#ffdbcb]/40 transition-all duration-500",
                        showGuidance && "opacity-20 pointer-events-none blur-[1px]"
                    )}
                />

                {showGuidance && (
                    <FirstTimeGuidance
                        projectType={projectType || 'tv_script'}
                        onDismiss={() => setManualDismiss(true)}
                    />
                )}
            </div>

            {/* Auto-save indicator */}
            <div className="fixed bottom-6 right-8 text-[10px] font-sans tracking-[0.2em] uppercase text-slate-300 pointer-events-none flex items-center gap-3 transition-all duration-500">
                <div className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-500",
                    isSaving ? "bg-amber-400 animate-pulse" : "bg-green-400/50"
                )} />
                <span className={cn(
                    "transition-all duration-500",
                    isSaving || justSaved ? "text-slate-400 font-medium" : "text-slate-300"
                )}>
                    {isSaving ? 'Saving…' : (justSaved ? 'Saved' : 'The Manuscript is safe')}
                </span>
            </div>
        </div>
    )
}
