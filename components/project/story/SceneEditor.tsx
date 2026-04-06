'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useCallback, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database, WritingMode } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

import FirstTimeGuidance from './FirstTimeGuidance'
import LinkedContext from './LinkedContext'
import SceneAnalysisPanel from './SceneAnalysisPanel'

type Scene = Database['public']['Tables']['scenes']['Row'] & {
    scene_characters?: any[]
    scene_ideas?: any[]
}

export interface SceneEditorRef {
    appendContent: (text: string) => void
    getText: () => string
}

interface SceneEditorProps {
    scene: Scene
    writingMode: WritingMode
    onUpdate: (scene: Scene) => void
    onTextChange?: (text: string) => void
    isProjectEmpty?: boolean
    projectType?: 'tv_script' | 'novel'
    projectCharacters?: any[]
    projectIdeas?: any[]
    onLinkingUpdate?: () => void
    activeCharacters?: Record<string, boolean>
    setActiveCharacters?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
    activeIdeas?: Record<string, boolean>
    setActiveIdeas?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}

const SIMPLE_PLACEHOLDER = 'Start your story here. Use the panel on the left to add episodes and scenes, or begin writing in this scene.'
const SCREENPLAY_PLACEHOLDER = 'INT. LOCATION — DAY\n\nAction begins here.'

const SceneEditor = forwardRef<SceneEditorRef, SceneEditorProps>(({ 
    scene, 
    writingMode, 
    onUpdate, 
    onTextChange, 
    isProjectEmpty, 
    projectType,
    projectCharacters = [],
    projectIdeas = [],
    onLinkingUpdate,
    activeCharacters,
    setActiveCharacters,
    activeIdeas,
    setActiveIdeas
}: SceneEditorProps, ref: React.ForwardedRef<SceneEditorRef>) => {
    const [isSaving, setIsSaving] = useState(false)
    const [manualDismiss, setManualDismiss] = useState(false)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analyzeError, setAnalyzeError] = useState<string | null>(null)
    const [analysisResult, setAnalysisResult] = useState<{
        summary: string
        tension: string
        pacing: string
        dialogue: string
        suggestions: string[]
    } | null>(null)
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
        
        if (data) {
            onUpdate({
                ...data,
                scene_characters: sceneRef.current.scene_characters,
                scene_ideas: sceneRef.current.scene_ideas
            })
        }

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
        onUpdate: ({ editor }: { editor: any }) => {
            setIsSaving(true)
            if (onTextChange) onTextChange(editor.getText())
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

    // Sync initial text to parent on mount
    useEffect(() => {
        if (editor && onTextChange) {
            onTextChange(editor.getText())
        }
    }, [editor, onTextChange])

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

    useImperativeHandle(ref, () => ({
        appendContent: (text: string) => {
            if (editor) {
                editor.commands.focus('end')
                // Build proper paragraph nodes for each line to preserve structure
                const paragraphs = text
                    .split('\n')
                    .filter(line => line.trim() !== '')
                    .map(line => ({ type: 'paragraph', content: [{ type: 'text', text: line }] }))
                if (paragraphs.length === 0) return
                editor.commands.insertContent([
                    { type: 'paragraph' }, // blank line separator
                    ...paragraphs,
                ])
            }
        },
        getText: () => editor?.getText() ?? ''
    }), [editor])

    const handleAnalyzeScene = useCallback(async () => {
        if (!editor) return
        const sceneText = editor.getText().trim()

        setAnalyzeError(null)
        setAnalysisResult(null)
        setIsAnalyzing(true)

        try {
            const res = await fetch('/api/ai/analyze-scene', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sceneText }),
            })

            if (!res.ok) {
                const body = await res.text()
                if (body === 'SCENE_TOO_SHORT') setAnalyzeError('This scene is too short to analyze. Add more content first.')
                else if (body === 'SCENE_TOO_LARGE') setAnalyzeError('This scene is too long to analyze (limit: ~2,500 words). Try a shorter section.')
                else if (body === 'NO_API_KEY') setAnalyzeError('No API key found. Add your Gemini API key in Account Settings.')
                else if (body === 'RATE_LIMITED') setAnalyzeError('Please wait a few seconds before analyzing again.')
                else setAnalyzeError('Something went wrong. Please try again.')
                return
            }

            const data = await res.json()
            setAnalysisResult(data)
        } catch {
            setAnalyzeError('Network error. Please check your connection and try again.')
        } finally {
            setIsAnalyzing(false)
        }
    }, [editor])

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
            {/* Analyze Scene button — top-right, outside card so it floats above */}
            <div className="flex items-start justify-end mb-4 gap-3">
                <div className="flex flex-col items-end gap-1">
                    <button
                        onClick={handleAnalyzeScene}
                        disabled={isAnalyzing || !editor || editor.isEmpty}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                            "border border-slate-200 bg-white/60 backdrop-blur-sm text-slate-600",
                            "hover:border-violet-200 hover:bg-violet-50/80 hover:text-violet-700 hover:shadow-sm",
                            "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-white/60 disabled:hover:text-slate-600",
                            isAnalyzing && "border-violet-300 bg-violet-50/80 text-violet-700 animate-pulse"
                        )}
                    >
                        <span>{isAnalyzing ? '⏳' : '✨'}</span>
                        <span>{isAnalyzing ? 'Analyzing…' : 'Analyze Scene'}</span>
                    </button>
                    <span className="text-[10px] text-slate-400 tracking-wide">
                        Analyzes only this scene using your API key
                    </span>
                    {analyzeError && (
                        <span className="text-[11px] text-red-400 max-w-[240px] text-right leading-tight">
                            {analyzeError}
                        </span>
                    )}
                </div>
            </div>

            <div className={cn(
                "transition-all duration-700 p-8 md:p-16 rounded-[3rem] border border-slate-200 hover:border-slate-300 focus-within:border-slate-400 focus-within:shadow-[0_40px_100px_rgba(0,0,0,0.02)] relative",
                writingMode === 'simple' && "editor-content text-[#31332f]/90 leading-[2.2] bg-white/10",
                isAnalyzing && "border-violet-200 shadow-[0_0_0_2px_rgba(167,139,250,0.15)]"
            )}>
                <LinkedContext 
                    sceneId={scene.id}
                    sceneCharacters={scene.scene_characters || []}
                    sceneIdeas={scene.scene_ideas || []}
                    projectCharacters={projectCharacters}
                    projectIdeas={projectIdeas}
                    onUpdate={onLinkingUpdate || (() => {})}
                    activeCharacters={activeCharacters}
                    setActiveCharacters={setActiveCharacters}
                    activeIdeas={activeIdeas}
                    setActiveIdeas={setActiveIdeas}
                />
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

            {/* Scene Analysis results panel */}
            <SceneAnalysisPanel
                result={analysisResult}
                onClose={() => setAnalysisResult(null)}
            />
        </div>
    )
})

SceneEditor.displayName = 'SceneEditor'

export default SceneEditor
