import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

function StatCard({ title, value, caption }: { title: string; value: string | number; caption?: string }) {
  return (
    <Card className="border-slate-200/80 bg-white/90 shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs uppercase tracking-[0.18em] text-slate-400">{title}</CardDescription>
        <CardTitle className="text-3xl font-semibold text-slate-900">{value}</CardTitle>
      </CardHeader>
      {caption ? (
        <CardContent className="pt-0 text-sm text-slate-500">{caption}</CardContent>
      ) : null}
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
            <tr key={rowIndex} className="border-b border-slate-100/80 last:border-b-0">
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

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    redirect('/library')
  }

  const dashboard = await getAdminDashboardData()

  return (
    <div className="admin-page-shell flex h-full min-h-0 flex-1 flex-col overflow-auto bg-slate-50/50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <Badge variant="outline" className="border-[#546354]/20 bg-[#546354]/5 text-[#546354]">
                Owner Only
              </Badge>
              <div>
                <CardTitle className="text-3xl text-slate-900">Admin Dashboard</CardTitle>
                <CardDescription className="mt-1 text-base text-slate-500">
                  Private usage overview
                </CardDescription>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Visible only for: {APPROVED_ADMIN_EMAILS.join(', ')}
            </div>
          </CardHeader>
        </Card>

        {dashboard.status === 'misconfigured' ? (
          <Card className="border-amber-200/80 bg-amber-50/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Admin metrics need server configuration</CardTitle>
              <CardDescription className="text-amber-900/80">
                `SUPABASE_SERVICE_ROLE_KEY` is not configured on the server, so global owner-only metrics cannot be loaded yet.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <StatCard title="Total Registered Users" value={dashboard.stats.totalUsers} />
              <StatCard title="New Users in Last 7 Days" value={dashboard.stats.newUsersLast7Days} />
              <StatCard title="New Users in Last 30 Days" value={dashboard.stats.newUsersLast30Days} />
              <StatCard title="Total Saved AI Responses" value={dashboard.stats.totalSavedAiResponses} />
              <StatCard title="Saved AI Responses in Last 7 Days" value={dashboard.stats.savedAiResponsesLast7Days} />
              <StatCard title="Saved AI Responses Today" value={dashboard.stats.savedAiResponsesToday} />
            </section>

            <Card className="border-[#2b332b]/10 bg-[#e7eee7]/40 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-slate-900">User Segmentation</CardTitle>
                    <CardDescription>Grandfathering strategy tracking</CardDescription>
                  </div>
                  <Badge variant="outline" className="border-slate-200 bg-white px-3 py-1 text-xs font-normal text-slate-500">
                    {dashboard.segmentation.cutoffDate 
                      ? `Cutoff: ${formatDateTime(dashboard.segmentation.cutoffDate)}` 
                      : 'Beta Ongoing (No Cutoff)'}
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
                    </div>
                  ])}
                />
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 bg-white/95 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900">AI Usage Overview</CardTitle>
                <CardDescription>Saved-response activity by user based on existing AI response records.</CardDescription>
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
                <CardTitle className="text-slate-900">Early Beta Users</CardTitle>
                <CardDescription>Earliest registered accounts, useful for future grandfathering decisions.</CardDescription>
              </CardHeader>
              <CardContent>
                <SectionTable
                  headers={['Email', 'Created', 'Last Sign-In', 'Status']}
                  rows={dashboard.earlyUsers.map((entry) => [
                    <span key="email" className="font-medium text-slate-900">{entry.email ?? entry.id}</span>,
                    <span key="created">{formatDateTime(entry.created_at)}</span>,
                    <span key="signin">{formatDateTime(entry.last_sign_in_at)}</span>,
                    <div key="status" className="flex flex-wrap gap-1">
                      {entry.profile?.is_early_user && <Badge className="bg-amber-100 text-[10px] text-amber-700 hover:bg-amber-100 border-amber-200">Manual Early</Badge>}
                      {entry.profile?.plan_type && entry.profile.plan_type !== 'standard' && <Badge variant="secondary" className="text-[10px]">{entry.profile.plan_type}</Badge>}
                      {!entry.profile?.is_early_user && entry.profile?.plan_type === 'standard' && <span className="text-slate-300">-</span>}
                    </div>
                  ])}
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
          </>
        )}
      </div>
    </div>
  )
}
