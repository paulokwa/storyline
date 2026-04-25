'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Cloud, LockKeyhole, Settings, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
        detail: 'You can enable cloud sync later from Project Settings when a project needs collaboration.',
        icon: LockKeyhole,
    },
    {
        id: 'cloud',
        title: 'Start with Cloud & Collaboration',
        copy: 'Use Storyline with cloud collaboration in mind while keeping project creation local-first.',
        detail: 'Cloud can be enabled per project. Turn on cloud sync from Project Settings after creating a project.',
        icon: Cloud,
    },
]

export default function StorageFirstOnboarding({ displayName }: StorageFirstOnboardingProps) {
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
            <section className="rounded-[2rem] border border-[#d9e1d5] bg-[linear-gradient(135deg,#fbf9f5_0%,#f5f4ef_55%,#eef4ed_100%)] p-8 shadow-[0_24px_80px_rgba(84,99,84,0.12)]">
                <div className="mb-6 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#546354]">
                    <span className="rounded-full bg-white/80 px-3 py-1">Welcome</span>
                    <span className="rounded-full bg-white/70 px-3 py-1">Choose Storage</span>
                </div>

                <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-5">
                        <h1 className="max-w-2xl font-serif text-4xl leading-tight text-slate-900 md:text-5xl">
                            Welcome to Storyline{displayName ? `, ${displayName}` : ''}.
                        </h1>
                        <p className="max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                            Start with private writing on this device, or keep cloud collaboration in view for projects that need it later.
                        </p>
                        <p className="max-w-2xl text-sm leading-6 text-slate-500">
                            New projects still begin local-only. Cloud sync can be enabled per project from Project Settings after you create one.
                        </p>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-6 backdrop-blur">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#546354] text-white shadow-lg shadow-[#546354]/20">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Local-first remains the default</p>
                                <p className="text-sm text-slate-500">This choice does not create a cloud project or turn on automatic sync.</p>
                            </div>
                        </div>
                        <div className="space-y-3 text-sm text-slate-600">
                            <div className="rounded-2xl bg-[#f5f4ef] px-4 py-3">
                                Create a Book or Screenplay from the library.
                            </div>
                            <div className="rounded-2xl bg-[#f5f4ef] px-4 py-3">
                                Keep work local until you choose otherwise.
                            </div>
                            <div className="rounded-2xl bg-[#f5f4ef] px-4 py-3">
                                Enable cloud sync per project when collaboration is needed.
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#546354]">Storage</p>
                        <h2 className="mt-2 font-serif text-3xl text-slate-900">Choose how you want to start</h2>
                    </div>
                    <Link href="/settings" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 underline-offset-4 hover:underline">
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
                                        ? 'border-[#546354] bg-[#eef4ed] shadow-md shadow-[#546354]/10'
                                        : 'border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-white'
                                )}
                            >
                                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5f4ef] text-[#546354]">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900">{option.title}</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{option.copy}</p>
                                <p className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-sm leading-6 text-slate-500">
                                    {option.detail}
                                </p>
                            </button>
                        )
                    })}
                </div>

                {errorMessage && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {errorMessage}
                    </div>
                )}

                <div className="sticky bottom-4 z-20 rounded-[1.5rem] border border-[#d9e1d5] bg-white/95 p-4 shadow-[0_18px_50px_rgba(84,99,84,0.15)] backdrop-blur md:p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#546354]">Selected</p>
                            <p className="text-lg font-semibold text-slate-900">{selectedOption.title}</p>
                            <p className="max-w-2xl text-sm text-slate-500">{selectedOption.detail}</p>
                        </div>
                        <Button
                            type="button"
                            onClick={handleContinue}
                            disabled={loading}
                            className="h-11 rounded-full bg-[#546354] px-5 text-white hover:bg-[#465345] sm:min-w-[220px]"
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
