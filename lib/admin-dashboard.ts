import 'server-only'

import type { Database, Json } from '@/lib/supabase/types'
import { createAdminClient, getAdminClientConfigStatus } from '@/lib/supabase/admin'
import { BETA_CUTOFF_DATE } from './admin'

type AdminUser = {
  id: string
  email: string | null
  created_at: string
  last_sign_in_at: string | null
  profile?: {
    plan_type: string | null
    is_early_user: boolean | null
  }
}

type ProjectRow = Pick<Database['public']['Tables']['projects']['Row'], 'id' | 'user_id'>
type AiResponseRow = Pick<Database['public']['Tables']['ai_responses']['Row'], 'created_at' | 'project_id'>
type AssetRow = Pick<Database['public']['Tables']['project_assets']['Row'], 'file_size'>
type TrialAccountRow = Pick<
  Database['public']['Tables']['ai_trial_accounts']['Row'],
  | 'user_id'
  | 'status'
  | 'remaining_micros'
  | 'reserved_micros'
  | 'consumed_micros'
  | 'granted_micros'
  | 'grant_count'
  | 'granted_at'
  | 'exhausted_at'
  | 'blocked_reason'
  | 'signup_risk_score'
  | 'signup_ip'
  | 'signup_device_fingerprint'
  | 'normalized_email'
  | 'raw_email'
  | 'email_domain'
  | 'suspicious_flags'
  | 'last_activity_at'
  | 'last_request_ip'
  | 'last_device_fingerprint'
>
type UsageEventRow = Pick<
  Database['public']['Tables']['ai_usage_events']['Row'],
  | 'id'
  | 'user_id'
  | 'request_key'
  | 'endpoint'
  | 'billing_mode'
  | 'provider'
  | 'model'
  | 'status'
  | 'final_micros'
  | 'reserved_micros'
  | 'refunded_micros'
  | 'input_chars'
  | 'output_chars'
  | 'error_code'
  | 'http_status'
  | 'created_at'
  | 'completed_at'
  | 'ip_address'
  | 'device_fingerprint'
  | 'normalized_email'
  | 'metadata'
>
type AbuseSignalRow = Pick<
  Database['public']['Tables']['ai_abuse_signals']['Row'],
  | 'id'
  | 'user_id'
  | 'signal_type'
  | 'risk_score'
  | 'risk_flags'
  | 'created_at'
  | 'ip_address'
  | 'device_fingerprint'
  | 'normalized_email'
  | 'raw_email'
  | 'email_domain'
  | 'billing_mode'
  | 'provider'
  | 'endpoint'
  | 'metadata'
>
type LedgerRow = Pick<
  Database['public']['Tables']['ai_trial_ledger']['Row'],
  | 'id'
  | 'user_id'
  | 'admin_user_id'
  | 'created_at'
  | 'entry_type'
  | 'delta_micros'
  | 'balance_after_micros'
  | 'note'
  | 'metadata'
>
type UserAiSettingsRow = Pick<
  Database['public']['Tables']['user_api_keys']['Row'],
  'user_id' | 'billing_mode' | 'ai_provider' | 'ai_enabled'
>
type FeedbackResponseSummary = {
  id: string
  userId: string | null
  userEmail: string | null
  createdAt: string
  useCase: string | null
  satisfaction: string | null
  feedbackText: string | null
  pagePath: string | null
  projectCount: number | null
  appVersion: string | null
  userAgent: string | null
}
type FeedbackSection = {
  tableAvailable: boolean
  totalResponses: number
  hasStatus: boolean
  responses: FeedbackResponseSummary[]
  unavailableReason: string | null
}

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

type UsageSummaryItem = {
  key: string
  requests: number
  completed: number
  failed: number
  blocked: number
  sponsoredMicros: number
}

type ClusterSummary = {
  key: string
  users: number
  trialUsers: number
  flaggedUsers: number
  sampleEmails: string[]
}

type TrialUserSummary = {
  userId: string
  email: string | null
  createdAt: string
  lastSignInAt: string | null
  currentBillingMode: string
  currentProvider: string
  aiEnabled: boolean
  status: string
  remainingMicros: number
  consumedMicros: number
  grantedMicros: number
  grantCount: number
  signupRiskScore: number
  suspiciousFlags: string[]
  normalizedEmail: string | null
  signupIp: string | null
  signupDeviceFingerprint: string | null
  lastActivityAt: string | null
  exhaustedAt: string | null
  blockedReason: string | null
  requestCounts: {
    total: number
    reserved: number
    completed: number
    failed: number
    blocked: number
  }
  reservedMicros: number
  modeCounts: Record<string, number>
  providerCounts: Record<string, number>
  endpointCounts: Record<string, number>
}

type ModeSwitchSummary = {
  userId: string
  email: string | null
  createdAt: string
  billingMode: string
  provider: string | null
  previousBillingMode: string | null
}

type ManualActionSummary = {
  id: string
  userId: string
  userEmail: string | null
  adminUserId: string | null
  adminEmail: string | null
  createdAt: string
  deltaMicros: number
  balanceAfterMicros: number
  note: string | null
  status: string | null
}

type SponsoredActivityEvent = {
  id: string
  userId: string
  email: string | null
  createdAt: string
  completedAt: string | null
  endpoint: string
  billingMode: string
  provider: string
  model: string | null
  status: string
  inputChars: number
  outputChars: number
  finalMicros: number
  reservedMicros: number
  refundedMicros: number
  errorCode: string | null
  httpStatus: number | null
}

function getMisconfiguredReason(): 'missing_supabase_url' | 'missing_service_role_key' {
  const status = getAdminClientConfigStatus()
  return status === 'missing_supabase_url' ? 'missing_supabase_url' : 'missing_service_role_key'
}

export type AdminDashboardData =
  | {
      status: 'misconfigured'
      reason: 'missing_supabase_url' | 'missing_service_role_key'
    }
  | {
      status: 'ready'
      generatedAt: string
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
      segmentation: {
        cutoffDate: string | null
        earlyUsers: number
        standardUsers: number
      }
      trial: {
        overview: {
          totalTrialGrants: number
          activeTrialUsers: number
          exhaustedTrialUsers: number
          blockedUsers: number
          abuseReviewUsers: number
          sponsoredUsageMicros: number
          totalRemainingMicros: number
          totalReservedMicros: number
          appManagedCompletedRequests: number
          appManagedFailedRequests: number
          suspiciousUsers: number
        }
        users: TrialUserSummary[]
        endpointUsage: UsageSummaryItem[]
        billingModeUsage: UsageSummaryItem[]
        providerUsage: UsageSummaryItem[]
        recentGrants: TrialUserSummary[]
        recentExhausted: TrialUserSummary[]
        modeSwitchesToByok: ModeSwitchSummary[]
        modeSwitchesToOllama: ModeSwitchSummary[]
        ipClusters: ClusterSummary[]
        deviceClusters: ClusterSummary[]
        normalizedEmailClusters: ClusterSummary[]
        recentManualActions: ManualActionSummary[]
        recentSponsoredActivity: SponsoredActivityEvent[]
      }
      feedback: {
        tableAvailable: boolean
        totalResponses: number
        hasStatus: boolean
        responses: FeedbackResponseSummary[]
        unavailableReason: string | null
      }
    }

const DAY_MS = 24 * 60 * 60 * 1000
const RECENT_USERS_LIMIT = 12
const EARLY_USERS_LIMIT = 10
const AI_USAGE_LIMIT = 12
const USERS_PAGE_SIZE = 1000
const CLUSTER_LIMIT = 10
const RECENT_ACTIVITY_LIMIT = 12

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

function toStringArray(value: Json | null | undefined) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function asRecord(value: Json | null | undefined) {
  if (!value || Array.isArray(value) || typeof value !== 'object') return null
  return value as Record<string, Json>
}

function getMetadataString(value: Json | null | undefined, key: string) {
  const record = asRecord(value)
  const entry = record?.[key]
  return typeof entry === 'string' ? entry : null
}

function isMissingFeedbackResponsesTable(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false
  if (error.code === '42P01') return true
  return (error.message ?? '').toLowerCase().includes('feedback_responses')
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

function buildUsageSummary(events: UsageEventRow[], selector: (event: UsageEventRow) => string) {
  const summary = new Map<string, UsageSummaryItem>()

  for (const event of events) {
    const key = selector(event)
    const existing = summary.get(key) ?? {
      key,
      requests: 0,
      completed: 0,
      failed: 0,
      blocked: 0,
      sponsoredMicros: 0,
    }

    existing.requests += 1
    if (event.status === 'completed') existing.completed += 1
    if (event.status === 'failed') existing.failed += 1
    if (event.status === 'blocked') existing.blocked += 1
    if (event.billing_mode === 'app_managed_trial' && event.status === 'completed') {
      existing.sponsoredMicros += event.final_micros ?? 0
    }

    summary.set(key, existing)
  }

  return [...summary.values()].sort((a, b) => {
    if (b.requests !== a.requests) return b.requests - a.requests
    return b.sponsoredMicros - a.sponsoredMicros
  })
}

function buildClusterSummary(params: {
  values: Array<{ key: string | null | undefined; userId: string }>
  accountByUserId: Map<string, TrialAccountRow>
  usersById: Map<string, AdminUser>
}) {
  const map = new Map<string, Set<string>>()

  for (const value of params.values) {
    const key = value.key?.trim()
    if (!key) continue

    if (!map.has(key)) {
      map.set(key, new Set())
    }

    map.get(key)?.add(value.userId)
  }

  return [...map.entries()]
    .map(([key, userIds]) => {
      const ids = [...userIds]
      const sampleEmails = ids
        .map((userId) => params.usersById.get(userId)?.email ?? params.accountByUserId.get(userId)?.raw_email ?? null)
        .filter((email): email is string => Boolean(email))
        .slice(0, 4)

      return {
        key,
        users: ids.length,
        trialUsers: ids.filter((userId) => (params.accountByUserId.get(userId)?.grant_count ?? 0) > 0).length,
        flaggedUsers: ids.filter((userId) => {
          const account = params.accountByUserId.get(userId)
          return (account?.status === 'blocked' || account?.status === 'abuse_review' || toStringArray(account?.suspicious_flags).length > 0)
        }).length,
        sampleEmails,
      }
    })
    .filter((item) => item.users > 1)
    .sort((a, b) => {
      if (b.users !== a.users) return b.users - a.users
      return b.flaggedUsers - a.flaggedUsers
    })
    .slice(0, CLUSTER_LIMIT)
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const supabase = createAdminClient()
  if (!supabase) {
    return { status: 'misconfigured', reason: getMisconfiguredReason() }
  }

  const [
    users,
    projectsResult,
    aiResponsesResult,
    assetsResult,
    profilesResult,
    trialAccountsResult,
    usageEventsResult,
    abuseSignalsResult,
    ledgerResult,
    aiSettingsResult,
    ...storageBreakdown
  ] = await Promise.all([
    fetchAllAuthUsers(),
    supabase.from('projects').select('id,user_id').is('deleted_at', null),
    supabase.from('ai_responses').select('created_at,project_id').is('deleted_at', null),
    supabase.from('project_assets').select('file_size'),
    supabase.from('profiles').select('id,plan_type,is_early_user'),
    supabase.from('ai_trial_accounts').select('user_id,status,remaining_micros,reserved_micros,consumed_micros,granted_micros,grant_count,granted_at,exhausted_at,blocked_reason,signup_risk_score,signup_ip,signup_device_fingerprint,normalized_email,raw_email,email_domain,suspicious_flags,last_activity_at,last_request_ip,last_device_fingerprint'),
    supabase.from('ai_usage_events').select('id,user_id,request_key,endpoint,billing_mode,provider,model,status,final_micros,reserved_micros,refunded_micros,input_chars,output_chars,error_code,http_status,created_at,completed_at,ip_address,device_fingerprint,normalized_email,metadata'),
    supabase.from('ai_abuse_signals').select('id,user_id,signal_type,risk_score,risk_flags,created_at,ip_address,device_fingerprint,normalized_email,raw_email,email_domain,billing_mode,provider,endpoint,metadata'),
    supabase.from('ai_trial_ledger').select('id,user_id,admin_user_id,created_at,entry_type,delta_micros,balance_after_micros,note,metadata'),
    supabase.from('user_api_keys').select('user_id,billing_mode,ai_provider,ai_enabled'),
    ...STORAGE_ESTIMATE_TABLES.map(estimateTableBytes),
  ])

  if (!users) {
    return { status: 'misconfigured', reason: getMisconfiguredReason() }
  }

  if (projectsResult.error) throw projectsResult.error
  if (aiResponsesResult.error) throw aiResponsesResult.error
  if (assetsResult.error) throw assetsResult.error
  if (profilesResult.error) throw profilesResult.error
  if (trialAccountsResult.error) throw trialAccountsResult.error
  if (usageEventsResult.error) throw usageEventsResult.error
  if (abuseSignalsResult.error) throw abuseSignalsResult.error
  if (ledgerResult.error) throw ledgerResult.error
  if (aiSettingsResult.error) throw aiSettingsResult.error

  const profiles = profilesResult.data ?? []
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
  for (const user of users) {
    const profile = profilesById.get(user.id)
    if (profile) {
      user.profile = {
        plan_type: profile.plan_type,
        is_early_user: profile.is_early_user,
      }
    }
  }

  const projects = (projectsResult.data ?? []) as ProjectRow[]
  const aiResponses = (aiResponsesResult.data ?? []) as AiResponseRow[]
  const assets = (assetsResult.data ?? []) as AssetRow[]
  const trialAccounts = (trialAccountsResult.data ?? []) as TrialAccountRow[]
  const usageEvents = (usageEventsResult.data ?? []) as UsageEventRow[]
  const abuseSignals = (abuseSignalsResult.data ?? []) as AbuseSignalRow[]
  const ledgerEntries = (ledgerResult.data ?? []) as LedgerRow[]
  const aiSettings = (aiSettingsResult.data ?? []) as UserAiSettingsRow[]

  const nowMs = Date.now()
  const now = new Date()
  const usersById = new Map(users.map((user) => [user.id, user]))
  const accountByUserId = new Map(trialAccounts.map((account) => [account.user_id, account]))
  const settingsByUserId = new Map(aiSettings.map((settings) => [settings.user_id, settings]))
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

  const usageByUserId = new Map<string, TrialUserSummary['requestCounts']>()
  const modeCountsByUserId = new Map<string, Record<string, number>>()
  const providerCountsByUserId = new Map<string, Record<string, number>>()
  const endpointCountsByUserId = new Map<string, Record<string, number>>()
  const suspiciousFlagsByUserId = new Map<string, Set<string>>()

  for (const signal of abuseSignals) {
    if (!signal.user_id) continue
    const existing = suspiciousFlagsByUserId.get(signal.user_id) ?? new Set<string>()
    for (const flag of toStringArray(signal.risk_flags)) {
      existing.add(flag)
    }
    if (signal.signal_type === 'manual_review') {
      existing.add('manual_review')
    }
    suspiciousFlagsByUserId.set(signal.user_id, existing)
  }

  for (const event of usageEvents) {
    const requestCounts = usageByUserId.get(event.user_id) ?? { total: 0, reserved: 0, completed: 0, failed: 0, blocked: 0 }
    requestCounts.total += 1
    if (event.status === 'reserved') requestCounts.reserved += 1
    if (event.status === 'completed') requestCounts.completed += 1
    if (event.status === 'failed') requestCounts.failed += 1
    if (event.status === 'blocked') requestCounts.blocked += 1
    usageByUserId.set(event.user_id, requestCounts)

    const modeCounts = modeCountsByUserId.get(event.user_id) ?? {}
    modeCounts[event.billing_mode] = (modeCounts[event.billing_mode] ?? 0) + 1
    modeCountsByUserId.set(event.user_id, modeCounts)

    const providerCounts = providerCountsByUserId.get(event.user_id) ?? {}
    providerCounts[event.provider] = (providerCounts[event.provider] ?? 0) + 1
    providerCountsByUserId.set(event.user_id, providerCounts)

    const endpointCounts = endpointCountsByUserId.get(event.user_id) ?? {}
    endpointCounts[event.endpoint] = (endpointCounts[event.endpoint] ?? 0) + 1
    endpointCountsByUserId.set(event.user_id, endpointCounts)
  }

  const trialUsers: TrialUserSummary[] = trialAccounts
    .map((account) => {
      const user = usersById.get(account.user_id)
      const settings = settingsByUserId.get(account.user_id)
      const suspiciousFlags = [
        ...new Set([
          ...toStringArray(account.suspicious_flags),
          ...(suspiciousFlagsByUserId.get(account.user_id) ? [...suspiciousFlagsByUserId.get(account.user_id)!] : []),
        ]),
      ]

      return {
        userId: account.user_id,
        email: user?.email ?? account.raw_email ?? null,
        createdAt: user?.created_at ?? account.granted_at ?? account.last_activity_at ?? new Date(0).toISOString(),
        lastSignInAt: user?.last_sign_in_at ?? null,
        currentBillingMode: settings?.billing_mode ?? 'app_managed_trial',
        currentProvider: settings?.ai_provider ?? 'openai',
        aiEnabled: settings?.ai_enabled ?? false,
        status: account.status,
        remainingMicros: account.remaining_micros,
        reservedMicros: account.reserved_micros,
        consumedMicros: account.consumed_micros,
        grantedMicros: account.granted_micros,
        grantCount: account.grant_count,
        signupRiskScore: account.signup_risk_score,
        suspiciousFlags,
        normalizedEmail: account.normalized_email,
        signupIp: account.signup_ip,
        signupDeviceFingerprint: account.signup_device_fingerprint,
        lastActivityAt: account.last_activity_at,
        exhaustedAt: account.exhausted_at,
        blockedReason: account.blocked_reason,
        requestCounts: usageByUserId.get(account.user_id) ?? { total: 0, reserved: 0, completed: 0, failed: 0, blocked: 0 },
        modeCounts: modeCountsByUserId.get(account.user_id) ?? {},
        providerCounts: providerCountsByUserId.get(account.user_id) ?? {},
        endpointCounts: endpointCountsByUserId.get(account.user_id) ?? {},
      }
    })
    .sort((a, b) => {
      const aTime = new Date(a.lastActivityAt ?? a.createdAt).getTime()
      const bTime = new Date(b.lastActivityAt ?? b.createdAt).getTime()
      return bTime - aTime
    })

  const appManagedEvents = usageEvents.filter((event) => event.billing_mode === 'app_managed_trial')

  const recentSponsoredActivity: SponsoredActivityEvent[] = [...appManagedEvents]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50)
    .map((event) => ({
      id: event.id,
      userId: event.user_id,
      email: usersById.get(event.user_id)?.email ?? event.normalized_email ?? null,
      createdAt: event.created_at,
      completedAt: event.completed_at,
      endpoint: event.endpoint,
      billingMode: event.billing_mode,
      provider: event.provider,
      model: event.model,
      status: event.status,
      inputChars: event.input_chars,
      outputChars: event.output_chars,
      finalMicros: event.final_micros,
      reservedMicros: event.reserved_micros,
      refundedMicros: event.refunded_micros,
      errorCode: event.error_code,
      httpStatus: event.http_status,
    }))

  const trialOverview = {
    totalTrialGrants: trialAccounts.filter((account) => account.grant_count > 0).length,
    activeTrialUsers: trialAccounts.filter((account) => account.status === 'active').length,
    exhaustedTrialUsers: trialAccounts.filter((account) => account.status === 'exhausted').length,
    blockedUsers: trialAccounts.filter((account) => account.status === 'blocked').length,
    abuseReviewUsers: trialAccounts.filter((account) => account.status === 'abuse_review').length,
    sponsoredUsageMicros: trialAccounts.reduce((total, account) => total + (account.consumed_micros ?? 0), 0),
    totalRemainingMicros: trialAccounts.reduce((total, account) => total + (account.remaining_micros ?? 0), 0),
    totalReservedMicros: trialAccounts.reduce((total, account) => total + (account.reserved_micros ?? 0), 0),
    appManagedCompletedRequests: appManagedEvents.filter((event) => event.status === 'completed').length,
    appManagedFailedRequests: appManagedEvents.filter((event) => event.status === 'failed' || event.status === 'blocked').length,
    suspiciousUsers: trialUsers.filter((user) => user.suspiciousFlags.length > 0 || user.status === 'blocked' || user.status === 'abuse_review' || user.signupRiskScore >= 50).length,
  }

  const endpointUsage = buildUsageSummary(usageEvents, (event) => event.endpoint)
  const billingModeUsage = buildUsageSummary(usageEvents, (event) => event.billing_mode)
  const providerUsage = buildUsageSummary(usageEvents, (event) => event.provider)

  const recentGrants = [...trialUsers]
    .filter((user) => (accountByUserId.get(user.userId)?.granted_at))
    .sort((a, b) => new Date(accountByUserId.get(b.userId)?.granted_at ?? 0).getTime() - new Date(accountByUserId.get(a.userId)?.granted_at ?? 0).getTime())
    .slice(0, RECENT_ACTIVITY_LIMIT)

  const recentExhausted = [...trialUsers]
    .filter((user) => user.exhaustedAt)
    .sort((a, b) => new Date(b.exhaustedAt ?? 0).getTime() - new Date(a.exhaustedAt ?? 0).getTime())
    .slice(0, RECENT_ACTIVITY_LIMIT)

  const modeSwitchSignals = abuseSignals
    .filter((signal) => signal.signal_type === 'mode_change' && signal.user_id)
    .map((signal) => ({
      userId: signal.user_id!,
      email: usersById.get(signal.user_id!)?.email ?? accountByUserId.get(signal.user_id!)?.raw_email ?? null,
      createdAt: signal.created_at,
      billingMode: signal.billing_mode ?? 'unknown',
      provider: signal.provider ?? null,
      previousBillingMode: getMetadataString(signal.metadata, 'previousBillingMode'),
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const modeSwitchesToByok = modeSwitchSignals
    .filter((signal) => signal.billingMode === 'byok' && signal.previousBillingMode === 'app_managed_trial')
    .slice(0, RECENT_ACTIVITY_LIMIT)

  const modeSwitchesToOllama = modeSwitchSignals
    .filter((signal) => signal.billingMode === 'ollama' && signal.previousBillingMode === 'app_managed_trial')
    .slice(0, RECENT_ACTIVITY_LIMIT)

  const ipClusters = buildClusterSummary({
    values: [
      ...trialAccounts.map((account) => ({ key: account.signup_ip, userId: account.user_id })),
      ...usageEvents.map((event) => ({ key: event.ip_address, userId: event.user_id })),
    ],
    accountByUserId,
    usersById,
  })

  const deviceClusters = buildClusterSummary({
    values: [
      ...trialAccounts.map((account) => ({ key: account.signup_device_fingerprint, userId: account.user_id })),
      ...trialAccounts.map((account) => ({ key: account.last_device_fingerprint, userId: account.user_id })),
      ...usageEvents.map((event) => ({ key: event.device_fingerprint, userId: event.user_id })),
    ],
    accountByUserId,
    usersById,
  })

  const normalizedEmailClusters = buildClusterSummary({
    values: trialAccounts.map((account) => ({ key: account.normalized_email, userId: account.user_id })),
    accountByUserId,
    usersById,
  })

  const recentManualActions = ledgerEntries
    .filter((entry) => entry.entry_type === 'manual_adjustment')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, RECENT_ACTIVITY_LIMIT)
    .map((entry) => ({
      id: entry.id,
      userId: entry.user_id,
      userEmail: usersById.get(entry.user_id)?.email ?? accountByUserId.get(entry.user_id)?.raw_email ?? null,
      adminUserId: entry.admin_user_id,
      adminEmail: entry.admin_user_id ? usersById.get(entry.admin_user_id)?.email ?? null : null,
      createdAt: entry.created_at,
      deltaMicros: entry.delta_micros,
      balanceAfterMicros: entry.balance_after_micros,
      note: entry.note,
      status: getMetadataString(entry.metadata, 'status'),
    }))

  const [feedbackCountResult, feedbackResponsesResult] = await Promise.all([
    // `feedback_responses` is newer than the generated Supabase types in this repo.
    // Keep the same safe temporary `any` pattern used by the survey route until types are regenerated.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('feedback_responses').select('id', { count: 'exact', head: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('feedback_responses')
      .select('id,user_id,created_at,use_case,satisfaction,feedback_text,page_path,project_count,app_version,user_agent')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  let feedback: FeedbackSection
  const feedbackCountError = feedbackCountResult?.error as { code?: string; message?: string } | null | undefined
  const feedbackRowsError = feedbackResponsesResult?.error as { code?: string; message?: string } | null | undefined

  if (feedbackCountError || feedbackRowsError) {
    const missingTable = isMissingFeedbackResponsesTable(feedbackCountError) || isMissingFeedbackResponsesTable(feedbackRowsError)

    if (!missingTable) {
      if (feedbackCountError) throw feedbackCountError
      if (feedbackRowsError) throw feedbackRowsError
    }

    feedback = {
      tableAvailable: false,
      totalResponses: 0,
      hasStatus: false,
      responses: [],
      unavailableReason: 'missing_table',
    }
  } else {
    const feedbackRows = (feedbackResponsesResult.data ?? []) as Array<{
      id: string
      user_id: string | null
      created_at: string
      use_case: string | null
      satisfaction: string | null
      feedback_text: string | null
      page_path: string | null
      project_count: number | null
      app_version: string | null
      user_agent: string | null
    }>

    feedback = {
      tableAvailable: true,
      totalResponses: feedbackCountResult.count ?? feedbackRows.length,
      hasStatus: false,
      responses: feedbackRows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_id ? usersById.get(row.user_id)?.email ?? null : null,
        createdAt: row.created_at,
        useCase: row.use_case,
        satisfaction: row.satisfaction,
        feedbackText: row.feedback_text,
        pagePath: row.page_path,
        projectCount: row.project_count,
        appVersion: row.app_version,
        userAgent: row.user_agent,
      })),
      unavailableReason: null,
    }
  }

  return {
    status: 'ready',
    generatedAt: new Date().toISOString(),
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
    segmentation: {
      cutoffDate: BETA_CUTOFF_DATE,
      earlyUsers: users.filter((user) => {
        if (!BETA_CUTOFF_DATE) return true
        return new Date(user.created_at) < new Date(BETA_CUTOFF_DATE)
      }).length,
      standardUsers: users.filter((user) => {
        if (!BETA_CUTOFF_DATE) return false
        return new Date(user.created_at) >= new Date(BETA_CUTOFF_DATE)
      }).length,
    },
    trial: {
      overview: trialOverview,
      users: trialUsers,
      endpointUsage,
      billingModeUsage,
      providerUsage,
      recentGrants,
      recentExhausted,
      modeSwitchesToByok,
      modeSwitchesToOllama,
      ipClusters,
      deviceClusters,
      normalizedEmailClusters,
      recentManualActions,
      recentSponsoredActivity,
    },
    feedback,
  }
}
