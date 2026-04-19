'use client'

import type { ReactNode } from 'react'
import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles, KeyRound, MonitorSmartphone, PenSquare, ArrowRight, CheckCircle2, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AiSetupGuide from '@/components/app/AiSetupGuide'
import { cn } from '@/lib/utils'

type SetupMode = 'trial' | 'byok' | 'ollama' | 'none'
type CloudProvider = 'openai' | 'gemini'

type FirstRunAiSetupProps = {
    displayName: string
    initialAiSettings: {
        ai_enabled: boolean
        billing_mode: string
        ai_provider: string
        ollama_model: string
        ollama_url: string
    }
    trialStatus: string | null
}

export default function FirstRunAiSetup({ displayName, initialAiSettings, trialStatus }: FirstRunAiSetupProps) {
    const router = useRouter()
    const configCardRef = useRef<HTMLDivElement | null>(null)
    const [guideOpen, setGuideOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [mode, setMode] = useState<SetupMode>(() => {
        if (initialAiSettings.billing_mode === 'ollama') return 'ollama'
        if (initialAiSettings.billing_mode === 'byok') return 'byok'
        return trialStatus === 'active' ? 'trial' : 'none'
    })
    const [provider, setProvider] = useState<CloudProvider>(
        initialAiSettings.ai_provider === 'gemini' ? 'gemini' : 'openai'
    )
    const [apiKey, setApiKey] = useState('')
    const [ollamaUrl, setOllamaUrl] = useState(initialAiSettings.ollama_url)
    const [ollamaModel, setOllamaModel] = useState(initialAiSettings.ollama_model)

    const trialAvailable = trialStatus === 'active'
    const needsSetupDetails = mode === 'byok' || mode === 'ollama'
    const canSubmitSelection =
        mode === 'trial'
            ? trialAvailable
            : mode === 'byok'
                ? Boolean(apiKey.trim())
                : mode === 'ollama'
                    ? Boolean(ollamaUrl.trim() && ollamaModel.trim())
                    : true

    const ctaLabel = useMemo(() => {
        switch (mode) {
            case 'trial':
                return 'Continue with Free Trial AI'
            case 'byok':
                return apiKey.trim()
                    ? `Save ${provider === 'gemini' ? 'Gemini' : 'OpenAI'} Key and Continue`
                    : `Add ${provider === 'gemini' ? 'Gemini' : 'OpenAI'} Key Below`
            case 'ollama':
                return ollamaUrl.trim() && ollamaModel.trim()
                    ? 'Use Ollama and Continue'
                    : 'Configure Ollama Below'
            case 'none':
                return 'Continue Without AI'
            default:
                return 'Continue to Library'
        }
    }, [apiKey, mode, ollamaModel, ollamaUrl, provider])

    const selectionSummary = useMemo(() => {
        switch (mode) {
            case 'trial':
                return 'Storyline will enable the sponsored free trial and take you straight into your library.'
            case 'byok':
                return `Storyline will connect to your personal ${provider === 'gemini' ? 'Gemini' : 'OpenAI'} account once you paste your API key below.`
            case 'ollama':
                return 'Storyline will use your local Ollama server once the connection details below are filled in.'
            case 'none':
                return 'Storyline will keep AI off and send you straight into the writing workspace.'
            default:
                return ''
        }
    }, [mode, provider])

    const focusConfigCard = () => {
        configCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const handleContinue = async () => {
        if (needsSetupDetails && !canSubmitSelection) {
            focusConfigCard()
            return
        }

        setLoading(true)
        setErrorMessage(null)

        const body =
            mode === 'trial'
                ? {
                    aiEnabled: true,
                    billingMode: 'app_managed_trial',
                    aiProvider: 'openai',
                    completeOnboarding: true,
                }
                : mode === 'byok'
                    ? {
                        aiEnabled: true,
                        billingMode: 'byok',
                        aiProvider: provider,
                        apiKey,
                        completeOnboarding: true,
                    }
                    : mode === 'ollama'
                        ? {
                            aiEnabled: true,
                            billingMode: 'ollama',
                            aiProvider: 'ollama',
                            ollamaUrl,
                            ollamaModel,
                            completeOnboarding: true,
                        }
                        : {
                            aiEnabled: false,
                            billingMode: 'app_managed_trial',
                            aiProvider: 'openai',
                            completeOnboarding: true,
                        }

        const response = await fetch('/api/ai/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })

        const data = await response.json().catch(() => null)

        if (!response.ok) {
            setErrorMessage(data?.error || 'Unable to save your setup right now.')
            setLoading(false)
            return
        }

        router.push('/library')
        router.refresh()
    }

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
            <div className="rounded-[2rem] border border-[#d9e1d5] bg-[linear-gradient(135deg,#fbf9f5_0%,#f5f4ef_55%,#eef4ed_100%)] p-8 shadow-[0_24px_80px_rgba(84,99,84,0.12)]">
                <div className="mb-6 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#546354]">
                    <span className="rounded-full bg-white/80 px-3 py-1">Step 1 - Welcome</span>
                    <span className="rounded-full bg-white/70 px-3 py-1">Step 2 - Choose AI Setup</span>
                </div>
                <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="space-y-4">
                        <h1 className="max-w-2xl font-serif text-4xl leading-tight text-slate-900 md:text-5xl">
                            Welcome to Storyline{displayName ? `, ${displayName}` : ''}.
                        </h1>
                        <p className="max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                            Storyline works with or without AI. Pick the setup that fits how you want to write today, then head straight into your library.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setGuideOpen(true)}
                                className="border-[#c9d4c3] bg-white/70 text-[#546354] hover:bg-white"
                            >
                                <HelpCircle className="w-4 h-4" />
                                Help Me Choose
                            </Button>
                            <Link href="/settings" className="inline-flex items-center text-sm font-medium text-slate-600 underline-offset-4 hover:underline">
                                I&apos;d rather use the full settings page
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-white/80 bg-white/80 p-6 backdrop-blur">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#546354] text-white shadow-lg shadow-[#546354]/20">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900">You can change this later</p>
                                <p className="text-sm text-slate-500">Settings always lets you switch AI modes, update keys, or turn AI off entirely.</p>
                            </div>
                        </div>
                        <div className="space-y-3 text-sm text-slate-600">
                            <div className="rounded-2xl bg-[#f5f4ef] px-4 py-3">
                                Free trial gives you sponsored OpenAI access with a capped budget.
                            </div>
                            <div className="rounded-2xl bg-[#f5f4ef] px-4 py-3">
                                Use your own AI account by pasting an API key from OpenAI or Gemini.
                            </div>
                            <div className="rounded-2xl bg-[#f5f4ef] px-4 py-3">
                                Ollama keeps generation local on your machine.
                            </div>
                            <div className="rounded-2xl bg-[#f5f4ef] px-4 py-3">
                                No AI keeps the writing workspace fully usable.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AiSetupGuide
                open={guideOpen}
                onOpenChange={setGuideOpen}
                onSelectTrial={() => setMode('trial')}
                onNavigateToProvider={(selectedProvider) => {
                    if (selectedProvider === 'ollama') {
                        setMode('ollama')
                        return
                    }
                    setMode('byok')
                    setProvider(selectedProvider)
                }}
            />

            <section className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#546354]">AI Setup</p>
                        <h2 className="mt-2 font-serif text-3xl text-slate-900">Choose how Storyline should handle AI</h2>
                    </div>
                    <p className="max-w-md text-sm text-slate-500">
                        Pick one option now. Nothing here blocks normal writing, and you can revise it later in Settings.
                    </p>
                </div>

                <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
                    <OptionCard
                        title="Free Trial AI"
                        copy={trialAvailable
                            ? 'Start with sponsored OpenAI usage managed by Storyline.'
                            : 'Sponsored trial is unavailable for this account right now.'}
                        icon={<Sparkles className="h-5 w-5" />}
                        active={mode === 'trial'}
                        disabled={!trialAvailable}
                        onClick={() => trialAvailable && setMode('trial')}
                    />
                    <OptionCard
                        title="Use Your Own Key"
                        copy="Use your own OpenAI or Gemini account by pasting the key they give you."
                        icon={<KeyRound className="h-5 w-5" />}
                        active={mode === 'byok'}
                        onClick={() => setMode('byok')}
                    />
                    <OptionCard
                        title="Local AI with Ollama"
                        copy="Run local models on your machine without cloud billing."
                        icon={<MonitorSmartphone className="h-5 w-5" />}
                        active={mode === 'ollama'}
                        onClick={() => setMode('ollama')}
                    />
                    <OptionCard
                        title="No AI for Now"
                        copy="Skip AI and use Storyline as a focused writing workspace."
                        icon={<PenSquare className="h-5 w-5" />}
                        active={mode === 'none'}
                        onClick={() => setMode('none')}
                    />
                </div>

                <div className="sticky bottom-4 z-20 mt-2 rounded-[1.5rem] border border-[#d9e1d5] bg-white/95 p-4 shadow-[0_18px_50px_rgba(84,99,84,0.15)] backdrop-blur md:p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#546354]">Selected</p>
                            <p className="text-lg font-semibold text-slate-900">
                                {mode === 'trial' && 'Free Trial AI'}
                                {mode === 'byok' && `Use Your Own Key${provider === 'gemini' ? ' - Gemini' : ' - OpenAI'}`}
                                {mode === 'ollama' && 'Local AI with Ollama'}
                                {mode === 'none' && 'No AI for Now'}
                            </p>
                            <p className="max-w-2xl text-sm text-slate-500">{selectionSummary}</p>
                        </div>
                        <div className="flex flex-col items-stretch gap-2 sm:min-w-[260px]">
                            <Button
                                type="button"
                                onClick={handleContinue}
                                disabled={loading || (mode === 'trial' && !trialAvailable)}
                                className="h-11 rounded-full bg-[#546354] px-5 text-white hover:bg-[#465345]"
                            >
                                {loading ? 'Saving Setup...' : ctaLabel}
                                {!loading && <ArrowRight className="w-4 h-4" />}
                            </Button>
                            {needsSetupDetails && !canSubmitSelection && (
                                <p className="text-center text-xs text-slate-500">
                                    Finish the fields below, then continue.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <div ref={configCardRef}>
            <Card className="border border-slate-200 bg-white/85 py-0 shadow-lg shadow-slate-200/40">
                <CardHeader className="px-6 pt-6">
                    <CardTitle className="text-xl text-slate-900">
                        {mode === 'trial' && 'Free Trial AI'}
                        {mode === 'byok' && 'Use Your Own AI Account'}
                        {mode === 'ollama' && 'Local Ollama Setup'}
                        {mode === 'none' && 'Continue Without AI'}
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                        {mode === 'trial' && 'Storyline will use the sponsored app-managed OpenAI trial until the budget is exhausted.'}
                        {mode === 'byok' && 'Paste a key from your own OpenAI or Gemini account so Storyline uses your billing instead of the built-in trial.'}
                        {mode === 'ollama' && 'Point Storyline at your local Ollama server and preferred model.'}
                        {mode === 'none' && 'AI will stay off. You can enable it later from Settings whenever you are ready.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 px-6 pb-6">
                    {mode === 'byok' && (
                        <>
                            <div className="grid gap-3 md:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setProvider('openai')}
                                    className={cn(
                                        'rounded-2xl border px-4 py-4 text-left transition-all',
                                        provider === 'openai'
                                            ? 'border-[#546354] bg-[#eef4ed] shadow-sm'
                                            : 'border-slate-200 hover:border-slate-300'
                                    )}
                                >
                                    <p className="font-semibold text-slate-900">OpenAI</p>
                                    <p className="mt-1 text-sm text-slate-500">Best if you already use OpenAI keys and want the fastest path.</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProvider('gemini')}
                                    className={cn(
                                        'rounded-2xl border px-4 py-4 text-left transition-all',
                                        provider === 'gemini'
                                            ? 'border-[#546354] bg-[#eef4ed] shadow-sm'
                                            : 'border-slate-200 hover:border-slate-300'
                                    )}
                                >
                                    <p className="font-semibold text-slate-900">Gemini</p>
                                    <p className="mt-1 text-sm text-slate-500">Works well if you want your own Google-hosted AI setup.</p>
                                </button>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="first-run-api-key" className="text-slate-800">
                                    {provider === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'}
                                </Label>
                                <Input
                                    id="first-run-api-key"
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
                                    className="bg-white text-slate-900 placeholder:text-slate-400"
                                />
                                <p className="text-sm text-slate-500">This is a private key from your AI provider. Storyline stores it in your settings so requests run on your account, and you can change or remove it later.</p>
                            </div>
                        </>
                    )}

                    {mode === 'ollama' && (
                        <div className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="first-run-ollama-url" className="text-slate-800">Local API URL</Label>
                                <Input
                                    id="first-run-ollama-url"
                                    type="text"
                                    value={ollamaUrl}
                                    onChange={(e) => setOllamaUrl(e.target.value)}
                                    placeholder="http://127.0.0.1:11434"
                                    className="bg-white text-slate-900 placeholder:text-slate-400"
                                />
                                <p className="text-sm text-slate-500">Use `127.0.0.1` if your browser blocks `localhost`.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="first-run-ollama-model" className="text-slate-800">Model Name</Label>
                                <Input
                                    id="first-run-ollama-model"
                                    type="text"
                                    value={ollamaModel}
                                    onChange={(e) => setOllamaModel(e.target.value)}
                                    placeholder="llama3"
                                    className="bg-white text-slate-900 placeholder:text-slate-400"
                                />
                                <p className="text-sm text-slate-500">Make sure the model is available locally before you start using AI tools.</p>
                            </div>
                        </div>
                    )}

                    {mode === 'trial' && (
                        <div className="rounded-2xl border border-[#d9e1d5] bg-[#f7faf7] p-5 text-sm text-slate-600">
                            Storyline will enable AI immediately using the app-managed free trial. If you later want more control, you can switch to your own key or Ollama from Settings.
                        </div>
                    )}

                    {mode === 'none' && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                            You will still be able to create projects, write, organize scenes, and manage your library. AI features remain off until you enable them later.
                        </div>
                    )}

                    {errorMessage && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {errorMessage}
                        </div>
                    )}

                    <div className="border-t border-slate-200 pt-5">
                        <p className="text-sm text-slate-500">
                            You can change this later in <Link href="/settings" className="font-medium text-[#546354] hover:underline">Settings</Link>.
                        </p>
                    </div>
                </CardContent>
            </Card>
            </div>
        </div>
    )
}

function OptionCard({
    title,
    copy,
    icon,
    active,
    disabled = false,
    onClick,
}: {
    title: string
    copy: string
    icon: ReactNode
    active: boolean
    disabled?: boolean
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'rounded-[1.5rem] border p-5 text-left transition-all',
                active
                    ? 'border-[#546354] bg-[#eef4ed] shadow-md shadow-[#546354]/10'
                    : 'border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-white',
                disabled && 'cursor-not-allowed opacity-50 hover:border-slate-200 hover:bg-white/80'
            )}
        >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5f4ef] text-[#546354]">
                {icon}
            </div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
        </button>
    )
}
