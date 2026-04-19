'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { HELP_TOPICS, matchHelpTopics, type HelpTopic } from '@/lib/help'

function HelpTopicCard({ topic, projectId }: { topic: HelpTopic; projectId: string }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{topic.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{topic.summary}</p>
        </div>
        {topic.relatedRoutes.length > 0 ? (
          <Link
            href={`/project/${projectId}${topic.relatedRoutes[0]}`}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Open
          </Link>
        ) : null}
      </div>
      <div className="mt-4 text-sm leading-7 text-slate-700 whitespace-pre-line">{topic.answer}</div>
    </div>
  )
}

export default function HelpTab() {
  const params = useParams()
  const projectId = typeof params === 'object' && params?.id ? String(params.id) : ''
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (!query.trim()) return HELP_TOPICS.slice(0, 6)
    return matchHelpTopics(query, HELP_TOPICS)
  }, [query])

  const noResults = query.trim().length > 0 && results.length === 0

  return (
    <div className="min-h-full bg-[#fbf9f5] p-6 max-w-6xl mx-auto fade-in">
      <div className="rounded-[3rem] bg-white p-10 shadow-xl shadow-slate-200/40 ring-1 ring-slate-100">
        <div className="max-w-3xl">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Help Center</p>
            <h1 className="mt-4 text-4xl font-serif italic text-slate-900 tracking-tight">Find answers fast</h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Search common Storyline workflows, AI help, export guidance, and recovery tips without leaving the app.
            </p>
          </div>

          <div className="mt-6">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask a question, like ‘How do I add a character?’"
              className="max-w-2xl"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr] mt-8">
        <div className="space-y-4">
          {noResults ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
              <p className="font-semibold">No exact match found.</p>
              <p className="mt-2 text-sm text-slate-600">Try different words or browse the most common questions below.</p>
            </div>
          ) : null}

          {results.map((topic) => (
            <HelpTopicCard key={topic.id} topic={topic} projectId={projectId} />
          ))}
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Popular Questions</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              {HELP_TOPICS.slice(0, 6).map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setQuery(topic.sampleQuestions[0] ?? topic.title)}
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
              <Link
                href={`/project/${projectId}/help`}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-100"
              >
                Browse all help topics
              </Link>
              <Link
                href={`/project/${projectId}/story`}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-100"
              >
                Keyboard shortcuts
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
