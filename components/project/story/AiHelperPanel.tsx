'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { getProjectTypeLabel } from '@/lib/constants'
import { useCompletion } from '@ai-sdk/react'
import Link from 'next/link'
import { Sparkles, Send, Loader2, Plus, MessageSquare, AlertCircle, RefreshCcw, Copy, X, Check, ChevronDown, ChevronUp, Info, Settings, Package, Bookmark, Database, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import SaveAiResponseModal from '@/components/project/ai/SaveAiResponseModal'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useProjectActions } from '@/components/project/ProjectContext'
import { analyzeContextSize, ContextSizingResult, SAFEGUARD_THRESHOLDS } from '@/lib/ai/config'
import { AiSafeguardDialogs } from '@/components/project/ai/AiSafeguardDialogs'
import { HelpCircle } from 'lucide-react'
import AiPartnerTour from './AiPartnerTour'

interface AiHelperPanelProps {
    projectId: string
    sceneText: string
    linkedCharacters?: any[]
    linkedIdeas?: any[]
    linkedLocations?: any[]
    linkedObjects?: any[]
    projectRelationships?: any[]
    selectedNodes?: any[]
    allNodes?: any[]
    allScenes?: any[]
    onClearSelection?: () => void
    onInsert: (content: any) => void
    activeNodeId?: string | null
    activeSceneId?: string | null
    projectType?: 'tv_script' | 'novel'
    projectPremise?: string | null
    projectTone?: string | null
    isFullCanvas?: boolean
    aiSettings: {
        ai_enabled: boolean
        ai_provider: string
        ai_fallback_enabled: boolean
        ollama_model: string
        ollama_url: string
        api_key: string | null
    }
}

function extractTextFromJson(content: any): string {
    if (typeof content === 'string') return content
    if (!content) return ''
    if (content.content && Array.isArray(content.content)) {
        return content.content.map((c: any) => extractTextFromJson(c)).join('\n')
    }
    if (content.type === 'storyImage') {
        const alt = content.attrs?.alt || 'Illustration'
        let caption = ''
        if (content.content && Array.isArray(content.content)) {
            caption = content.content.map((c: any) => extractTextFromJson(c)).join(' ')
        }
        return `[Illustration: ${alt}${caption ? ` - Caption: ${caption}` : ''}]`
    }
    if (content.type === 'text') return content.text || ''
    if (Array.isArray(content)) {
        return content.map((c: any) => extractTextFromJson(c)).join(' ')
    }
    return ''
}

/**
 * Attempts to salvage truncated JSON by force-closing brackets
 */
function attemptJsonRepair(str: string): any {
    try {
        return JSON.parse(str);
    } catch (e) {
        // Try adding a closing bracket
        try {
            return JSON.parse(str.trim() + ']');
        } catch (e2) {
            // Try finding the last valid object and closing the array there
            const lastObjectEnd = str.lastIndexOf('}');
            if (lastObjectEnd !== -1) {
                try {
                    return JSON.parse(str.substring(0, lastObjectEnd + 1) + ']');
                } catch (e3) {
                    // One last ditch effort: regex for objects
                    const matches = str.match(/\{\s*"type":\s*"[^"]*",\s*"text":\s*"[^"]*"\s*\}/g);
                    if (matches) {
                        try {
                            return JSON.parse(`[${matches.join(',')}]`);
                        } catch (e4) {
                            return null;
                        }
                    }
                }
            }
            return null;
        }
    }
}

function getDescendantScenes(nodeId: string, allNodes: any[], allScenes: any[]): any[] {
    const node = allNodes.find(n => n.id === nodeId)
    if (!node) return []
    if (node.type === 'scene') {
        const scene = allScenes.find(s => s.node_id === nodeId)
        return scene ? [scene] : []
    }
    const children = allNodes.filter(n => n.parent_id === nodeId)
    return children.flatMap(c => getDescendantScenes(c.id, allNodes, allScenes))
}

const EMPTY_HINTS = [
    'What could happen next in this scene?',
    'How should this scene end?',
    'What detail would make this scene more vivid?',
    'What is my character feeling right now?',
]

const MAX_SCENE_CHARS_FULL = 45000
const MAX_SCENE_CHARS_TAIL = 10000

type ContextStrategy = 'continuation' | 'full-scene'

function getContextStrategy(mode: string): ContextStrategy {
    if (mode === 'Continue Writing') return 'continuation'
    return 'full-scene' // Includes Improve, Conflict, Emotion, Script, and Review/Chat
}

function buildContextText(text: string, strategy: ContextStrategy): string {
    if (strategy === 'continuation') {
        return text.slice(-MAX_SCENE_CHARS_TAIL)
    }
    // Q&A / Review / Improve: Take as much as possible from the start
    return text.slice(0, MAX_SCENE_CHARS_FULL)
}

const MODE_EXPLANATIONS: Record<string, string> = {
    'Continue Writing': 'Seamlessly continues the scene based on your prompt.',
    'Improve Scene': 'Refines the clarity, flow, and overall prose quality.',
    'Add Conflict': 'Introduces new tension, higher stakes, or drama.',
    'Rewrite with Emotion': 'Deepens emotional resonance and character expressions.',
    'Write as Script Scene': 'Generates a new scene in structured screenplay format.',
    'Review / Chat': 'Ask questions about your story elements or critique your work.'
}

const PROMPT_TEMPLATES = [
    { label: 'What happens next?', value: 'What could happen next in this scene?' },
    { label: 'More tense', value: 'Rewrite this scene to feel more tense and urgent.' },
    { label: 'More natural', value: 'How could I rewrite this to sound more natural?' },
    { label: 'Dialogue idea', value: 'Write a short dialogue exchange that could fit here.' },
    { label: 'How to end it?', value: 'How could I end this scene effectively?' },
]

export default function AiHelperPanel({
    projectId, sceneText, onInsert, linkedCharacters = [], linkedIdeas = [], linkedLocations = [], linkedObjects = [],
    projectRelationships = [],
    selectedNodes = [], allNodes = [], allScenes = [], onClearSelection, aiSettings, projectType,
    projectPremise, projectTone,
    activeNodeId, activeSceneId,
    isFullCanvas = false
}: AiHelperPanelProps) {
    const label = getProjectTypeLabel(projectType)
    const isNovel = projectType === 'novel'

    const { role } = useProjectActions()
    const isReadOnly = role === 'viewer'

    const [prompt, setPrompt] = useState('')
    const [lastPrompt, setLastPrompt] = useState('')
    const [copied, setCopied] = useState(false)
    // Holds the previous response while a new one is loading — avoids blank flash
    const [previousCompletion, setPreviousCompletion] = useState('')
    const [previewOpen, setPreviewOpen] = useState(false)
    const [promptsOpen, setPromptsOpen] = useState(false)
    const [promptMode, setPromptMode] = useState('Review / Chat')
    const [isOllamaLoading, setIsOllamaLoading] = useState(false)
    const [ollamaStatus, setOllamaStatus] = useState<'online' | 'offline' | 'checking'>('online')
    const [geminiStatus, setGeminiStatus] = useState<'online' | 'offline' | 'checking'>('online')
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
    const [lastUsedProvider, setLastUsedProvider] = useState<'gemini' | 'ollama' | null>(null)
    const [contextWarning, setContextWarning] = useState<string | null>(null)
    
    // Safeguard States
    const [preflight, setPreflight] = useState<ContextSizingResult | null>(null)
    const [isConfirmingCost, setIsConfirmingCost] = useState(false)
    const [isExtremeContext, setIsExtremeContext] = useState(false)
    const [pendingRequest, setPendingRequest] = useState<{
        finalPrompt: string,
        contextText: string,
        strategy: ContextStrategy
    } | null>(null)

    // Phase 5 AI Reuse Context
    const [includeArchiveContext, setIncludeArchiveContext] = useState(false)
    const [archiveResponses, setArchiveResponses] = useState<any[]>([])
    const [selectedArchiveIds, setSelectedArchiveIds] = useState<string[]>([])
    const [isLoadingArchive, setIsLoadingArchive] = useState(false)

    const supabase = createClient()
    const [saveModalOpen, setSaveModalOpen] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [tourOpen, setTourOpen] = useState(false)

    // Trigger tour on first use
    useEffect(() => {
        const hasSeenTour = localStorage.getItem('storyline-ai-tour-complete') === 'true'
        if (!hasSeenTour) {
            const timer = setTimeout(() => setTourOpen(true), 800)
            return () => clearTimeout(timer)
        }
    }, [])

    // Snapshot scene text at submit time so the hook body stays stable during streaming
    // Fetch archive context when enabled
    useEffect(() => {
        async function loadArchive() {
            if (!includeArchiveContext) {
                setArchiveResponses([])
                setSelectedArchiveIds([]) // Clear selection when disabled for safety
                return
            }
            try {
                setIsLoadingArchive(true)
                const { data, error } = await (supabase
                    .from('ai_responses' as any) as any)
                    .select('id, title, response, type, source_label')
                    .eq('project_id', projectId)
                    .neq('type', 'analysis') // Don't allow linking analysis results
                    .order('created_at', { ascending: false })
                    .limit(8)
                
                if (error) throw error
                if (data) setArchiveResponses(data)
            } catch (err: any) {
                console.error('Error loading archive context:', err.message)
            } finally {
                setIsLoadingArchive(false)
            }
        }
        loadArchive()
    }, [includeArchiveContext, projectId, supabase])

    const archiveContextString = useMemo(() => {
        if (!includeArchiveContext || selectedArchiveIds.length === 0) return ''
        const selectedIndices = archiveResponses.filter(r => selectedArchiveIds.includes(r.id))
        return selectedIndices.map(r => 
            `=== Saved Response: ${r.title} ===\nType: ${r.type}\nSource: ${r.source_label}\n\n${r.response}`
        ).join('\n\n')
    }, [includeArchiveContext, archiveResponses, selectedArchiveIds])

    const toggleArchiveId = (id: string) => {
        setSelectedArchiveIds(prev => {
            if (prev.includes(id)) return prev.filter(i => i !== id)
            if (prev.length >= 5) return prev // Max 5 limit
            return [...prev, id]
        })
    }

    const sceneTextRef = useRef(sceneText)
    sceneTextRef.current = sceneText

    const storySelectionContext = useMemo(() => {
        if (!selectedNodes?.length || !allNodes?.length || !allScenes?.length) return []
        const sceneIds = new Set<string>()
        const results: { title: string, content: string, node_id: string }[] = []
        
        for (const node of selectedNodes) {
             const scenesInside = getDescendantScenes(node.id, allNodes, allScenes)
             for (const s of scenesInside) {
                  if (!sceneIds.has(s.id)) {
                       sceneIds.add(s.id)
                       const nodeRef = allNodes.find(n => n.id === s.node_id)
                       results.push({
                           title: nodeRef?.title || 'Unknown Scene',
                           content: extractTextFromJson(s.content),
                           node_id: s.node_id
                       })
                  }
             }
        }
        return results
    }, [selectedNodes, allNodes, allScenes])

    const contextSizeChars = useMemo(() => {
        return storySelectionContext.reduce((acc, s) => acc + s.title.length + s.content.length, 0)
    }, [storySelectionContext])

    const isContextTooLarge = contextSizeChars > 30000 // Blocking over 30k chars

    const linkedEntitiesSnapshot = useMemo(() => {
        return {
            characters: linkedCharacters.map(c => ({ id: c.id, name: c.name })),
            ideas: linkedIdeas.map(i => ({ id: i.id, title: i.title })),
            locations: linkedLocations.map(l => ({ id: l.id, name: l.name })),
            objects: linkedObjects.map(o => ({ id: o.id, name: o.name })),
            storyContextNodes: selectedNodes.map(n => ({ id: n.id, title: n.title, type: n.type }))
        }
    }, [linkedCharacters, linkedIdeas, linkedLocations, linkedObjects, selectedNodes])

    const storySelectionLabel = useMemo(() => {
        if (!selectedNodes.length) return ''
        
        const selectedScenes = selectedNodes.filter(n => n.type === 'scene')
        if (selectedScenes.length === 0) {
            // Only folders were selected, no scenes
            const folders = selectedNodes.filter(n => n.type !== 'scene')
            return folders.map(f => f.title).join(', ')
        }

        const parentGroups = new Map<string, any[]>()
        const standaloneScenes = []
        
        for (const scene of selectedScenes) {
            const parentId = scene.parent_id
            if (parentId) {
                if (!parentGroups.has(parentId)) parentGroups.set(parentId, [])
                parentGroups.get(parentId)!.push(scene)
            } else {
                standaloneScenes.push(scene)
            }
        }
        
        const labels: string[] = []
        
        parentGroups.forEach((scenes, parentId) => {
            const parent = allNodes.find(n => n.id === parentId)
            const parentTitle = parent?.title || 'Group'
            
            const totalScenesInParent = allNodes.filter(n => n.type === 'scene' && n.parent_id === parentId).length
            
            if (scenes.length === totalScenesInParent && totalScenesInParent > 0) {
                labels.push(parentTitle)
            } else if (scenes.length === 1) {
                labels.push(`${parentTitle} (${scenes[0].title || 'Scene'})`)
            } else {
                labels.push(`${parentTitle} (${scenes.length} scenes)`)
            }
        })
        
        if (standaloneScenes.length > 0) {
            if (standaloneScenes.length === 1) {
                labels.push(standaloneScenes[0].title || 'Unbound scene')
            } else {
                labels.push(`${standaloneScenes.length} unbound scenes`)
            }
        }
        
        return labels.join(', ')
    }, [selectedNodes, allNodes])

    const charactersLabel = useMemo(() => linkedCharacters.length === 1 ? (linkedCharacters[0].name || 'Character') : `${linkedCharacters.length} Characters`, [linkedCharacters])
    const ideasLabel = useMemo(() => linkedIdeas.length === 1 ? (linkedIdeas[0].title || 'Idea') : `${linkedIdeas.length} Ideas`, [linkedIdeas])
    const locationsLabel = useMemo(() => linkedLocations.length === 1 ? (linkedLocations[0].name || 'Location') : `${linkedLocations.length} Locations`, [linkedLocations])
    const objectsLabel = useMemo(() => linkedObjects.length === 1 ? (linkedObjects[0].name || 'Object') : `${linkedObjects.length} Objects`, [linkedObjects])

    const contextSnapshotString = useMemo(() => {
        const parts = []
        if (projectId) parts.push(`Project: ${projectId}`)
        if (activeNodeId) {
            const node = allNodes.find(n => n.id === activeNodeId)
            if (node) parts.push(`${node.type === 'scene' ? 'Scene' : 'Chapter'}: ${node.title}`)
        }
        if (linkedCharacters.length > 0) parts.push(charactersLabel)
        if (linkedIdeas.length > 0) parts.push(ideasLabel)
        if (linkedLocations.length > 0) parts.push(locationsLabel)
        if (linkedObjects.length > 0) parts.push(objectsLabel)
        if (selectedNodes.length > 0) parts.push(storySelectionLabel)
        return parts.join(' | ')
    }, [projectId, activeNodeId, allNodes, linkedCharacters, linkedIdeas, linkedLocations, linkedObjects, selectedNodes, charactersLabel, ideasLabel, locationsLabel, objectsLabel, storySelectionLabel])

    const sourceLabel = useMemo(() => {
        if (activeNodeId) {
            const node = allNodes.find(n => n.id === activeNodeId)
            if (node) {
                const typeLabel = node.type.charAt(0).toUpperCase() + node.type.slice(1)
                return `${typeLabel}: ${node.title}`
            }
            return isNovel ? 'Chapter: Unknown' : 'Scene: Unknown'
        }
        return 'Project Chat'
    }, [activeNodeId, allNodes, isNovel])

    const { completion, complete, isLoading, error, setCompletion } = useCompletion({
        api: '/api/ai',
        streamProtocol: 'text',
        body: useMemo(() => ({ action: 'helper', projectId }), [projectId]),
        onError: (err) => {
            console.error('AI Error:', err)
        }
    })

    // What to display: live completion takes priority; fall back to previous while loading
    const actualLoading = isLoading || isOllamaLoading
    const displayedCompletion = completion || (actualLoading ? previousCompletion : '')
    const isShowingPrevious = actualLoading && !completion && !!previousCompletion



    const handleInsert = () => {
        console.log('AI Helper: handleInsert called', { promptMode, completionExist: !!displayedCompletion })
        if (promptMode === 'Write as Script Scene') {
            try {
                // 1. Pre-processing: Strip markdown code blocks if present
                let cleanText = displayedCompletion.trim()
                if (cleanText.startsWith('```')) {
                    const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
                    if (match) cleanText = match[1]
                }

                // 2. Parse JSON with salvage logic
                const blocks = attemptJsonRepair(cleanText)
                if (blocks && Array.isArray(blocks)) {
                    console.log('AI Helper: JSON salvaged, mapping to nodes:', blocks.length)
                    // 3. Node mapping
                    const typeMap: Record<string, string> = {
                        'scene-heading': 'screenplaySceneHeading',
                        'action': 'screenplayAction',
                        'character': 'screenplayCharacter',
                        'parenthetical': 'screenplayParenthetical',
                        'dialogue': 'screenplayDialogue',
                        'transition': 'screenplayTransition'
                    }

                    const nodes = blocks.map(block => ({
                        type: typeMap[block.type] || 'screenplayAction',
                        content: block.text ? [{ type: 'text', text: block.text }] : []
                    }))

                    onInsert(nodes)
                    handleClear()
                    return
                }
            } catch (err) {
                console.warn('JSON parsing failed for Script Scene, falling back to text:', err)
                // Fallback to text insertion if JSON is invalid
            }
        }

        console.log('AI Helper: Inserting as plain text/HTML')
        onInsert(displayedCompletion)
        handleClear()
    }

    const handleTemplate = (value: string) => {
        setPrompt(value)
    }

    // --- Provider Orchestration ---
    const runGeminiCloud = async (finalPrompt: string, contextText: string, strategy: ContextStrategy) => {
        setLastUsedProvider('gemini')
        console.log(`--- AI DEBUG: runGeminiCloud [Mode: ${strategy}] ---`)
        console.log('Active Scene ID:', activeSceneId)
        console.log('Scene Text Length (original):', sceneTextRef.current.length)
        console.log('Scene Text Length (sent):', contextText.length)
        console.log('Final Prompt prefix:', finalPrompt.substring(0, 200))
        console.log('Scene Text Preview (sent):', contextText.substring(0, 200))
        
        await complete(finalPrompt, {
            body: {
                action: 'helper',
                projectId,
                sceneId: activeSceneId,
                input: contextText,
                archiveContext: archiveContextString,
                linkedCharacters: linkedCharacters.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    description: c.description,
                    notes: c.notes
                })),
                linkedIdeas: linkedIdeas.map((i: any) => ({
                    id: i.id,
                    title: i.title,
                    content: i.content
                })),
                linkedLocations: linkedLocations.map((l: any) => ({
                    id: l.id,
                    name: l.name,
                    description: l.description,
                    atmosphere: l.atmosphere
                })),
                linkedObjects: linkedObjects.map((o: any) => ({
                    id: o.id,
                    name: o.name,
                    description: o.description,
                    significance: o.significance
                })),
                projectRelationships: projectRelationships.map((r: any) => ({
                    id: r.id,
                    source_id: r.source_id,
                    target_id: r.target_id,
                    relation_label: r.relation_label,
                    is_symmetrical: r.is_symmetrical
                })),
                storyContext: storySelectionContext.map(s => ({
                    title: s.title,
                    content: s.content.slice(0, 10000) // Safety truncation per scene
                }))
            }
        })
    }

    const runLocalOllama = async (finalPrompt: string, contextText: string, strategy: ContextStrategy) => {
        // Build the prompt with context
        const projectContext = `Project: ${projectId}. ${projectPremise ? `Premise: ${projectPremise}. ` : ''}${projectTone ? `Tone: ${projectTone}. ` : ''}`
        const charactersContext = linkedCharacters.length > 0 
            ? `Characters: ${linkedCharacters.map(c => c.name).join(', ')}. ` 
            : ''
        const archiveContext = includeArchiveContext && archiveContextString
            ? `\n\nRELEVANT ARCHIVED RESPONSES:\n${archiveContextString}\n\n`
            : ''
        
        const ideasContext = linkedIdeas.length > 0 
            ? `Ideas: ${linkedIdeas.map(i => i.title).join(', ')}. ` 
            : ''
        const locationsContext = linkedLocations.length > 0 
            ? `Locations: ${linkedLocations.map(l => l.name).join(', ')}. ` 
            : ''
        
        const storyContextString = storySelectionContext.length > 0
            ? `STORY CONTEXT:\n${storySelectionContext.map(s => `[${s.title}]\n${s.content.slice(0, 5000)}`).join('\n\n')}\n\n`
            : ''
        
        const fullInternalPrompt = `${projectContext}${charactersContext}${ideasContext}${locationsContext}\n\n${storyContextString}SCENE:\n${contextText}\n\nUSER REQUEST: ${finalPrompt}`

        console.log(`--- AI DEBUG: runLocalOllama [Mode: ${strategy}] ---`)
        console.log('Active Scene ID:', activeSceneId)
        console.log('Full Prompt Preview (first 500):', fullInternalPrompt.substring(0, 500))
        console.log('Scene Text Sent Length:', contextText.length)

        setIsOllamaLoading(true)
        const abortController = new AbortController()
        
        try {
            const response = await fetch(`${aiSettings.ollama_url.replace(/\/$/, '')}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: aiSettings.ollama_model,
                    prompt: fullInternalPrompt,
                    stream: true
                }),
                signal: abortController.signal
            })

            if (!response.ok || !response.body) {
                setOllamaStatus('offline')
                throw new Error(response.status === 404 ? 'Ollama model not found' : 'Ollama connection failed')
            }

            setOllamaStatus('online')
            setLastUsedProvider('ollama')
            const reader = response.body!.getReader()
            const decoder = new TextDecoder()
            let accumulated = ''
            let buffer = ''

            // Better stream handling for Ollama's NDJSON
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                buffer += chunk
                
                const lines = buffer.split('\n')
                // Keep the last partial line in the buffer
                buffer = lines.pop() || ''
                
                for (const line of lines) {
                    if (!line.trim()) continue
                    try {
                        const json = JSON.parse(line)
                        if (json.response) {
                            accumulated += json.response
                            setCompletion(accumulated)
                        }
                    } catch (e) {
                        // Malformed line - usually shouldn't happen with .pop() strategy
                    }
                }
            }
        } catch (err: any) {
            if (aiSettings.ai_fallback_enabled && aiSettings.api_key) {
                console.warn('Ollama failed, falling back to Gemini:', err.message)
                await runGeminiCloud(finalPrompt)
            } else {
                throw err
            }
        } finally {
            setIsOllamaLoading(false)
        }
    }

    const handleCopy = async () => {
        if (!displayedCompletion) return
        try {
            await navigator.clipboard.writeText(displayedCompletion)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Clipboard not available - silently fail
        }
    }

    const handleClear = () => {
        setCompletion('')
        setPreviousCompletion('')
        setLastPrompt('')
        setCopied(false)
        setPreflight(null)
    }

    const executeAiRequest = async (finalPrompt: string, contextText: string, strategy: ContextStrategy) => {
        setCompletion('') // Clear for new run
        setLastUsedProvider(null)
        setContextWarning(null)
        
        if (displayedCompletion) setPreviousCompletion(displayedCompletion)

        // Check for oversized scene warning (fallback UI)
        if (strategy === 'full-scene' && sceneTextRef.current.length > MAX_SCENE_CHARS_FULL && !preflight) {
            setContextWarning("This scene is very long, so AI answers may use a reduced context window.")
        }
        
        if (preflight?.level === 'medium' && aiSettings.ai_provider !== 'ollama') {
            setContextWarning(`Note: This request is moderately large (Est. ${preflight.estimatedTokens.toLocaleString()} tokens).`)
        }
        
        try {
            if (aiSettings.ai_provider === 'ollama') {
                await runLocalOllama(finalPrompt, contextText, strategy)
            } else {
                await runGeminiCloud(finalPrompt, contextText, strategy)
            }
        } catch (err: any) {
            console.error('AI Processing Error:', err)
        } finally {
            setPreviousCompletion('')
            setPendingRequest(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!aiSettings.ai_enabled) return
        const currentPrompt = prompt.trim()
        if (actualLoading || isContextTooLarge) return

        const modeRules = projectType === 'tv_script'
            ? `\n\nWrite in professional script format (scene headings, character names in caps, dialogue, etc.).\nDo not give advice, suggestions, or explanations.\nOutput only the script.`
            : `\n\nWrite in narrative prose.\nDo not give advice, suggestions, or explanations.\nOutput only the story.`
        
        let finalPrompt = ''

        if (promptMode === 'Continue Writing') {
            finalPrompt = currentPrompt 
                ? `Continue the scene based on these instructions: ${currentPrompt}${modeRules}`
                : `Continue the scene.${modeRules}`
        } else if (promptMode === 'Improve Scene') {
            finalPrompt = currentPrompt 
                ? `Continue the scene by improving clarity, flow, and quality.\n\nUser instructions: ${currentPrompt}${modeRules}`
                : `Continue the scene by improving clarity, flow, and quality.${modeRules}`
        } else if (promptMode === 'Add Conflict') {
            finalPrompt = currentPrompt 
                ? `Continue the scene by introducing tension, stakes, or conflict.\n\nUser instructions: ${currentPrompt}${modeRules}`
                : `Continue the scene by introducing tension, stakes, or conflict.${modeRules}`
        } else if (promptMode === 'Rewrite with Emotion') {
            finalPrompt = currentPrompt 
                ? `Continue the scene by enhancing emotional depth and character expression.\n\nUser instructions: ${currentPrompt}${modeRules}`
                : `Continue the scene by enhancing emotional depth and character expression.${modeRules}`
        } else if (promptMode === 'Write as Script Scene') {
            finalPrompt = `Write a new scene as a script based on these instructions: ${currentPrompt || 'Write a compelling scene.'}
            
            FORMAT REQUIREMENTS:
            - Return ONLY a valid JSON array.
            - No markdown code blocks.
            - No preamble, no postamble, no explanation text.
            - Valid types for screenplay blocks: "scene-heading", "action", "character", "parenthetical", "dialogue", "transition".
            
            JSON Structure Example:
            [
              { "type": "scene-heading", "text": "INT. OFFICE - DAY" },
              { "type": "character", "text": "JOHN" },
              { "type": "dialogue", "text": "Hello." }
            ]`
        } else if (promptMode === 'Review / Chat') {
            finalPrompt = currentPrompt || 'Review the selected context and offer thoughtful insights.'
        }

        setLastPrompt(currentPrompt || promptMode)
        setPrompt('')
        setCopied(false)
        setContextWarning(null)
        
        // Select strategy and prepare context
        const strategy = getContextStrategy(promptMode)
        const contextText = buildContextText(sceneTextRef.current, strategy)

        // Safeguard Preflight
        const analysis = analyzeContextSize(
            contextText, 
            aiSettings.ai_provider, 
            aiSettings.ai_provider === 'gemini' ? (aiSettings.ai_fallback_enabled ? 'gemini-1.5-flash' : 'gemini-1.5-pro') : 'default'
        )
        setPreflight(analysis)

        const requestPayload = { finalPrompt, contextText, strategy }

        if (analysis.level === 'extreme') {
            setPendingRequest(requestPayload)
            setIsExtremeContext(true)
            return
        }

        if (analysis.level === 'high') {
            setPendingRequest(requestPayload)
            setIsConfirmingCost(true)
            return
        }

        // Performance warning for local models (Ollama)
        if (aiSettings.ai_provider === 'ollama' && contextText.length > SAFEGUARD_THRESHOLDS.PERFORMANCE_WARNING_LOCAL_CHARS) {
            setContextWarning(`Warning: Large request for local model (${contextText.length.toLocaleString()} chars). It may be slow.`)
        }

        executeAiRequest(finalPrompt, contextText, strategy)
    }

    // Check Ollama status on mount
    useEffect(() => {
        const checkStatus = async () => {
            if (aiSettings.ai_provider !== 'ollama') return
            
            try {
                const response = await fetch(`${aiSettings.ollama_url}/api/tags`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(3000)
                })
                setOllamaStatus(response.ok ? 'online' : 'offline')
            } catch {
                setOllamaStatus('offline')
            }
        }
        checkStatus()
    }, [aiSettings.ai_provider, aiSettings.ollama_url])

    // Check Gemini status on mount
    useEffect(() => {
        const checkStatus = async () => {
            if (aiSettings.ai_provider !== 'gemini') return
            if (!aiSettings.api_key) {
                setGeminiStatus('offline')
                return
            }
            
            try {
                // Heartbeat to models list
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${aiSettings.api_key}`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000)
                })
                setGeminiStatus(response.ok ? 'online' : 'offline')
            } catch {
                setGeminiStatus('offline')
            }
        }
        checkStatus()
    }, [aiSettings.ai_provider, aiSettings.api_key])

    // Pick a random hint on mount
    const [hint, setHint] = useState('')
    useEffect(() => {
        setHint(EMPTY_HINTS[Math.floor(Math.random() * EMPTY_HINTS.length)])
    }, [])

    const promptPlaceholder = useMemo(() => {
        if (actualLoading) return ""
        switch (promptMode) {
            case 'Continue Writing':
                return "What should happen next? (e.g. 'They find a hidden door')"
            case 'Improve Scene':
                return "Focus on... (e.g. 'making the dialogue snappier' or 'vivid detail')"
            case 'Add Conflict':
                return "Who starts the trouble? (e.g. 'A sudden storm arrives')"
            case 'Rewrite with Emotion':
                return "What's the mood? (e.g. 'Heavy with grief' or 'Nervous tension')"
            case 'Write as Script Scene':
                return "What's the scene? (e.g. 'A tense interrogation in the rain')"
            default:
                return `Ask anything about this ${label.toLowerCase()}...`
        }
    }, [promptMode, actualLoading, label])

    const emptyStateCall = useMemo(() => {
        switch (promptMode) {
            case 'Continue Writing': return "Ready to write?"
            case 'Improve Scene': return "Let's polish this up."
            case 'Add Conflict': return "Time for some trouble?"
            case 'Rewrite with Emotion': return "Deepen the mood."
            case 'Write as Script Scene': return "Lights, camera, action."
            default: return `How can I help with this ${label.toLowerCase()}?`
        }
    }, [promptMode, label])

    const emptyStateHint = useMemo(() => {
        switch (promptMode) {
            case 'Continue Writing': return "Let's pick up right where you left off or type a direction below."
            case 'Improve Scene': return "I'll help you find the perfect flow. Type a focus if you have one!"
            case 'Add Conflict': return "Let's introduce some drama or a sudden twist to pick up the pace."
            case 'Rewrite with Emotion': return "I'll help you capture the emotional heart of this specific moment."
            case 'Write as Script Scene': return "Describe a situation and I'll adapt it into professional script format."
            default: return hint || "Ask for feedback, brainstorm ideas, or just chat about the story."
        }
    }, [promptMode, hint])

    return (
        <div className="flex flex-col h-full bg-[#fcfbf9] border-l border-slate-200/60 shadow-[-20px_0_50px_rgba(0,0,0,0.02)] overflow-hidden">
            {/* Header */}
            <div 
                data-tour="ai-header"
                className="px-4 md:px-6 py-3 border-b border-slate-200/60 flex items-center gap-2 md:gap-3 bg-white/50 backdrop-blur-sm shrink-0 overflow-hidden"
            >
                <div className="p-1.5 bg-indigo-50 rounded-xl">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-50" />
                </div>
                <div className="flex-1 min-w-0">
                    {!isFullCanvas && (
                        <h3 className="text-sm font-serif font-bold text-slate-800 tracking-tight leading-none mb-1">AI Partner</h3>
                    )}
                    <div className="flex items-center gap-1.5 md:gap-2 overflow-hidden">
                        <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold uppercase truncate">
                            {aiSettings.ai_provider === 'ollama' ? `Ollama` : 'Gemini'}
                        </p>
                        <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-1">
                            <div className={cn(
                                "w-1 h-1 rounded-full",
                                (aiSettings.ai_provider === 'ollama' ? ollamaStatus : geminiStatus) === 'online' ? "bg-green-400" : 
                                (aiSettings.ai_provider === 'ollama' ? ollamaStatus : geminiStatus) === 'checking' ? "bg-slate-300 animate-pulse" : "bg-red-400"
                            )} />
                            <span className={cn(
                                "text-[8px] font-bold uppercase tracking-tight",
                                (aiSettings.ai_provider === 'ollama' ? ollamaStatus : geminiStatus) === 'online' ? "text-green-600" : 
                                (aiSettings.ai_provider === 'ollama' ? ollamaStatus : geminiStatus) === 'checking' ? "text-slate-400" : "text-red-500"
                            )}>
                                {(aiSettings.ai_provider === 'ollama' ? ollamaStatus : geminiStatus)}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 md:gap-1.5 ml-1 min-w-0">
                            <select 
                                value={promptMode}
                                onChange={(e) => setPromptMode(e.target.value)}
                                data-tour="ai-mode-selector"
                                className="bg-transparent text-indigo-500 text-[9px] font-bold uppercase tracking-[0.05em] md:tracking-[0.1em] outline-none cursor-pointer appearance-none border-b border-transparent hover:border-indigo-200 transition-colors truncate max-w-[80px] md:max-w-none"
                                suppressHydrationWarning
                            >
                                <option value="Continue Writing">Continue</option>
                                <option value="Improve Scene">Improve</option>
                                <option value="Add Conflict">Conflict</option>
                                <option value="Rewrite with Emotion">Emotion</option>
                                {!isNovel && <option value="Write as Script Scene">Script</option>}
                                <option value="Review / Chat">Chat</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setTourOpen(true)}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"
                            >
                                <HelpCircle className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">AI Partner Tour</TooltipContent>
                    </Tooltip>

                    {!isFullCanvas && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link href={`/project/${projectId}/ai`}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"
                                    >
                                        <Maximize2 className="w-3.5 h-3.5" />
                                    </Button>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="top">Open full AI canvas</TooltipContent>
                        </Tooltip>
                    )}

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                data-tour="ai-memory-btn"
                                onClick={() => setIncludeArchiveContext(!includeArchiveContext)}
                                className={cn(
                                    "w-8 h-8 rounded-lg relative transition-all",
                                    includeArchiveContext ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                {isLoadingArchive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
                                {selectedArchiveIds.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-500 text-white text-[8px] flex items-center justify-center rounded-full font-bold border border-white">
                                        {selectedArchiveIds.length}
                                    </span>
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">AI Memory</TooltipContent>
                    </Tooltip>
                </div>
                {(completion || previousCompletion) && !isLoading && (
                    <Tooltip>
                        <TooltipTrigger className="shrink-0">
                            <button
                                onClick={handleClear}
                                className="p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all"
                            >
                                <X className="w-3 md:w-3.5 h-3 md:h-3.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Clear response</TooltipContent>
                    </Tooltip>
                )}
            </div>

            {/* Context Indicator */}
            <div 
                data-tour="ai-context-strip"
                className="bg-white/40 px-6 py-2 border-b border-slate-200/60 flex items-center gap-3 shrink-0 overflow-hidden"
            >
                <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-slate-400 font-bold shrink-0 border-r border-slate-200 pr-3 mr-1">
                    <Database className="w-3 h-3" />
                    <span>Context</span>
                </div>
                
                <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                    {linkedCharacters.length > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50/50 border border-indigo-100/50 text-[9px] text-indigo-600 font-medium shrink-0 animate-in fade-in slide-in-from-left-2 transition-all">
                            <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
                            {charactersLabel}
                        </div>
                    )}
                    {linkedIdeas.length > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50/50 border border-amber-100/50 text-[9px] text-amber-600 font-medium shrink-0 animate-in fade-in slide-in-from-left-2 transition-all">
                            <div className="w-1 h-1 bg-amber-400 rounded-full"></div>
                            {ideasLabel}
                        </div>
                    )}
                    {linkedLocations.length > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50/50 border border-emerald-100/50 text-[9px] text-emerald-600 font-medium shrink-0 animate-in fade-in slide-in-from-left-2 transition-all">
                            <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
                            {locationsLabel}
                        </div>
                    )}
                    {linkedObjects.length > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-50/50 border border-sky-100/50 text-[9px] text-sky-600 font-medium shrink-0 animate-in fade-in slide-in-from-left-2 transition-all">
                            <div className="w-1 h-1 bg-sky-400 rounded-full"></div>
                            {objectsLabel}
                        </div>
                    )}
                    {selectedNodes.length > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-200/50 text-[9px] text-indigo-700 font-bold shrink-0 animate-in fade-in slide-in-from-left-2 transition-all shadow-sm">
                            <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse"></div>
                            {storySelectionLabel}
                        </div>
                    )}
                    
                    {/* Fallback if nothing linked */}
                    {!linkedCharacters.length && !linkedIdeas.length && !linkedLocations.length && !selectedNodes.length && (
                        <div className="text-[9px] text-slate-300 italic">No specific entities linked</div>
                    )}
                </div>
            </div>

            {/* Response Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {contextWarning && (
                    <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-[11px] text-amber-900 leading-relaxed font-bold">
                                Long Scene detected
                            </p>
                            <p className="text-[10px] text-amber-700 leading-relaxed font-serif italic">
                                {contextWarning}
                            </p>
                        </div>
                        <button 
                            onClick={() => setContextWarning(null)}
                            className="text-amber-400 hover:text-amber-600 transition-colors p-0.5"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {/* Empty state */}
                {!displayedCompletion && !isLoading && !error && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-5 opacity-50">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-indigo-300" />
                        </div>
                        <div className="space-y-1.5 flex flex-col items-center">
                            <p className="text-sm font-serif font-medium text-slate-600">
                                {emptyStateCall}
                            </p>
                            <p className="text-xs text-slate-400 font-serif italic max-w-[200px] leading-relaxed">
                                "{emptyStateHint}"
                            </p>
                        </div>
                    </div>
                )}

                {/* Loading skeleton — only when truly no content to show yet */}
                {isLoading && !displayedCompletion && (
                    <div className="space-y-2 animate-in fade-in duration-300">
                        <div className="h-3 bg-slate-100 rounded-full w-3/4 animate-pulse" />
                        <div className="h-3 bg-slate-100 rounded-full w-full animate-pulse" />
                        <div className="h-3 bg-slate-100 rounded-full w-5/6 animate-pulse" />
                    </div>
                )}

                {/* Error state */}
                {error && !isLoading && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="bg-white w-9 h-9 rounded-full flex items-center justify-center mx-auto shadow-sm">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                        </div>
                        {error.message?.includes('NO_API_KEY') ? (
                            <>
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-red-900">API Key Missing</p>
                                    <p className="text-xs text-red-500 leading-relaxed font-serif italic">
                                        Please provide an AI API key in your account settings to use the AI Partner.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full bg-white border-red-200 text-red-700 hover:bg-red-50 rounded-xl gap-2 text-xs"
                                >
                                    <Link href="/settings" className="flex items-center gap-2 w-full justify-center">
                                        <Settings className="w-3 h-3" />
                                        Go to Settings
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-red-900">Something went wrong</p>
                                    <p className="text-xs text-red-500 leading-relaxed font-serif italic">
                                        The AI partner ran into an issue. Your prompt is saved — you can retry below.
                                        {error.message ? ` (${error.message})` : ''}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => lastPrompt && handleSubmit({ preventDefault: () => {} } as any)}
                                    variant="outline"
                                    size="sm"
                                    disabled={!lastPrompt || isLoading}
                                    className="w-full bg-white border-red-200 text-red-700 hover:bg-red-50 rounded-xl gap-2 text-xs"
                                >
                                    <RefreshCcw className="w-3 h-3" />
                                    Try again
                                </Button>
                            </>
                        )}
                    </div>
                )}

                {/* Response — shown during streaming, with previous faded while waiting */}
                {displayedCompletion && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Prompt label */}
                        {lastPrompt && (
                            <div className="flex items-center justify-between px-1">
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                                    {lastPrompt.length > 50 ? lastPrompt.slice(0, 50) + '…' : lastPrompt}
                                </p>
                                {lastUsedProvider && !actualLoading && (
                                    <div className={cn(
                                        "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md border",
                                        lastUsedProvider === 'ollama' 
                                            ? "bg-indigo-50 border-indigo-100 text-indigo-400" 
                                            : "bg-blue-50 border-blue-100 text-blue-400"
                                    )}>
                                        {lastUsedProvider}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Response bubble — dimmed when showing previous while new loads */}
                        <div className={cn(
                            "bg-white rounded-2xl p-5 shadow-sm border border-slate-100/80 text-sm leading-relaxed text-slate-700 font-serif whitespace-pre-wrap italic min-h-[4rem] transition-opacity duration-300",
                            isShowingPrevious && "opacity-40"
                        )}>
                            {displayedCompletion}
                            {isLoading && completion && (
                                <span className="inline-block w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse ml-1 align-middle" />
                            )}
                        </div>

                        {/* "Thinking…" label when re-requesting with previous visible */}
                        {isShowingPrevious && (
                            <p className="text-[10px] text-slate-400 text-center font-medium animate-pulse">
                                Writing a new response…
                            </p>
                        )}

                        {/* Action buttons — only when complete */}
                        {!isLoading && completion && (
                            <div className="flex items-center gap-2">
                                {saveSuccess && (
                                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider animate-in fade-in slide-in-from-right-2 duration-500 flex items-center gap-1 mr-1">
                                        <Check className="w-3 h-3" />
                                        Saved to Archive
                                    </span>
                                )}
                                {!isReadOnly && (
                                    <>
                                        <Button
                                            onClick={handleInsert}
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 rounded-xl border-indigo-100 hover:border-indigo-200 hover:bg-indigo-50/50 text-indigo-600 gap-2 h-9 font-serif italic transition-all active:scale-95"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Insert into Scene
                                        </Button>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Button
                                                    onClick={() => setSaveModalOpen(true)}
                                                    variant="outline"
                                                    size="sm"
                                                    className="rounded-xl gap-1.5 h-9 px-3 transition-all active:scale-95 border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50"
                                                >
                                                    <Bookmark className="w-3.5 h-3.5" />
                                                    Save
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">Save to database</TooltipContent>
                                        </Tooltip>
                                    </>
                                )}
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Button
                                            onClick={handleCopy}
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                                "rounded-xl gap-1.5 h-9 px-3 transition-all active:scale-95",
                                                isReadOnly && "flex-1",
                                                copied
                                                    ? "border-green-200 text-green-600 bg-green-50"
                                                    : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                                            )}
                                        >
                                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                            {copied ? 'Copied' : 'Copy'}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Copy to clipboard</TooltipContent>
                                </Tooltip>
                            </div>
                        )}
                        
                        <SaveAiResponseModal 
                            open={saveModalOpen}
                            onOpenChange={setSaveModalOpen}
                            projectId={projectId}
                            prompt={lastPrompt}
                            response={completion || displayedCompletion}
                            sourceSceneId={activeSceneId || undefined}
                            sourceNodeId={activeNodeId || undefined}
                            sourceLabel={sourceLabel}
                            model={lastUsedProvider === 'ollama' ? aiSettings.ollama_model : (lastUsedProvider === 'gemini' ? 'Gemini' : aiSettings.ai_provider)}
                            action={promptMode.toLowerCase()}
                            linkedEntities={linkedEntitiesSnapshot}
                            contextSnapshot={contextSnapshotString}
                            onSuccess={() => {
                                setSaveSuccess(true)
                                setTimeout(() => setSaveSuccess(false), 4000)
                            }}
                        />
                    </div>
                )}
            </div>
            
            {includeArchiveContext && (
                <div className="px-6 py-3 border-b border-slate-200/60 bg-white/50 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">AI Memory</span>
                            {isLoadingArchive && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
                        </div>
                        <button 
                            onClick={() => setIncludeArchiveContext(false)}
                            className="text-[9px] text-slate-400 hover:text-slate-600 underline"
                        >
                            Disable
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1 scrollbar-thin">
                        {archiveResponses.length > 0 ? (
                            archiveResponses.map((r) => {
                                const isSelected = selectedArchiveIds.includes(r.id)
                                return (
                                    <Tooltip key={r.id}>
                                        <TooltipTrigger>
                                            <button
                                                onClick={() => toggleArchiveId(r.id)}
                                                className={cn(
                                                    "text-[9px] px-2 py-1 rounded-lg border transition-all text-left truncate flex-1 min-w-[100px] flex items-center gap-1.5",
                                                    isSelected 
                                                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold ring-1 ring-indigo-200" 
                                                        : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-1 h-1 rounded-full shrink-0",
                                                    isSelected ? "bg-indigo-500" : "bg-slate-300"
                                                )} />
                                                <span className="truncate">{r.title}</span>
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            {r.title} ({r.source_label})
                                        </TooltipContent>
                                    </Tooltip>
                                )
                            })
                        ) : !isLoadingArchive && (
                            <p className="text-[10px] text-slate-400 italic">No memories found in your archive.</p>
                        )}
                    </div>
                    {selectedArchiveIds.length >= 5 && (
                        <p className="text-[8px] text-amber-600 font-bold uppercase mt-2">Max selection reached</p>
                    )}
                </div>
            )}

            {/* Input Area */}
            <div className="bg-white border-t border-slate-200/60 z-10">
                {/* Context Preview */}
                <div className="border-b border-slate-100">
                    <button
                        type="button"
                        onClick={() => setPreviewOpen(!previewOpen)}
                        className="w-full px-4 py-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <span>What the AI is noticing</span>
                        {previewOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </button>
                    
                    {previewOpen && (
                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 max-h-80 md:max-h-64 overflow-y-auto text-[11px] font-mono whitespace-pre-wrap text-slate-600 space-y-4 overscroll-contain touch-auto custom-scrollbar">
                            <div>
                                <div className="font-bold text-slate-400 mb-1">{label.toUpperCase()}:</div>
                                <div className="italic bg-white p-2 border border-slate-100 rounded-lg">{sceneTextRef.current.slice(-1000) || '(empty)'}</div>
                            </div>
                            
                            {linkedCharacters.length > 0 && (
                                <div>
                                    <div className="font-bold text-slate-400 mb-1">CHARACTERS:</div>
                                    <ul className="list-disc pl-4 space-y-1 bg-white p-2 border border-slate-100 rounded-lg">
                                        {linkedCharacters.map(c => (
                                            <li key={c.id}>
                                                <span className="font-bold">{c.name}</span>: {c.description || 'No description'}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {linkedIdeas.length > 0 && (
                                <div>
                                    <div className="font-bold text-slate-400 mb-1">IDEAS:</div>
                                    <ul className="list-disc pl-4 space-y-1 bg-white p-2 border border-slate-100 rounded-lg">
                                        {linkedIdeas.map(i => (
                                            <li key={i.id}>
                                                <span className="font-bold">{i.title}</span>
                                                {i.content && <span className="text-slate-400"> - {i.content.length > 50 ? i.content.slice(0, 50) + '...' : i.content}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {linkedLocations.length > 0 && (
                                <div>
                                    <div className="font-bold text-slate-400 mb-1">LOCATIONS:</div>
                                    <ul className="list-disc pl-4 space-y-1 bg-white p-2 border border-slate-100 rounded-lg">
                                        {linkedLocations.map(l => (
                                            <li key={l.id}>
                                                <span className="font-bold">{l.name}</span>: {l.atmosphere || l.description || 'No description'}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {linkedObjects.length > 0 && (
                                <div>
                                    <div className="font-bold text-slate-400 mb-1">OBJECTS/ITEMS:</div>
                                    <ul className="list-disc pl-4 space-y-1 bg-white p-2 border border-slate-100 rounded-lg">
                                        {linkedObjects.map(o => (
                                            <li key={o.id}>
                                                <span className="font-bold">{o.name}</span>: {o.significance || o.description || 'No description'}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {(() => {
                                const relevantIds = [
                                    ...linkedCharacters.map(c => c.id),
                                    ...linkedLocations.map(l => l.id),
                                    ...linkedObjects.map(o => o.id)
                                ]
                                const ties = projectRelationships.filter(r => relevantIds.includes(r.source_id) && relevantIds.includes(r.target_id)).slice(0, 5)
                                if (ties.length === 0) return null
                                
                                return (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-500">
                                        <div className="font-bold text-indigo-400 mb-1">WORLD TIES ({label} Relevant):</div>
                                        <ul className="list-disc pl-4 space-y-1 bg-indigo-50/30 p-2 border border-indigo-100 rounded-lg text-indigo-900 italic">
                                            {ties.map(t => {
                                                const source = [...linkedCharacters, ...linkedLocations, ...linkedObjects].find(e => e.id === t.source_id)
                                                const target = [...linkedCharacters, ...linkedLocations, ...linkedObjects].find(e => e.id === t.target_id)
                                                return (
                                                    <li key={t.id}>
                                                        <span className="font-bold not-italic">{source?.name || 'Unknown'}</span> 
                                                        {t.is_symmetrical ? ' and ' : ` is ${t.relation_label} to `}
                                                        <span className="font-bold not-italic">{target?.name || 'Unknown'}</span>
                                                        {t.is_symmetrical && ` are ${t.relation_label}`}
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    </div>
                                )
                            })()}

                            {storySelectionContext.length > 0 && (
                                <div>
                                    <div className="font-bold text-slate-400 mb-1 flex items-center justify-between">
                                        <span>STORY CONTEXT ({storySelectionContext.length} scenes):</span>
                                        {onClearSelection && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onClearSelection() }} 
                                                className="text-indigo-500 hover:text-indigo-600 transition-colors"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-2 bg-white p-2 border border-slate-100 rounded-lg">
                                        {storySelectionContext.slice(0, 3).map(s => (
                                            <div key={s.node_id} className="border-b border-slate-50 last:border-0 pb-1.5 mb-1.5">
                                                <div className="font-bold text-slate-700 truncate">{s.title}</div>
                                                <div className="line-clamp-2 text-slate-400 italic text-[10px]">
                                                    {s.content || '(No text yet)'}
                                                </div>
                                            </div>
                                        ))}
                                        {storySelectionContext.length > 3 && (
                                            <div className="text-center py-1 text-slate-300 italic">+ {storySelectionContext.length - 3} more elements</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Prompt templates - Collapsible */}
                <div className="border-b border-slate-100">
                    <button
                        type="button"
                        onClick={() => setPromptsOpen(!promptsOpen)}
                        className="w-full px-4 py-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <span>Quick Writing Ideas</span>
                        {promptsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </button>
                    
                    {promptsOpen && (
                        <div className="px-4 pt-3 pb-3 flex flex-wrap gap-2.5 justify-center bg-slate-50 border-t border-slate-100 animate-in slide-in-from-top-1 duration-300">
                            {PROMPT_TEMPLATES.map((t) => (
                                <button
                                    key={t.label}
                                    type="button"
                                    onClick={() => handleTemplate(t.value)}
                                    className="px-3 py-1.5 text-[11px] font-medium rounded-xl border border-slate-200 text-slate-500 bg-white hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all active:scale-95 shadow-sm whitespace-nowrap"
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-4 pb-4">
                    <form onSubmit={handleSubmit} className="space-y-3" suppressHydrationWarning>
                        {isContextTooLarge && (
                            <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-[10px] leading-snug animate-in fade-in zoom-in duration-300">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <p>This selection is too large to send directly. Reduce the selection or use summarized context.</p>
                            </div>
                        )}
                        {actualLoading && (
                            <div className="flex items-center gap-2 mb-2 px-2 text-[10px] text-indigo-500/80 font-bold uppercase tracking-wider animate-in slide-in-from-top-1 duration-500">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                                </span>
                                {aiSettings.ai_provider === 'ollama' ? "Thinking with Ollama..." : "Generating with Gemini..."}
                            </div>
                        )}
                        <div 
                            data-tour="ai-prompt-area"
                            className={cn(
                                "relative group transition-all duration-500",
                                actualLoading && "ring-2 ring-indigo-500/10 rounded-2xl animate-pulse"
                            )}
                        >
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSubmit(e as any)
                                    }
                                }}
                                placeholder={promptPlaceholder}
                                rows={3}
                                className={cn(
                                    "w-full border border-slate-200 rounded-2xl py-3.5 pl-4 pr-12 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all resize-none outline-none placeholder:text-slate-400 font-serif leading-relaxed shadow-sm",
                                    actualLoading ? "bg-white cursor-wait" : "bg-slate-50"
                                )}
                                suppressHydrationWarning
                            ></textarea>
                            <button
                                type="submit"
                                disabled={actualLoading || (!prompt.trim() && promptMode !== 'Review / Chat') || isContextTooLarge}
                                className={cn(
                                    "absolute bottom-3.5 right-3.5 p-2 rounded-xl transition-all active:scale-95 flex items-center justify-center min-w-[34px] min-h-[34px]",
                                    !actualLoading && !isContextTooLarge && (prompt.trim() || promptMode === 'Review / Chat')
                                        ? "bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-100"
                                        : "bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200"
                                )}
                            >
                                {actualLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </button>
                        </div>

                    </form>
                </div>
            </div>

            <AiSafeguardDialogs 
                preflight={preflight}
                isConfirmingCost={isConfirmingCost}
                setIsConfirmingCost={setIsConfirmingCost}
                isExtremeContext={isExtremeContext}
                setIsExtremeContext={setIsExtremeContext}
                provider={aiSettings.ai_provider}
                onConfirm={() => {
                    setIsConfirmingCost(false);
                    setIsExtremeContext(false);
                    if (pendingRequest) {
                        executeAiRequest(pendingRequest.finalPrompt, pendingRequest.contextText, pendingRequest.strategy);
                    }
                }}
                onCancel={() => {
                    setIsConfirmingCost(false);
                    setIsExtremeContext(false);
                    setPendingRequest(null);
                    setPreflight(null);
                }}
            />
            <AiPartnerTour 
                open={tourOpen}
                onClose={() => setTourOpen(false)}
            />
        </div>
    )
}
