'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HELP_TOPICS, matchHelpTopics, type HelpTopic } from '@/lib/help'
import { queueWorkspaceTourStart } from '@/lib/project/tour'
import { requestOpenShortcuts } from '@/lib/project/shortcuts'
import dynamic from 'next/dynamic'

const LaunchSurveyModal = dynamic(() => import('@/components/survey/LaunchSurveyModal'), { ssr: false })

function HelpTopicCard({
  topic,
  projectId,
  mode,
  onOpenShortcuts,
}: {
  topic: HelpTopic
  projectId: string
  mode: 'project' | 'global'
  onOpenShortcuts?: () => void
}) {
  const hasProjectRoute = mode === 'project' && projectId && topic.relatedRoutes.length > 0
  const canOpenShortcuts = mode === 'project' && topic.id === 'shortcuts' && !!onOpenShortcuts

  return (
    <div className="rounded-[2rem] border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold leading-7 text-slate-900">{topic.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{topic.summary}</p>
        </div>
        {hasProjectRoute ? (
          <Link
            href={`/project/${projectId}${topic.relatedRoutes[0]}`}
            className="shrink-0 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-white"
          >
            Open
          </Link>
        ) : canOpenShortcuts ? (
          <button
            type="button"
            onClick={onOpenShortcuts}
            className="shrink-0 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-white"
          >
            Open shortcuts
          </button>
        ) : null}
      </div>
      <div className="mt-5 whitespace-pre-line text-[15px] leading-7 text-slate-700">{topic.answer}</div>
    </div>
  )
}

export default function HelpTab({ mode = 'project' }: { mode?: 'project' | 'global' }) {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = mode === 'project' && typeof params === 'object' && params?.id ? String(params.id) : ''
  const searchQuery = searchParams.get('q') ?? ''
  const [queryOverride, setQueryOverride] = useState<string | null>(null)
  const query = queryOverride ?? searchQuery
  const [surveyOpen, setSurveyOpen] = useState(false)

  const results = useMemo(() => {
    if (!query.trim()) return HELP_TOPICS.slice(0, 6)
    return matchHelpTopics(query, HELP_TOPICS)
  }, [query])

  const noResults = query.trim().length > 0 && results.length === 0

  const handleReplayTour = () => {
    if (!projectId) return

    queueWorkspaceTourStart()
    router.push(`/project/${projectId}/story`)
  }

  const handleOpenShortcuts = () => {
    if (mode !== 'project' || !projectId) return

    setQueryOverride('keyboard shortcuts')
    requestOpenShortcuts()
  }

  return (
    <div className="help-center-view flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-slate-50/70 custom-scrollbar">
      <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 fade-in">
        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/30 sm:p-8 lg:rounded-[2.75rem] lg:p-10">
          {mode === 'global' ? (
            <div className="mb-6 sm:mb-8">
              <Link
                href="/library"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Library
              </Link>
            </div>
          ) : null}

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8 xl:gap-10">
            <div className="max-w-3xl flex-1">
              <div className="mb-6 sm:mb-8">
                <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Help Center</p>
                <h1 className="mt-4 text-3xl font-serif italic tracking-tight text-slate-900 sm:text-4xl">Find answers fast</h1>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  {mode === 'project'
                    ? 'Search common Storyline workflows, AI help, export guidance, and recovery tips without leaving the app.'
                    : 'Search common Storyline workflows, moving-between-devices tips, cloud sync guidance, and backup answers before you open a project.'}
                </p>
              </div>

              <div className="max-w-2xl rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:p-5">
                <Label htmlFor="help-search" className="text-sm font-semibold text-slate-800">
                  Search the Help Center
                </Label>
                <Input
                  id="help-search"
                  value={query}
                  onChange={(event) => setQueryOverride(event.target.value)}
                  placeholder={mode === 'project' ? "Ask a question, like 'How do I add a character?'" : "Ask a question, like 'How do I enable cloud sync?'"}
                  className="mt-3 h-10 max-w-2xl border-slate-200 bg-white text-sm shadow-sm placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-primary/20"
                />
                {mode === 'project' ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <button
                      type="button"
                      onClick={handleOpenShortcuts}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-800 transition hover:bg-slate-100"
                    >
                      Open keyboard shortcuts
                    </button>
                    <p>Or press Shift + / while focus is outside a text field.</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="w-full max-w-sm rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5 shadow-sm sm:p-6">
              {mode === 'project' ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Need a refresher?</p>
                  <h2 className="mt-3 text-2xl font-serif italic text-slate-900">Take the tour again</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Jump back into the main writing workspace and replay the guided walkthrough.
                  </p>
                  <button
                    type="button"
                    onClick={handleReplayTour}
                    className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-100"
                  >
                    Start workspace tour
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Most useful from the library</p>
                  <h2 className="mt-3 text-2xl font-serif italic text-slate-900">Cloud Sync, without the jargon</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Local projects stay on one device until you either import a backup on another device or open that project and turn on cloud sync from Project Settings.
                  </p>
                  <button
                    type="button"
                    onClick={() => setQueryOverride('cloud sync')}
                    className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-100"
                  >
                    Show cloud sync help
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:mt-8 lg:gap-6 xl:grid-cols-[minmax(0,1.85fr)_minmax(280px,0.95fr)]">
          <div className="space-y-5">
            {noResults ? (
              <div className="rounded-[2rem] border border-slate-200 bg-slate-50/80 p-5 text-slate-700 sm:p-6">
                <p className="font-semibold">No exact match found.</p>
                <p className="mt-2 text-sm text-slate-600">Try different words or browse the most common questions below.</p>
              </div>
            ) : null}

            {results.map((topic) => (
              <HelpTopicCard
                key={topic.id}
                topic={topic}
                projectId={projectId}
                mode={mode}
                onOpenShortcuts={mode === 'project' ? handleOpenShortcuts : undefined}
              />
            ))}
          </div>

          <aside className="space-y-5 pb-6">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50/80 p-5 shadow-sm sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Popular Questions</h2>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                {HELP_TOPICS.slice(0, 6).map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setQueryOverride(topic.sampleQuestions[0] ?? topic.title)}
                    className="block w-full rounded-xl px-3 py-2 text-left text-slate-700 transition hover:bg-white hover:text-slate-900"
                  >
                    {topic.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Quick links</h2>
              <div className="mt-4 grid gap-3">
                {mode === 'project' ? (
                  <Link
                    href={`/project/${projectId}/help`}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-white"
                  >
                    Browse all help topics
                  </Link>
                ) : (
                  <Link
                    href="/library"
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-white"
                  >
                    Back to library
                  </Link>
                )}
                <button
                  type="button"
                  onClick={mode === 'project' ? handleOpenShortcuts : () => setQueryOverride('cloud sync')}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left text-sm font-medium text-slate-800 shadow-sm transition hover:bg-white"
                >
                  {mode === 'project' ? 'Open keyboard shortcuts' : 'Cloud sync guide'}
                </button>
                <button
                  type="button"
                  onClick={() => setSurveyOpen(true)}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left text-sm font-medium text-slate-800 shadow-sm transition hover:bg-white"
                >
                  Share feedback
                </button>
              </div>
            </div>
          </aside>

          <LaunchSurveyModal open={surveyOpen} onClose={() => setSurveyOpen(false)} />
        </div>
      </div>
    </div>
  )
}
