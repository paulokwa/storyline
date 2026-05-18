'use client'

const LEGACY_NEW_PROJECT_DRAFT_KEY = 'storyline-new-project-draft'
const LEGACY_GUIDED_DRAFT_KEY = 'storyline-guided-data-draft'

function newProjectDraftKey(userId: string) {
    return `${LEGACY_NEW_PROJECT_DRAFT_KEY}:${userId}`
}

function guidedDraftKey(userId: string) {
    return `${LEGACY_GUIDED_DRAFT_KEY}:${userId}`
}

function readJson<T>(key: string): T | null {
    if (typeof window === 'undefined') return null

    const saved = localStorage.getItem(key)
    if (!saved) return null

    try {
        return JSON.parse(saved) as T
    } catch (error) {
        console.error('Failed to parse local project setup draft', error)
        return null
    }
}

function writeJson<T>(key: string, value: T) {
    if (typeof window === 'undefined') return

    localStorage.setItem(key, JSON.stringify(value))
}

function removeKey(key: string) {
    if (typeof window === 'undefined') return

    localStorage.removeItem(key)
}

export interface NewProjectDraftPayload<TState, TStep extends string> {
    state: TState
    step: TStep
}

export interface GuidedDraftPayload<TData> {
    data: TData
    stepIndex?: number
}

export function readNewProjectDraft<TState, TStep extends string>(userId: string) {
    return readJson<NewProjectDraftPayload<TState, TStep>>(newProjectDraftKey(userId))
}

export function writeNewProjectDraft<TState, TStep extends string>(
    userId: string,
    payload: NewProjectDraftPayload<TState, TStep>
) {
    writeJson(newProjectDraftKey(userId), payload)
}

export function readGuidedProjectDraft<TData>(userId: string) {
    return readJson<GuidedDraftPayload<TData>>(guidedDraftKey(userId))
}

export function writeGuidedProjectDraft<TData>(userId: string, payload: GuidedDraftPayload<TData>) {
    writeJson(guidedDraftKey(userId), payload)
}

export function clearProjectSetupDrafts(userId: string) {
    removeKey(newProjectDraftKey(userId))
    removeKey(guidedDraftKey(userId))
    clearLegacyProjectSetupDrafts()
}

export function clearLegacyProjectSetupDrafts() {
    removeKey(LEGACY_NEW_PROJECT_DRAFT_KEY)
    removeKey(LEGACY_GUIDED_DRAFT_KEY)
}
