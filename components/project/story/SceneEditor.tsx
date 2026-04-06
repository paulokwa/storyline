'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useCallback, useRef, useState, useMemo, useImperativeHandle, forwardRef } from 'react'
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
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'failed' | 'idle'>('saved')
    const [lastSavedContent, setLastSavedContent] = useState<string>(JSON.stringify(scene.content))
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
    const prevSceneIdRef = useRef(scene.id)
    sceneRef.current = scene

    // --- Reliability: Local Fallback Helpers ---
    const getStorageKey = useCallback((sId: string) => `storyline_backup_${sId}`, [])
    
    const saveToLocal = useCallback((content: any, forceId?: string) => {
        const targetId = forceId || sceneRef.current.id
        try {
            localStorage.setItem(getStorageKey(targetId), JSON.stringify({
                content,
                timestamp: Date.now()
            }))
        } catch (e) {
            console.error('Failed to save to localStorage:', e)
        }
    }, [getStorageKey])

    const clearLocal = useCallback((sId: string) => {
        localStorage.removeItem(getStorageKey(sId))
    }, [getStorageKey])

    const save = useCallback(async (content: object, forceId?: string) => {
        const targetId = forceId || sceneRef.current.id
        const contentStr = JSON.stringify(content)
        // Redundancy check: don't save if it matches what we last sent
        if (contentStr === lastSavedContent) {
            setSaveStatus('saved')
            return
        }

        setSaveStatus('saving')
        const supabase = createClient()
        
        try {
            const { data, error } = await (supabase as any)
                .from('scenes')
                .update({ content, writing_mode: writingMode })
                .eq('id', targetId)
                .select()
                .single()
            
            if (error) throw error

            if (data) {
                setLastSavedContent(contentStr)
                clearLocal(targetId)
                setSaveStatus('saved')
                onUpdate({
                    ...data,
                    scene_characters: sceneRef.current.scene_characters,
                    scene_ideas: sceneRef.current.scene_ideas
                })
            }
        } catch (err) {
            console.error('Save failed:', err)
            setSaveStatus('failed')
            saveToLocal(content, targetId)
        }
    }, [writingMode, onUpdate, lastSavedContent, clearLocal, saveToLocal])

    // --- Editor Configuration: Memoized Extensions ---
    const extensions = useMemo(() => [
        StarterKit.configure({
            heading: { levels: [1, 2, 3] },
            bulletList: { keepMarks: true },
            orderedList: { keepMarks: true },
        }),
        Placeholder.configure({
            placeholder: writingMode === 'screenplay' ? SCREENPLAY_PLACEHOLDER : SIMPLE_PLACEHOLDER,
            emptyEditorClass: 'is-editor-empty',
        }),
    ], [writingMode]);

    const editor = useEditor({
        immediatelyRender: false,
        extensions,
        content: scene.content as object ?? null,
        autofocus: 'end',
        onUpdate: ({ editor }: { editor: any }) => {
            setSaveStatus('idle') // Mark as dirty
            if (onTextChange) onTextChange(editor.getText())
            if (saveTimer.current) clearTimeout(saveTimer.current)
            
            // --- Reliability: 5s Debounce (Reduced Spam) ---
            saveTimer.current = setTimeout(() => {
                const json = editor.getJSON()
                save(json)
            }, 5000)
        },
        onBlur: ({ editor }) => {
            // --- Reliability: Save on Blur ---
            if (saveTimer.current) {
                clearTimeout(saveTimer.current)
                save(editor.getJSON())
            }
        },
        editorProps: {
            attributes: {
                class: 'outline-none focus:outline-none min-h-full editor-content',
            },
        },
    }, [extensions]) // Re-run if extensions change

    // --- Reliability: BeforeUnload Protection ---
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Only warn if we have an active save in flight OR a failed save that needs attention.
            // 'idle' means we just started typing but the debounce hasn't fired yet.
            // 'saved' means we are in sync.
            // Warn on ANY state that isn't 'saved' (covers idle, saving, and failed)
            if (saveStatus !== 'saved') {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [saveStatus])

    // --- Reliability: Recovery Flow ---
    useEffect(() => {
        if (!editor || !scene.id) return

        const localData = localStorage.getItem(getStorageKey(scene.id))
        if (localData) {
            try {
                const { content, timestamp } = JSON.parse(localData)
                const localStr = JSON.stringify(content)
                const serverStr = JSON.stringify(scene.content)
                
                // Only prompt if local is meaningfully different from server
                if (localStr !== serverStr) {
                    const confirmRecover = window.confirm(
                        `We found unsaved changes for this scene (from ${new Date(timestamp).toLocaleTimeString()}) that aren't on the server. Recover them?`
                    )
                    if (confirmRecover) {
                        editor.commands.setContent(content)
                        save(content)
                    } else {
                        clearLocal(scene.id)
                    }
                } else {
                    // It matches server, just clean up stale local
                    clearLocal(scene.id)
                }
            } catch (e) {
                clearLocal(scene.id)
            }
        }
    }, [editor, scene.id, getStorageKey, clearLocal, save]) // Initial mount only really, but keyed to editor/scene

    // --- Placeholder Dynamic Update ---
    useEffect(() => {
        if (!editor) return
        editor.setOptions({
            extensions: [
                Placeholder.configure({
                    placeholder: writingMode === 'screenplay' ? SCREENPLAY_PLACEHOLDER : SIMPLE_PLACEHOLDER,
                    emptyEditorClass: 'is-editor-empty',
                })
            ]
        })
    }, [editor, writingMode])

    // Sync initial text to parent on mount
    useEffect(() => {
        if (editor && onTextChange) {
            onTextChange(editor.getText())
        }
    }, [editor, onTextChange])

    // When scene changes, update editor content
    useEffect(() => {
        if (!editor) return

        const currentContentJson = editor.getJSON()
        const currentContentStr = JSON.stringify(currentContentJson)
        const newContentStr = JSON.stringify(scene.content || null)
        
        // --- Reliability: Switch Handling ---
        if (prevSceneIdRef.current !== scene.id) {
            // Scene is changing! Flush old scene changes IF dirty
            if (saveStatus !== 'saved') {
                console.log('Switching scenes: Flushing pending changes to', prevSceneIdRef.current)
                save(currentContentJson, prevSceneIdRef.current)
            }
            
            // Now load the new scene
            if (scene.content) {
                editor.commands.setContent(scene.content as object)
            } else {
                editor.commands.clearContent()
            }
            
            setLastSavedContent(newContentStr)
            setSaveStatus('saved')
            prevSceneIdRef.current = scene.id
            return
        }

        // Handle external updates to the SAME scene
        if (currentContentStr !== newContentStr) {
            if (scene.content) {
                editor.commands.setContent(scene.content as object)
            } else {
                editor.commands.clearContent()
            }
            setLastSavedContent(newContentStr)
            setSaveStatus('saved')
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

    // Guidance visibility logic
    const showGuidance = isProjectEmpty && editor?.isEmpty && !manualDismiss

    // Cleanup on unmount (Final save attempt)
    useEffect(() => {
        return () => {
            if (saveTimer.current) {
                clearTimeout(saveTimer.current)
                // Note: We can't easily await here, so local fallback is critical
            }
        }
    }, [])

    return (
        <div className={cn(
            'min-h-full pt-6 sm:pt-12 pb-32 md:pb-80 transition-all duration-700 ease-in-out relative',
            writingMode === 'screenplay' ? 'bg-[#f0f0ed] py-10 sm:py-20 px-4 sm:px-8' : 'px-4 sm:px-12 md:px-24 max-w-6xl mx-auto'
        )}>
            {/* Analyze Scene button — top-right, outside card so it floats above */}
            <div className={cn(
                "flex items-start justify-end mb-4 gap-3",
                writingMode === 'screenplay' && "max-w-[80ch] mx-auto"
            )}>
                <div className="flex flex-col items-end gap-1">
                    <button
                        onClick={handleAnalyzeScene}
                        disabled={isAnalyzing || !editor || editor.isEmpty}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                            "border border-slate-200 bg-white/60 backdrop-blur-sm text-slate-600",
                            "hover:border-violet-200 hover:bg-violet-50/80 hover:text-violet-700 hover:shadow-sm",
                            "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-white/60 disabled:hover:text-slate-600",
                            isAnalyzing && "border-violet-300 bg-violet-50/80 text-violet-700 animate-pulse",
                            // Reliability: disable analysis if unsaved or saving to ensure we analyze the latest version
                            (saveStatus === 'saving' || saveStatus === 'idle') && "opacity-50 pointer-events-none"
                        )}
                    >
                        <span>{isAnalyzing ? (saveStatus === 'saving' || saveStatus === 'idle' ? '⌛' : '⏳') : '✨'}</span>
                        <span>
                            {saveStatus === 'saving' || saveStatus === 'idle' 
                                ? 'Autosaving…' 
                                : isAnalyzing ? 'Analyzing…' : 'Analyze Scene'
                            }
                        </span>
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
                "transition-all duration-700 relative",
                writingMode === 'screenplay' 
                    ? 'screenplay-mode' 
                    : "p-4 sm:p-8 md:p-16 rounded-[2rem] sm:rounded-[3rem] border border-slate-200 hover:border-slate-300 focus-within:border-slate-400 focus-within:shadow-[0_40px_100px_rgba(0,0,0,0.02)] bg-white/10 text-[#31332f]/90 leading-[2.2]",
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
                        "w-full min-h-[40vh] md:min-h-[700px] selection:bg-[#ffdbcb]/40 transition-all duration-500",
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
            <div className="fixed bottom-6 right-8 text-[10px] font-sans tracking-[0.2em] uppercase pointer-events-none flex items-center gap-3 transition-all duration-500">
                <div className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-500",
                    saveStatus === 'saving' && "bg-amber-400 animate-pulse",
                    saveStatus === 'saved' && "bg-green-400/50",
                    saveStatus === 'failed' && "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]",
                    saveStatus === 'idle' && "bg-slate-300"
                )} />
                <span className={cn(
                    "transition-all duration-500",
                    saveStatus === 'saving' && "text-slate-500 font-medium",
                    saveStatus === 'saved' && "text-slate-400",
                    saveStatus === 'failed' && "text-red-500 font-bold",
                    saveStatus === 'idle' && "text-slate-300"
                )}>
                    {saveStatus === 'saving' && 'Saving…'}
                    {saveStatus === 'saved' && 'Saved'}
                    {saveStatus === 'failed' && 'Save Failed — Saved Locally'}
                    {saveStatus === 'idle' && 'Unsaved Changes'}
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
