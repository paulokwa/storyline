import 'server-only'

import type { Database } from '@/lib/supabase/types'
import { createAdminClient } from '@/lib/supabase/admin'

type AdminUser = {
  id: string
  email: string | null
  created_at: string
  last_sign_in_at: string | null
}
type ProjectRow = Pick<Database['public']['Tables']['projects']['Row'], 'id' | 'user_id'>
type AiResponseRow = Pick<Database['public']['Tables']['ai_responses']['Row'], 'created_at' | 'project_id'>
type AssetRow = Pick<Database['public']['Tables']['project_assets']['Row'], 'file_size'>

type TableEstimateConfig = {
  table: keyof Database['public']['Tables']
  label: string
  fields: string[]
  deletedAtField?: string
}

type StorageBreakdownItem = {
  label: string
  bytes: number
}

export type AdminDashboardData =
  | {
      status: 'misconfigured'
    }
  | {
      status: 'ready'
      stats: {
        totalUsers: number
        newUsersLast7Days: number
        newUsersLast30Days: number
        totalSavedAiResponses: number
        savedAiResponsesLast7Days: number
        savedAiResponsesToday: number
      }
      recentUsers: AdminUser[]
      earlyUsers: AdminUser[]
      aiUsage: Array<{
        userId: string
        email: string | null
        savedResponses: number
        latestSavedResponseAt: string | null
      }>
      storage: {
        totalEstimateBytes: number
        assetBytes: number
        textEstimateBytes: number
        breakdown: StorageBreakdownItem[]
      }
    }

const DAY_MS = 24 * 60 * 60 * 1000
const RECENT_USERS_LIMIT = 12
const EARLY_USERS_LIMIT = 10
const AI_USAGE_LIMIT = 12
const USERS_PAGE_SIZE = 1000

const STORAGE_ESTIMATE_TABLES: TableEstimateConfig[] = [
  { table: 'projects', label: 'Projects', fields: ['title', 'premise', 'setting', 'tone', 'export_metadata', 'cover_url'], deletedAtField: 'deleted_at' },
  { table: 'structure_nodes', label: 'Structure', fields: ['title'], deletedAtField: 'deleted_at' },
  { table: 'scenes', label: 'Scenes', fields: ['content'], deletedAtField: 'deleted_at' },
  { table: 'characters', label: 'Characters', fields: ['name', 'description', 'notes'], deletedAtField: 'deleted_at' },
  { table: 'ideas', label: 'Ideas', fields: ['title', 'content'], deletedAtField: 'deleted_at' },
  { table: 'locations', label: 'Locations', fields: ['name', 'description', 'atmosphere'], deletedAtField: 'deleted_at' },
  { table: 'objects', label: 'Objects', fields: ['name', 'description', 'significance'], deletedAtField: 'deleted_at' },
  { table: 'ai_responses', label: 'Saved AI responses', fields: ['title', 'auto_title', 'prompt', 'response', 'context_snapshot', 'linked_entities'], deletedAtField: 'deleted_at' },
  { table: 'scene_versions', label: 'Scene history', fields: ['content', 'source_text'] },
  { table: 'project_snapshots', label: 'Project snapshots', fields: ['name', 'description', 'snapshot_data'] },
  { table: 'project_comments', label: 'Comments', fields: ['content', 'anchor_data'] },
]

function isWithinLastDays(dateInput: string | null | undefined, days: number, now = Date.now()) {
  if (!dateInput) return false
  const timestamp = new Date(dateInput).getTime()
  return Number.isFinite(timestamp) && now - timestamp <= days * DAY_MS
}

function isToday(dateInput: string | null | undefined, now = new Date()) {
  if (!dateInput) return false
  const date = new Date(dateInput)
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  )
}

function estimateValueBytes(value: unknown) {
  if (value === null || value === undefined) return 0
  if (typeof value === 'string') {
    return new TextEncoder().encode(value).length
  }

  return new TextEncoder().encode(JSON.stringify(value)).length
}

async function fetchAllAuthUsers() {
  const supabase = createAdminClient()
  if (!supabase) {
    return null
  }

  const users: AdminUser[] = []
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: USERS_PAGE_SIZE,
    })

    if (error) {
      throw error
    }

    const pageUsers = (data.users ?? []).map((user) => ({
      id: user.id,
      email: user.email ?? null,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at ?? null,
    }))

    users.push(...pageUsers)

    if (pageUsers.length < USERS_PAGE_SIZE) {
      break
    }

    page += 1
  }

  return users
}

async function estimateTableBytes(tableConfig: TableEstimateConfig) {
  const supabase = createAdminClient()
  if (!supabase) {
    return null
  }

  let query = supabase.from(tableConfig.table).select(tableConfig.fields.join(','))
  if (tableConfig.deletedAtField) {
    query = query.is(tableConfig.deletedAtField, null)
  }

  const { data, error } = await query
  if (error) {
    throw error
  }

  const rows = ((data ?? []) as unknown[]) as Record<string, unknown>[]
  const bytes = rows.reduce((total, row) => {
    return total + tableConfig.fields.reduce((fieldTotal, field) => fieldTotal + estimateValueBytes(row[field]), 0)
  }, 0)

  return {
    label: tableConfig.label,
    bytes,
  }
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const supabase = createAdminClient()
  if (!supabase) {
    return { status: 'misconfigured' }
  }

  const [users, projectsResult, aiResponsesResult, assetsResult, ...storageBreakdown] = await Promise.all([
    fetchAllAuthUsers(),
    supabase.from('projects').select('id,user_id').is('deleted_at', null),
    supabase.from('ai_responses').select('created_at,project_id').is('deleted_at', null),
    supabase.from('project_assets').select('file_size'),
    ...STORAGE_ESTIMATE_TABLES.map(estimateTableBytes),
  ])

  if (!users) {
    return { status: 'misconfigured' }
  }

  if (projectsResult.error) throw projectsResult.error
  if (aiResponsesResult.error) throw aiResponsesResult.error
  if (assetsResult.error) throw assetsResult.error

  const projects = (projectsResult.data ?? []) as ProjectRow[]
  const aiResponses = (aiResponsesResult.data ?? []) as AiResponseRow[]
  const assets = (assetsResult.data ?? []) as AssetRow[]

  const nowMs = Date.now()
  const now = new Date()
  const usersById = new Map(users.map((user) => [user.id, user]))
  const projectToUserId = new Map(projects.map((project) => [project.id, project.user_id]))
  const aiUsageMap = new Map<string, { savedResponses: number; latestSavedResponseAt: string | null }>()

  for (const response of aiResponses) {
    const userId = projectToUserId.get(response.project_id)
    if (!userId) continue

    const current = aiUsageMap.get(userId) ?? { savedResponses: 0, latestSavedResponseAt: null }
    const latestSavedResponseAt =
      !current.latestSavedResponseAt || new Date(response.created_at) > new Date(current.latestSavedResponseAt)
        ? response.created_at
        : current.latestSavedResponseAt

    aiUsageMap.set(userId, {
      savedResponses: current.savedResponses + 1,
      latestSavedResponseAt,
    })
  }

  const sortedNewestUsers = [...users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const sortedEarliestUsers = [...users].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const aiUsage = [...aiUsageMap.entries()]
    .map(([userId, usage]) => ({
      userId,
      email: usersById.get(userId)?.email ?? null,
      savedResponses: usage.savedResponses,
      latestSavedResponseAt: usage.latestSavedResponseAt,
    }))
    .sort((a, b) => {
      if (b.savedResponses !== a.savedResponses) {
        return b.savedResponses - a.savedResponses
      }

      return new Date(b.latestSavedResponseAt ?? 0).getTime() - new Date(a.latestSavedResponseAt ?? 0).getTime()
    })
    .slice(0, AI_USAGE_LIMIT)

  const assetBytes = assets.reduce((total, asset) => total + (asset.file_size ?? 0), 0)
  const textBreakdown = storageBreakdown.filter((item): item is StorageBreakdownItem => Boolean(item))
  const textEstimateBytes = textBreakdown.reduce((total, item) => total + item.bytes, 0)

  return {
    status: 'ready',
    stats: {
      totalUsers: users.length,
      newUsersLast7Days: users.filter((user) => isWithinLastDays(user.created_at, 7, nowMs)).length,
      newUsersLast30Days: users.filter((user) => isWithinLastDays(user.created_at, 30, nowMs)).length,
      totalSavedAiResponses: aiResponses.length,
      savedAiResponsesLast7Days: aiResponses.filter((response) => isWithinLastDays(response.created_at, 7, nowMs)).length,
      savedAiResponsesToday: aiResponses.filter((response) => isToday(response.created_at, now)).length,
    },
    recentUsers: sortedNewestUsers.slice(0, RECENT_USERS_LIMIT),
    earlyUsers: sortedEarliestUsers.slice(0, EARLY_USERS_LIMIT),
    aiUsage,
    storage: {
      totalEstimateBytes: assetBytes + textEstimateBytes,
      assetBytes,
      textEstimateBytes,
      breakdown: [
        { label: 'Uploaded assets', bytes: assetBytes },
        ...textBreakdown,
      ].filter((item) => item.bytes > 0),
    },
  }
}
