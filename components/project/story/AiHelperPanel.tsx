'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { getProjectTypeLabel } from '@/lib/constants'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Sparkles, Send, Loader2, Plus, MessageSquare, AlertCircle, RefreshCcw, Copy, X, Check, ChevronDown, ChevronUp, Info, Settings, Bookmark, Database, Maximize2, Users, Lightbulb, MapPin, Box, HelpCircle, Layout, Square } from 'lucide-react'
import { PremiumEditor } from '@/components/ui/premium-editor'
import { Button } from '@/components/ui/button'
import { SanctuarySelect } from '@/components/ui/sanctuary-select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import SaveAiResponseModal from '@/components/project/ai/SaveAiResponseModal'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import type { Database as SupabaseDatabase } from '@/lib/supabase/types'
import { AI_TOUR_COMPLETE_KEY, AI_TOUR_PENDING_KEY, AI_TOUR_START_EVENT, AI_TOUR_STARTED_KEY } from '@/lib/ai/tour'
import { formatTrialRemainingPct, isLowTrialBalance } from '@/lib/ai/trial'
import { useProjectActions } from '@/components/project/ProjectContext'
import { useComments } from '@/components/project/CommentsContext'
import { analyzeContextSize, ContextSizingResult, SAFEGUARD_THRESHOLDS } from '@/lib/ai/config'
import { getAiProviderLabel } from '@/lib/ai/providers'
import { getBillingModeLabel } from '@/lib/ai/modes'
import { AiSafeguardDialogs } from '@/components/project/ai/AiSafeguardDialogs'
import AiPartnerTour from './AiPartnerTour'
import { useTheme } from '@/components/providers/ThemeProvider'
import { getDeviceFingerprint } from '@/lib/client/device-fingerprint'

interface AiHelperPanelProps {
    projectId: string
    projectTitle?: string | null
    sceneText: string
    sceneCharacters?: { characters: any }[]
    sceneIdeas?: { ideas: any }[]
    sceneLocations?: { locations: any }[]
    sceneObjects?: { objects: any }[]
    linkedCharacters?: any[]
    linkedIdeas?: any[]
    linkedLocations?: any[]
    linkedObjects?: any[]
    linkedAiFeedback?: SupabaseDatabase['public']['Tables']['ai_responses']['Row'][]
    projectCharacters?: any[]
    projectIdeas?: any[]
    projectLocations?: any[]
    projectObjects?: any[]
    projectAiFeedback?: SupabaseDatabase['public']['Tables']['ai_responses']['Row'][]
    projectRelationships?: any[]
    selectedNodes?: any[]
    allNodes?: any[]
    allScenes?: any[]
    onClearSelection?: () => void
    onInsert: (content: any) => void
    activeNodeId?: string | null
    activeSceneId?: string | null
    onClose?: () => void
    projectType?: 'tv_script' | 'novel'
    projectPremise?: string | null
    projectTone?: string | null
    isFullCanvas?: boolean
    onReturnToSidebar?: () => void
    allowViewerFeedback?: boolean
    accessContext?: AiAccessContext
    aiSettings: {
        ai_enabled: boolean
        billing_mode: string
        ai_provider: string
        ai_fallback_enabled: boolean
        ollama_model: string
        ollama_url: string
        api_key: string | null
        trial?: {
            status: string
            remaining_micros: number
            granted_micros: number
            consumed_micros: number
        } | null
    }
}

export type AiAccessContext = 'partner' | 'analyzer'

type AiAccessIssue = {
    title: string
    description: string
}

type ContextEntityType = 'characters' | 'ideas' | 'locations' | 'objects' | 'aiFeedback'

type ContextDraft = Record<ContextEntityType, string[]>

const EMPTY_ARRAY: any[] = []
const AI_PARTNER_PREVIEW_NOTE_KEY_PREFIX = 'storyline-ai-partner-preview-note'

function buildContextDraft({
    sceneCharacters = [],
    sceneIdeas = [],
    sceneLocations = [],
    sceneObjects = [],
    aiFeedbackIds = [],
}: {
    sceneCharacters?: { characters: any }[]
    sceneIdeas?: { ideas: any }[]
    sceneLocations?: { locations: any }[]
    sceneObjects?: { objects: any }[]
    aiFeedbackIds?: string[]
}): ContextDraft {
    return {
        characters: sceneCharacters.map((entry) => entry.characters?.id).filter(Boolean),
        ideas: sceneIdeas.map((entry) => entry.ideas?.id).filter(Boolean),
        locations: sceneLocations.map((entry) => entry.locations?.id).filter(Boolean),
        objects: sceneObjects.map((entry) => entry.objects?.id).filter(Boolean),
        aiFeedback: aiFeedbackIds.filter(Boolean),
    }
}

function arraysEqual(a: string[], b: string[]) {
    if (a.length !== b.length) return false
    return a.every((value, index) => value === b[index])
}

function getAiPartnerPreviewNoteKey(projectId: string) {
    return `${AI_PARTNER_PREVIEW_NOTE_KEY_PREFIX}:${projectId}`
}

function draftsEqual(a: ContextDraft, b: ContextDraft) {
    return (
        arraysEqual(a.characters, b.characters) &&
        arraysEqual(a.ideas, b.ideas) &&
        arraysEqual(a.locations, b.locations) &&
        arraysEqual(a.objects, b.objects) &&
        arraysEqual(a.aiFeedback, b.aiFeedback)
    )
}

function cloneContextDraft(draft: ContextDraft): ContextDraft {
    return {
        characters: [...draft.characters],
        ideas: [...draft.ideas],
        locations: [...draft.locations],
        objects: [...draft.objects],
        aiFeedback: [...draft.aiFeedback],
    }
}

function stripFeedbackPrefix(title: string | null | undefined) {
    return (title || 'Idea').replace(/^feedback(?:\s+thread)?:\s*/i, '')
}

function isFeedbackIdea(idea: any) {
    return /^feedback(?:\s+thread)?:/i.test(idea?.title || '')
}

function partitionIdeas(items: any[] = []) {
    const feedback: any[] = []
    const regular: any[] = []

    items.forEach((item) => {
        if (isFeedbackIdea(item)) {
            feedback.push(item)
        } else {
            regular.push(item)
        }
    })

    return { feedback, regular }
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

function getDescendantScenes(nodeId: string, allNodes: any[], allScenes: any[], projectContextMode: 'default' | 'expanded' | 'full' = 'default'): any[] {
    if (nodeId === 'virtual-root') {
        if (projectContextMode === 'default') return allScenes.slice(0, 10)
        if (projectContextMode === 'expanded') return allScenes.slice(0, 50)
        return allScenes
    }
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

type FriendlyAiError = {
    title: string
    description: string
    showSettingsCta?: boolean
}

function getFriendlyAiError(message: string | undefined): FriendlyAiError | null {
    if (!message) return null

    if (message.includes('APP_MANAGED_AI_UNAVAILABLE')) {
        return {
            title: 'Free Trial AI Unavailable',
            description: "Storyline's sponsored AI is not configured right now. Please try again later or switch to another AI option in Settings.",
            showSettingsCta: true,
        }
    }

    if (message.includes('NO_API_KEY')) {
        return {
            title: 'API Key Missing',
            description: 'Please provide an AI API key in your account settings to use the AI Partner.',
            showSettingsCta: true,
        }
    }

    if (message.includes('TRIAL_EXHAUSTED')) {
        return {
            title: 'Free Trial AI Exhausted',
            description: 'Your sponsored AI trial is fully used. Switch to your own API key or Ollama in Settings to keep going.',
            showSettingsCta: true,
        }
    }

    if (message.includes('TRIAL_UNAVAILABLE')) {
        return {
            title: 'Free Trial AI Unavailable',
            description: 'This account cannot use the sponsored trial right now. You can still switch to BYOK or Ollama in Settings.',
            showSettingsCta: true,
        }
    }

    if (message.includes("couldn't verify your")) {
        return {
            title: 'Check Your API Key',
            description: message,
            showSettingsCta: true,
        }
    }

    if (message.includes('needs available billing or usage credits')) {
        return {
            title: 'Check Your AI Billing',
            description: message,
            showSettingsCta: true,
        }
    }

    if (message.includes('is busy right now')) {
        return {
            title: 'AI Service Busy',
            description: message,
        }
    }

    if (message.includes('temporary problem')) {
        return {
            title: 'AI Service Unavailable',
            description: message,
        }
    }

    return null
}

function getContextStrategy(mode: string): ContextStrategy {
    if (mode === 'Continue Writing') return 'continuation'
    return 'full-scene' // Includes Improve, Conflict, Emotion, Script, and Review/Chat
}

export function getAiAccessIssue(
    aiSettings: AiHelperPanelProps['aiSettings'],
    context: AiAccessContext = 'partner'
): AiAccessIssue | null {
    const featureLabel = context === 'analyzer' ? 'Scene Analyzer' : 'AI Partner'
    const actionLabel = context === 'analyzer' ? 'analyze scenes' : 'keep chatting'

    if (!aiSettings.ai_enabled) {
        return {
            title: `${featureLabel} needs AI access`,
            description: `Open Account Settings from your avatar, then enable AI Partner to ${actionLabel}.`,
        }
    }

    if (aiSettings.billing_mode === 'app_managed_trial') {
        if (aiSettings.trial?.status === 'active') {
            return null
        }

        if (aiSettings.trial?.status === 'exhausted') {
            return {
                title: `${featureLabel} is unavailable`,
                description: `Free Trial AI is exhausted. Switch to your own API key or Ollama in Account Settings to ${actionLabel}.`,
            }
        }

        if (aiSettings.trial?.status === 'blocked' || aiSettings.trial?.status === 'abuse_review') {
            return {
                title: `${featureLabel} is currently limited`,
                description: `You can still switch to your own API key or Ollama from Account Settings to ${actionLabel}.`,
            }
        }

        return {
            title: `${featureLabel} is unavailable`,
            description: `Open Account Settings to switch to your own key or Ollama so you can ${actionLabel}.`,
        }
    }

    if (aiSettings.billing_mode === 'ollama') {
        return null
    }

    if (aiSettings.ai_provider === 'gemini' && !aiSettings.api_key) {
        return {
            title: `Gemini needs an API key for ${featureLabel}`,
            description: `Add your Gemini API key in Account Settings before trying to ${actionLabel}.`,
        }
    }

    if (aiSettings.ai_provider === 'openai' && !aiSettings.api_key) {
        return {
            title: `OpenAI needs an API key for ${featureLabel}`,
            description: `Add your OpenAI API key in Account Settings before trying to ${actionLabel}.`,
        }
    }

    return null
}

function buildContextText(text: string, strategy: ContextStrategy): string {
    if (strategy === 'continuation') {
        return text.slice(-MAX_SCENE_CHARS_TAIL)
    }
    // Q&A / Review / Improve: Take as much as possible from the start
    return text.slice(0, MAX_SCENE_CHARS_FULL)
}

type ScreenplayBlock = {
    type: 'scene-heading' | 'action' | 'character' | 'parenthetical' | 'dialogue' | 'transition'
    text: string
}

function mapScreenplayBlocksToNodes(blocks: ScreenplayBlock[]) {
    const typeMap: Record<ScreenplayBlock['type'], string> = {
        'scene-heading': 'screenplaySceneHeading',
        'action': 'screenplayAction',
        'character': 'screenplayCharacter',
        'parenthetical': 'screenplayParenthetical',
        'dialogue': 'screenplayDialogue',
        'transition': 'screenplayTransition'
    }

    return blocks.map((block) => ({
        type: typeMap[block.type],
        content: block.text ? [{ type: 'text', text: block.text }] : []
    }))
}

function stripMarkdownCodeFences(text: string) {
    const trimmed = text.trim()
    if (!trimmed.startsWith('```')) return trimmed

    const match = trimmed.match(/```(?:json|text|md|markdown)?\s*([\s\S]*?)\s*```/)
    return match ? match[1].trim() : trimmed
}

function isScreenplaySceneHeading(line: string) {
    return /^(INT|EXT|INT\/EXT|EXT\/INT|I\/E)\./i.test(line.trim())
}

function isScreenplayTransition(line: string) {
    const trimmed = line.trim()
    return /^[A-Z0-9 '().-]+ TO:$/.test(trimmed) || /^(FADE OUT:|FADE TO:|CUT TO:|SMASH CUT:|MATCH CUT:)$/.test(trimmed)
}

function isScreenplayParenthetical(line: string) {
    const trimmed = line.trim()
    return trimmed.startsWith('(') && trimmed.endsWith(')')
}

function isLikelyCharacterCue(line: string) {
    const trimmed = line.trim()
    if (!trimmed) return false
    if (isScreenplaySceneHeading(trimmed) || isScreenplayTransition(trimmed) || isScreenplayParenthetical(trimmed)) return false
    if (trimmed.length > 40) return false
    if (!/[A-Z]/.test(trimmed)) return false

    const normalized = trimmed.replace(/\s*\(.*\)\s*$/, '')
    return /^[A-Z0-9 .'\-]+$/.test(normalized) && normalized === normalized.toUpperCase()
}

function parseScreenplayTextToBlocks(text: string): ScreenplayBlock[] {
    const lines = stripMarkdownCodeFences(text)
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((line) => line.replace(/\s+$/g, ''))

    const blocks: ScreenplayBlock[] = []
    let index = 0

    while (index < lines.length) {
        const currentLine = lines[index]
        const trimmed = currentLine.trim()

        if (!trimmed) {
            index += 1
            continue
        }

        if (isScreenplaySceneHeading(trimmed)) {
            blocks.push({ type: 'scene-heading', text: trimmed.toUpperCase() })
            index += 1
            continue
        }

        if (isScreenplayTransition(trimmed)) {
            blocks.push({ type: 'transition', text: trimmed.toUpperCase() })
            index += 1
            continue
        }

        if (isLikelyCharacterCue(trimmed)) {
            blocks.push({ type: 'character', text: trimmed.toUpperCase() })
            index += 1

            while (index < lines.length) {
                const nextTrimmed = lines[index].trim()

                if (!nextTrimmed) {
                    index += 1
                    break
                }

                if (isScreenplayParenthetical(nextTrimmed)) {
                    blocks.push({ type: 'parenthetical', text: nextTrimmed.replace(/^\((.*)\)$/, '$1').trim() })
                    index += 1
                    continue
                }

                if (
                    isScreenplaySceneHeading(nextTrimmed) ||
                    isScreenplayTransition(nextTrimmed) ||
                    isLikelyCharacterCue(nextTrimmed)
                ) {
                    break
                }

                const dialogueLines: string[] = []
                while (index < lines.length) {
                    const dialogueTrimmed = lines[index].trim()
                    if (!dialogueTrimmed) break
                    if (
                        isScreenplaySceneHeading(dialogueTrimmed) ||
                        isScreenplayTransition(dialogueTrimmed) ||
                        isLikelyCharacterCue(dialogueTrimmed)
                    ) {
                        break
                    }
                    if (isScreenplayParenthetical(dialogueTrimmed)) break

                    dialogueLines.push(dialogueTrimmed)
                    index += 1
                }

                if (dialogueLines.length > 0) {
                    blocks.push({ type: 'dialogue', text: dialogueLines.join('\n') })
                    continue
                }

                break
            }

            continue
        }

        const actionLines = [trimmed]
        index += 1

        while (index < lines.length) {
            const nextTrimmed = lines[index].trim()
            if (!nextTrimmed) {
                index += 1
                break
            }
            if (
                isScreenplaySceneHeading(nextTrimmed) ||
                isScreenplayTransition(nextTrimmed) ||
                isLikelyCharacterCue(nextTrimmed)
            ) {
                break
            }

            actionLines.push(nextTrimmed)
            index += 1
        }

        blocks.push({ type: 'action', text: actionLines.join('\n') })
    }

    return blocks
}

function parseCompletionToScreenplayNodes(text: string) {
    const cleanText = stripMarkdownCodeFences(text)

    const repairedJson = attemptJsonRepair(cleanText)
    if (repairedJson && Array.isArray(repairedJson)) {
        const jsonBlocks = repairedJson
            .filter((block) => block && typeof block === 'object' && typeof block.type === 'string')
            .map((block) => ({
                type: block.type,
                text: typeof block.text === 'string' ? block.text : ''
            }))
            .filter((block): block is ScreenplayBlock =>
                ['scene-heading', 'action', 'character', 'parenthetical', 'dialogue', 'transition'].includes(block.type)
            )

        if (jsonBlocks.length > 0) {
            return mapScreenplayBlocksToNodes(jsonBlocks)
        }
    }

    const parsedBlocks = parseScreenplayTextToBlocks(cleanText)
    if (parsedBlocks.length === 0) return null

    const hasStructuredCue = parsedBlocks.some((block) => block.type !== 'action')
    return hasStructuredCue ? mapScreenplayBlocksToNodes(parsedBlocks) : null
}

export default function AiHelperPanel({
    projectId, projectTitle, sceneText, onInsert,
    sceneCharacters = EMPTY_ARRAY, sceneIdeas = EMPTY_ARRAY, sceneLocations = EMPTY_ARRAY, sceneObjects = EMPTY_ARRAY,
    linkedCharacters = EMPTY_ARRAY, linkedIdeas = EMPTY_ARRAY, linkedLocations = EMPTY_ARRAY, linkedObjects = EMPTY_ARRAY, linkedAiFeedback = EMPTY_ARRAY,
    projectCharacters = EMPTY_ARRAY, projectIdeas = EMPTY_ARRAY, projectLocations = EMPTY_ARRAY, projectObjects = EMPTY_ARRAY, projectAiFeedback = EMPTY_ARRAY,
    projectRelationships = EMPTY_ARRAY,
    selectedNodes = EMPTY_ARRAY, allNodes = EMPTY_ARRAY, allScenes = EMPTY_ARRAY, onClearSelection, aiSettings, projectType,
    projectPremise, projectTone,
    activeNodeId, activeSceneId,
    isFullCanvas = false,
    onReturnToSidebar,
    onClose,
    allowViewerFeedback = false,
    accessContext = 'partner',
}: AiHelperPanelProps) {
    const label = getProjectTypeLabel(projectType)
    const isNovel = projectType === 'novel'
    const router = useRouter()
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    const resolvedProjectTitle = projectTitle?.trim() || 'Untitled Project'
    const isOllamaMode = aiSettings.billing_mode === 'ollama' || aiSettings.ai_provider === 'ollama'
    const modeLabel = getBillingModeLabel((aiSettings.billing_mode as any) || 'app_managed_trial')
    const isTrial = aiSettings.billing_mode === 'app_managed_trial'
    const trialRemainingPct = isTrial && aiSettings.trial?.granted_micros
        ? formatTrialRemainingPct(aiSettings.trial.remaining_micros, aiSettings.trial.granted_micros)
        : null
    const showTrialNudge = trialRemainingPct !== null && trialRemainingPct < 50

    const { role } = useProjectActions()
    const isReadOnly = role === 'viewer'
    const { addComment } = useComments()

    const [prompt, setPrompt] = useState('')
    const [lastPrompt, setLastPrompt] = useState('')
    const [copied, setCopied] = useState(false)
    const [completion, setCompletion] = useState('')
    const [completionError, setCompletionError] = useState<Error | undefined>(undefined)
    // Holds the previous response while a new one is loading — avoids blank flash
    const [previousCompletion, setPreviousCompletion] = useState('')
    const [previewOpen, setPreviewOpen] = useState(false)
    const [promptMode, setPromptMode] = useState('Review / Chat')
    const [isPartnerBusy, setIsPartnerBusy] = useState(false)
    const [isCloudLoading, setIsCloudLoading] = useState(false)
    const [isOllamaLoading, setIsOllamaLoading] = useState(false)
    const [ollamaStatus, setOllamaStatus] = useState<'online' | 'offline' | 'checking'>('online')
    const [cloudStatus, setCloudStatus] = useState<'online' | 'offline' | 'checking'>('online')
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
    const [lastUsedProvider, setLastUsedProvider] = useState<'gemini' | 'openai' | 'ollama' | null>(null)
    const [contextWarning, setContextWarning] = useState<string | null>(null)
    const [showAiAccessNotice, setShowAiAccessNotice] = useState(false)
    
    // Safeguard States
    const [preflight, setPreflight] = useState<ContextSizingResult | null>(null)
    const [isConfirmingCost, setIsConfirmingCost] = useState(false)
    const [isExtremeContext, setIsExtremeContext] = useState(false)
    const [isOverridingProjectContext, setIsOverridingProjectContext] = useState(false)
    const [projectContextMode, setProjectContextMode] = useState<'default' | 'expanded' | 'full'>('default')
    const [pendingRequest, setPendingRequest] = useState<{
        finalPrompt: string,
        contextText: string,
        strategy: ContextStrategy
    } | null>(null)

    const supabase = createClient()
    const [saveModalOpen, setSaveModalOpen] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [isSavingToFeedback, setIsSavingToFeedback] = useState(false)
    const [tourOpen, setTourOpen] = useState(false)
    const [contextManagerOpen, setContextManagerOpen] = useState(false)
    const [isApplyingContext, setIsApplyingContext] = useState(false)
    const [pendingContextDraft, setPendingContextDraft] = useState<ContextDraft | null>(null)
    const [requestNotice, setRequestNotice] = useState<string | null>(null)
    const [showFirstUsePreviewNotice, setShowFirstUsePreviewNotice] = useState(false)
    const [isRequestCancelled, setIsRequestCancelled] = useState(false)
    const cloudAbortRef = useRef<AbortController | null>(null)
    const ollamaAbortRef = useRef<AbortController | null>(null)
    const activeCloudControllersRef = useRef<Set<AbortController>>(new Set())
    const submitInFlightRef = useRef(false)
    const cancelledRequestRef = useRef(false)
    const requestTokenRef = useRef(0)
    const lastSubmittedPromptRef = useRef('')
    const hasShownProjectPreviewNoticeRef = useRef(false)
    const aiAccessIssue = useMemo(() => getAiAccessIssue(aiSettings, accessContext), [accessContext, aiSettings])

    const currentContextDraft = useMemo(
        () => buildContextDraft({
            sceneCharacters,
            sceneIdeas,
            sceneLocations,
            sceneObjects,
            aiFeedbackIds: projectAiFeedback.filter((item) => item.source_scene_id === activeSceneId).map((item) => item.id)
        }),
        [sceneCharacters, sceneIdeas, sceneLocations, sceneObjects, projectAiFeedback, activeSceneId]
    )
    const [contextDraft, setContextDraft] = useState<ContextDraft>(currentContextDraft)
    const isContextSyncPending = pendingContextDraft !== null

    const navigateToContextTab = async (type: ContextEntityType) => {
        if (contextManagerOpen) {
            await syncSceneContext()
            setContextManagerOpen(false)
        }

        router.push(`/project/${projectId}/${type}`)
    }

    useEffect(() => {
        if (pendingContextDraft && draftsEqual(currentContextDraft, pendingContextDraft)) {
            setPendingContextDraft(null)
            setContextDraft(currentContextDraft)
            return
        }

        if (!contextManagerOpen && !pendingContextDraft) {
            setContextDraft((previousDraft) =>
                draftsEqual(previousDraft, currentContextDraft) ? previousDraft : currentContextDraft
            )
        }
    }, [currentContextDraft, contextManagerOpen, pendingContextDraft])

    useEffect(() => {
        if (typeof window === 'undefined') return

        const hasSeenTour = localStorage.getItem(AI_TOUR_COMPLETE_KEY) === 'true'
        if (hasSeenTour) {
            sessionStorage.removeItem(AI_TOUR_PENDING_KEY)
            sessionStorage.removeItem(AI_TOUR_STARTED_KEY)
            return
        }

        const shouldStartTour = sessionStorage.getItem(AI_TOUR_PENDING_KEY) === 'true'
        const hasStartedThisSession = sessionStorage.getItem(AI_TOUR_STARTED_KEY) === 'true'
        if (!shouldStartTour && hasStartedThisSession) return

        sessionStorage.removeItem(AI_TOUR_PENDING_KEY)
        sessionStorage.setItem(AI_TOUR_STARTED_KEY, 'true')
        const timer = setTimeout(() => setTourOpen(true), 300)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined') return

        const handleStartTour = () => {
            const hasSeenTour = localStorage.getItem(AI_TOUR_COMPLETE_KEY) === 'true'
            if (hasSeenTour) return

            sessionStorage.removeItem(AI_TOUR_PENDING_KEY)
            sessionStorage.setItem(AI_TOUR_STARTED_KEY, 'true')
            setTourOpen(true)
        }

        window.addEventListener(AI_TOUR_START_EVENT, handleStartTour)
        return () => window.removeEventListener(AI_TOUR_START_EVENT, handleStartTour)
    }, [])

    useEffect(() => {
        if (!aiAccessIssue) {
            setShowAiAccessNotice(false)
        }
    }, [aiAccessIssue])

    useEffect(() => {
        if (typeof window === 'undefined') return
        if (!completion || isPartnerBusy || isCloudLoading || isOllamaLoading || hasShownProjectPreviewNoticeRef.current) return

        const storageKey = getAiPartnerPreviewNoteKey(projectId)
        if (localStorage.getItem(storageKey) === 'true') {
            hasShownProjectPreviewNoticeRef.current = true
            return
        }

        localStorage.setItem(storageKey, 'true')
        hasShownProjectPreviewNoticeRef.current = true
        setShowFirstUsePreviewNotice(true)
        setPreviewOpen(true)
    }, [completion, isCloudLoading, isOllamaLoading, isPartnerBusy, projectId])

    const sceneTextRef = useRef(sceneText)
    sceneTextRef.current = sceneText

    const storySelectionContext = useMemo(() => {
        if (!selectedNodes?.length || !allNodes?.length || !allScenes?.length) return []
        const sceneIds = new Set<string>()
        const results: { title: string, content: string, node_id: string }[] = []
        
        for (const node of selectedNodes) {
             const scenesInside = getDescendantScenes(node.id, allNodes, allScenes, projectContextMode)
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
    }, [selectedNodes, allNodes, allScenes, projectContextMode])

    const contextSizeChars = useMemo(() => {
        return storySelectionContext.reduce((acc, s) => acc + s.title.length + s.content.length, 0)
    }, [storySelectionContext])

    const isContextTooLarge = contextSizeChars > 150000 // High baseline for safety

    const isVirtualRootSelected = useMemo(() => {
        return selectedNodes.some(n => n.id === 'virtual-root')
    }, [selectedNodes])

    const linkedEntitiesSnapshot = useMemo(() => {
        return {
            characters: linkedCharacters.map(c => ({ id: c.id, name: c.name })),
            ideas: linkedIdeas.map(i => ({ id: i.id, title: i.title })),
            aiFeedback: linkedAiFeedback.map(item => ({ id: item.id, title: item.title })),
            locations: linkedLocations.map(l => ({ id: l.id, name: l.name })),
            objects: linkedObjects.map(o => ({ id: o.id, name: o.name })),
            storyContextNodes: selectedNodes.map(n => ({ id: n.id, title: n.title, type: n.type }))
        }
    }, [linkedCharacters, linkedIdeas, linkedAiFeedback, linkedLocations, linkedObjects, selectedNodes])

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

    const { feedback: linkedFeedbackItems, regular: linkedRegularIdeas } = useMemo(
        () => partitionIdeas(linkedIdeas),
        [linkedIdeas]
    )
    const charactersLabel = useMemo(() => linkedCharacters.length === 1 ? (linkedCharacters[0].name || 'Character') : `${linkedCharacters.length} Characters`, [linkedCharacters])
    const ideasLabel = useMemo(() => {
        if (linkedRegularIdeas.length === 1) {
            return linkedRegularIdeas[0].title || 'Idea'
        }
        return `${linkedRegularIdeas.length} Ideas`
    }, [linkedRegularIdeas])
    const feedbackLabel = useMemo(() => {
        if (linkedFeedbackItems.length === 1) {
            const title = linkedFeedbackItems[0].title || 'Feedback'
            return stripFeedbackPrefix(title)
        }
        return `${linkedFeedbackItems.length} Feedback`
    }, [linkedFeedbackItems])
    const aiFeedbackLabel = useMemo(() => {
        if (linkedAiFeedback.length === 1) {
            return linkedAiFeedback[0].title || 'AI Feedback'
        }
        return `${linkedAiFeedback.length} AI Feedback`
    }, [linkedAiFeedback])
    const locationsLabel = useMemo(() => linkedLocations.length === 1 ? (linkedLocations[0].name || 'Location') : `${linkedLocations.length} Locations`, [linkedLocations])
    const objectsLabel = useMemo(() => linkedObjects.length === 1 ? (linkedObjects[0].name || 'Object') : `${linkedObjects.length} Objects`, [linkedObjects])

    const contextEntityGroups = useMemo(() => {
        const mergedIdeas = [...projectIdeas]
        sceneIdeas.forEach((entry) => {
            const linkedIdea = entry.ideas
            if (linkedIdea && !mergedIdeas.some((idea) => idea.id === linkedIdea.id)) {
                mergedIdeas.push(linkedIdea)
            }
        })
        const { feedback: mergedFeedbackItems, regular: mergedRegularIdeas } = partitionIdeas(mergedIdeas)

        return [
            {
                key: 'characters' as const,
                draftKey: 'characters' as const,
                canNavigateToAdd: true,
                title: 'Characters',
                singularLabel: 'character',
                icon: Users,
                iconClassName: 'text-[#546354]',
                emptyLabel: 'No characters yet',
                items: projectCharacters.map((item) => ({ id: item.id, label: item.name || 'Character' })),
            },
            {
                key: 'ideas' as const,
                draftKey: 'ideas' as const,
                canNavigateToAdd: true,
                title: 'Ideas',
                singularLabel: 'idea',
                icon: Lightbulb,
                iconClassName: 'text-indigo-600',
                emptyLabel: 'No ideas yet',
                items: mergedRegularIdeas.map((item) => ({ id: item.id, label: item.title || 'Idea' })),
            },
            {
                key: 'ai-feedback' as const,
                draftKey: 'aiFeedback' as const,
                canNavigateToAdd: false,
                title: 'AI Feedback',
                singularLabel: 'ai feedback item',
                icon: Sparkles,
                iconClassName: 'text-violet-600',
                emptyLabel: 'No saved AI feedback yet',
                items: projectAiFeedback.map((item) => ({
                    id: item.id,
                    label: item.title || 'AI Feedback',
                    preview: item.response || item.title || 'AI Feedback'
                })),
                emptyActionLabel: 'Use “Add to Assistant” in Book Analysis or Scene Analysis.',
            },
            {
                key: 'feedback' as const,
                draftKey: 'ideas' as const,
                canNavigateToAdd: false,
                title: 'Feedback',
                singularLabel: 'feedback item',
                icon: MessageSquare,
                iconClassName: 'text-amber-600',
                emptyLabel: 'No feedback linked yet',
                items: mergedFeedbackItems
                    .filter((item) => contextDraft.ideas.includes(item.id))
                    .map((item) => ({ id: item.id, label: stripFeedbackPrefix(item.title) })),
            },
            {
                key: 'locations' as const,
                draftKey: 'locations' as const,
                canNavigateToAdd: true,
                title: 'Locations',
                singularLabel: 'location',
                icon: MapPin,
                iconClassName: 'text-emerald-600',
                emptyLabel: 'No locations yet',
                items: projectLocations.map((item) => ({ id: item.id, label: item.name || 'Location' })),
            },
            {
                key: 'objects' as const,
                draftKey: 'objects' as const,
                canNavigateToAdd: true,
                title: 'Objects',
                singularLabel: 'object',
                icon: Box,
                iconClassName: 'text-sky-600',
                emptyLabel: 'No objects yet',
                items: projectObjects.map((item) => ({ id: item.id, label: item.name || 'Object' })),
            },
        ]
    }, [projectCharacters, projectIdeas, projectLocations, projectObjects, projectAiFeedback, sceneIdeas, contextDraft.ideas])

    const contextSummaryItems = useMemo(() => {
        return contextEntityGroups
            .map((group) => ({
                key: group.key,
                title: group.title,
                icon: group.icon,
                iconClassName: group.iconClassName,
                count: group.items.filter((item) => contextDraft[group.draftKey].includes(item.id)).length,
            }))
            .filter((group) => group.count > 0)
    }, [contextDraft, contextEntityGroups])

    const contextSnapshotString = useMemo(() => {
        const parts = []
        if (resolvedProjectTitle) parts.push(`Project: ${resolvedProjectTitle}`)
        if (activeNodeId) {
            const node = allNodes.find(n => n.id === activeNodeId)
            if (node) parts.push(`${node.type === 'scene' ? 'Scene' : 'Chapter'}: ${node.title}`)
        }
        if (linkedCharacters.length > 0) parts.push(charactersLabel)
        if (linkedRegularIdeas.length > 0) parts.push(ideasLabel)
        if (linkedAiFeedback.length > 0) parts.push(aiFeedbackLabel)
        if (linkedFeedbackItems.length > 0) parts.push(feedbackLabel)
        if (linkedLocations.length > 0) parts.push(locationsLabel)
        if (linkedObjects.length > 0) parts.push(objectsLabel)
        if (selectedNodes.length > 0) parts.push(storySelectionLabel)
        return parts.join(' | ')
    }, [resolvedProjectTitle, activeNodeId, allNodes, linkedCharacters, linkedRegularIdeas, linkedAiFeedback, linkedFeedbackItems, linkedLocations, linkedObjects, selectedNodes, charactersLabel, ideasLabel, aiFeedbackLabel, feedbackLabel, locationsLabel, objectsLabel, storySelectionLabel])

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

    const closePreview = () => {
        setPreviewOpen(false)
        setShowFirstUsePreviewNotice(false)
    }

    const togglePreview = () => {
        if (previewOpen) {
            closePreview()
            return
        }
        setPreviewOpen(true)
    }

    const utilityIcons = (
        <TooltipProvider>
            <div className="flex items-center gap-0.5">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTourOpen(true)}
                            data-tour="ai-help-icon"
                            className="h-8 w-8 rounded-xl text-slate-400 transition-all hover:bg-white/80 hover:text-indigo-600"
                        >
                            <HelpCircle className="w-3.5 h-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Tour</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={togglePreview}
                            className={cn(
                                "h-8 w-8 rounded-xl transition-all",
                                previewOpen
                                    ? "bg-indigo-50 text-indigo-600"
                                    : "text-slate-500 hover:bg-white/80 hover:text-indigo-600"
                            )}
                            aria-label={previewOpen ? 'Hide AI context preview' : 'Show AI context preview'}
                        >
                            {previewOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        {previewOpen ? 'Hide AI context preview' : 'Inspect what the AI can currently use'}
                    </TooltipContent>
                </Tooltip>

                {!isFullCanvas && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link href={`/project/${projectId}/ai`}>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl text-slate-400 transition-all hover:bg-white/80 hover:text-indigo-600"
                                >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                </Button>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="top">Full View</TooltipContent>
                    </Tooltip>
                )}

                {onClose && (
                    <>
                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    className="flex h-8 w-8 rounded-xl text-slate-400 transition-all hover:bg-white/80 hover:text-slate-700"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Close</TooltipContent>
                        </Tooltip>
                    </>
                )}
            </div>
        </TooltipProvider>
    )

    const contextManagerList = (
        <div className="max-h-72 space-y-4 overflow-y-auto pr-1 custom-scrollbar">
            {contextEntityGroups.map((group) => {
                const Icon = group.icon
                return (
                    <div key={group.key} className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                            <Icon className={cn("h-3.5 w-3.5", group.iconClassName)} />
                            <span>{group.title}</span>
                        </div>

                        {group.items.length > 0 ? (
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const isSelected = contextDraft[group.draftKey].includes(item.id)
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => toggleContextDraftItem(group.draftKey, item.id)}
                                            className={cn(
                                                "flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-all",
                                                isSelected
                                                    ? "border-slate-200 bg-white text-slate-800 shadow-sm"
                                                    : "border-transparent bg-white/50 text-slate-500 hover:border-slate-200 hover:bg-white"
                                            )}
                                        >
                                            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50", group.iconClassName)}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                                {item.label}
                                            </span>
                                            <div
                                                className={cn(
                                                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
                                                    isSelected
                                                        ? "border-indigo-500 bg-indigo-500 text-white"
                                                        : "border-slate-200 bg-white text-transparent"
                                                )}
                                            >
                                                <Check className="h-3.5 w-3.5" />
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    if (group.canNavigateToAdd) {
                                        void navigateToContextTab(group.draftKey)
                                    }
                                }}
                                className={cn(
                                    "w-full rounded-2xl border border-dashed border-slate-200 bg-white/70 px-3 py-2 text-left transition-all",
                                    group.canNavigateToAdd
                                        ? "hover:border-slate-300 hover:bg-white"
                                        : "cursor-default"
                                )}
                            >
                                <span className="block text-[11px] italic text-slate-400">{group.emptyLabel}</span>
                                <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                                    {group.emptyActionLabel ?? (group.canNavigateToAdd
                                        ? `Click here to add a ${group.singularLabel}`
                                        : 'Link a feedback comment from the feedback panel')}
                                </span>
                            </button>
                        )}
                    </div>
                )
            })}
        </div>
    )

    const toggleContextDraftItem = (type: ContextEntityType, id: string) => {
        setContextDraft((prev) => ({
            ...prev,
            [type]: prev[type].includes(id)
                ? prev[type].filter((value) => value !== id)
                : [...prev[type], id],
        }))
    }

    const syncSceneContext = async () => {
        if (!activeSceneId || draftsEqual(contextDraft, currentContextDraft)) return

        const nextDraft = cloneContextDraft(contextDraft)
        const characterAdds = contextDraft.characters.filter((id) => !currentContextDraft.characters.includes(id))
        const characterRemovals = currentContextDraft.characters.filter((id) => !contextDraft.characters.includes(id))
        const ideaAdds = contextDraft.ideas.filter((id) => !currentContextDraft.ideas.includes(id))
        const ideaRemovals = currentContextDraft.ideas.filter((id) => !contextDraft.ideas.includes(id))
        const locationAdds = contextDraft.locations.filter((id) => !currentContextDraft.locations.includes(id))
        const locationRemovals = currentContextDraft.locations.filter((id) => !contextDraft.locations.includes(id))
        const objectAdds = contextDraft.objects.filter((id) => !currentContextDraft.objects.includes(id))
        const objectRemovals = currentContextDraft.objects.filter((id) => !contextDraft.objects.includes(id))
        const aiFeedbackAdds = contextDraft.aiFeedback.filter((id) => !currentContextDraft.aiFeedback.includes(id))
        const aiFeedbackRemovals = currentContextDraft.aiFeedback.filter((id) => !contextDraft.aiFeedback.includes(id))

        try {
            setIsApplyingContext(true)
            setPendingContextDraft(nextDraft)

            const operations: any[] = []

            if (characterAdds.length > 0) {
                operations.push(
                    supabase.from('scene_characters').upsert(
                        characterAdds.map((characterId) => ({ scene_id: activeSceneId, character_id: characterId })),
                        { onConflict: 'scene_id,character_id' }
                    )
                )
            }
            if (characterRemovals.length > 0) {
                operations.push(
                    supabase.from('scene_characters').delete().eq('scene_id', activeSceneId).in('character_id', characterRemovals)
                )
            }
            if (ideaAdds.length > 0) {
                operations.push(
                    supabase.from('scene_ideas').upsert(
                        ideaAdds.map((ideaId) => ({ scene_id: activeSceneId, idea_id: ideaId })),
                        { onConflict: 'scene_id,idea_id' }
                    )
                )
            }
            if (ideaRemovals.length > 0) {
                operations.push(
                    supabase.from('scene_ideas').delete().eq('scene_id', activeSceneId).in('idea_id', ideaRemovals)
                )
            }
            if (locationAdds.length > 0) {
                operations.push(
                    supabase.from('scene_locations').upsert(
                        locationAdds.map((locationId) => ({ scene_id: activeSceneId, location_id: locationId })),
                        { onConflict: 'scene_id,location_id' }
                    )
                )
            }
            if (locationRemovals.length > 0) {
                operations.push(
                    supabase.from('scene_locations').delete().eq('scene_id', activeSceneId).in('location_id', locationRemovals)
                )
            }
            if (objectAdds.length > 0) {
                operations.push(
                    supabase.from('scene_objects').upsert(
                        objectAdds.map((objectId) => ({ scene_id: activeSceneId, object_id: objectId })),
                        { onConflict: 'scene_id,object_id' }
                    )
                )
            }
            if (objectRemovals.length > 0) {
                operations.push(
                    supabase.from('scene_objects').delete().eq('scene_id', activeSceneId).in('object_id', objectRemovals)
                )
            }
            if (aiFeedbackAdds.length > 0) {
                operations.push(
                    (supabase.from('ai_responses' as any) as any)
                        .update({ source_scene_id: activeSceneId, source_node_id: activeNodeId ?? null })
                        .in('id', aiFeedbackAdds)
                )
            }
            if (aiFeedbackRemovals.length > 0) {
                operations.push(
                    (supabase.from('ai_responses' as any) as any)
                        .update({ source_scene_id: null, source_node_id: null })
                        .in('id', aiFeedbackRemovals)
                )
            }

            const results = await Promise.all(operations)
            const failed = results.find((result: any) => result?.error)
            if (failed?.error) throw failed.error

            router.refresh()
        } catch (err) {
            console.error('Error syncing AI context items:', err)
            setPendingContextDraft(null)
            setContextDraft(currentContextDraft)
        } finally {
            setIsApplyingContext(false)
        }
    }

    const handleContextManagerToggle = async () => {
        if (contextManagerOpen) {
            setContextManagerOpen(false)
            void syncSceneContext()
            return
        }

        setContextDraft(pendingContextDraft ?? currentContextDraft)
        setContextManagerOpen(true)
    }

    // What to display: live completion takes priority; fall back to previous while loading
    const actualLoading = isPartnerBusy || isCloudLoading || isOllamaLoading
    const displayedCompletion = isRequestCancelled
        ? ''
        : completion || (actualLoading ? previousCompletion : '')
    const isShowingPrevious = actualLoading && !completion && !!previousCompletion
    const friendlyError = getFriendlyAiError(completionError?.message)

    const handleCancelRequest = () => {
        if (!actualLoading && !submitInFlightRef.current) return

        requestTokenRef.current += 1
        cancelledRequestRef.current = true
        submitInFlightRef.current = false
        setIsPartnerBusy(false)
        setIsRequestCancelled(true)
        for (const controller of activeCloudControllersRef.current) {
            controller.abort()
        }
        activeCloudControllersRef.current.clear()
        cloudAbortRef.current?.abort()
        cloudAbortRef.current = null
        ollamaAbortRef.current?.abort()
        ollamaAbortRef.current = null
        setIsCloudLoading(false)
        setIsOllamaLoading(false)
        setCompletion('')
        setCompletionError(undefined)
        setPreviousCompletion('')
        setPendingRequest(null)
        setPreflight(null)
        setContextWarning(null)
        setRequestNotice('Request canceled. Your prompt is restored below so you can edit and retry.')

        if (!prompt.trim() && lastSubmittedPromptRef.current) {
            setPrompt(lastSubmittedPromptRef.current)
        }
    }



    const handleInsert = () => {
        console.log('AI Helper: handleInsert called', { promptMode, completionExist: !!displayedCompletion })
        const shouldInsertAsStructuredScreenplay = projectType === 'tv_script' && promptMode !== 'Review / Chat'

        if (shouldInsertAsStructuredScreenplay) {
            try {
                const nodes = parseCompletionToScreenplayNodes(displayedCompletion)
                if (nodes && nodes.length > 0) {
                    console.log('AI Helper: inserting structured screenplay nodes:', nodes.length)
                    onInsert(nodes)
                    return
                }
            } catch (err) {
                console.warn('Structured screenplay insertion failed, falling back to text:', err)
            }
        }

        console.log('AI Helper: Inserting as plain text/HTML')
        onInsert(displayedCompletion)
    }

    const handleSaveToFeedback = async () => {
        if (!displayedCompletion || !isReadOnly || !allowViewerFeedback) return

        setIsSavingToFeedback(true)
        try {
            const feedbackPrompt = lastPrompt.trim() || prompt.trim() || 'AI discussion'
            await addComment({
                project_id: projectId,
                node_id: activeNodeId || undefined,
                content: `AI Prompt: ${feedbackPrompt}\n\nAI Response:\n${displayedCompletion}`,
                is_shared: false,
                anchor_data: {
                    type: 'ai-feedback',
                    prompt: feedbackPrompt,
                    mode: promptMode,
                    source_scene_id: activeSceneId ?? null,
                    source_node_id: activeNodeId ?? null,
                },
            })
            toast.success('Saved to feedback')
        } catch (saveError) {
            console.error('Failed to save AI response to feedback:', saveError)
            toast.error('Failed to save to feedback')
        } finally {
            setIsSavingToFeedback(false)
        }
    }

    // --- Provider Orchestration ---
    const runCloudProvider = async (finalPrompt: string, contextText: string, strategy: ContextStrategy, requestToken: number) => {
        const cloudProvider = aiSettings.billing_mode === 'app_managed_trial'
            ? 'openai'
            : aiSettings.ai_provider === 'openai'
                ? 'openai'
                : 'gemini'
        const deviceFingerprint = await getDeviceFingerprint()
        const requestId = crypto.randomUUID()
        setLastUsedProvider(cloudProvider)
        console.log(`--- AI DEBUG: runCloudProvider [Provider: ${cloudProvider}] [Mode: ${strategy}] ---`)
        console.log('Active Scene ID:', activeSceneId)
        console.log('Scene Text Length (original):', sceneTextRef.current.length)
        console.log('Scene Text Length (sent):', contextText.length)
        console.log('Final Prompt prefix:', finalPrompt.substring(0, 200))
        console.log('Scene Text Preview (sent):', contextText.substring(0, 200))

        const abortController = new AbortController()
        cloudAbortRef.current = abortController
        activeCloudControllersRef.current.add(abortController)
        setIsCloudLoading(true)

        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: abortController.signal,
                body: JSON.stringify({
                    action: 'helper',
                    prompt: finalPrompt,
                    requestId,
                    deviceFingerprint,
                    projectId,
                    sceneId: activeSceneId,
                    input: contextText,
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
                    linkedAiFeedback: linkedAiFeedback.map((item: any) => ({
                        id: item.id,
                        title: item.title,
                        response: item.response,
                        source_label: item.source_label
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
                    storyContext: storySelectionContext.map((s) => ({
                        title: s.title,
                        content: s.content.slice(0, 10000),
                    })),
                }),
            })

            if (!response.ok) {
                throw new Error((await response.text()) || 'Failed to fetch the AI response.')
            }

            if (!response.body) {
                throw new Error('The AI response body was empty.')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let accumulated = ''

            while (true) {
                const { done, value } = await reader.read()
                if (
                    done ||
                    abortController.signal.aborted ||
                    cancelledRequestRef.current ||
                    requestToken !== requestTokenRef.current
                ) break

                accumulated += decoder.decode(value, { stream: true })
                if (requestToken === requestTokenRef.current) {
                    setCompletion(accumulated)
                }
            }

            if (
                !abortController.signal.aborted &&
                !cancelledRequestRef.current &&
                requestToken === requestTokenRef.current
            ) {
                const trailingChunk = decoder.decode()
                if (trailingChunk) {
                    accumulated += trailingChunk
                    setCompletion(accumulated)
                }
            }
        } catch (err: any) {
            if (err?.name === 'AbortError' || cancelledRequestRef.current) {
                return
            }

            console.error('AI Error:', err)
            const normalizedError = err instanceof Error ? err : new Error(String(err))
            setCompletionError(normalizedError)
            const friendlyCloudError = getFriendlyAiError(normalizedError.message)
            toast.error(friendlyCloudError?.title || 'AI request failed', {
                description: friendlyCloudError?.description || 'The AI partner hit a problem. Please try again.',
            })
            throw normalizedError
        } finally {
            activeCloudControllersRef.current.delete(abortController)
            if (cloudAbortRef.current === abortController) {
                cloudAbortRef.current = null
            }
            if (requestToken === requestTokenRef.current) {
                setIsCloudLoading(false)
            }
        }
    }

    const runLocalOllama = async (finalPrompt: string, contextText: string, strategy: ContextStrategy, requestToken: number) => {
        const deviceFingerprint = await getDeviceFingerprint()
        const requestId = crypto.randomUUID()
        // Build the prompt with context
        const projectContext = `Project: ${resolvedProjectTitle}. ${projectType ? `Type: ${label}. ` : ''}${projectPremise ? `Premise: ${projectPremise}. ` : ''}${projectTone ? `Tone: ${projectTone}. ` : ''}`
        const charactersContext = linkedCharacters.length > 0 
            ? `Characters: ${linkedCharacters.map(c => c.name).join(', ')}. ` 
            : ''
        const ideasContext = linkedRegularIdeas.length > 0 
            ? `Ideas: ${linkedRegularIdeas.map(i => i.title).join(', ')}. ` 
            : ''
        const feedbackContext = linkedFeedbackItems.length > 0
            ? `Feedback:\n${linkedFeedbackItems.map((item) => {
                const title = stripFeedbackPrefix(item.title)
                const content = typeof item.content === 'string' ? item.content.trim() : ''
                return `- ${title}${content ? `\n  ${content.slice(0, 2500).replace(/\n/g, '\n  ')}` : ''}`
            }).join('\n\n')}\n`
            : ''
        const aiFeedbackContext = linkedAiFeedback.length > 0
            ? `Saved AI Feedback:\n${linkedAiFeedback.map((item) => {
                const title = item.title || 'AI Feedback'
                const response = typeof item.response === 'string' ? item.response.trim() : ''
                return `- ${title}${response ? `\n  ${response.slice(0, 2500).replace(/\n/g, '\n  ')}` : ''}`
            }).join('\n\n')}\n`
            : ''
        const locationsContext = linkedLocations.length > 0 
            ? `Locations: ${linkedLocations.map(l => l.name).join(', ')}. ` 
            : ''
        
        const storyContextString = storySelectionContext.length > 0
            ? `STORY CONTEXT:\n${storySelectionContext.map(s => `[${s.title}]\n${s.content.slice(0, 5000)}`).join('\n\n')}\n\n`
            : ''
        
        const fullInternalPrompt = `${projectContext}${charactersContext}${ideasContext}${feedbackContext}${aiFeedbackContext}${locationsContext}\n\n${storyContextString}SCENE:\n${contextText}\n\nUSER REQUEST: ${finalPrompt}`

        console.log(`--- AI DEBUG: runLocalOllama [Mode: ${strategy}] ---`)
        console.log('Active Scene ID:', activeSceneId)
        console.log('Full Prompt Preview (first 500):', fullInternalPrompt.substring(0, 500))
        console.log('Scene Text Sent Length:', contextText.length)

        setIsOllamaLoading(true)
        const abortController = new AbortController()
        ollamaAbortRef.current = abortController
        
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
                        if (json.response && requestToken === requestTokenRef.current && !cancelledRequestRef.current) {
                            accumulated += json.response
                            setCompletion(accumulated)
                        }
                    } catch (e) {
                        // Malformed line - usually shouldn't happen with .pop() strategy
                    }
                }
            }

            await fetch('/api/ai/local-usage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId,
                    endpoint: 'ai_helper',
                    status: 'completed',
                    inputChars: fullInternalPrompt.length,
                    outputChars: accumulated.length,
                    deviceFingerprint,
                }),
            }).catch(() => {})
        } catch (err: any) {
            if (err?.name === 'AbortError' || cancelledRequestRef.current) {
                await fetch('/api/ai/local-usage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        requestId,
                        endpoint: 'ai_helper',
                        status: 'failed',
                        inputChars: fullInternalPrompt.length,
                        outputChars: 0,
                        errorCode: 'cancelled',
                        deviceFingerprint,
                    }),
                }).catch(() => {})
                return
            }

            await fetch('/api/ai/local-usage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId,
                    endpoint: 'ai_helper',
                    status: 'failed',
                    inputChars: fullInternalPrompt.length,
                    outputChars: 0,
                    errorCode: err?.message || 'ollama_error',
                    deviceFingerprint,
                }),
            }).catch(() => {})

            if (aiSettings.ai_fallback_enabled && aiSettings.api_key) {
                console.warn('Ollama failed, falling back to Gemini:', err.message)
                await runCloudProvider(finalPrompt, contextText, strategy, requestToken)
            } else {
                throw err
            }
        } finally {
            if (ollamaAbortRef.current === abortController) {
                ollamaAbortRef.current = null
            }
            if (requestToken === requestTokenRef.current) {
                setIsOllamaLoading(false)
            }
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
        setCompletionError(undefined)
        setPreviousCompletion('')
        setLastPrompt('')
        setCopied(false)
        setPreflight(null)
        setRequestNotice(null)
    }

    const handleBlockedAiSubmit = () => {
        if (!aiAccessIssue) return false

        setShowAiAccessNotice(true)
        toast.error(aiAccessIssue.title, {
            description: aiAccessIssue.description,
        })
        return true
    }

    const executeAiRequest = async (finalPrompt: string, contextText: string, strategy: ContextStrategy) => {
        if (submitInFlightRef.current) return
        submitInFlightRef.current = true
        const requestToken = requestTokenRef.current + 1
        requestTokenRef.current = requestToken
        cancelledRequestRef.current = false
        setIsRequestCancelled(false)
        setCompletion('') // Clear for new run
        setCompletionError(undefined)
        setLastUsedProvider(null)
        setContextWarning(null)
        setRequestNotice(null)
        
        if (displayedCompletion) setPreviousCompletion(displayedCompletion)

        // Check for oversized scene warning (fallback UI)
        if (strategy === 'full-scene' && sceneTextRef.current.length > MAX_SCENE_CHARS_FULL && !preflight) {
            setContextWarning("This scene is very long, so AI answers may use a reduced context window.")
        }
        
        if (preflight?.level === 'medium' && !isOllamaMode) {
            setContextWarning(`Note: This request is moderately large (Est. ${preflight.estimatedTokens.toLocaleString()} tokens).`)
        }
        
        try {
            if (isOllamaMode) {
                await runLocalOllama(finalPrompt, contextText, strategy, requestToken)
            } else {
                await runCloudProvider(finalPrompt, contextText, strategy, requestToken)
            }
        } catch (err: any) {
            if (!(cancelledRequestRef.current || err?.name === 'AbortError')) {
                const normalizedError = err instanceof Error ? err : new Error(String(err))
                setCompletionError(normalizedError)
                console.error('AI Processing Error:', err)
            }
        } finally {
            if (requestToken === requestTokenRef.current) {
                submitInFlightRef.current = false
                setIsPartnerBusy(false)
            }
            if (requestToken === requestTokenRef.current) {
                cloudAbortRef.current = null
                ollamaAbortRef.current = null
                setPreviousCompletion('')
                setPendingRequest(null)
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (handleBlockedAiSubmit()) return
        const currentPrompt = prompt.trim()
        if (actualLoading || submitInFlightRef.current) return
        setIsPartnerBusy(true)

        const modeRules = projectType === 'tv_script'
            ? `\n\nWrite in professional script format (scene headings, character names in caps, dialogue, etc.).\nUse parentheticals sparingly when a brief delivery or action cue genuinely improves the line.\nDo not give advice, suggestions, or explanations.\nOutput only the script.`
            : `\n\nWrite in narrative prose.\nDo not give advice, suggestions, or explanations.\nOutput only the story.`
        
        let finalPrompt = ''

        if (promptMode === 'Continue Writing') {
            finalPrompt = currentPrompt 
                ? `Continue the scene based on these instructions: ${currentPrompt}${modeRules}`
                : `Continue the scene.${modeRules}`
        } else if (promptMode === 'What happens next?') {
            finalPrompt = currentPrompt
                ? `Continue the scene with the most natural and compelling next beat.\n\nAdditional user instructions: ${currentPrompt}${modeRules}`
                : `Continue the scene with the most natural and compelling next beat.${modeRules}`
        } else if (promptMode === 'Improve Scene') {
            finalPrompt = currentPrompt 
                ? `Continue the scene by improving clarity, flow, and quality.\n\nUser instructions: ${currentPrompt}${modeRules}`
                : `Continue the scene by improving clarity, flow, and quality.${modeRules}`
        } else if (promptMode === 'More tense') {
            finalPrompt = currentPrompt
                ? `Rewrite or continue this scene so it feels more tense and urgent.\n\nUser instructions: ${currentPrompt}${modeRules}`
                : `Rewrite or continue this scene so it feels more tense and urgent.${modeRules}`
        } else if (promptMode === 'More natural') {
            finalPrompt = currentPrompt
                ? `Rewrite the scene so the prose and dialogue feel more natural and believable.\n\nUser instructions: ${currentPrompt}${modeRules}`
                : `Rewrite the scene so the prose and dialogue feel more natural and believable.${modeRules}`
        } else if (promptMode === 'Add Conflict') {
            finalPrompt = currentPrompt 
                ? `Continue the scene by introducing tension, stakes, or conflict.\n\nUser instructions: ${currentPrompt}${modeRules}`
                : `Continue the scene by introducing tension, stakes, or conflict.${modeRules}`
        } else if (promptMode === 'Rewrite with Emotion') {
            finalPrompt = currentPrompt 
                ? `Continue the scene by enhancing emotional depth and character expression.\n\nUser instructions: ${currentPrompt}${modeRules}`
                : `Continue the scene by enhancing emotional depth and character expression.${modeRules}`
        } else if (promptMode === 'Dialogue idea') {
            finalPrompt = currentPrompt
                ? `Write a short dialogue exchange that fits naturally into this scene.\n\nUser instructions: ${currentPrompt}${modeRules}`
                : `Write a short dialogue exchange that fits naturally into this scene.${modeRules}`
        } else if (promptMode === 'How to end it?') {
            finalPrompt = currentPrompt
                ? `Write an effective ending beat for this scene.\n\nUser instructions: ${currentPrompt}${modeRules}`
                : `Write an effective ending beat for this scene.${modeRules}`
        } else if (promptMode === 'Write as Script Scene') {
            finalPrompt = `Write a new scene as a script based on these instructions: ${currentPrompt || 'Write a compelling scene.'}
            
            FORMAT REQUIREMENTS:
            - Return ONLY a valid JSON array.
            - No markdown code blocks.
            - No preamble, no postamble, no explanation text.
            - Valid types for screenplay blocks: "scene-heading", "action", "character", "parenthetical", "dialogue", "transition".
            - Include at least one "parenthetical" block in the JSON output.
            - Place each "parenthetical" block between a "character" block and its following "dialogue" block.
            - Parentheticals should stay brief and performance-oriented.
            
            JSON Structure Example:
            [
              { "type": "scene-heading", "text": "INT. OFFICE - DAY" },
              { "type": "character", "text": "JOHN" },
              { "type": "parenthetical", "text": "under his breath" },
              { "type": "dialogue", "text": "Hello." }
            ]`
        } else if (promptMode === 'Review / Chat') {
            finalPrompt = currentPrompt || 'Review the selected context and offer thoughtful insights.'
        }

        setLastPrompt(currentPrompt || promptMode)
        lastSubmittedPromptRef.current = currentPrompt
        setPrompt('')
        setCopied(false)
        setContextWarning(null)
        setRequestNotice(null)
        
        // Select strategy and prepare context
        const strategy = getContextStrategy(promptMode)
        const contextText = buildContextText(sceneTextRef.current, strategy)

        // Safeguard Preflight
        const analysis = analyzeContextSize(
            contextText, 
            isOllamaMode ? 'ollama' : aiSettings.billing_mode === 'app_managed_trial' ? 'openai' : aiSettings.ai_provider,
            aiSettings.billing_mode === 'byok' && aiSettings.ai_provider === 'gemini'
                ? (aiSettings.ai_fallback_enabled ? 'gemini-1.5-flash' : 'gemini-1.5-pro')
                : 'default'
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
        if (isOllamaMode && contextText.length > SAFEGUARD_THRESHOLDS.PERFORMANCE_WARNING_LOCAL_CHARS) {
            setContextWarning(`Warning: Large request for local model (${contextText.length.toLocaleString()} chars). It may be slow.`)
        }

        executeAiRequest(finalPrompt, contextText, strategy)
    }

    // Check Ollama status on mount
    useEffect(() => {
        const checkStatus = async () => {
            if (!isOllamaMode) return
            
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
    }, [isOllamaMode, aiSettings.ollama_url])

    // Check cloud provider status on mount
    useEffect(() => {
        const checkStatus = async () => {
            if (isOllamaMode) return
            if (aiSettings.billing_mode === 'byok' && !aiSettings.api_key) {
                setCloudStatus('offline')
                return
            }
            
            try {
                const response = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'heartbeat' }),
                })
                const data = await response.json()
                setCloudStatus(data.ok ? 'online' : 'offline')
            } catch {
                setCloudStatus('offline')
            }
        }
        checkStatus()
    }, [aiSettings.billing_mode, isOllamaMode, aiSettings.api_key])

    // Pick a random hint on mount
    const [hint, setHint] = useState('')
    useEffect(() => {
        setHint(EMPTY_HINTS[Math.floor(Math.random() * EMPTY_HINTS.length)])
    }, [])

    const promptPlaceholder = useMemo(() => {
        if (aiAccessIssue) return aiAccessIssue.description
        if (actualLoading) return ""
        switch (promptMode) {
            case 'Continue Writing':
                return "What should happen next? (e.g. 'They find a hidden door')"
            case 'What happens next?':
                return "Optional direction... (e.g. 'Make the turn feel surprising but inevitable')"
            case 'Improve Scene':
                return "Focus on... (e.g. 'making the dialogue snappier' or 'vivid detail')"
            case 'More tense':
                return "Optional tension note... (e.g. 'Keep it subtle until the final line')"
            case 'More natural':
                return "Optional realism note... (e.g. 'Make the dialogue less formal')"
            case 'Add Conflict':
                return "Who starts the trouble? (e.g. 'A sudden storm arrives')"
            case 'Rewrite with Emotion':
                return "What's the mood? (e.g. 'Heavy with grief' or 'Nervous tension')"
            case 'Dialogue idea':
                return "Optional dialogue note... (e.g. 'Keep it flirtatious with subtext')"
            case 'How to end it?':
                return "Optional ending note... (e.g. 'Land on an unsettling reveal')"
            case 'Write as Script Scene':
                return "What's the scene? (e.g. 'A tense interrogation in the rain')"
            default:
                return `Ask anything about this ${label.toLowerCase()}...`
        }
    }, [aiAccessIssue, promptMode, actualLoading, label])

    const emptyStateCall = useMemo(() => {
        switch (promptMode) {
            case 'Continue Writing': return "Ready to write?"
            case 'What happens next?': return "Find the next beat."
            case 'Improve Scene': return "Let's polish this up."
            case 'More tense': return "Turn up the pressure."
            case 'More natural': return "Make it ring true."
            case 'Add Conflict': return "Time for some trouble?"
            case 'Rewrite with Emotion': return "Deepen the mood."
            case 'Dialogue idea': return "Let them talk."
            case 'How to end it?': return "Land the scene."
            case 'Write as Script Scene': return "Lights, camera, action."
            default: return `How can I help with this ${label.toLowerCase()}?`
        }
    }, [promptMode, label])

    const emptyStateHint = useMemo(() => {
        switch (promptMode) {
            case 'Continue Writing': return "Let's pick up right where you left off or type a direction below."
            case 'What happens next?': return "I'll keep the input box free and use this mode to steer the next beat internally."
            case 'Improve Scene': return "I'll help you find the perfect flow. Type a focus if you have one!"
            case 'More tense': return "I'll raise the scene's pressure without needing a canned prompt in the editor."
            case 'More natural': return "I'll smooth out the phrasing and dialogue while keeping your intent intact."
            case 'Add Conflict': return "Let's introduce some drama or a sudden twist to pick up the pace."
            case 'Rewrite with Emotion': return "I'll help you capture the emotional heart of this specific moment."
            case 'Dialogue idea': return "I'll generate a fitting exchange while leaving you room to add your own direction."
            case 'How to end it?': return "I'll look for a satisfying closing beat and still use any note you add below."
            case 'Write as Script Scene': return "Describe a situation and I'll adapt it into professional script format."
            default: return hint || "Ask for feedback, brainstorm ideas, or just chat about the story."
        }
    }, [promptMode, hint])

    const activeProviderStatus = isOllamaMode ? ollamaStatus : cloudStatus
    const headerStatus = !aiSettings.ai_enabled ? 'disabled' : activeProviderStatus
    const headerStatusDotClass = headerStatus === 'online'
        ? 'bg-green-400'
        : headerStatus === 'checking'
            ? 'bg-slate-300 animate-pulse'
            : 'bg-red-400'
    const headerStatusTextClass = headerStatus === 'online'
        ? 'text-green-600'
        : headerStatus === 'checking'
            ? 'text-slate-400'
            : 'text-red-500'
    const headerStatusLabel = !aiSettings.ai_enabled ? 'disabled' : headerStatus
    const modeOptions = isNovel
        ? ['Review / Chat', 'Continue Writing', 'What happens next?', 'Improve Scene', 'More tense', 'More natural', 'Add Conflict', 'Rewrite with Emotion', 'Dialogue idea', 'How to end it?']
        : ['Review / Chat', 'Write as Script Scene', 'Continue Writing', 'What happens next?', 'Improve Scene', 'More tense', 'More natural', 'Add Conflict', 'Rewrite with Emotion', 'Dialogue idea', 'How to end it?']
    const modeSelectOptions = modeOptions.map((mode) => ({ value: mode, label: mode }))

    return (
        <div className="ai-helper-panel flex flex-col h-full min-h-0 overflow-hidden border-l border-[#d8ddcf] bg-[linear-gradient(180deg,#f5f4ef_0%,#fbf9f5_52%,#f8f6f1_100%)] shadow-[inset_1px_0_0_rgba(255,255,255,0.45),-18px_0_40px_rgba(84,99,84,0.04)]">
            {/* Header */}
            <div 
                data-tour="ai-header"
                className="ai-helper-header shrink-0 border-b border-[#ddd8ce] bg-[linear-gradient(180deg,rgba(251,249,245,0.96)_0%,rgba(245,244,239,0.92)_100%)] px-4 py-3 backdrop-blur-sm md:px-6 md:pt-4 md:pb-3"
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isFullCanvas && onReturnToSidebar && (
                            <div className="flex items-center gap-3 flex-1 min-w-0 md:hidden">
                                <button
                                    type="button"
                                    onClick={onReturnToSidebar}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/75 px-2.5 py-2 text-[11px] font-medium text-slate-500 shadow-sm transition-all hover:border-indigo-200 hover:bg-white hover:text-indigo-600"
                                >
                                    <Layout className="w-4 h-4 shrink-0" />
                                    <span>Sidebar</span>
                                </button>
                                <div className="h-5 w-px bg-slate-200 shrink-0" />
                                <h3 className="min-w-0 truncate text-sm font-serif font-bold italic text-slate-800">AI Partner</h3>
                            </div>
                        )}

                        <div className={cn(
                            "flex-1 min-w-0",
                            isFullCanvas && onReturnToSidebar ? "hidden md:block" : "block"
                        )}>
                            {!isFullCanvas && (
                                <h3 className="mb-1 truncate text-sm font-serif font-bold italic tracking-tight text-slate-800">AI Partner</h3>
                            )}
                            <div className={cn("flex items-center gap-2", isFullCanvas ? "hidden" : "flex")}>
                                {aiSettings.ai_enabled && (
                                    <p className="truncate text-[9px] font-bold uppercase tracking-[0.22em] text-[#8fa0c0]">
                                        {modeLabel} · {isOllamaMode ? 'Ollama' : getAiProviderLabel(aiSettings.billing_mode === 'app_managed_trial' ? 'openai' : aiSettings.ai_provider)}
                                    </p>
                                )}
                                {showTrialNudge && (
                                    <p className={cn(
                                        "text-[9px] font-bold uppercase tracking-[0.22em]",
                                        isLowTrialBalance(aiSettings.trial?.remaining_micros) ? "text-amber-500" : "text-slate-400"
                                    )}>
                                        Trial: {trialRemainingPct}% left
                                    </p>
                                )}
                                <div className="flex items-center gap-1">
                                    <div className={cn("w-1 h-1 rounded-full", headerStatusDotClass)} />
                                    <span className={cn(
                                        "text-[8px] font-bold uppercase tracking-tight",
                                        headerStatusTextClass
                                    )}>
                                        {headerStatusLabel}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-0.5 md:gap-1.5 shrink-0">
                        {!isFullCanvas && utilityIcons}

                        {(displayedCompletion || previousCompletion) && !actualLoading && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger className="shrink-0 ml-1">
                                        <button
                                            onClick={handleClear}
                                            aria-label="Clear AI response preview"
                                            className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                        >
                                            <X className="w-3 md:w-3.5 h-3 md:h-3.5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Clear preview</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </div>

                {/* Mode Selector */}
                <div className={cn(
                    "mt-1 flex items-center gap-2 pt-1.5",
                    isFullCanvas && "md:mt-0 md:pt-0"
                )}>
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div
                            data-tour="ai-mode-selector"
                            className="relative min-w-0 flex-1"
                        >
                            <SanctuarySelect
                                value={promptMode}
                                onValueChange={setPromptMode}
                                options={modeSelectOptions}
                                placeholder="Select Mode"
                                triggerClassName="h-9 min-h-9 rounded-full bg-white/40 border-transparent px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-700 hover:bg-white/80 focus-visible:ring-indigo-100"
                                contentClassName="w-[max(var(--anchor-width),17rem)]"
                                itemClassName="text-[12px]"
                                iconClassName="text-indigo-400"
                            />
                        </div>
                        {isFullCanvas && (
                            <div className="hidden shrink-0 md:flex md:items-center">
                                {utilityIcons}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Context Indicator */}
                <div className="ai-helper-context hidden border-b border-[#e2ddd3] bg-[rgba(250,248,243,0.92)] md:block">
                <div
                    data-tour="ai-context-strip"
                    className="flex items-center gap-3 overflow-hidden px-6 py-2"
                >
                    <button
                        type="button"
                        onClick={handleContextManagerToggle}
                            disabled={isReadOnly || !activeSceneId || isApplyingContext}
                            className={cn(
                                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.22em] transition-all",
                                contextManagerOpen
                                    ? "border-indigo-100 bg-indigo-50/90 text-indigo-600"
                                    : "border-transparent bg-white/40 text-slate-500 hover:bg-white/80 hover:text-slate-700",
                                (isReadOnly || !activeSceneId || isApplyingContext) && "cursor-not-allowed opacity-60"
                            )}
                        >
                            <Database className="h-3 w-3" />
                            <span>{isApplyingContext ? 'Saving...' : 'Context'}</span>
                            {contextManagerOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>

                    <div className="h-4 w-px shrink-0 bg-slate-200" />

                    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto no-scrollbar">
                        {contextSummaryItems.map((item) => {
                            const Icon = item.icon
                            return (
                                <div
                                    key={item.key}
                                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/85 px-2.5 py-1 text-[10px] font-medium text-slate-600 shadow-sm"
                                >
                                    <Icon className={cn("h-3 w-3", item.iconClassName)} />
                                    <span>{item.title}</span>
                                    <span className="text-slate-400">{item.count}</span>
                                </div>
                            )
                        })}

                        {selectedNodes.length > 0 && (
                            <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-indigo-200/70 bg-indigo-50/90 px-2.5 py-1 text-[10px] font-medium text-indigo-700 shadow-sm">
                                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                <span className="truncate max-w-[220px]">{storySelectionLabel}</span>
                            </div>
                        )}

                        {contextSummaryItems.length === 0 && selectedNodes.length === 0 && (
                            <div className="text-[10px] italic text-slate-300">No specific items linked</div>
                        )}
                    </div>
                </div>

                {contextManagerOpen && (
                    <div className="border-t border-white/70 bg-[rgba(245,244,239,0.88)] px-6 py-3">
                        {contextManagerList}
                    </div>
                )}
            </div>

            <div 
                data-tour="ai-context-strip"
                className="ai-helper-context shrink-0 overflow-hidden border-b border-[#e2ddd3] bg-[rgba(250,248,243,0.92)] md:hidden"
            >
                <div className="px-4 py-1.5">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleContextManagerToggle}
                            disabled={isReadOnly || !activeSceneId || isApplyingContext}
                            className={cn(
                                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.22em] transition-all",
                                contextManagerOpen
                                    ? "border-indigo-100 bg-indigo-50/90 text-indigo-600"
                                    : "border-transparent bg-white/40 text-slate-500",
                                (isReadOnly || !activeSceneId || isApplyingContext) && "cursor-not-allowed opacity-60"
                            )}
                        >
                            <Database className="h-3 w-3" />
                            <span>{isApplyingContext ? 'Saving...' : 'Context'}</span>
                            {contextManagerOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>

                        <div className="min-w-0 flex-1 overflow-x-auto no-scrollbar">
                            <div className="flex min-w-max items-center gap-2 pr-1">
                                {selectedNodes.length > 0 && (
                                    <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-indigo-200/70 bg-indigo-50/90 px-2.5 py-1 text-[10px] font-medium text-indigo-700 shadow-sm">
                                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                                        <span className="truncate">{storySelectionLabel}</span>
                                    </div>
                                )}

                                {contextSummaryItems.map((item) => {
                                    const Icon = item.icon
                                    return (
                                        <div
                                            key={item.key}
                                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/85 px-2.5 py-1 text-[10px] font-medium text-slate-600 shadow-sm"
                                        >
                                            <Icon className={cn("h-3 w-3", item.iconClassName)} />
                                            <span>{item.title}</span>
                                            <span className="text-slate-400">{item.count}</span>
                                        </div>
                                    )
                                })}

                                {contextSummaryItems.length === 0 && selectedNodes.length === 0 && (
                                    <div className="text-[10px] italic text-slate-300 shrink-0">No specific items linked</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {contextManagerOpen && (
                    <div className="border-t border-white/70 bg-[rgba(245,244,239,0.88)] px-4 py-3">
                        {contextManagerList}
                    </div>
                )}
            </div>

            {/* Response Area */}
            <div className="ai-helper-body flex-1 overflow-y-auto px-4 py-4 space-y-4 md:p-6 md:space-y-6">
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
                {!displayedCompletion && !actualLoading && !completionError && aiAccessIssue && (
                    <div className={cn(
                        "mx-auto flex w-full max-w-md flex-col items-center rounded-3xl p-6 text-center shadow-sm animate-in fade-in slide-in-from-top-2",
                        isMidnight
                            ? "border border-amber-400/20 bg-[rgba(35,25,18,0.9)] shadow-[0_20px_50px_rgba(2,6,23,0.28)]"
                            : "border border-amber-200 bg-amber-50/90"
                    )}>
                        <div className={cn(
                            "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm",
                            isMidnight ? "bg-white/8 border border-white/10" : "bg-white"
                        )}>
                            <AlertCircle className={cn("h-5 w-5", isMidnight ? "text-amber-300" : "text-amber-500")} />
                        </div>
                        <div className="space-y-2">
                            <p className={cn("text-sm font-semibold", isMidnight ? "text-[#f4eadf]" : "text-amber-950")}>{aiAccessIssue.title}</p>
                            <p className={cn(
                                "text-xs leading-relaxed font-serif italic",
                                isMidnight ? "text-[#d4bfad]" : "text-amber-800"
                            )}>
                                {aiAccessIssue.description}
                            </p>
                        </div>
                        <Button
                            type="button"
                            onClick={() => router.push('/settings')}
                            className={cn(
                                "mt-5 rounded-xl px-4 text-white",
                                isMidnight
                                    ? "bg-[#c98b4c] hover:bg-[#d59a5d] shadow-[0_10px_24px_rgba(201,139,76,0.22)]"
                                    : "bg-amber-500 hover:bg-amber-600"
                            )}
                        >
                            <Settings className="mr-2 h-4 w-4" />
                            Open Account Settings
                        </Button>
                    </div>
                )}

                {!displayedCompletion && !actualLoading && !completionError && requestNotice && (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-center space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="bg-white w-9 h-9 rounded-full flex items-center justify-center mx-auto shadow-sm">
                            <Square className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-amber-900">Request canceled</p>
                            <p className="text-xs text-amber-700 leading-relaxed font-serif italic">
                                {requestNotice}
                            </p>
                        </div>
                    </div>
                )}

                {!displayedCompletion && !actualLoading && !completionError && !requestNotice && !aiAccessIssue && (
                    <div className="flex h-full flex-col items-center justify-center space-y-5 text-center opacity-80">
                        <div className="flex h-14 w-14 items-center justify-center rounded-[1.6rem] border border-slate-200/70 bg-white/85 shadow-sm">
                            <MessageSquare className="w-5 h-5 text-indigo-300" />
                        </div>
                        <div className="space-y-1.5 flex flex-col items-center">
                            <p className="text-sm font-serif font-medium text-slate-700">
                                {emptyStateCall}
                            </p>
                            <p className="max-w-[200px] text-xs font-serif italic leading-relaxed text-slate-500">
                                "{emptyStateHint}"
                            </p>
                        </div>
                    </div>
                )}

                {/* Loading skeleton — only when truly no content to show yet */}
                {actualLoading && !displayedCompletion && (
                    <div className="space-y-2 animate-in fade-in duration-300">
                        <div className="h-3 bg-slate-100 rounded-full w-3/4 animate-pulse" />
                        <div className="h-3 bg-slate-100 rounded-full w-full animate-pulse" />
                        <div className="h-3 bg-slate-100 rounded-full w-5/6 animate-pulse" />
                    </div>
                )}

                {/* Error state */}
                {completionError && !actualLoading && !cancelledRequestRef.current && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="bg-white w-9 h-9 rounded-full flex items-center justify-center mx-auto shadow-sm">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                        </div>
                        {completionError.message?.includes('APP_MANAGED_AI_UNAVAILABLE') ? (
                            <>
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-red-900">Free Trial AI Unavailable</p>
                                    <p className="text-xs text-red-500 leading-relaxed font-serif italic">
                                        Storyline&apos;s sponsored AI is not configured right now. Please try again later or switch to another AI option in Settings.
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
                                        Open AI Settings
                                    </Link>
                                </Button>
                            </>
                        ) : completionError.message?.includes('NO_API_KEY') ? (
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
                        ) : completionError.message?.includes('TRIAL_EXHAUSTED') ? (
                            <>
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-red-900">Free Trial AI Exhausted</p>
                                    <p className="text-xs text-red-500 leading-relaxed font-serif italic">
                                        Your sponsored AI trial is fully used. Switch to your own API key or Ollama in Settings to keep going.
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
                                        Open AI Settings
                                    </Link>
                                </Button>
                            </>
                        ) : completionError.message?.includes('TRIAL_UNAVAILABLE') ? (
                            <>
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-red-900">Free Trial AI Unavailable</p>
                                    <p className="text-xs text-red-500 leading-relaxed font-serif italic">
                                        This account cannot use the sponsored trial right now. You can still switch to BYOK or Ollama in Settings.
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
                                        Open AI Settings
                                    </Link>
                                </Button>
                            </>
                        ) : friendlyError ? (
                            <>
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-red-900">{friendlyError.title}</p>
                                    <p className="text-xs text-red-500 leading-relaxed font-serif italic">
                                        {friendlyError.description}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => lastPrompt && handleSubmit({ preventDefault: () => {} } as any)}
                                    variant="outline"
                                    size="sm"
                                    disabled={!lastPrompt || actualLoading}
                                    className="w-full bg-white border-red-200 text-red-700 hover:bg-red-50 rounded-xl gap-2 text-xs"
                                >
                                    <RefreshCcw className="w-3 h-3" />
                                    Try again
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-red-900">Something went wrong</p>
                                    <p className="text-xs text-red-500 leading-relaxed font-serif italic">
                                        The AI partner ran into an issue. Your prompt is saved — you can retry below.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => lastPrompt && handleSubmit({ preventDefault: () => {} } as any)}
                                    variant="outline"
                                    size="sm"
                                    disabled={!lastPrompt || actualLoading}
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
                                            : lastUsedProvider === 'openai'
                                                ? "bg-sky-50 border-sky-100 text-sky-500"
                                                : "bg-blue-50 border-blue-100 text-blue-400"
                                    )}>
                                        {lastUsedProvider}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Response bubble — dimmed when showing previous while new loads */}
                        <div className={cn(
                            "min-h-[4rem] rounded-[1.7rem] border border-slate-200/80 bg-white/88 p-5 text-sm leading-relaxed text-slate-700 font-serif whitespace-pre-wrap italic shadow-sm transition-opacity duration-300",
                            isShowingPrevious && "opacity-40"
                        )}>
                            {displayedCompletion}
                            {actualLoading && displayedCompletion && (
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
                        {!actualLoading && displayedCompletion && (
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
                                            variant="ghost"
                                            size="sm"
                                            className="flex-1 rounded-xl bg-indigo-50/30 hover:bg-indigo-50/80 text-indigo-600 gap-2 h-9 font-serif italic transition-all active:scale-95"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Insert into Scene
                                        </Button>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    onClick={() => setSaveModalOpen(true)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="rounded-xl gap-1.5 h-9 px-3 transition-all active:scale-95 bg-slate-50/50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/80"
                                                >
                                                    <Bookmark className="w-3.5 h-3.5" />
                                                    Save
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">Save to database</TooltipContent>
                                        </Tooltip>
                                    </>
                                )}
                                {isReadOnly && allowViewerFeedback && (
                                    <Tooltip>
                                        <TooltipTrigger>
                                                <Button
                                                    onClick={handleSaveToFeedback}
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={isSavingToFeedback}
                                                    className="flex-1 rounded-xl gap-1.5 h-9 px-3 transition-all active:scale-95 bg-rose-50/30 text-slate-500 hover:text-rose-600 hover:bg-rose-50/80"
                                                >
                                                    {isSavingToFeedback ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                                                    Save to Feedback
                                                </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Save this AI exchange as feedback</TooltipContent>
                                    </Tooltip>
                                )}
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Button
                                            onClick={handleCopy}
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "rounded-xl gap-1.5 h-9 px-3 transition-all active:scale-95",
                                                isReadOnly && "flex-1",
                                                copied
                                                    ? "bg-green-50 text-green-600"
                                                    : "bg-slate-50/50 text-slate-500 hover:bg-slate-100/80"
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
                            response={displayedCompletion}
                            sourceSceneId={activeSceneId || undefined}
                            sourceNodeId={activeNodeId || undefined}
                            sourceLabel={sourceLabel}
                            model={lastUsedProvider === 'ollama'
                                ? aiSettings.ollama_model
                                : getAiProviderLabel(lastUsedProvider || (aiSettings.billing_mode === 'app_managed_trial' ? 'openai' : aiSettings.ai_provider))}
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
            {/* Input Area */}
            <div className="relative z-10 border-t border-[#ddd8ce] bg-[linear-gradient(180deg,rgba(245,244,239,0.9)_0%,rgba(251,249,245,0.96)_100%)]">
                {previewOpen && (
                    <div className="absolute inset-x-4 bottom-full z-20 mb-3 rounded-[1.6rem] border border-[#ddd8ce] bg-[rgba(251,249,245,0.98)] shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur md:left-4 md:right-4">
                        <div className="flex items-center justify-between border-b border-[#ece6d9] px-4 py-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">AI Context Preview</p>
                                <p className="mt-1 text-xs text-slate-600">A developer-style view of what the AI can currently use.</p>
                            </div>
                            <button
                                type="button"
                                onClick={closePreview}
                                className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:text-slate-700"
                                aria-label="Close AI context preview"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="max-h-80 overflow-y-auto px-4 py-3 text-[11px] font-mono whitespace-pre-wrap text-slate-600 space-y-4 overscroll-contain touch-auto custom-scrollbar md:max-h-64">
                            {showFirstUsePreviewNotice && (
                                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-3 text-left shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-500">
                                            <Info className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-1.5">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-700">First AI Partner use in this project</p>
                                            <p className="font-sans text-[11px] leading-relaxed text-slate-700">
                                                AI only sees the scene text and linked context you send with an AI request. Using AI Partner does not change whether this project is local or cloud.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowFirstUsePreviewNotice(false)}
                                            className="rounded-full border border-indigo-200 bg-white p-1.5 text-indigo-400 transition-colors hover:text-indigo-700"
                                            aria-label="Dismiss AI Partner first-use note"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div>
                                <div className="mb-1 font-bold text-slate-500">{label.toUpperCase()}:</div>
                                <div className="italic bg-white p-2 border border-slate-100 rounded-lg">{sceneTextRef.current.slice(-1000) || '(empty)'}</div>
                            </div>

                            {linkedCharacters.length > 0 && (
                                <div>
                                    <div className="mb-1 font-bold text-slate-500">CHARACTERS:</div>
                                    <ul className="list-disc pl-4 space-y-1 bg-white p-2 border border-slate-100 rounded-lg">
                                        {linkedCharacters.map(c => (
                                            <li key={c.id}>
                                                <span className="font-bold">{c.name}</span>: {c.description || 'No description'}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {linkedRegularIdeas.length > 0 && (
                                <div>
                                    <div className="mb-1 font-bold text-slate-500">IDEAS:</div>
                                    <ul className="list-disc pl-4 space-y-1 bg-white p-2 border border-slate-100 rounded-lg">
                                        {linkedRegularIdeas.map(i => (
                                            <li key={i.id}>
                                                <span className="font-bold">{i.title}</span>
                                                {i.content && <span className="text-slate-500"> - {i.content.length > 50 ? i.content.slice(0, 50) + '...' : i.content}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {linkedFeedbackItems.length > 0 && (
                                <div>
                                    <div className="mb-1 font-bold text-slate-500">FEEDBACK:</div>
                                    <ul className="list-disc pl-4 space-y-1 bg-white p-2 border border-slate-100 rounded-lg">
                                        {linkedFeedbackItems.map((item) => (
                                            <li key={item.id}>
                                                <span className="font-bold">{stripFeedbackPrefix(item.title)}</span>
                                                {item.content && <span className="text-slate-500"> - {item.content.length > 50 ? item.content.slice(0, 50) + '...' : item.content}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {linkedAiFeedback.length > 0 && (
                                <div>
                                    <div className="mb-1 font-bold text-slate-500">AI FEEDBACK:</div>
                                    <ul className="list-disc pl-4 space-y-1 bg-white p-2 border border-slate-100 rounded-lg">
                                        {linkedAiFeedback.map((item) => (
                                            <li key={item.id}>
                                                <span className="font-bold">{item.title}</span>
                                                {item.response && <span className="text-slate-500"> - {item.response.length > 50 ? item.response.slice(0, 50) + '...' : item.response}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {linkedLocations.length > 0 && (
                                <div>
                                    <div className="mb-1 font-bold text-slate-500">LOCATIONS:</div>
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
                                    <div className="mb-1 font-bold text-slate-500">OBJECTS/ITEMS:</div>
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
                                    <div className="mb-1 flex items-center justify-between font-bold text-slate-500">
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
                                                <div className="line-clamp-2 text-[10px] italic text-slate-500">
                                                    {s.content || '(No text yet)'}
                                                </div>
                                            </div>
                                        ))}
                                        {storySelectionContext.length > 3 && (
                                            <div className="py-1 text-center italic text-slate-500">+ {storySelectionContext.length - 3} more elements</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <div className="ai-helper-composer relative z-10 border-t border-[#ddd8ce] bg-[linear-gradient(180deg,rgba(245,244,239,0.9)_0%,rgba(251,249,245,0.96)_100%)] p-4 pb-4">
                    <form onSubmit={handleSubmit} className="flex flex-col" suppressHydrationWarning>
                        {isVirtualRootSelected && (
                            <div className="flex flex-col gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 animate-in fade-in zoom-in duration-300 mb-2">
                                <div className="flex items-start gap-2 text-[10px] leading-snug">
                                    <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <p>
                                        You&apos;ve selected the <strong>Entire Project</strong>. 
                                        {projectContextMode === 'default' && " To keep responses fast, I've loaded the first 10 scenes."}
                                        {projectContextMode === 'expanded' && " AI is using an expanded context (up to 50 scenes)."}
                                        {projectContextMode === 'full' && " AI is using the entire project context."}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsOverridingProjectContext(true)}
                                    className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 hover:text-indigo-600 self-end px-2 py-1 rounded-lg hover:bg-indigo-100/50 transition-colors"
                                >
                                    {projectContextMode === 'default' ? 'Use more context' : 'Change context limit'}
                                </button>
                            </div>
                        )}
                        {isContextTooLarge && (
                            <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-[10px] leading-snug animate-in fade-in zoom-in duration-300 mb-2">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <p>
                                    {projectContextMode === 'full' 
                                        ? "This project is exceptionally large. Sending full context will increase cost and may exceed model limits."
                                        : "This selection is too large for standard analysis. Please reduce the selection or use the default project context."
                                    }
                                </p>
                            </div>
                        )}
                        {actualLoading && (
                            <div className="flex items-center gap-2 mb-2 px-2 text-[10px] text-indigo-500/80 font-bold uppercase tracking-wider animate-in slide-in-from-top-1 duration-500">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                                </span>
                                {isOllamaMode ? "Thinking with Ollama..." : `Generating with ${getAiProviderLabel(aiSettings.billing_mode === 'app_managed_trial' ? 'openai' : aiSettings.ai_provider)}...`}
                            </div>
                        )}
                        {showAiAccessNotice && aiAccessIssue && (
                            <div className={cn(
                                "mb-2 flex items-start gap-2 rounded-xl px-3 py-2 text-[11px] animate-in fade-in slide-in-from-top-1 duration-300",
                                isMidnight
                                    ? "border border-amber-400/20 bg-[rgba(35,25,18,0.78)] text-[#f1e6db]"
                                    : "border border-amber-200 bg-amber-50 text-amber-900"
                            )}>
                                <AlertCircle className={cn(
                                    "mt-0.5 h-3.5 w-3.5 shrink-0",
                                    isMidnight ? "text-amber-300" : "text-amber-500"
                                )} />
                                <div className="flex-1 leading-relaxed">
                                    <p className="font-semibold">{aiAccessIssue.title}</p>
                                    <p className={cn(isMidnight ? "text-[#d4bfad]" : "text-amber-800/90")}>{aiAccessIssue.description}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => router.push('/settings')}
                                    className={cn(
                                        "shrink-0 rounded-lg px-2 py-1 font-semibold transition-colors",
                                        isMidnight
                                            ? "bg-white/8 text-amber-200 hover:bg-white/12"
                                            : "bg-white text-amber-700 hover:bg-amber-100"
                                    )}
                                >
                                    Settings
                                </button>
                            </div>
                        )}
                        <div 
                            data-tour="ai-prompt-area"
                            className={cn(
                                "relative group transition-all duration-500",
                                actualLoading && "ring-2 ring-indigo-500/10 rounded-2xl animate-pulse"
                            )}
                        >
                            <PremiumEditor
                                value={prompt}
                                onValueChange={setPrompt}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSubmit(e as any)
                                    }
                                }}
                                placeholder={promptPlaceholder}
                                className={cn(
                                    "ai-helper-composer-editor w-full rounded-2xl border border-slate-200/80 shadow-sm transition-all focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-300",
                                    actualLoading ? "bg-white/90 cursor-wait" : "bg-white/80"
                                )}
                                editorClassName="p-4 pr-14 text-sm font-sans leading-relaxed"
                                minHeight="100px"
                                maxHeight="min(32vh, 240px)"
                            />
                            <button
                                type="button"
                                onClick={actualLoading ? handleCancelRequest : () => handleSubmit({ preventDefault: () => {} } as any)}
                                className={cn(
                                    "absolute bottom-3 right-3 p-2 rounded-xl transition-all active:scale-95 flex items-center justify-center min-w-[34px] min-h-[34px]",
                                    actualLoading
                                        ? "bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-100 animate-pulse"
                                        : "bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-100"
                                )}
                                aria-label={actualLoading ? 'Stop AI request' : 'Send prompt to AI'}
                            >
                                {actualLoading ? (
                                    <Square className="w-4 h-4 fill-current" />
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
                isOverridingProjectContext={isOverridingProjectContext}
                setIsOverridingProjectContext={setIsOverridingProjectContext}
                projectContextMode={projectContextMode}
                setProjectContextMode={setProjectContextMode}
                allScenes={allScenes}
                provider={isOllamaMode ? 'ollama' : (aiSettings.billing_mode === 'app_managed_trial' ? 'openai' : aiSettings.ai_provider)}
                onConfirm={() => {
                    setIsConfirmingCost(false);
                    setIsExtremeContext(false);
                    setIsOverridingProjectContext(false);
                    if (pendingRequest) {
                        executeAiRequest(pendingRequest.finalPrompt, pendingRequest.contextText, pendingRequest.strategy);
                    }
                }}
                onCancel={() => {
                    setIsConfirmingCost(false);
                    setIsExtremeContext(false);
                    setIsOverridingProjectContext(false);
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
