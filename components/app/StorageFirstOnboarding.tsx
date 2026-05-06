'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Cloud, LockKeyhole, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/providers/ThemeProvider'

type StoragePath = 'private' | 'cloud'
type OnboardingStep = 'welcome' | 'choose'

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
        copy: 'Keep new projects on this device by default.',
        detail: 'You can turn on cloud sync later from Project Settings.',
        icon: LockKeyhole,
    },
    {
        id: 'cloud',
        title: 'Start with Cloud & Collaboration',
        copy: 'Create new projects online from the start, ready for cloud access and collaboration.',
        detail: 'Best if you already know you want collaboration or cloud access from the beginning.',
        icon: Cloud,
    },
]

export default function StorageFirstOnboarding({ displayName }: StorageFirstOnboardingProps) {
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    const router = useRouter()
    const [step, setStep] = useState<OnboardingStep>('welcome')
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
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-12 md:px-8 md:py-20">

            {/* Step 1 — Welcome */}
            {step === 'welcome' && (
                <div className="flex flex-1 flex-col justify-center gap-10 animate-in fade-in duration-500">
                    <div className="space-y-6">
                        <h1 className={cn(
                            'font-serif text-4xl leading-tight md:text-5xl',
                            isMidnight ? 'text-slate-100' : 'text-slate-900'
                        )}>
                            Welcome to Storyline{displayName ? `, ${displayName}` : ''}.
                        </h1>
                        <p className={cn(
                            'text-base leading-7 md:text-lg',
                            isMidnight ? 'text-slate-300' : 'text-slate-600'
                        )}>
                            You&rsquo;re all set. Storyline is a quiet place to shape your books and screenplays, keep your ideas organized, and write at your own pace.
                        </p>
                        <p className={cn(
                            'text-sm leading-6',
                            isMidnight ? 'text-slate-400' : 'text-slate-500'
                        )}>
                            Before you enter the library, we&rsquo;ll ask one quick question so new projects start in the way that feels right for you.
                        </p>
                    </div>

                    <Button
                        type="button"
                        onClick={() => setStep('choose')}
                        className={cn(
                            'h-12 self-start rounded-full px-8 text-white',
                            isMidnight ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-[#546354] hover:bg-[#465345]'
                        )}
                    >
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Step 2 — Choose storage */}
            {step === 'choose' && (
                <div className="flex flex-1 flex-col gap-8 animate-in fade-in duration-500">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <p className={cn('text-sm font-semibold uppercase tracking-[0.24em]', isMidnight ? 'text-slate-400' : 'text-[#546354]')}>Storage</p>
                            <h2 className={cn('mt-2 font-serif text-3xl', isMidnight ? 'text-slate-100' : 'text-slate-900')}>Choose how new projects should start</h2>
                            <p className={cn('mt-3 text-sm leading-6', isMidnight ? 'text-slate-400' : 'text-slate-500')}>
                                You can keep new projects private on this device, or start them online if you already know you want cloud access or collaboration.
                            </p>
                        </div>
                        <Link
                            href="/settings"
                            className={cn('inline-flex shrink-0 items-center gap-2 text-sm font-medium underline-offset-4 hover:underline', isMidnight ? 'text-slate-400' : 'text-slate-600')}
                        >
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
                                    aria-pressed={active}
                                    className={cn(
                                        'rounded-[1.5rem] border p-6 text-left transition-all outline-none',
                                        'focus-visible:ring-2 focus-visible:ring-offset-2',
                                        isMidnight
                                            ? 'focus-visible:ring-indigo-400 focus-visible:ring-offset-slate-900'
                                            : 'focus-visible:ring-[#546354] focus-visible:ring-offset-white',
                                        active
                                            ? isMidnight
                                                ? 'border-indigo-400/40 bg-slate-800 shadow-md shadow-indigo-500/10'
                                                : 'border-[#546354] bg-[#eef4ed] shadow-md shadow-[#546354]/10'
                                            : isMidnight
                                                ? 'border-slate-600/40 bg-slate-800/40 hover:border-slate-500/60 hover:bg-slate-800/60'
                                                : 'border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-white'
                                    )}
                                >
                                    <div className="mb-4 flex items-start justify-between">
                                        <div className={cn(
                                            'flex h-11 w-11 items-center justify-center rounded-2xl',
                                            isMidnight ? 'bg-slate-700/60 text-indigo-400' : 'bg-[#f5f4ef] text-[#546354]'
                                        )}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        {active && (
                                            <span
                                                aria-hidden="true"
                                                className={cn(
                                                    'flex h-6 w-6 items-center justify-center rounded-full',
                                                    isMidnight ? 'bg-indigo-500' : 'bg-[#546354]'
                                                )}
                                            >
                                                <Check className="h-3.5 w-3.5 text-white" />
                                            </span>
                                        )}
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
                                <p className={cn('text-lg font-semibold', isMidnight ? 'text-slate-100' : 'text-slate-900')}>
                                    {selectedOption.title}
                                </p>
                                <p className={cn('max-w-2xl text-sm', isMidnight ? 'text-slate-400' : 'text-slate-500')}>
                                    You can change this later from Project Settings.
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setStep('welcome')}
                                    disabled={loading}
                                    className={cn(
                                        'text-sm font-medium underline-offset-4 hover:underline disabled:opacity-40',
                                        isMidnight ? 'text-slate-400' : 'text-slate-500'
                                    )}
                                >
                                    Back
                                </button>
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
                                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
