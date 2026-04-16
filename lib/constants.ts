import type { ProjectType, WritingMode } from './supabase/types'

// ⚠️ CRITICAL:
// Internal project types (`novel`, `tv_script`) must NOT be renamed.
// These are persisted values tied to DB schema and existing user data.
// UI labels must be mapped using PROJECT_TYPE_LABELS.
// See internal documentation: Project Type Naming.

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
    novel: 'Book',
    tv_script: 'Screenplay',
}

export function getProjectTypeLabel(type: string | undefined | null) {
    if (!type) return 'Project'
    const label = PROJECT_TYPE_LABELS[type as keyof typeof PROJECT_TYPE_LABELS]
    if (!label) {
        console.warn("Unknown project type label:", type)
        return type
    }
    return label
}

export const DEFAULT_WRITING_MODE_BY_TYPE: Record<ProjectType, WritingMode> = {
    novel: 'simple',
    tv_script: 'screenplay',
}

export const THEME_COVERS = [
    { id: 'comedy', label: 'Comedy', url: '/assets/covers/cover-comedy.png' },
    { id: 'thriller', label: 'Thriller', url: '/assets/covers/cover-thriller.png' },
    { id: 'drama', label: 'Drama', url: '/assets/covers/cover-drama.png' },
    { id: 'fantasy', label: 'Fantasy', url: '/assets/covers/cover-fantasy.png' },
    { id: 'scifi', label: 'Sci-Fi', url: '/assets/covers/cover-scifi.png' },
    { id: 'romance', label: 'Romance', url: '/assets/covers/cover-romance.png' },
    { id: 'mystery', label: 'Mystery', url: '/assets/covers/cover-mystery.png' },
    { id: 'war', label: 'War', url: '/assets/covers/cover-war.png' },
    { id: 'childrens', label: "Children's", url: '/assets/covers/cover-childrens.png' },
]
