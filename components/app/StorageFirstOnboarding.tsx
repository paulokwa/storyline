'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Cloud, LockKeyhole, Settings, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/providers/ThemeProvider'

type StoragePath = 'private' | 'cloud'

type StorageFirstOnboardingProps = {
    displayName: string
}

const options: Array<{
    id: StoragePath
    title: string
    copy: string
    detail: string
    icon: typeof LockKeyhole
}> = [
    {
        id: 'private',
        title: 'Start Private',
        copy: 'Create local-only projects by default and keep your writing on this device.',
        detail: 'You can turn on cloud sync later from Project Settings.',
        icon: LockKeyhole,
    },
    {
        id: 'cloud',
        title: 'Start with Cloud & Collaboration',
        copy: 'Create new projects directly in the cloud with collaboration ready from the start.',
        detail: 'Best if you already know you want collaboration or cloud access from the beginning.',
        icon: Cloud,
    },
]

export default function StorageFirstOnboarding({ displayName }: StorageFirstOnboardingProps) {
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    const router = useRouter()
    const [selectedPath, setSelectedPath] = useState<StoragePath>('private')
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const handleContinue = async () => {
        setLoading(true)
        setErrorMessage(null)

        const response = await fetch('/api/onboarding/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                preferredStorageMode: selectedPath === 'cloud' ? 'cloud' : 'local',
            }),
        })

        const data = await response.json().catch(() => null)

        if (!response.ok) {
            setErrorMessage(data?.error || 'Unable to finish onboarding right now.')
            setLoading(false)
            return
        }

        router.push('/library')
        router.refresh()
    }

    const selectedOption = options.find((option) => option.id === selectedPath) ?? options[0]

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
            <section className={cn(
                'rounded-[2rem] border p-8 shadow-[0_24px_80px_rgba(84,99,84,0.12)]',
                isMidnight
                    ? 'border-slate-700/60 bg-[linear-gradient(135deg,#1a2234_0%,#111c2e_55%,#0f1729_100%)] shadow-none'
                    : 'border-[#d9e1d5] bg-[linear-gradient(135deg,#fbf9f5_0%,#f5f4ef_55%,#eef4ed_100%)]'
            )}>
                <div className={cn(
                    'mb-6 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em]',
                    isMidnight ? 'text-slate-400' : 'text-[#546354]'
                )}>
                    <span className={cn('rounded-full px-3 py-1', isMidnight ? 'bg-white/8' : 'bg-white/80')}>Welcome</span>
                    <span className={cn('rounded-full px-3 py-1', isMidnight ? 'bg-white/6' : 'bg-white/70')}>Choose Storage</span>
                </div>

                <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-5">
                        <h1 className={cn('max-w-2xl font-serif text-4xl leading-tight md:text-5xl', isMidnight ? 'text-slate-100' : 'text-slate-900')}>
                            Welcome to Storyline{displayName ? `, ${displayName}` : ''}.
                        </h1>
                        <p className={cn('max-w-2xl text-base leading-7 md:text-lg', isMidnight ? 'text-slate-300' : 'text-slate-600')}>
                            Choose where Storyline should create new projects by default.
                        </p>
                        <p className={cn('max-w-2xl text-sm leading-6', isMidnight ? 'text-slate-400' : 'text-slate-500')}>
                            Private projects stay local on this device. Cloud projects are stored online so they can support collaboration.
                        </p>
                    </div>

                    <div className={cn(
                        'rounded-[1.5rem] border p-6',
                        isMidnight ? 'border-slate-600/40 bg-slate-800/60' : 'border-white/80 bg-white/80'
                    )}>
                        <div className="mb-4 flex items-center gap-3">
                            <div className={cn(
                                'flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg',
                                isMidnight ? 'bg-indigo-500/30 text-indigo-300 shadow-indigo-500/10' : 'bg-[#546354] text-white shadow-[#546354]/20'
                            )}>
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <p className={cn('text-sm font-semibold', isMidnight ? 'text-slate-100' : 'text-slate-900')}>You can change course later</p>
                                <p className={cn('text-sm', isMidnight ? 'text-slate-400' : 'text-slate-500')}>You can change this later. Private projects can move to cloud from Project Settings.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className={cn('text-sm font-semibold uppercase tracking-[0.24em]', isMidnight ? 'text-slate-400' : 'text-[#546354]')}>Storage</p>
                        <h2 className={cn('mt-2 font-serif text-3xl', isMidnight ? 'text-slate-100' : 'text-slate-900')}>Choose how you want to start</h2>
                    </div>
                    <Link href="/settings" className={cn('inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline', isMidnight ? 'text-slate-400' : 'text-slate-600')}>
                        <Settings className="h-4 w-4" />
                        AI and account settings
                    </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {options.map((option) => {
                        const Icon = option.icon
                        const active = selectedPath === option.id

                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setSelectedPath(option.id)}
                                className={cn(
                                    'rounded-[1.5rem] border p-6 text-left transition-all',
                                    active
                                        ? cn(
                                            isMidnight ? 'border-indigo-400/40 bg-slate-800 shadow-md shadow-indigo-500/10' : 'border-[#546354] bg-[#eef4ed] shadow-md shadow-[#546354]/10'
                                        )
                                        : cn(
                                            isMidnight ? 'border-slate-600/40 bg-slate-800/40 hover:border-slate-500/60 hover:bg-slate-800/60' : 'border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-white'
                                        )
                                )}
                            >
                                <div className={cn(
                                    'mb-4 flex h-11 w-11 items-center justify-center rounded-2xl',
                                    isMidnight ? 'bg-slate-700/60 text-indigo-400' : 'bg-[#f5f4ef] text-[#546354]'
                                )}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <h3 className={cn('text-lg font-semibold', isMidnight ? 'text-slate-100' : 'text-slate-900')}>{option.title}</h3>
                                <p className={cn('mt-2 text-sm leading-6', isMidnight ? 'text-slate-300' : 'text-slate-600')}>{option.copy}</p>
                                <p className={cn('mt-4 rounded-2xl px-4 py-3 text-sm leading-6', isMidnight ? 'bg-white/6 text-slate-400' : 'bg-white/70 text-slate-500')}>
                                    {option.detail}
                                </p>
                            </button>
                        )
                    })}
                </div>

                {errorMessage && (
                    <div role="alert" aria-live="polite" className={cn(
                        'rounded-2xl border px-4 py-3 text-sm',
                        isMidnight ? 'border-red-400/30 bg-red-500/15 text-red-300' : 'border-red-200 bg-red-50 text-red-700'
                    )}>
                        {errorMessage}
                    </div>
                )}

                <div className={cn(
                    'sticky bottom-4 z-20 rounded-[1.5rem] border p-4 shadow-[0_18px_50px_rgba(84,99,84,0.15)] md:p-5',
                    isMidnight ? 'border-slate-600/40 bg-slate-800/95 shadow-none' : 'border-[#d9e1d5] bg-white/95'
                )}>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                            <p className={cn('text-xs font-semibold uppercase tracking-[0.24em]', isMidnight ? 'text-slate-400' : 'text-[#546354]')}>Selected</p>
                            <p className={cn('text-lg font-semibold', isMidnight ? 'text-slate-100' : 'text-slate-900')}>{selectedOption.title}</p>
                            <p className={cn('max-w-2xl text-sm', isMidnight ? 'text-slate-400' : 'text-slate-500')}>{selectedOption.detail}</p>
                        </div>
                        <Button
                            type="button"
                            onClick={handleContinue}
                            disabled={loading}
                            className={cn(
                                'h-11 rounded-full px-5 text-white sm:min-w-[220px]',
                                isMidnight ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-[#546354] hover:bg-[#465345]'
                            )}
                        >
                            {loading ? 'Opening Library...' : 'Continue to Library'}
                            {!loading && <ArrowRight className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    )
}
