'use client'

import { useState, useCallback, useEffect, useImperativeHandle, forwardRef, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { createClient } from '@/lib/supabase/client'
import type { Database, WritingMode } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface SceneEditorProps {
    scene: any
    title: string
    writingMode: WritingMode
    onUpdate: (updated: any) => void
    onTitleUpdate?: (newTitle: string) => void
    onTextChange?: (text: string) => void
    isProjectEmpty?: boolean
    projectType?: 'novel' | 'tv_script'
    projectCharacters: any[]
    projectIdeas: any[]
    projectLocations: any[]
    projectObjects: any[]
    aiSettings: any
}

export interface SceneEditorRef {
    getText: () => string
    getSelectionText: () => string
}

const SceneEditor = forwardRef<SceneEditorRef, SceneEditorProps>(({
    scene,
    title: initialTitle,
    writingMode,
    onUpdate,
    onTitleUpdate,
    onTextChange,
    isProjectEmpty,
    projectType,
    projectCharacters,
    projectIdeas,
    projectLocations,
    projectObjects,
    aiSettings
}, ref) => {
    const [title, setTitle] = useState(initialTitle)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

    // Sync with external title (StructureTree changes)
    useEffect(() => {
        setTitle(initialTitle)
    }, [initialTitle])

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: writingMode === 'screenplay' ? 'Start your script...' : 'Once upon a time...',
            }),
        ],
        content: scene.content || '',
        editorProps: {
            attributes: {
                class: cn(
                    'prose prose-slate max-w-none focus:outline-none min-h-[500px]',
                    writingMode === 'screenplay' ? 'font-mono' : 'font-serif text-lg leading-relaxed'
                ),
            },
        },
        onUpdate: ({ editor }) => {
            const text = editor.getText()
            onTextChange?.(text)
            setSaveStatus('idle') 
        },
    })

    const saveContent = useCallback(async () => {
        if (!editor) return
        const currentTitle = title
        const newContent = editor.getHTML()
        
        // Skip if same as scene/node (using initialTitle for current on-disk title)
        if (currentTitle === initialTitle && newContent === (scene.content || '')) {
            return
        }

        setSaveStatus('saving')
        const supabase = createClient()
        
        // 1. Update scene content
        const { error: sceneError } = await (supabase
            .from('scenes') as any)
            .update({ 
                content: newContent,
                updated_at: new Date().toISOString() 
            })
            .eq('id', scene.id)

        // 2. Update structure_node title if changed
        let nodeErrorResult = null
        if (currentTitle !== initialTitle) {
            const { error: nodeError } = await (supabase as any)
                .from('structure_nodes')
                .update({ title: currentTitle })
                .eq('id', scene.node_id)
            nodeErrorResult = nodeError
        }

        if (sceneError || nodeErrorResult) {
            console.error('Save error (scene/node):', sceneError || nodeErrorResult)
            setSaveStatus('error')
        } else {
            setSaveStatus('saved')
            if (currentTitle !== initialTitle) onTitleUpdate?.(currentTitle)
            onUpdate({ ...scene, title: currentTitle, content: newContent })
        }
    }, [scene.id, scene.node_id, title, initialTitle, editor, onUpdate, onTitleUpdate])

    // Effect for autosave
    useEffect(() => {
        if (saveStatus !== 'idle') return
        const timeout = setTimeout(saveContent, 1500)
        return () => clearTimeout(timeout)
    }, [title, editor?.getHTML(), saveStatus, saveContent])

    // Keep editor in sync when scene ID changes
    useEffect(() => {
        if (editor && scene.id !== (editor as any)._lastSceneId) {
            editor.commands.setContent(scene.content || '')
            ;(editor as any)._lastSceneId = scene.id
        }
    }, [scene.id, editor])

    useImperativeHandle(ref, () => ({
        getText: () => editor?.getText() || '',
        getSelectionText: () => {
            if (!editor) return ''
            const { from, to } = editor.state.selection
            return editor.state.doc.textBetween(from, to, ' ')
        }
    }))

    const label = projectType === 'tv_script' ? 'Episode' : 'Scene'

    return (
        <div className={cn(
            'min-h-full pb-32 md:pb-80 transition-all duration-700 ease-in-out relative',
            writingMode === 'screenplay' ? 'bg-[#f0f0ed] py-10 px-4 sm:px-8' : 'px-4 sm:px-12 md:px-24 max-w-6xl mx-auto pt-4'
        )}>
            {/* Header info bar */}
            <div className="flex flex-col mb-10">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 font-sans">
                        {writingMode === 'screenplay' ? 'Script' : 'Draft'} — {label}
                    </span>
                    <div className="flex items-center gap-2">
                         <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 font-sans",
                            saveStatus === 'saving' ? "text-amber-500" : 
                            saveStatus === 'saved' ? "text-emerald-500" : 
                            saveStatus === 'error' ? "text-red-500" : "text-slate-300"
                        )}>
                            {saveStatus === 'saving' ? 'Autosaving...' : saveStatus === 'saved' ? 'Saved' : ''}
                        </span>
                    </div>
                </div>
                
                <input
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value)
                        setSaveStatus('idle')
                    }}
                    placeholder={`Untitled ${label}`}
                    className={cn(
                        "w-full bg-transparent border-none focus:outline-none focus:ring-0 p-0 transition-all placeholder:text-slate-300",
                        writingMode === 'screenplay' 
                            ? "font-mono uppercase text-xl font-bold tracking-widest text-slate-700" 
                            : "font-serif text-3xl sm:text-4xl text-[#31332f]"
                    )}
                />
            </div>

            <div className={cn(
                "transition-all duration-700 relative",
                writingMode === 'screenplay' ? "max-w-[80ch] mx-auto bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] p-12 sm:p-20 min-h-[11in] border border-slate-200/50" : ""
            )}>
                <EditorContent editor={editor} />
            </div>

            {isProjectEmpty && (
                <div className="mt-12 p-8 rounded-3xl bg-amber-50/50 border border-amber-100 border-dashed text-center">
                    <p className="text-amber-700 font-serif italic text-lg mb-2">Your journey begins with a single word.</p>
                    <p className="text-amber-600/60 text-sm">Use the AI Helper on the right if you need a spark of inspiration.</p>
                </div>
            )}
        </div>
    )
})

SceneEditor.displayName = 'SceneEditor'

export default SceneEditor
