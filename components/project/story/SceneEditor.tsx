'use client'

import { useState, useCallback, useEffect, useImperativeHandle, forwardRef, useRef, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import Underline from '@tiptap/extension-underline'
import { 
    ScreenplaySceneHeading, 
    ScreenplayAction, 
    ScreenplayCharacter, 
    ScreenplayParenthetical, 
    ScreenplayDialogue, 
    ScreenplayTransition 
} from '@/lib/tiptap/screenplay'
import { StoryImage } from '@/lib/tiptap/story-image'
import { ScreenplayKeyboard } from '@/lib/tiptap/screenplay-keyboard'
import { createClient } from '@/lib/supabase/client'
import type { Database, WritingMode } from '@/lib/supabase/types'
import { cn, getUserColor } from '@/lib/utils'
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
    MessageSquarePlus,
    MessageCircle,
    ArrowRight,
    Type as TypeIcon,
    Clock,
    Image as ImageIcon
} from 'lucide-react'
import { restoreStructureNode, captureSceneVersion } from '@/lib/supabase/recovery'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import EditorAssetSelector from './EditorAssetSelector'

import { useProjectActions } from '@/components/project/ProjectContext'
import { useComments } from '@/components/project/CommentsContext'
import { CommentMark } from '@/lib/tiptap/comment-mark'
import { usePresence } from '@/components/project/PresenceContext'

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
    insertContent: (content: any) => void
}

const ToolbarButton = ({ 
    onClick, 
    active, 
    icon: Icon, 
    tooltip,
    disabled 
}: { 
    onClick: (e: React.MouseEvent) => void, 
    active?: boolean, 
    icon: any, 
    tooltip: string,
    disabled?: boolean 
}) => (
    <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onClick(e)
        }}
        className={cn(
            "p-1.5 sm:p-2 rounded-lg transition-all duration-200 shrink-0",
            active 
                ? "bg-slate-800 text-white shadow-md scale-105" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        )}
        title={tooltip}
    >
        <Icon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
    </button>
)

// Helper to get clean text for AI context, representing custom nodes as placeholders
function getSceneTextForAi(json: any): string {
    if (!json || !json.content) return ''
    
    return json.content.map((node: any) => {
        const getText = (content?: any[]) => {
            if (!content) return ''
            return content.map((c: any) => c.text || '').join('')
        }

        switch (node.type) {
            case 'storyImage':
                const alt = node.attrs?.alt || 'Illustration'
                const caption = getText(node.content)
                return `[Illustration: ${alt}${caption ? ` - Caption: ${caption}` : ''}]`
            
            case 'screenplaySceneHeading':
                return `SCENE HEADING: ${getText(node.content).toUpperCase()}`
            case 'screenplayCharacter':
                return `CHARACTER: ${getText(node.content).toUpperCase()}`
            case 'screenplayDialogue':
                return `DIALOGUE: ${getText(node.content)}`
            case 'screenplayAction':
                return `ACTION: ${getText(node.content)}`
            case 'screenplayTransition':
                return `TRANSITION: ${getText(node.content).toUpperCase()}`
                
            default:
                if (node.content) {
                    return node.content.map((c: any) => c.text || '').join('')
                }
                return ''
        }
    }).filter((s: string) => s.length > 0).join('\n\n')
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
    const router = useRouter()
    const [title, setTitle] = useState(initialTitle)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [isRestoring, setIsRestoring] = useState(false)

    const [isMounted, setIsMounted] = useState(false)
    const [showViewSettings, setShowViewSettings] = useState(false)
    const [interimTranscript, setInterimTranscript] = useState('')
    const [isDirty, setIsDirty] = useState(false)
    const [isAssetSelectorOpen, setIsAssetSelectorOpen] = useState(false)

    // Versioning & Conflict State
    const [localVersion, setLocalVersion] = useState<number>(scene.version || 1)
    const [showConflictModal, setShowConflictModal] = useState(false)
    const [showUpdateBanner, setShowUpdateBanner] = useState(false)
    const [remoteVersion, setRemoteVersion] = useState<number>(scene.version || 1)
    const [lastEditorName, setLastEditorName] = useState<string | null>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUserId(data.user?.id || null)
        })
    }, [])


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
        textAlign: 'left',
        fontFamily: 'Newsreader'
    })


    useEffect(() => {
        setIsMounted(true)
        const saved = localStorage.getItem('storyline_editor_prefs')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setViewSettings(prev => ({ ...prev, ...parsed }))
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
                heading: { levels: [1, 2] },
                bulletList: { keepMarks: true },
                orderedList: { keepMarks: true }
            }),
            Highlight.configure({ multicolor: true }),
            Placeholder.configure({
                placeholder: writingMode === 'screenplay' ? 'Start your script...' : 'Once upon a time...',
            }),
            BubbleMenuExtension.configure({
                element: null, 
            }),
            CommentMark.extend({
                addAttributes() {
                    return {
                        ...this.parent?.(),
                        onClick: {
                            default: null,
                        }
                    }
                }
            }),
            StoryImage
        ]

        const isScriptProject = projectType === 'tv_script' || projectType === 'feature_film';

        if (writingMode === 'screenplay' || isScriptProject) {
            base.push(
                ScreenplaySceneHeading,
                ScreenplayAction,
                ScreenplayCharacter,
                ScreenplayParenthetical,
                ScreenplayDialogue,
                ScreenplayTransition
            )
        }

        if (writingMode === 'screenplay') {
            base.push(ScreenplayKeyboard)
        }

        return base
    }, [writingMode, projectType, aiSettings])

    const { sidebarOpen, setSidebarOpen, aiPanelOpen, setAiPanelOpen, sceneAssetsOpen, setSceneAssetsOpen, currentSceneText, setCurrentSceneText, role } = useProjectActions()
    const { 
        setCommentsPanelOpen, 
        addComment, 
        activeCommentId, 
        setActiveCommentId,
        comments,
        isLoading,
        scrollTrigger
    } = useComments()
    const { activeSceneUsers, setMyStatus } = usePresence()
    
    const isReadOnly = role === 'viewer'

    const editor = useEditor({
        immediatelyRender: false,
        extensions,
        content: scene.content || '',
        editable: !isReadOnly,
        onCreate: ({ editor }) => {
            onTextChange?.(getSceneTextForAi(editor.getJSON()))
        },
        onUpdate: ({ editor, transaction }) => {
            onTextChange?.(getSceneTextForAi(editor.getJSON()))
            
            // Only trigger autosave if it's a user change
            const isInternal = transaction.getMeta('isInternal')
            if (!isInternal && transaction.docChanged) {
                setSaveStatus('idle') 
                setIsDirty(true)
            }
            
            setMyStatus('editing')
        },
        editorProps: {
            attributes: {
                class: cn(
                    'max-w-none focus:outline-none min-h-[500px]',
                    writingMode === 'screenplay' 
                        ? 'screenplay-mode font-mono' 
                        : 'prose prose-slate editor-novel-overrides'
                ),
            },
            handleClick: (view, pos, event) => {
                const { state } = view
                console.log('Editor click at pos:', pos, 'Writing mode:', writingMode, 'Project type:', projectType)
                if (!state?.doc?.resolve) return false
                const mark = state.doc.resolve(pos).marks().find(m => m.type.name === 'comment')
                if (mark) {
                    const commentId = mark.attrs.commentId
                    setActiveCommentId(commentId)
                    setCommentsPanelOpen(true)
                    return true
                }
                setActiveCommentId(null)
                return false
            },
            transformPasted: (slice) => {
                // Strip comment marks from pasted content
                slice.content.descendants(node => {
                    if (node.marks) {
                        ;(node as any).marks = node.marks.filter((m: any) => m.type.name !== 'comment')
                    }
                })
                return slice
            }
        }
    }, [writingMode, scene.id])

    console.log('SceneEditor Render:', { writingMode, fontFamily: viewSettings.fontFamily, editorReady: !!editor })

    // Revert to viewing after 2s of inactivity
    useEffect(() => {
        const timer = setTimeout(() => {
            setMyStatus('viewing')
        }, 2000)
        return () => clearTimeout(timer)
    }, [currentSceneText, setMyStatus])
    
    // Scan for detached comments
    useEffect(() => {
        if (!editor || isLoading) return
        
        const editorCommentIds = new Set<string>()
        editor.state.doc.descendants((node) => {
            if (node.marks) {
                node.marks.forEach(mark => {
                    if (mark.type.name === 'comment') {
                        editorCommentIds.add(mark.attrs.commentId)
                    }
                })
            }
        })
        
        const nodeComments = comments.filter(c => c.node_id === scene.node_id && c.anchor_data?.type === 'inline' && !c.parent_id)
        const detached = nodeComments.filter(c => !editorCommentIds.has(c.id))
        
        if (detached.length > 0) {
            console.log('Detached comments found in this scene:', detached.map(d => d.id))
            // In a future phase, we could show a "Restore Highlights" UI
        }
    }, [editor, comments, scene.node_id, isLoading])

    // Realtime Highlight Cleanup: Remove marks if the comment no longer exists globally
    useEffect(() => {
        if (!editor || isLoading) return

        // Get all comment IDs in doc
        const editorCommentIds = new Set<string>()
        editor.state.doc.descendants((node) => {
            if (node.marks) {
                node.marks.forEach(mark => {
                    if (mark.type.name === 'comment') {
                        editorCommentIds.add(mark.attrs.commentId)
                    }
                })
            }
        })

        // Find which ones are missing from the global list
        const missingIds = Array.from(editorCommentIds).filter(id => 
            !id.startsWith('pending-') && 
            !comments.some(c => c.id === id)
        )

        if (missingIds.length > 0) {
            // Remove marks for missing comments
            editor.commands.command(({ tr, dispatch }) => {
                if (dispatch) {
                    tr.setMeta('isInternal', true)
                    missingIds.forEach(id => {
                        editor.state.doc.descendants((node, pos) => {
                             if (node.marks?.some(m => m.type.name === 'comment' && m.attrs.commentId === id)) {
                                tr.removeMark(pos, pos + node.nodeSize, editor.schema.marks.comment)
                             }
                        })
                    })
                }
                return true
            })
        }
    }, [comments, editor, isLoading])

    const saveContent = useCallback(async () => {
        if (!editor || isReadOnly) return
        
        // Phase 0: Only save if there are actual changes to prevent auto-converting legacy HTML on load
        const currentTitle = title
        const newContent = editor.getJSON()
        
        const isTitleChanged = currentTitle !== initialTitle
        
        // Deep compare JSON content with stored content
        const storedContentStr = typeof scene.content === 'string' ? scene.content : JSON.stringify(scene.content)
        const newContentStr = JSON.stringify(newContent)
        const isContentChanged = newContentStr !== storedContentStr

        if (!isDirty && !isTitleChanged) {
            return
        }

        if (!isTitleChanged && !isContentChanged) {
            return
        }

        setSaveStatus('saving')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        // 1. Update scene content with version check
        const { error: sceneError, count } = await (supabase
            .from('scenes') as any)
            .update({ 
                content: newContent,
                version: localVersion + 1,
                last_editor_id: user?.id,
                updated_at: new Date().toISOString() 
            }, { count: 'exact' })
            .eq('id', scene.id)
            .eq('version', localVersion)

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

        if (count === 0 && !sceneError) {
            console.warn('Conflict detected: local version', localVersion, 'Remote is likely newer.')
            setSaveStatus('error')
            setShowConflictModal(true)
            return
        }

        if (sceneError || nodeErrorResult) {
            console.error('Save error (scene/node):', sceneError || nodeErrorResult)
            setSaveStatus('error')
        } else {
            setSaveStatus('saved')
            setIsDirty(false)
            setLastEditorName('you')
            // Use the version we just successfully saved to
            const savedVersion = localVersion + 1
            setLocalVersion(v => Math.max(v, savedVersion))
            setShowUpdateBanner(false)
            if (currentTitle !== initialTitle) onTitleUpdate?.(currentTitle)
            
            const updatedScene = { 
                ...scene, 
                title: currentTitle, 
                content: newContent, 
                version: localVersion + 1,
                last_editor_id: user?.id 
            }
            if (editor) {
                (editor as any)._lastContent = newContent
            }
            onUpdate(updatedScene)
        }
    }, [scene, title, initialTitle, editor, onUpdate, onTitleUpdate, localVersion, isDirty])

    const lastScrollTrigger = useRef(scrollTrigger)

    // Sync active comment from sidebar to editor
    useEffect(() => {
        if (!editor || !activeCommentId) return

        const shouldScroll = scrollTrigger !== lastScrollTrigger.current
        lastScrollTrigger.current = scrollTrigger

        if (!shouldScroll) return

        const { state, view } = editor
        let foundPos = -1
        
        state.doc.descendants((node, pos) => {
            if (node.marks) {
                const mark = node.marks.find(m => m.type.name === 'comment' && m.attrs.commentId === activeCommentId)
                if (mark) {
                    foundPos = pos
                    return false
                }
            }
        })

        if (foundPos !== -1) {
            // Highlight precisely? For now just scroll
            const element = view.domAtPos(foundPos).node as HTMLElement
            if (element instanceof HTMLElement) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
        }
    }, [activeCommentId, editor, scrollTrigger])

    // Sync individual comment status (resolved/open) to marks
    useEffect(() => {
        if (!editor) return
        
        let transaction = editor.state.tr
        let changed = false

        editor.state.doc.descendants((node, pos) => {
            if (node.marks) {
                const commentMark = node.marks.find(m => m.type.name === 'comment')
                if (commentMark) {
                    const dbComment = comments.find(c => c.id === commentMark.attrs.commentId)
                    if (dbComment && dbComment.status !== commentMark.attrs.status) {
                        transaction = transaction.removeMark(pos, pos + node.nodeSize, commentMark.type)
                        transaction = transaction.addMark(pos, pos + node.nodeSize, commentMark.type.create({
                            ...commentMark.attrs,
                            status: dbComment.status
                        }))
                        changed = true
                    }
                }
            }
        })

        if (changed) {
            transaction.setMeta('isInternal', true)
            editor.view.dispatch(transaction)
        }
    }, [comments, editor])

    async function handleAddInlineComment() {
        if (!editor) return
        
        // 1. Give immediate feedback by opening the panel
        setCommentsPanelOpen(true)
        
        const { from, to } = editor.state.selection
        const text = editor.state.doc.textBetween(from, to)
        
        if (!text.trim()) return

        // 2. Apply pending mark
        const tempId = 'pending-' + Math.random().toString(36).substr(2, 9)
        editor.chain().focus().setComment(tempId).run()

        try {
            // 2. Create in DB
            const newComment = await addComment({
                project_id: scene.project_id,
                node_id: scene.node_id,
                content: 'Add your feedback...', // Initial placeholder
                anchor_data: {
                    type: 'inline',
                    text,
                    from,
                    to,
                }
            })

            // 3. Replace pending ID with real ID
            editor.view.state.doc.descendants((node, pos) => {
                if (node.marks) {
                    const mark = node.marks.find(m => m.type.name === 'comment' && m.attrs.commentId === tempId)
                    if (mark) {
                        // We need a transaction to replace the mark
                        editor.chain().setTextSelection({ from: pos, to: pos + node.nodeSize }).unsetComment().setComment(newComment!.id).run()
                    }
                }
            })

            setActiveCommentId(newComment!.id)
        } catch (err) {
            console.error('Failed to create inline comment:', err)
            editor.chain().focus().unsetComment().run()
        }
    }

    // Effect for autosave
    useEffect(() => {
        if (saveStatus !== 'idle' || !isDirty) return
        const timeout = setTimeout(saveContent, 1500)
        return () => clearTimeout(timeout)
    }, [title, isDirty, saveStatus, saveContent])

    // Keep editor in sync when scene changes (ID or content)
    useEffect(() => {
        if (!editor) return

        const isDifferentScene = scene.id !== (editor as any)._lastSceneId
        const currentHTML = editor.getHTML()
        // Structurally check if the content from parent is actually different from what we have/saved
        const isContentDifferent = scene.content !== (editor as any)._lastContent && scene.content !== currentHTML

        if (isDifferentScene) {
            editor.commands.setContent(scene.content || '')
            ;(editor as any)._lastSceneId = scene.id
            ;(editor as any)._lastContent = scene.content
            setLocalVersion(scene.version || 1)
            setShowConflictModal(false)
            setShowUpdateBanner(false)
            setIsDirty(false)
        } else {
            // Same scene, check version
            if (scene.version > localVersion) {
                // If it caught up to exactly what we were trying to save, or we are idle, just sync
                if (scene.version === localVersion + 1 && saveStatus === 'saving') {
                    // This was likely our own save arriving via realtime
                    setLocalVersion(v => Math.max(v, scene.version))
                } else if (!editor.isFocused || scene.version > localVersion + 1) {
                    setShowUpdateBanner(true)
                    setRemoteVersion(scene.version)
                }
            } else if (scene.version === localVersion && showConflictModal) {
                // The DB caught up to our local version state, we can resolve the conflict modal!
                setShowConflictModal(false)
                setSaveStatus('idle')
            }
        }
    }, [scene.id, scene.content, scene.version, editor, localVersion, showConflictModal, saveStatus])

    // Fetch last editor name
    useEffect(() => {
        // If we just saved locally, we might already have set it to 'you'
        // But we still want to sync if it's someone else
        if (!scene.last_editor_id) {
            setLastEditorName(null)
            return
        }

        if (currentUserId && scene.last_editor_id === currentUserId) {
            setLastEditorName('you')
            return
        }

        let isMounted = true
        async function fetchLastEditor() {
            try {
                const supabase = createClient()
                // Use the RPC if available (like for comments) or fetch from project_members
                // Since project_members doesn't have email, we look it up in public.project_members joined with a secure view
                // For now, let's try a direct member fetch - if we want emails of others, we need a secure DEFINER RPC
                const { data, error } = await (supabase as any).rpc('get_project_member_email', { 
                    p_project_id: scene.project_id,
                    p_user_id: scene.last_editor_id
                })
                
                if (isMounted) {
                    if (data) setLastEditorName(data)
                    else setLastEditorName('a collaborator')
                }
            } catch (e) {
                if (isMounted) setLastEditorName('a collaborator')
            }
        }
        
        fetchLastEditor()
        return () => { isMounted = false }
    }, [scene.last_editor_id, currentUserId, scene.project_id])
    useImperativeHandle(ref, () => ({
        getText: () => editor?.getText() || '',
        getSelectionText: () => {
            if (!editor) return ''
            const { from, to } = editor.state.selection
            return editor.state.doc.textBetween(from, to, ' ')
        },
        insertContent: (content: any) => {
            if (!editor) return
            editor.commands.insertContent(content)
        }
    }), [editor])

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

    // Sync editor settings without re-mounting
    useEffect(() => {
        if (!editor) return
        editor.setEditable(!isReadOnly)
    }, [editor, isReadOnly])

    return (
        <div className={cn(
            'min-h-full pb-32 md:pb-80 transition-all duration-700 ease-in-out relative',
            writingMode === 'screenplay' ? 'bg-[#f0f0ed] py-10 px-4 sm:px-8' : 'px-4 sm:px-12 md:px-24 max-w-6xl mx-auto pt-4'
        )}>
            {/* Realtime Conflict / Update Banners */}
            {showUpdateBanner && !showConflictModal && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-white border-2 border-primary/20 shadow-2xl rounded-2xl px-6 py-3 flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <RotateCcw className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900">Scene updated elsewhere</span>
                            <span className="text-[10px] text-slate-500 font-medium">Someone else saved a new version (v{remoteVersion})</span>
                        </div>
                        <Button 
                            variant="default" 
                            size="sm" 
                            className="rounded-xl h-8 text-[11px] font-bold uppercase tracking-widest"
                            onClick={() => {
                                editor?.commands.setContent(scene.content || '')
                                setLocalVersion(scene.version)
                                setShowUpdateBanner(false)
                            }}
                        >
                            Load Latest
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="rounded-xl h-8 text-[10px] text-slate-400"
                            onClick={() => setShowUpdateBanner(false)}
                        >
                            Ignore
                        </Button>
                    </div>
                </div>
            )}

            {showConflictModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl border border-white/50 text-center space-y-8">
                        <div className="w-24 h-24 bg-amber-50 rounded-[2.2rem] flex items-center justify-center text-amber-500 mx-auto shadow-inner">
                            <RotateCcw className="w-12 h-12" />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-3xl font-serif font-bold text-slate-900">Collaboration Conflict</h2>
                            <p className="text-base text-slate-500 font-sans leading-relaxed tracking-tight">
                                Another collaborator has saved changes to this scene since you started. How would you like to handle this overlap?
                            </p>
                        </div>
                        <div className="grid gap-4 pt-4">
                            <div className="relative group">
                                <Button 
                                    className="w-full h-16 rounded-3xl text-lg font-bold bg-[#546354] hover:bg-[#435043] shadow-lg shadow-[#546354]/10 transition-all hover:-translate-y-0.5"
                                    onClick={() => {
                                        editor?.commands.setContent(scene.content || '')
                                        setLocalVersion(scene.version)
                                        setShowConflictModal(false)
                                        setSaveStatus('idle')
                                    }}
                                >
                                    <RotateCcw className="w-5 h-5 mr-3" />
                                    Reload Latest (Safe)
                                </Button>
                                <p className="text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-widest text-center">Replaces your local changes with the current server version</p>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <Button 
                                    variant="outline"
                                    className="w-full h-14 rounded-2xl text-sm font-bold border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all"
                                    onClick={async () => {
                                        setLocalVersion(scene.version)
                                        setShowConflictModal(false)
                                        setSaveStatus('idle')
                                    }}
                                >
                                    Force Overwrite
                                </Button>
                                <p className="text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-widest text-center">Keeping your local work and overwriting remote changes</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Header info bar */}
            <div className="flex flex-col mb-10">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 font-sans">
                            {writingMode === 'screenplay' ? 'Script' : 'Draft'} — {label}
                        </span>
                        {activeSceneUsers.length > 0 && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300 ml-4">
                                <div className="flex items-center -space-x-1.5">
                                    {activeSceneUsers.map(u => {
                                        const userColor = getUserColor(u.email)
                                        return (
                                            <div 
                                                key={u.user_id} 
                                                className={cn(
                                                    "w-5 h-5 rounded-full border border-white flex items-center justify-center text-[8px] font-bold shadow-sm",
                                                    userColor
                                                )}
                                                title={u.email}
                                            >
                                                {u.email[0].toUpperCase()}
                                            </div>
                                        )
                                    })}
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    {activeSceneUsers.length === 1 
                                        ? `${activeSceneUsers[0].email} is ${activeSceneUsers[0].status === 'editing' ? 'writing' : 'reading'}` 
                                        : `${activeSceneUsers.length} others reading`}
                                </span>
                            </div>
                        )}
                    </div>
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
                        
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setCommentsPanelOpen(true)}
                            className="h-6 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary hover:bg-white transition-all"
                        >
                            <MessageSquare className="w-3 h-3 mr-1" />
                             Feedback
                        </Button>
                        
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSceneAssetsOpen(!sceneAssetsOpen)}
                            className={cn(
                                "h-6 px-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                                sceneAssetsOpen ? "text-emerald-500 bg-white" : "text-slate-400 hover:text-emerald-600 hover:bg-white"
                            )}
                        >
                            <ImageIcon className="w-3 h-3 mr-1" />
                             Gallery
                        </Button>

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
                                                {/* Font Choice */}
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 block">Typography</label>
                                                    <div className="grid grid-cols-2 bg-slate-50 p-1 rounded-xl gap-1">
                                                        {[
                                                            { id: 'Newsreader', label: 'Newsreader', serif: true },
                                                            { id: 'Lora', label: 'Lora', serif: true },
                                                            { id: 'Inter', label: 'Inter', serif: false },
                                                            { id: 'Atkinson Hyperlegible', label: 'Atkinson', serif: false }
                                                        ].map((font) => (
                                                            <button
                                                                key={font.id}
                                                                onClick={() => updateViewSetting('fontFamily', font.id)}
                                                                className={cn(
                                                                    "py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all text-center",
                                                                    viewSettings.fontFamily === font.id 
                                                                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
                                                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
                                                                )}
                                                                style={{ fontFamily: font.id }}
                                                            >
                                                                {font.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

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
                {lastEditorName && (
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider animate-in fade-in duration-500">
                        <Clock className="w-3 h-3" />
                        <span>Last edited by {lastEditorName}</span>
                    </div>
                )}
            </div>

            <div 
                style={isMounted && writingMode === 'simple' ? {
                    '--editor-font': `'${viewSettings.fontFamily}', serif`,
                    '--editor-font-size': viewSettings.fontSize,
                    '--editor-line-height': viewSettings.lineHeight,
                    '--editor-max-width': viewSettings.maxWidth,
                    '--editor-text-align': viewSettings.textAlign,
                    maxWidth: viewSettings.maxWidth,
                    textAlign: viewSettings.textAlign as any,
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
                        className="flex items-center gap-0.5 bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-xl p-1 animate-in fade-in zoom-in duration-200 z-[100] max-w-[calc(100vw-2rem)] overflow-x-auto no-scrollbar scroll-smooth cursor-default"
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
                                
                                <div className="w-px h-4 bg-slate-200 mx-1" />

                                <ToolbarButton
                                    onClick={handleAddInlineComment}
                                    active={false}
                                    icon={MessageSquarePlus}
                                    tooltip="Add Feedback"
                                />
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().setNode('screenplayDialogue').run()}
                                    active={editor.isActive('screenplayDialogue')}
                                    icon={MessageCircle}
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

                                <div className="w-px h-4 bg-slate-200 mx-1" />

                                <ToolbarButton
                                    onClick={handleAddInlineComment}
                                    active={false}
                                    icon={MessageSquarePlus}
                                    tooltip="Add Feedback"
                                />
                                <div className="w-px h-4 bg-slate-200 mx-1" />
                                <ToolbarButton
                                    onClick={() => setIsAssetSelectorOpen(true)}
                                    active={false}
                                    icon={ImageIcon}
                                    tooltip="Insert Illustration"
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

            <EditorAssetSelector
                projectId={scene.project_id}
                isOpen={isAssetSelectorOpen}
                onClose={() => setIsAssetSelectorOpen(false)}
                onSelect={(asset) => {
                    editor?.chain().focus().setImage({
                        assetId: asset.id,
                        src: asset.url,
                        alt: asset.alt,
                    }).run()
                }}
            />
        </div>
    )
})

SceneEditor.displayName = 'SceneEditor'

export default SceneEditor
