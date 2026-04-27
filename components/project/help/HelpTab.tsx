'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { HELP_TOPICS, matchHelpTopics, type HelpTopic } from '@/lib/help'
import { queueWorkspaceTourStart } from '@/lib/project/tour'

function HelpTopicCard({ topic, projectId, mode }: { topic: HelpTopic; projectId: string; mode: 'project' | 'global' }) {
  const hasProjectRoute = mode === 'project' && projectId && topic.relatedRoutes.length > 0

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{topic.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{topic.summary}</p>
        </div>
        {hasProjectRoute ? (
          <Link
            href={`/project/${projectId}${topic.relatedRoutes[0]}`}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Open
          </Link>
        ) : null}
      </div>
      <div className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{topic.answer}</div>
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

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-[#fbf9f5] custom-scrollbar">
      <div className="mx-auto max-w-6xl p-6 fade-in">
        <div className="rounded-[3rem] bg-white p-10 shadow-xl shadow-slate-200/40 ring-1 ring-slate-100">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-8">
                <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Help Center</p>
                <h1 className="mt-4 text-4xl font-serif italic text-slate-900 tracking-tight">Find answers fast</h1>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  {mode === 'project'
                    ? 'Search common Storyline workflows, AI help, export guidance, and recovery tips without leaving the app.'
                    : 'Search common Storyline workflows, moving-between-devices tips, cloud sync guidance, and backup answers before you open a project.'}
                </p>
              </div>

              <div className="mt-6">
                <Input
                  value={query}
                  onChange={(event) => setQueryOverride(event.target.value)}
                  placeholder={mode === 'project' ? "Ask a question, like 'How do I add a character?'" : "Ask a question, like 'How do I enable cloud sync?'"}
                  className="max-w-2xl"
                />
              </div>
            </div>

            <div className="w-full max-w-sm rounded-[2rem] border border-slate-200 bg-slate-50 p-5 shadow-sm">
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
                    className="mt-5 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
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
                    className="mt-5 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Show cloud sync help
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            {noResults ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
                <p className="font-semibold">No exact match found.</p>
                <p className="mt-2 text-sm text-slate-600">Try different words or browse the most common questions below.</p>
              </div>
            ) : null}

            {results.map((topic) => (
              <HelpTopicCard key={topic.id} topic={topic} projectId={projectId} mode={mode} />
            ))}
          </div>

          <aside className="space-y-6 pb-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Popular Questions</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {HELP_TOPICS.slice(0, 6).map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setQueryOverride(topic.sampleQuestions[0] ?? topic.title)}
                    className="block w-full text-left text-slate-700 hover:text-slate-900"
                  >
                    {topic.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Quick links</h2>
              <div className="mt-4 grid gap-3">
                {mode === 'project' ? (
                  <Link
                    href={`/project/${projectId}/help`}
                    className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-100"
                  >
                    Browse all help topics
                  </Link>
                ) : (
                  <Link
                    href="/library"
                    className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-100"
                  >
                    Back to library
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setQueryOverride(mode === 'project' ? 'keyboard shortcuts' : 'cloud sync')}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-100"
                >
                  {mode === 'project' ? 'Keyboard shortcuts' : 'Cloud sync guide'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
