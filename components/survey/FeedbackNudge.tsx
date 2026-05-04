'use client'

import { useState, useEffect } from 'react'
import { MessageSquarePlus, X } from 'lucide-react'
import { SURVEY_STORAGE_KEY } from './LaunchSurveyModal'
import dynamic from 'next/dynamic'

const LaunchSurveyModal = dynamic(() => import('./LaunchSurveyModal'), { ssr: false })

type Props = {
    projectCount: number
}

export default function FeedbackNudge({ projectCount }: Props) {
    const [visible, setVisible] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)

    useEffect(() => {
        if (projectCount < 1) return
        const stored = localStorage.getItem(SURVEY_STORAGE_KEY)
        if (!stored) setVisible(true)
    }, [projectCount])

    const handleDismiss = () => {
        localStorage.setItem(SURVEY_STORAGE_KEY, 'dismissed')
        setVisible(false)
    }

    const handleOpen = () => {
        setModalOpen(true)
        setVisible(false)
    }

    const handleModalClose = () => {
        setModalOpen(false)
    }

    return (
        <>
            {visible && (
                <div className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                                <MessageSquarePlus className="h-4 w-4 text-slate-600" />
                            </div>
                            <p className="text-sm text-slate-700">
                                <span className="font-semibold text-slate-900">Enjoying Storyline?</span>
                                {' '}A 3-question survey helps shape what we build next.
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                type="button"
                                onClick={handleOpen}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-white hover:shadow-sm"
                            >
                                Share thoughts
                            </button>
                            <button
                                type="button"
                                onClick={handleDismiss}
                                aria-label="Dismiss"
                                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <LaunchSurveyModal
                open={modalOpen}
                onClose={handleModalClose}
                projectCount={projectCount}
            />
        </>
    )
}
