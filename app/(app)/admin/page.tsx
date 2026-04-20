import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import AdminBackButton from '@/components/admin/AdminBackButton'
import AiTrialAdjustmentForm from '@/components/admin/AiTrialAdjustmentForm'
import { APPROVED_ADMIN_EMAILS, isAdminEmail } from '@/lib/admin'
import { getAdminDashboardData } from '@/lib/admin-dashboard'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Admin Dashboard - Storyline' }
export const dynamic = 'force-dynamic'

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let size = bytes / 1024
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function formatMicrosUsd(micros: number) {
  return `$${(Math.max(micros, 0) / 1_000_000).toFixed(2)}`
}

function compactId(value: string | null | undefined) {
  if (!value) return '-'
  return `${value.slice(0, 8)}...`
}

function readQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Active</Badge>
    case 'exhausted':
      return <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">Exhausted</Badge>
    case 'blocked':
      return <Badge className="border-red-200 bg-red-50 text-red-700 hover:bg-red-50">Blocked</Badge>
    case 'abuse_review':
      return <Badge className="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-50">Abuse Review</Badge>
    case 'disabled':
      return <Badge variant="outline">Disabled</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function StatCard({ title, value, caption }: { title: string; value: string | number; caption?: string }) {
  return (
    <Card className="border-slate-200/80 bg-white/90 shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs uppercase tracking-[0.18em] text-slate-400">{title}</CardDescription>
        <CardTitle className="text-3xl font-semibold text-slate-900">{value}</CardTitle>
      </CardHeader>
      {caption ? <CardContent className="pt-0 text-sm text-slate-500">{caption}</CardContent> : null}
    </Card>
  )
}

function SectionTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: Array<Array<React.ReactNode>>
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-[0.16em] text-slate-400">
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium first:pl-0 last:pr-0">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-slate-100/80 align-top last:border-b-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 text-slate-600 first:pl-0 last:pr-0">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function AdminPage({ searchParams }: PageProps<'/admin'>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    redirect('/library')
  }

  const dashboard = await getAdminDashboardData()
  const query = await searchParams

  const selectedStatus = readQueryValue(query.status) ?? 'all'
  const selectedMode = readQueryValue(query.mode) ?? 'all'
  const selectedProvider = readQueryValue(query.provider) ?? 'all'
  const selectedSuspicious = readQueryValue(query.suspicious) ?? 'all'
  const selectedWindow = readQueryValue(query.window) ?? 'all'
  const emailSearch = (readQueryValue(query.email) ?? '').trim().toLowerCase()

  if (dashboard.status === 'misconfigured') {
    const envMessage =
      dashboard.reason === 'missing_supabase_url'
        ? '`NEXT_PUBLIC_SUPABASE_URL` is not configured on the server.'
        : '`SUPABASE_SERVICE_ROLE_KEY` is not configured on the server.'

    return (
      <div className="admin-page-shell flex h-full min-h-0 flex-1 flex-col overflow-auto bg-slate-50/50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <Card className="border-amber-200/80 bg-amber-50/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Admin metrics need server configuration</CardTitle>
              <CardDescription className="text-amber-900/80">
                {envMessage} Restart the Next.js server after updating `.env.local`, then reload this page.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  const dashboardGeneratedAt = new Date(dashboard.generatedAt).getTime()
  const windowedTrialUsers = dashboard.trial.users.filter((entry) => {
    if (selectedWindow === '7d') {
      return entry.lastActivityAt ? dashboardGeneratedAt - new Date(entry.lastActivityAt).getTime() <= 7 * 24 * 60 * 60 * 1000 : false
    }
    if (selectedWindow === '30d') {
      return entry.lastActivityAt ? dashboardGeneratedAt - new Date(entry.lastActivityAt).getTime() <= 30 * 24 * 60 * 60 * 1000 : false
    }
    return true
  })

  const filteredTrialUsers = windowedTrialUsers.filter((entry) => {
    const searchableEmail = `${entry.email ?? ''} ${entry.normalizedEmail ?? ''}`.toLowerCase()

    if (emailSearch && !searchableEmail.includes(emailSearch)) return false
    if (selectedStatus !== 'all' && entry.status !== selectedStatus) return false
    if (selectedMode !== 'all' && entry.currentBillingMode !== selectedMode) return false
    if (selectedProvider !== 'all' && entry.currentProvider !== selectedProvider) return false
    if (selectedSuspicious === 'yes' && entry.suspiciousFlags.length === 0 && entry.signupRiskScore < 50 && entry.status !== 'blocked' && entry.status !== 'abuse_review') {
      return false
    }
    if (selectedSuspicious === 'no' && (entry.suspiciousFlags.length > 0 || entry.signupRiskScore >= 50 || entry.status === 'blocked' || entry.status === 'abuse_review')) {
      return false
    }
    return true
  })

  return (
    <div className="admin-page-shell flex h-full min-h-0 flex-1 flex-col overflow-auto bg-slate-50/50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <AdminBackButton />
              <Badge variant="outline" className="border-[#546354]/20 bg-[#546354]/5 text-[#546354]">
                Owner Only
              </Badge>
              <div>
                <CardTitle className="text-3xl text-slate-900">Admin Dashboard</CardTitle>
                <CardDescription className="mt-1 text-base text-slate-500">
                  Trial safety, usage, and abuse visibility
                </CardDescription>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Visible only for: {APPROVED_ADMIN_EMAILS.join(', ')}
            </div>
          </CardHeader>
        </Card>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Users" value={dashboard.stats.totalUsers} />
          <StatCard title="Trial Grants" value={dashboard.trial.overview.totalTrialGrants} />
          <StatCard title="Active Trial Users" value={dashboard.trial.overview.activeTrialUsers} />
          <StatCard title="Exhausted Trial Users" value={dashboard.trial.overview.exhaustedTrialUsers} />
          <StatCard title="Blocked / Review" value={dashboard.trial.overview.blockedUsers + dashboard.trial.overview.abuseReviewUsers} />
          <StatCard title="Sponsored Usage" value={formatMicrosUsd(dashboard.trial.overview.sponsoredUsageMicros)} />
          <StatCard title="Remaining Trial Balance" value={formatMicrosUsd(dashboard.trial.overview.totalRemainingMicros)} />
          <StatCard title="Suspicious Users" value={dashboard.trial.overview.suspiciousUsers} />
        </section>

        <Card className="border-[#2b332b]/10 bg-[#e7eee7]/40 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Free Trial AI Filters</CardTitle>
            <CardDescription>Filter the user-level trial table without changing the global overview cards.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-6">
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Email Search</label>
                <input
                  id="email"
                  name="email"
                  type="text"
                  defaultValue={emailSearch}
                  placeholder="skytra7@gmail.com"
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="status" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Status</label>
                <select id="status" name="status" defaultValue={selectedStatus} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm">
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="exhausted">Exhausted</option>
                  <option value="blocked">Blocked</option>
                  <option value="abuse_review">Abuse Review</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="mode" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Billing Mode</label>
                <select id="mode" name="mode" defaultValue={selectedMode} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm">
                  <option value="all">All</option>
                  <option value="app_managed_trial">App-Managed Trial</option>
                  <option value="byok">BYOK</option>
                  <option value="ollama">Ollama</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="provider" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Provider</label>
                <select id="provider" name="provider" defaultValue={selectedProvider} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm">
                  <option value="all">All</option>
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Gemini</option>
                  <option value="ollama">Ollama</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="suspicious" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Suspicious</label>
                <select id="suspicious" name="suspicious" defaultValue={selectedSuspicious} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm">
                  <option value="all">All</option>
                  <option value="yes">Flagged only</option>
                  <option value="no">Unflagged only</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="window" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Recent Activity</label>
                <select id="window" name="window" defaultValue={selectedWindow} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm">
                  <option value="all">All time</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </div>
              <div className="md:col-span-5 flex flex-wrap gap-3">
                <Button type="submit">Apply Filters</Button>
                <a
                  href="/admin"
                  className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium whitespace-nowrap text-slate-900 transition-all outline-none hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-50"
                >
                  Clear
                </a>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Free Trial Users</CardTitle>
            <CardDescription>
              {filteredTrialUsers.length} users match the current filters. This table combines trial state, current AI mode, request outcomes, and suspicious signals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SectionTable
              headers={['User', 'Status', 'Balance', 'Current Mode', 'Requests', 'Signals', 'Recent Activity']}
              rows={filteredTrialUsers.length > 0
                ? filteredTrialUsers.map((entry) => [
                    <div key="user" className="flex flex-col gap-1">
                      <span className="font-medium text-slate-900">{entry.email ?? entry.userId}</span>
                      <span className="text-xs text-slate-400">{entry.userId}</span>
                      {entry.normalizedEmail ? <span className="text-xs text-slate-400">Normalized: {entry.normalizedEmail}</span> : null}
                    </div>,
                    <div key="status" className="flex flex-col gap-2">
                      <div>{getStatusBadge(entry.status)}</div>
                      {entry.blockedReason ? <span className="text-xs text-amber-700">{entry.blockedReason}</span> : null}
                    </div>,
                    <div key="balance" className="flex flex-col gap-1">
                      <span className="font-medium text-slate-900">{formatMicrosUsd(entry.remainingMicros)} left</span>
                      <span className="text-xs text-slate-400">Used {formatMicrosUsd(entry.consumedMicros)} / {formatMicrosUsd(entry.grantedMicros)}</span>
                      <span className="text-xs text-slate-400">Grant count: {entry.grantCount}</span>
                    </div>,
                    <div key="mode" className="flex flex-col gap-1">
                      <span className="font-medium text-slate-900">{entry.currentBillingMode}</span>
                      <span className="text-xs text-slate-400">{entry.currentProvider}</span>
                      <span className="text-xs text-slate-400">{entry.aiEnabled ? 'AI enabled' : 'AI disabled'}</span>
                    </div>,
                    <div key="requests" className="flex flex-col gap-1">
                      <span className="text-slate-900">Total {entry.requestCounts.total}</span>
                      <span className="text-xs text-slate-400">Completed {entry.requestCounts.completed} · Failed {entry.requestCounts.failed} · Blocked {entry.requestCounts.blocked}</span>
                      <span className="text-xs text-slate-400">
                        Helper {entry.endpointCounts.ai_helper ?? 0} · Scene {entry.endpointCounts.analyze_scene ?? 0} · Import {entry.endpointCounts.import_ai_detect ?? 0}
                      </span>
                    </div>,
                    <div key="signals" className="flex flex-col gap-1">
                      <span className="text-xs text-slate-400">Risk score: {entry.signupRiskScore}</span>
                      <span className="text-xs text-slate-400">Signup IP: {entry.signupIp ?? '-'}</span>
                      <span className="text-xs text-slate-400">Device: {compactId(entry.signupDeviceFingerprint)}</span>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {entry.suspiciousFlags.length > 0
                          ? entry.suspiciousFlags.slice(0, 4).map((flag) => (
                              <Badge key={flag} variant="outline" className="text-[10px]">
                                {flag}
                              </Badge>
                            ))
                          : <span className="text-xs text-slate-300">None</span>}
                      </div>
                    </div>,
                    <div key="activity" className="flex flex-col gap-1">
                      <span className="text-xs text-slate-400">Created {formatDateTime(entry.createdAt)}</span>
                      <span className="text-xs text-slate-400">Last active {formatDateTime(entry.lastActivityAt)}</span>
                      <span className="text-xs text-slate-400">Last sign-in {formatDateTime(entry.lastSignInAt)}</span>
                      <span className="text-xs text-slate-400">Exhausted {formatDateTime(entry.exhaustedAt)}</span>
                    </div>,
                  ])
                : [[<span key="empty" className="text-slate-400">No trial users match these filters.</span>, '-', '-', '-', '-', '-', '-']]}
            />
          </CardContent>
        </Card>

        <section className="grid gap-6 xl:grid-cols-3">
          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Endpoint Usage</CardTitle>
              <CardDescription>Completed, failed, blocked, and sponsored usage by endpoint.</CardDescription>
            </CardHeader>
            <CardContent>
              <SectionTable
                headers={['Endpoint', 'Requests', 'Outcomes', 'Sponsored']}
                rows={dashboard.trial.endpointUsage.map((entry) => [
                  <span key="endpoint" className="font-medium text-slate-900">{entry.key}</span>,
                  <span key="requests">{entry.requests}</span>,
                  <span key="outcomes" className="text-xs text-slate-500">
                    Completed {entry.completed} · Failed {entry.failed} · Blocked {entry.blocked}
                  </span>,
                  <span key="sponsored">{formatMicrosUsd(entry.sponsoredMicros)}</span>,
                ])}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Billing Mode Usage</CardTitle>
              <CardDescription>See who is actually using the sponsored path versus BYOK or Ollama.</CardDescription>
            </CardHeader>
            <CardContent>
              <SectionTable
                headers={['Mode', 'Requests', 'Outcomes', 'Sponsored']}
                rows={dashboard.trial.billingModeUsage.map((entry) => [
                  <span key="mode" className="font-medium text-slate-900">{entry.key}</span>,
                  <span key="requests">{entry.requests}</span>,
                  <span key="outcomes" className="text-xs text-slate-500">
                    Completed {entry.completed} · Failed {entry.failed} · Blocked {entry.blocked}
                  </span>,
                  <span key="sponsored">{formatMicrosUsd(entry.sponsoredMicros)}</span>,
                ])}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Provider Usage</CardTitle>
              <CardDescription>OpenAI is isolated for the app-managed trial while BYOK and Ollama remain visible separately.</CardDescription>
            </CardHeader>
            <CardContent>
              <SectionTable
                headers={['Provider', 'Requests', 'Outcomes', 'Sponsored']}
                rows={dashboard.trial.providerUsage.map((entry) => [
                  <span key="provider" className="font-medium text-slate-900">{entry.key}</span>,
                  <span key="requests">{entry.requests}</span>,
                  <span key="outcomes" className="text-xs text-slate-500">
                    Completed {entry.completed} · Failed {entry.failed} · Blocked {entry.blocked}
                  </span>,
                  <span key="sponsored">{formatMicrosUsd(entry.sponsoredMicros)}</span>,
                ])}
              />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Repeated IP Clusters</CardTitle>
              <CardDescription>Shared IPs are a signal, not proof, so this view stays review-oriented.</CardDescription>
            </CardHeader>
            <CardContent>
              <SectionTable
                headers={['IP', 'Users', 'Flagged', 'Sample Emails']}
                rows={dashboard.trial.ipClusters.length > 0
                  ? dashboard.trial.ipClusters.map((entry) => [
                      <span key="key" className="font-medium text-slate-900">{entry.key}</span>,
                      <span key="users">{entry.users}</span>,
                      <span key="flagged">{entry.flaggedUsers}</span>,
                      <span key="emails" className="text-xs text-slate-500">{entry.sampleEmails.join(', ') || '-'}</span>,
                    ])
                  : [[<span key="empty" className="text-slate-400">No repeated IP clusters yet.</span>, '-', '-', '-']]}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Repeated Device Clusters</CardTitle>
              <CardDescription>Browser fingerprinting is imperfect, so this is for review and triage only.</CardDescription>
            </CardHeader>
            <CardContent>
              <SectionTable
                headers={['Fingerprint', 'Users', 'Flagged', 'Sample Emails']}
                rows={dashboard.trial.deviceClusters.length > 0
                  ? dashboard.trial.deviceClusters.map((entry) => [
                      <span key="key" className="font-medium text-slate-900">{compactId(entry.key)}</span>,
                      <span key="users">{entry.users}</span>,
                      <span key="flagged">{entry.flaggedUsers}</span>,
                      <span key="emails" className="text-xs text-slate-500">{entry.sampleEmails.join(', ') || '-'}</span>,
                    ])
                  : [[<span key="empty" className="text-slate-400">No repeated device clusters yet.</span>, '-', '-', '-']]}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Normalized Email Clusters</CardTitle>
              <CardDescription>Alias-normalized email collisions help catch obvious repeat trial attempts.</CardDescription>
            </CardHeader>
            <CardContent>
              <SectionTable
                headers={['Normalized Email', 'Users', 'Flagged', 'Sample Emails']}
                rows={dashboard.trial.normalizedEmailClusters.length > 0
                  ? dashboard.trial.normalizedEmailClusters.map((entry) => [
                      <span key="key" className="font-medium text-slate-900">{entry.key}</span>,
                      <span key="users">{entry.users}</span>,
                      <span key="flagged">{entry.flaggedUsers}</span>,
                      <span key="emails" className="text-xs text-slate-500">{entry.sampleEmails.join(', ') || '-'}</span>,
                    ])
                  : [[<span key="empty" className="text-slate-400">No repeated normalized-email clusters yet.</span>, '-', '-', '-']]}
              />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Recent Trial Grants</CardTitle>
              <CardDescription>Newly granted trial accounts and their current state.</CardDescription>
            </CardHeader>
            <CardContent>
              <SectionTable
                headers={['User', 'Granted', 'Status', 'Remaining']}
                rows={dashboard.trial.recentGrants.length > 0
                  ? dashboard.trial.recentGrants.map((entry) => [
                      <span key="user" className="font-medium text-slate-900">{entry.email ?? entry.userId}</span>,
                      <span key="granted">{formatDateTime(entry.lastActivityAt ?? entry.createdAt)}</span>,
                      <div key="status">{getStatusBadge(entry.status)}</div>,
                      <span key="remaining">{formatMicrosUsd(entry.remainingMicros)}</span>,
                    ])
                  : [[<span key="empty" className="text-slate-400">No recent trial grants yet.</span>, '-', '-', '-']]}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Recent Exhausted Users</CardTitle>
              <CardDescription>Users who used up the free app-managed trial.</CardDescription>
            </CardHeader>
            <CardContent>
              <SectionTable
                headers={['User', 'Exhausted', 'Current Mode', 'Consumed']}
                rows={dashboard.trial.recentExhausted.length > 0
                  ? dashboard.trial.recentExhausted.map((entry) => [
                      <span key="user" className="font-medium text-slate-900">{entry.email ?? entry.userId}</span>,
                      <span key="exhausted">{formatDateTime(entry.exhaustedAt)}</span>,
                      <span key="mode">{entry.currentBillingMode}</span>,
                      <span key="consumed">{formatMicrosUsd(entry.consumedMicros)}</span>,
                    ])
                  : [[<span key="empty" className="text-slate-400">No exhausted users yet.</span>, '-', '-', '-']]}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Trial To BYOK Switches</CardTitle>
              <CardDescription>Users who moved off the sponsored path and onto their own key.</CardDescription>
            </CardHeader>
            <CardContent>
              <SectionTable
                headers={['User', 'When', 'Provider', 'Previous Mode']}
                rows={dashboard.trial.modeSwitchesToByok.length > 0
                  ? dashboard.trial.modeSwitchesToByok.map((entry) => [
                      <span key="user" className="font-medium text-slate-900">{entry.email ?? entry.userId}</span>,
                      <span key="when">{formatDateTime(entry.createdAt)}</span>,
                      <span key="provider">{entry.provider ?? '-'}</span>,
                      <span key="previous">{entry.previousBillingMode ?? '-'}</span>,
                    ])
                  : [[<span key="empty" className="text-slate-400">No trial to BYOK switches yet.</span>, '-', '-', '-']]}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Trial To Ollama Switches</CardTitle>
              <CardDescription>Users who exhausted or skipped the sponsored path and moved local.</CardDescription>
            </CardHeader>
            <CardContent>
              <SectionTable
                headers={['User', 'When', 'Provider', 'Previous Mode']}
                rows={dashboard.trial.modeSwitchesToOllama.length > 0
                  ? dashboard.trial.modeSwitchesToOllama.map((entry) => [
                      <span key="user" className="font-medium text-slate-900">{entry.email ?? entry.userId}</span>,
                      <span key="when">{formatDateTime(entry.createdAt)}</span>,
                      <span key="provider">{entry.provider ?? '-'}</span>,
                      <span key="previous">{entry.previousBillingMode ?? '-'}</span>,
                    ])
                  : [[<span key="empty" className="text-slate-400">No trial to Ollama switches yet.</span>, '-', '-', '-']]}
              />
            </CardContent>
          </Card>
        </section>

        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Manual Trial Actions</CardTitle>
            <CardDescription>Adjust balances or status here. Every change is written to the trial ledger and abuse signals for review history.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <AiTrialAdjustmentForm />
            <SectionTable
              headers={['User', 'Admin', 'When', 'Delta', 'Balance After', 'Status', 'Note']}
              rows={dashboard.trial.recentManualActions.length > 0
                ? dashboard.trial.recentManualActions.map((entry) => [
                    <div key="user" className="flex flex-col gap-1">
                      <span className="font-medium text-slate-900">{entry.userEmail ?? entry.userId}</span>
                      <span className="text-xs text-slate-400">{entry.userId}</span>
                    </div>,
                    <div key="admin" className="flex flex-col gap-1">
                      <span>{entry.adminEmail ?? entry.adminUserId ?? '-'}</span>
                      {entry.adminUserId ? <span className="text-xs text-slate-400">{entry.adminUserId}</span> : null}
                    </div>,
                    <span key="when">{formatDateTime(entry.createdAt)}</span>,
                    <span key="delta" className={entry.deltaMicros >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                      {entry.deltaMicros >= 0 ? '+' : '-'}{formatMicrosUsd(Math.abs(entry.deltaMicros))}
                    </span>,
                    <span key="balance">{formatMicrosUsd(entry.balanceAfterMicros)}</span>,
                    <span key="status">{entry.status ?? '-'}</span>,
                    <span key="note" className="text-xs text-slate-500">{entry.note ?? '-'}</span>,
                  ])
                : [[<span key="empty" className="text-slate-400">No manual trial actions yet.</span>, '-', '-', '-', '-', '-', '-']]}
            />
          </CardContent>
        </Card>

        <Card className="border-[#2b332b]/10 bg-[#e7eee7]/40 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-slate-900">User Segmentation</CardTitle>
                <CardDescription>Grandfathering strategy tracking</CardDescription>
              </div>
              <Badge variant="outline" className="border-slate-200 bg-white px-3 py-1 text-xs font-normal text-slate-500">
                {dashboard.segmentation.cutoffDate ? `Cutoff: ${formatDateTime(dashboard.segmentation.cutoffDate)}` : 'Beta Ongoing (No Cutoff)'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/60 bg-white/50 px-5 py-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Total Users</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{dashboard.stats.totalUsers}</p>
              </div>
              <div className="rounded-2xl border border-[#546354]/20 bg-[#546354]/5 px-5 py-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#546354]/60">Early Users</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-2xl font-semibold text-[#2d362d]">{dashboard.segmentation.earlyUsers}</p>
                  <Badge className="bg-[#546354] text-[10px] hover:bg-[#546354]">Grandfathered</Badge>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/60 bg-white/50 px-5 py-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Post-Beta Users</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{dashboard.segmentation.standardUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Recent Users</CardTitle>
            <CardDescription>Most recent registrations across the app.</CardDescription>
          </CardHeader>
          <CardContent>
            <SectionTable
              headers={['Email', 'Created', 'Last Sign-In', 'Status']}
              rows={dashboard.recentUsers.map((entry) => [
                <span key="email" className="font-medium text-slate-900">{entry.email ?? entry.id}</span>,
                <span key="created">{formatDateTime(entry.created_at)}</span>,
                <span key="signin">{formatDateTime(entry.last_sign_in_at)}</span>,
                <div key="status" className="flex flex-wrap gap-1">
                  {entry.profile?.is_early_user && <Badge className="bg-amber-100 text-[10px] text-amber-700 hover:bg-amber-100 border-amber-200">Manual Early</Badge>}
                  {entry.profile?.plan_type && entry.profile.plan_type !== 'standard' && <Badge variant="secondary" className="text-[10px]">{entry.profile.plan_type}</Badge>}
                  {!entry.profile?.is_early_user && entry.profile?.plan_type === 'standard' && <span className="text-slate-300">-</span>}
                </div>,
              ])}
            />
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Legacy Saved AI Responses</CardTitle>
            <CardDescription>Saved-response activity remains here for historical context, but trial metrics above are sourced from authoritative usage events.</CardDescription>
          </CardHeader>
          <CardContent>
            <SectionTable
              headers={['User', 'Saved Responses', 'Latest Saved Response']}
              rows={dashboard.aiUsage.length > 0
                ? dashboard.aiUsage.map((entry) => [
                    <div key="user" className="flex flex-col">
                      <span className="font-medium text-slate-900">{entry.email ?? entry.userId}</span>
                      {entry.email ? <span className="text-xs text-slate-400">{entry.userId}</span> : null}
                    </div>,
                    <span key="count">{entry.savedResponses}</span>,
                    <span key="latest">{formatDateTime(entry.latestSavedResponseAt)}</span>,
                  ])
                : [[<span key="empty-user" className="text-slate-400">No saved AI responses yet.</span>, '-', '-']]}
            />
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Storage / Space Usage</CardTitle>
            <CardDescription>
              Project storage estimate from uploaded assets plus stored text and JSON content in existing tables.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Project Storage Estimate</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{formatBytes(dashboard.storage.totalEstimateBytes)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Uploaded Assets</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{formatBytes(dashboard.storage.assetBytes)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Stored Text / JSON Estimate</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{formatBytes(dashboard.storage.textEstimateBytes)}</p>
              </div>
            </div>

            <SectionTable
              headers={['Source', 'Estimated Size']}
              rows={dashboard.storage.breakdown.map((item) => [
                <span key="label" className="font-medium text-slate-900">{item.label}</span>,
                <span key="bytes">{formatBytes(item.bytes)}</span>,
              ])}
            />

            <p className="text-sm leading-6 text-slate-500">
              This is a safe estimate, not an official Supabase project-size metric. It excludes database indexes, auth tables, and internal storage overhead.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
