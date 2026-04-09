'use client'

import { useState, useCallback, useEffect, useImperativeHandle, forwardRef, useRef, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import { 
    ScreenplaySceneHeading, 
    ScreenplayAction, 
    ScreenplayCharacter, 
    ScreenplayParenthetical, 
    ScreenplayDialogue, 
    ScreenplayTransition 
} from '@/lib/tiptap/screenplay'
import { ScreenplayKeyboard } from '@/lib/tiptap/screenplay-keyboard'
import { createClient } from '@/lib/supabase/client'
import type { Database, WritingMode } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { 
    Trash2, 
    RotateCcw, 
    Loader2, 
    History as HistoryIcon,
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Highlighter,
    Heading1,
    Heading2,
    List,
    ListOrdered,
    Quote,
    Type,
    AlignLeft,
    AlignJustify,
    MoveHorizontal,
    Maximize2,
    Settings2,
    Mic,
    MicOff,
    Waves,
    Clapperboard,
    User,
    MessageSquare,
    ArrowRight,
    Type as TypeIcon
} from 'lucide-react'
import { restoreStructureNode, captureSceneVersion } from '@/lib/supabase/recovery'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useSpeechToText } from '@/hooks/useSpeechToText'

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
    insertText: (text: string) => void
}

const ToolbarButton = ({ 
    onClick, 
    active, 
    icon: Icon, 
    tooltip 
}: { 
    onClick: (e: React.MouseEvent) => void, 
    active?: boolean, 
    icon: any, 
    tooltip: string 
}) => (
    <button
        type="button"
        onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onClick(e)
        }}
        className={cn(
            "p-1.5 rounded-lg transition-all duration-200",
            active 
                ? "bg-slate-800 text-white shadow-md scale-105" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        )}
        title={tooltip}
    >
        <Icon className="w-3.5 h-3.5" />
    </button>
)

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
    const router = useRouter()
    const [title, setTitle] = useState(initialTitle)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [isRestoring, setIsRestoring] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const [showViewSettings, setShowViewSettings] = useState(false)
    const [interimTranscript, setInterimTranscript] = useState('')

    const { toggle: toggleDictation, isRecording, supported: speechSupported } = useSpeechToText({
        onTranscript: (text, isFinal) => {
            if (isFinal && editor) {
                setInterimTranscript('')
                // Add a space if we're not at the start of a sentence/line
                const { from } = editor.state.selection
                const textBefore = editor.state.doc.textBetween(Math.max(0, from - 1), from)
                const needsSpace = textBefore && ![' ', '\n'].includes(textBefore)
                
                editor.chain().focus().insertContent((needsSpace ? ' ' : '') + text).run()
            } else {
                setInterimTranscript(text)
            }
        }
    })

    const [viewSettings, setViewSettings] = useState({
        fontSize: '18px',
        lineHeight: '1.8',
        maxWidth: '1152px',
        textAlign: 'left'
    })

    useEffect(() => {
        setIsMounted(true)
        const saved = localStorage.getItem('storyline_editor_prefs')
        if (saved) {
            try {
                setViewSettings(JSON.parse(saved))
            } catch (e) {
                console.error('Failed to load editor prefs', e)
            }
        }
    }, [])

    // Track latest scene prop in a ref to ensure autosave doesn't use a stale closure
    const sceneRef = useRef(scene)
    useEffect(() => {
        sceneRef.current = scene
    }, [scene])

    const updateViewSetting = (key: string, value: string) => {
        const newSettings = { ...viewSettings, [key]: value }
        setViewSettings(newSettings)
        localStorage.setItem('storyline_editor_prefs', JSON.stringify(newSettings))
    }

    // Sync with external title (StructureTree changes)
    useEffect(() => {
        setTitle(initialTitle)
    }, [initialTitle])

    // Memoize extensions to prevent unnecessary editor re-mounts
    const extensions = useMemo(() => {
        const base = [
            StarterKit.configure({
                // Keep standard nodes enabled to prevent schema validation errors
                // We control their use via ScreenplayKeyboard and priority instead.
                paragraph: {},
                heading: {},
            }),
            // Underline is often included in StarterKit v3 or globally registered
            // If it's missing, add it back, but currently causing 'Duplicate' warning
            Highlight.configure({ multicolor: true }),
            BubbleMenuExtension.configure({
                element: null, 
            }),
            Placeholder.configure({
                placeholder: writingMode === 'screenplay' ? 'Start your script...' : 'Once upon a time...',
            }),
        ]

        if (writingMode === 'screenplay') {
            return [
                ...base,
                ScreenplaySceneHeading,
                ScreenplayAction,
                ScreenplayCharacter,
                ScreenplayParenthetical,
                ScreenplayDialogue,
                ScreenplayTransition,
                ScreenplayKeyboard,
            ]
        }

        return base
    }, [writingMode])

    const { sidebarOpen, setSidebarOpen, aiPanelOpen, setAiPanelOpen, currentSceneText, setCurrentSceneText, role } = useProjectActions()
    const isReadOnly = role === 'viewer'

    const editor = useEditor({
        immediatelyRender: false,
        extensions,
        content: scene.content || '',
        editable: !isReadOnly,
        editorProps: {
            attributes: {
                class: cn(
                    'max-w-none focus:outline-none min-h-[500px]',
                    writingMode === 'screenplay' 
                        ? 'screenplay-mode font-mono' 
                        : 'prose prose-slate font-serif editor-novel-overrides'
                ),
            },
        },
        onCreate: ({ editor }) => {
            onTextChange?.(editor.getText())
        },
        onUpdate: ({ editor }) => {
            const text = editor.getText()
            onTextChange?.(text)
            setSaveStatus('idle') 
        },
    }, [writingMode, isReadOnly])

    const saveContent = useCallback(async () => {
        if (!editor || isReadOnly) return
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

        // 1b. Capture version
        await captureSceneVersion(supabase, scene.project_id, scene.id, newContent)

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
            
            const updatedScene = { ...sceneRef.current, title: currentTitle, content: newContent }
            if (editor) {
                (editor as any)._lastContent = newContent
            }
            onUpdate(updatedScene)
        }
    }, [scene, title, initialTitle, editor, onUpdate, onTitleUpdate])

    // Effect for autosave
    useEffect(() => {
        if (saveStatus !== 'idle') return
        const timeout = setTimeout(saveContent, 1500)
        return () => clearTimeout(timeout)
    }, [title, editor?.getHTML(), saveStatus, saveContent])

    // Keep editor in sync when scene changes (ID or content)
    useEffect(() => {
        if (!editor) return

        const isDifferentScene = scene.id !== (editor as any)._lastSceneId
        const currentHTML = editor.getHTML()
        // Structurally check if the content from parent is actually different from what we have/saved
        const isContentDifferent = scene.content !== (editor as any)._lastContent && scene.content !== currentHTML

        if (isDifferentScene || (isContentDifferent && !editor.isFocused)) {
            editor.commands.setContent(scene.content || '')
            ;(editor as any)._lastSceneId = scene.id
            ;(editor as any)._lastContent = scene.content
            // Note: status will become idle via onUpdate which is triggered by setContent
        }
    }, [scene.id, scene.content, editor])

    useImperativeHandle(ref, () => ({
        getText: () => editor?.getText() || '',
        getSelectionText: () => {
            if (!editor) return ''
            const { from, to } = editor.state.selection
            return editor.state.doc.textBetween(from, to, ' ')
        },
        insertText: (text: string) => {
            if (!editor) return
            editor.commands.insertContent(text)
        }
    }))

    const handleRestore = async () => {
        if (isReadOnly) return
        setIsRestoring(true)
        try {
            const supabase = createClient()
            await restoreStructureNode(supabase, scene.node_id, [])
            router.refresh()
        } catch (error) {
            console.error('Error restoring scene:', error)
        } finally {
            setIsRestoring(false)
        }
    }

    const label = projectType === 'tv_script' ? 'Episode' : 'Scene'
    const isDeleted = scene.deleted_at !== null

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
                        {!isReadOnly && (
                             <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 font-sans",
                                saveStatus === 'saving' ? "text-amber-500" : 
                                saveStatus === 'saved' ? "text-emerald-500" : 
                                saveStatus === 'error' ? "text-red-500" : "text-slate-300"
                            )}>
                                {saveStatus === 'saving' ? 'Autosaving...' : saveStatus === 'saved' ? 'Saved' : ''}
                            </span>
                        )}
                        {!isReadOnly && (
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => router.push(`/project/${scene.project_id}/recovery?section=history&sceneId=${scene.id}`)}
                                className="h-6 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#546354] hover:bg-white transition-all"
                            >
                                <HistoryIcon className="w-3 h-3 mr-1" />
                                 History
                            </Button>
                        )}
                        
                        {!isReadOnly && speechSupported && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleDictation}
                                className={cn(
                                    "h-6 px-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                                    isRecording 
                                        ? "text-red-500 bg-red-50 hover:bg-red-100 animate-pulse" 
                                        : "text-slate-400 hover:text-slate-600 hover:bg-white"
                                )}
                            >
                                {isRecording ? <Mic className="w-3 h-3 mr-1" /> : <MicOff className="w-3 h-3 mr-1" />}
                                {isRecording ? 'Listening...' : 'Dictate'}
                            </Button>
                        )}
                        
                        {/* Phase B: View Settings */}
                        {writingMode === 'simple' && (
                            <div className="relative">
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setShowViewSettings(!showViewSettings)}
                                    className={cn(
                                        "h-6 px-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                                        showViewSettings ? "text-emerald-500 bg-white" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    <Type className="w-3 h-3 mr-1" />
                                    View
                                </Button>

                                {showViewSettings && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-[60]" 
                                            onClick={() => setShowViewSettings(false)} 
                                        />
                                        <div className="absolute right-0 top-8 w-64 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl p-4 z-[70] animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="space-y-4">
                                                {/* Font Size */}
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 block">Font Size</label>
                                                    <div className="flex bg-slate-50 p-1 rounded-xl gap-1">
                                                        {['16px', '18px', '22px'].map((size) => (
                                                            <button
                                                                key={size}
                                                                onClick={() => updateViewSetting('fontSize', size)}
                                                                className={cn(
                                                                    "flex-1 py-1 px-2 rounded-lg text-xs font-medium transition-all",
                                                                    viewSettings.fontSize === size 
                                                                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
                                                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
                                                                )}
                                                            >
                                                                {size === '16px' ? 'Small' : size === '18px' ? 'Medium' : 'Large'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Line Height */}
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 block">Line Height</label>
                                                    <div className="flex bg-slate-50 p-1 rounded-xl gap-1">
                                                        {['1.5', '1.8', '2.2'].map((lh) => (
                                                            <button
                                                                key={lh}
                                                                onClick={() => updateViewSetting('lineHeight', lh)}
                                                                className={cn(
                                                                    "flex-1 py-1 px-2 rounded-lg text-xs font-medium transition-all",
                                                                    viewSettings.lineHeight === lh 
                                                                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
                                                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
                                                                )}
                                                            >
                                                                {lh === '1.5' ? 'Tight' : lh === '1.8' ? 'Normal' : 'Relaxed'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Page Width */}
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 block">Page Width</label>
                                                    <div className="flex bg-slate-50 p-1 rounded-xl gap-1">
                                                        {['896px', '1152px', '100%'].map((width) => (
                                                            <button
                                                                key={width}
                                                                onClick={() => updateViewSetting('maxWidth', width)}
                                                                className={cn(
                                                                    "flex-1 py-1 px-2 rounded-lg text-xs font-medium transition-all",
                                                                    viewSettings.maxWidth === width 
                                                                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
                                                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
                                                                )}
                                                            >
                                                                {width === '896px' ? 'Narrow' : width === '1152px' ? 'Default' : 'Full'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Alignment */}
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 block">Alignment</label>
                                                    <div className="flex bg-slate-50 p-1 rounded-xl gap-1">
                                                        {[
                                                            { id: 'left', icon: AlignLeft, label: 'Left' },
                                                            { id: 'justify', icon: AlignJustify, label: 'Justified' }
                                                        ].map((item) => (
                                                            <button
                                                                key={item.id}
                                                                onClick={() => updateViewSetting('textAlign', item.id)}
                                                                className={cn(
                                                                    "flex-1 py-1 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2",
                                                                    viewSettings.textAlign === item.id 
                                                                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
                                                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
                                                                )}
                                                            >
                                                                <item.icon className="w-3 h-3" />
                                                                {item.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                <input
                    value={title}
                    onChange={(e) => {
                        if (isReadOnly) return
                        setTitle(e.target.value)
                        setSaveStatus('idle')
                    }}
                    disabled={isReadOnly}
                    placeholder={`Untitled ${label}`}
                    className={cn(
                        "w-full bg-transparent border-none focus:outline-none focus:ring-0 p-0 transition-all placeholder:text-slate-300",
                        writingMode === 'screenplay' 
                            ? "font-mono uppercase text-xl font-bold tracking-widest text-slate-700" 
                            : "font-serif text-3xl sm:text-4xl text-[#31332f]"
                    )}
                />
            </div>

            <div 
                style={isMounted && writingMode === 'simple' ? {
                    '--editor-font-size': viewSettings.fontSize,
                    '--editor-line-height': viewSettings.lineHeight,
                    '--editor-max-width': viewSettings.maxWidth,
                    '--editor-text-align': viewSettings.textAlign,
                    maxWidth: viewSettings.maxWidth,
                    textAlign: viewSettings.textAlign as any
                } as React.CSSProperties : {}}
                className={cn(
                    "transition-all duration-700 relative",
                    writingMode === 'screenplay' 
                        ? "max-w-[80ch] mx-auto bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] p-12 sm:p-20 min-h-[11in] border border-slate-200/50" 
                        : "mx-auto w-full transition-[max-width] duration-500 ease-in-out"
                )}
            >
                {editor && !isReadOnly && (
                    <BubbleMenu 
                        editor={editor} 
                        className="flex items-center gap-0.5 bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-xl p-1 overflow-hidden animate-in fade-in zoom-in duration-200 z-[100]"
                    >
                        {writingMode === 'screenplay' ? (
                            <>
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().setNode('screenplaySceneHeading').run()}
                                    active={editor.isActive('screenplaySceneHeading')}
                                    icon={Clapperboard}
                                    tooltip="Scene Heading"
                                />
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().setNode('screenplayAction').run()}
                                    active={editor.isActive('screenplayAction')}
                                    icon={TypeIcon}
                                    tooltip="Action"
                                />
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().setNode('screenplayCharacter').run()}
                                    active={editor.isActive('screenplayCharacter')}
                                    icon={User}
                                    tooltip="Character"
                                />
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().setNode('screenplayParenthetical').run()}
                                    active={editor.isActive('screenplayParenthetical')}
                                    icon={() => <span className="text-[10px] font-bold">( )</span>}
                                    tooltip="Parenthetical"
                                />
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().setNode('screenplayDialogue').run()}
                                    active={editor.isActive('screenplayDialogue')}
                                    icon={MessageSquare}
                                    tooltip="Dialogue"
                                />
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().setNode('screenplayTransition').run()}
                                    active={editor.isActive('screenplayTransition')}
                                    icon={ArrowRight}
                                    tooltip="Transition"
                                />
                            </>
                        ) : (
                            <>
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().toggleBold().run()}
                                    active={editor.isActive('bold')}
                                    icon={Bold}
                                    tooltip="Bold"
                                />
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().toggleItalic().run()}
                                    active={editor.isActive('italic')}
                                    icon={Italic}
                                    tooltip="Italic"
                                />
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                                    active={editor.isActive('underline')}
                                    icon={UnderlineIcon}
                                    tooltip="Underline"
                                />
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().toggleStrike().run()}
                                    active={editor.isActive('strike')}
                                    icon={Strikethrough}
                                    tooltip="Strikethrough"
                                />
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                                    active={editor.isActive('highlight')}
                                    icon={Highlighter}
                                    tooltip="Highlight"
                                />
                                <div className="w-px h-4 bg-slate-200 mx-1" />
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                                    active={editor.isActive('heading', { level: 1 })}
                                    icon={Heading1}
                                    tooltip="Heading 1"
                                />
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                                    active={editor.isActive('heading', { level: 2 })}
                                    icon={Heading2}
                                    tooltip="Heading 2"
                                />
                                <div className="w-px h-4 bg-slate-200 mx-1" />
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                                    active={editor.isActive('bulletList')}
                                    icon={List}
                                    tooltip="Bullet List"
                                />
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                    active={editor.isActive('orderedList')}
                                    icon={ListOrdered}
                                    tooltip="Numbered List"
                                />
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                                    active={editor.isActive('blockquote')}
                                    icon={Quote}
                                    tooltip="Blockquote"
                                />
                            </>
                        )}
                    </BubbleMenu>
                )}
                <EditorContent editor={editor} />
                
                {/* Floating Interim Transcript Indicator */}
                {isRecording && (
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-3">
                        {interimTranscript && (
                            <div className="bg-white/80 backdrop-blur-md border border-slate-200 px-6 py-3 rounded-2xl shadow-2xl max-w-lg text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <p className="text-slate-600 font-serif italic line-clamp-2">
                                    "{interimTranscript}..."
                                </p>
                            </div>
                        )}
                        <div className="bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 animate-pulse">
                            <Waves className="w-4 h-4 text-emerald-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Dictation Active</span>
                        </div>
                    </div>
                )}
            </div>

            {isProjectEmpty && (
                <div className="mt-12 p-8 rounded-3xl bg-amber-50/50 border border-amber-100 border-dashed text-center">
                    <p className="text-amber-700 font-serif italic text-lg mb-2">Your journey begins with a single word.</p>
                    <p className="text-amber-600/60 text-sm">Use the AI Helper on the right if you need a spark of inspiration.</p>
                </div>
            )}

            {/* Trash Overlay */}
            {isDeleted && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-[#fbf9f5]/60 backdrop-blur-[2px] animate-in fade-in duration-500">
                    <div className="max-w-md w-full bg-white rounded-[2rem] p-10 shadow-2xl shadow-stone-200/50 border border-slate-100 flex flex-col items-center text-center space-y-6">
                        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center rotate-3 ring-1 ring-amber-100/50">
                            <Trash2 className="w-10 h-10 text-amber-500/60" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-serif italic text-slate-800">This {label.toLowerCase()} is in the trash</h3>
                            <p className="text-sm text-slate-500 leading-relaxed font-sans">
                                You can view the content, but editing is disabled while it's in the recovery queue.
                            </p>
                        </div>
                        <div className="pt-4 flex flex-col w-full gap-3 font-sans">
                            <Button 
                                onClick={handleRestore}
                                disabled={isRestoring}
                                className="w-full rounded-2xl bg-[#546354] hover:bg-[#435243] text-white h-12 uppercase tracking-[0.15em] text-[10px] font-bold shadow-lg shadow-stone-200"
                            >
                                {isRestoring ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                                ) : (
                                    <RotateCcw className="w-3.5 h-3.5 mr-2" />
                                )}
                                {isRestoring ? 'Restoring...' : `Restore ${label}`}
                            </Button>
                            <p className="text-[10px] text-slate-300 uppercase tracking-widest font-medium pt-2">
                                Permanently delete in the Recovery Tab
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
})

SceneEditor.displayName = 'SceneEditor'

export default SceneEditor
