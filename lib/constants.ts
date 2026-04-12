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
