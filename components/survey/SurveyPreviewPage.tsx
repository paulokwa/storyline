'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import LaunchSurveyModal from './LaunchSurveyModal'

export default function SurveyPreviewPage() {
    const [open, setOpen] = useState(true)

    return (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-50/60 px-4 py-10">
            <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-slate-900"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Admin
                    </Link>
                    <span className="rounded-full border border-[#546354]/15 bg-[#546354]/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#546354]">
                        Preview Mode
                    </span>
                </div>

                <div className="mt-6 space-y-3">
                    <h1 className="text-3xl font-serif italic text-slate-900">Launch Survey Preview</h1>
                    <p className="text-sm leading-6 text-slate-600">
                        This opens the real survey modal without marking the normal library survey as dismissed or completed in
                        local storage. You can close it and reopen it as many times as you need while testing.
                    </p>
                    <p className="text-sm leading-6 text-slate-600">
                        Submitting from preview mode still posts to <code>/api/survey</code>, so successful test submissions will
                        create real rows in <code>feedback_responses</code>.
                    </p>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                        Open Survey Preview
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (typeof window !== 'undefined') {
                                localStorage.removeItem('storyline_survey_v1')
                            }
                        }}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-white hover:shadow-sm"
                    >
                        Clear local survey flag
                    </button>
                </div>
            </div>

            <LaunchSurveyModal
                open={open}
                onClose={() => setOpen(false)}
                projectCount={1}
                previewMode
            />
        </div>
    )
}
