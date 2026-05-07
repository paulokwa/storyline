'use client'

import { useState, useEffect } from 'react'
import { MessageSquarePlus, X } from 'lucide-react'
import { SURVEY_STORAGE_KEY } from './LaunchSurveyModal'
import dynamic from 'next/dynamic'
import { useTheme } from '@/components/providers/ThemeProvider'
import { cn } from '@/lib/utils'

const LaunchSurveyModal = dynamic(() => import('./LaunchSurveyModal'), { ssr: false })

type Props = {
    projectCount: number
}

export default function FeedbackNudge({ projectCount }: Props) {
    const [visible, setVisible] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'

    useEffect(() => {
        const nextVisible = projectCount >= 1 && !localStorage.getItem(SURVEY_STORAGE_KEY)
        const timeoutId = window.setTimeout(() => {
            setVisible(nextVisible)
        }, 0)

        return () => window.clearTimeout(timeoutId)
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
                <div
                    className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 sm:px-6"
                    style={{
                        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
                    }}
                >
                    <div className="mx-auto flex max-w-[26rem] md:mr-0 md:max-w-sm">
                        <div
                            className={cn(
                                'pointer-events-auto w-full rounded-[1.75rem] border px-4 py-4 shadow-[0_20px_55px_rgba(84,99,84,0.16)] backdrop-blur-xl sm:px-5',
                                'md:ml-auto',
                                isMidnight
                                    ? 'border-slate-700/70 bg-[#182239]/94 text-slate-100'
                                    : 'border-[#d9e1d5] bg-[#fbf9f5]/96 text-slate-900'
                            )}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                    <div
                                        className={cn(
                                            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                                            isMidnight
                                                ? 'border-[#aac0ad]/20 bg-[#546354]/20 text-[#dbe7d7]'
                                                : 'border-[#d9e1d5] bg-[#eef4ed] text-[#546354]'
                                        )}
                                    >
                                        <MessageSquarePlus className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className={cn(
                                                'text-sm font-semibold',
                                                isMidnight ? 'text-slate-100' : 'text-slate-900'
                                            )}
                                        >
                                            Help shape Storyline
                                        </p>
                                        <p
                                            className={cn(
                                                'mt-1 text-sm leading-relaxed',
                                                isMidnight ? 'text-slate-300' : 'text-slate-600'
                                            )}
                                        >
                                            Share one quick thought about what&apos;s working, what&apos;s confusing, or what you&apos;d love next.
                                        </p>

                                        <button
                                            type="button"
                                            onClick={handleOpen}
                                            className={cn(
                                                'mt-4 inline-flex max-w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition',
                                                isMidnight
                                                    ? 'bg-[#546354] text-white hover:bg-[#65745f]'
                                                    : 'bg-[#546354] text-white hover:bg-[#485748]'
                                            )}
                                        >
                                            Share thoughts
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDismiss}
                                    aria-label="Dismiss survey nudge"
                                    className={cn(
                                        'shrink-0 rounded-full p-1.5 transition',
                                        isMidnight
                                            ? 'text-slate-400 hover:bg-white/8 hover:text-slate-200'
                                            : 'text-slate-400 hover:bg-[#eef4ed] hover:text-[#546354]'
                                    )}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
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
