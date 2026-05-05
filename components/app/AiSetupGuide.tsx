'use client'

import { useState, useEffect, useRef } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
    Cloud,
    Monitor,
    ChevronRight,
    ChevronLeft,
    ExternalLink,
    Check,
    Shield,
    Zap,
    DollarSign,
    Sparkles,
    HelpCircle,
    ChevronDown,
    Globe,
    Lock,
    Settings,
    Terminal,
    Key,
    Info,
    ArrowRight,
} from 'lucide-react'

type GuideView = 'compare' | 'gemini' | 'openai' | 'ollama'
type ProviderOption = 'gemini' | 'openai' | 'ollama'

interface AiSetupGuideProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onNavigateToProvider?: (provider: ProviderOption) => void
    onSelectTrial?: () => void
}

export default function AiSetupGuide({ open, onOpenChange, onNavigateToProvider, onSelectTrial }: AiSetupGuideProps) {
    const [view, setView] = useState<GuideView>('compare')
    const [showAdvancedOllama, setShowAdvancedOllama] = useState(false)

    const resetGuide = () => {
        setTimeout(() => {
            setView('compare')
            setShowAdvancedOllama(false)
        }, 300)
    }

    const handleSelectProvider = (provider: ProviderOption) => {
        onNavigateToProvider?.(provider)
        onOpenChange(false)
        resetGuide()
    }

    const handleOpenChange = (nextOpen: boolean) => {
        onOpenChange(nextOpen)
        if (!nextOpen) {
            resetGuide()
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-5xl"
                showCloseButton
            >
                {view === 'compare' && (
                    <CompareView 
                        onSetView={setView} 
                        onSelect={handleSelectProvider} 
                        onSelectTrial={() => {
                            onSelectTrial?.()
                            onOpenChange(false)
                            resetGuide()
                        }}
                    />
                )}
                {view === 'gemini' && (
                    <GeminiGuide
                        onBack={() => setView('compare')}
                        onSelect={() => handleSelectProvider('gemini')}
                    />
                )}
                {view === 'openai' && (
                    <OpenAiGuide
                        onBack={() => setView('compare')}
                        onSelect={() => handleSelectProvider('openai')}
                    />
                )}
                {view === 'ollama' && (
                    <OllamaGuide
                        onBack={() => setView('compare')}
                        onSelect={() => handleSelectProvider('ollama')}
                        showAdvanced={showAdvancedOllama}
                        onToggleAdvanced={() => setShowAdvancedOllama(!showAdvancedOllama)}
                    />
                )}
            </DialogContent>
        </Dialog>
    )
}

function CompareView({
    onSetView,
    onSelect,
    onSelectTrial,
}: {
    onSetView: (v: GuideView) => void
    onSelect: (p: ProviderOption) => void
    onSelectTrial: () => void
}) {
    return (
        <div className="space-y-6">
            <DialogHeader>
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl">
                        <Sparkles className="w-4.5 h-4.5 text-indigo-500" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl text-slate-900">Set Up Your AI Writing Partner</DialogTitle>
                        <DialogDescription className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
                            Start with our free trial, connect your own cloud AI account, or run AI locally on your computer with Ollama.
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            {/* Provider Cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <button
                    onClick={onSelectTrial}
                    className="group text-left p-5 rounded-2xl border-2 border-slate-100 hover:border-violet-300 bg-gradient-to-br from-white to-violet-50/40 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-1">
                        <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-bl-xl rounded-tr-lg uppercase tracking-wider">
                            Free to start
                        </span>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-violet-100 rounded-xl group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-900 text-base">Free Trial AI</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                        Get started right away — no payment details needed. Storyline covers your AI costs during the trial.
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-violet-600 group-hover:gap-3 transition-all">
                        Choose free trial
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </button>

                {/* Gemini Card */}
                <button
                    onClick={() => onSetView('gemini')}
                    className="group text-left p-5 rounded-2xl border-2 border-slate-100 hover:border-indigo-300 bg-gradient-to-br from-white to-indigo-50/40 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-1">
                        <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-bl-xl rounded-tr-lg uppercase tracking-wider">
                            Recommended
                        </span>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-indigo-100 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                            <Cloud className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-900 text-base">Gemini Cloud</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                        Connect your own Gemini account with a free API key from Google. The quickest cloud option to set up.
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 group-hover:gap-3 transition-all">
                        Set up Gemini
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </button>

                <button
                    onClick={() => onSetView('openai')}
                    className="group text-left p-5 rounded-2xl border-2 border-slate-100 hover:border-sky-300 bg-gradient-to-br from-white to-sky-50/40 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-1">
                        <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-bl-xl rounded-tr-lg uppercase tracking-wider">
                            Your API key
                        </span>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-sky-100 rounded-xl group-hover:bg-sky-600 group-hover:text-white transition-colors duration-300">
                            <Key className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-900 text-base">OpenAI Cloud</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                        Connect your own OpenAI account using a personal API key from openai.com.
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-sky-600 group-hover:gap-3 transition-all">
                        Set up OpenAI
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </button>

                {/* Ollama Card */}
                <button
                    onClick={() => onSetView('ollama')}
                    className="group text-left p-5 rounded-2xl border-2 border-slate-100 hover:border-emerald-300 bg-gradient-to-br from-white to-emerald-50/40 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-1">
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-bl-xl rounded-tr-lg uppercase tracking-wider">
                            Private
                        </span>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-emerald-100 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                            <Monitor className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-900 text-base">Local Ollama</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                        Runs AI entirely on your own computer. No AI data sent to the cloud, no ongoing fees.
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:gap-3 transition-all">
                        Set up Ollama
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </button>
            </div>

            {/* Quick Comparison Table */}
            <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Quick Comparison</h4>
                <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm bg-white">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[30%]">Feature</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-violet-600 uppercase tracking-wider">Free Trial</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Gemini Cloud</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-sky-600 uppercase tracking-wider">OpenAI Cloud</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Local Ollama</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            <CompareRow
                                label="Setup"
                                icon={<Zap className="w-3.5 h-3.5 text-amber-500" />}
                                trial="Instant"
                                gemini="Easy (API Key)"
                                openai="Easy (API Key)"
                                ollama="Medium (App Install)"
                            />
                            <CompareRow
                                label="Privacy"
                                icon={<Shield className="w-3.5 h-3.5 text-blue-500" />}
                                trial="Cloud Hosted"
                                gemini="Cloud Hosted"
                                openai="Cloud Hosted"
                                ollama="100% On-Device"
                            />
                            <CompareRow
                                label="Cost"
                                icon={<DollarSign className="w-3.5 h-3.5 text-green-500" />}
                                trial="Covered by Storyline"
                                gemini="Free tier available"
                                openai="Usage-Based"
                                ollama="Completely Free"
                            />
                            <CompareRow
                                label="Location"
                                icon={<Globe className="w-3.5 h-3.5 text-sky-500" />}
                                trial="Works Everywhere"
                                gemini="Works Everywhere"
                                openai="Works Everywhere"
                                ollama="Runs on your device"
                            />
                            <CompareRow
                                label="Performance"
                                icon={<Sparkles className="w-3.5 h-3.5 text-indigo-500" />}
                                trial="High Speed"
                                gemini="High Speed"
                                openai="High Speed"
                                ollama="Depends on your hardware"
                            />
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-amber-50/60 rounded-2xl border border-amber-100/60">
                <div className="p-1.5 bg-amber-100 rounded-lg shrink-0">
                    <Info className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    <span className="font-bold">Not sure which to pick?</span> Start with Free Trial AI — no setup needed. When you're ready to use your own AI account, Gemini and OpenAI are the simplest options. Choose Ollama to keep AI running entirely on your own computer.
                </p>
            </div>
        </div>
    )
}

function CompareRow({
    label,
    icon,
    trial,
    gemini,
    openai,
    ollama,
}: {
    label: string
    icon: React.ReactNode
    trial: string
    gemini: string
    openai: string
    ollama: string
}) {
    return (
        <tr className="hover:bg-slate-50/30 transition-colors">
            <td className="px-4 py-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    {icon}
                    {label}
                </div>
            </td>
            <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                    <span className="text-xs text-slate-600 leading-snug font-medium">{trial}</span>
                </div>
            </td>
            <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    <span className="text-xs text-slate-600 leading-snug font-medium">{gemini}</span>
                </div>
            </td>
            <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                    <span className="text-xs text-slate-600 leading-snug font-medium">{openai}</span>
                </div>
            </td>
            <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-600 leading-snug font-medium">{ollama}</span>
                </div>
            </td>
        </tr>
    )
}

function GeminiGuide({ onBack, onSelect }: { onBack: () => void, onSelect: () => void }) {
    const backRef = useRef<HTMLButtonElement>(null)
    useEffect(() => { backRef.current?.focus() }, [])
    return (
        <div className="space-y-6">
            <DialogHeader>
                <button ref={backRef} onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors mb-1 min-h-[44px] px-1 -mx-1"><ChevronLeft className="w-3.5 h-3.5" />Back</button>
                <div className="flex items-center gap-2.5">
                    <Cloud className="w-5 h-5 text-indigo-600" />
                    <DialogTitle className="text-lg">Setting Up Gemini Cloud</DialogTitle>
                </div>
                <DialogDescription className="text-slate-500">Connect your Google AI API key to use Gemini in Storyline.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <StepItem number={1} title="Get your API key from Google" active><p className="text-xs text-slate-600">Visit Google AI Studio to create a free API key — this is a private code that lets Storyline connect to your Gemini account.</p><a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-600 flex items-center gap-1 mt-1 underline">Open AI Studio <ExternalLink className="w-3 h-3" /><span className="sr-only">(opens in new tab)</span></a></StepItem>
                <StepItem number={2} title="Paste Key"><p className="text-xs text-slate-600">Paste the key in the settings panel under "Gemini Cloud".</p></StepItem>
                <StepItem number={3} title="Test & Save" done><p className="text-xs text-slate-600">Click test connection and save your settings.</p></StepItem>
            </div>
            <DialogFooter><Button variant="outline" onClick={onBack}>Back</Button><Button onClick={onSelect} className="bg-indigo-600 text-white">Use Gemini Cloud</Button></DialogFooter>
        </div>
    )
}

function OpenAiGuide({ onBack, onSelect }: { onBack: () => void, onSelect: () => void }) {
    const backRef = useRef<HTMLButtonElement>(null)
    useEffect(() => { backRef.current?.focus() }, [])
    return (
        <div className="space-y-6">
            <DialogHeader>
                <button ref={backRef} onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors mb-1 min-h-[44px] px-1 -mx-1"><ChevronLeft className="w-3.5 h-3.5" />Back</button>
                <div className="flex items-center gap-2.5">
                    <Key className="w-5 h-5 text-sky-600" />
                    <DialogTitle className="text-lg">Setting Up OpenAI Cloud</DialogTitle>
                </div>
                <DialogDescription className="text-slate-500">Connect your own OpenAI account using a personal API key.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <StepItem number={1} title="Get your API key from OpenAI" active><p className="text-xs text-slate-600">Open your OpenAI dashboard and create a new secret API key for your account or project.</p><a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-sky-600 flex items-center gap-1 mt-1 underline">Open API Keys <ExternalLink className="w-3 h-3" /><span className="sr-only">(opens in new tab)</span></a></StepItem>
                <StepItem number={2} title="Paste Key"><p className="text-xs text-slate-600">Paste it into the settings panel under "OpenAI Cloud".</p></StepItem>
                <StepItem number={3} title="Test & Save" done><p className="text-xs text-slate-600">Run the connection test, then save your settings to start using OpenAI in Storyline.</p></StepItem>
            </div>
            <DialogFooter><Button variant="outline" onClick={onBack}>Back</Button><Button onClick={onSelect} className="bg-sky-600 text-white hover:bg-sky-700">Use OpenAI Cloud</Button></DialogFooter>
        </div>
    )
}

function OllamaGuide({
    onBack,
    onSelect,
    showAdvanced,
    onToggleAdvanced,
}: {
    onBack: () => void
    onSelect: () => void
    showAdvanced: boolean
    onToggleAdvanced: () => void
}) {
    const backRef = useRef<HTMLButtonElement>(null)
    useEffect(() => { backRef.current?.focus() }, [])
    return (
        <div className="space-y-6">
            <DialogHeader>
                <button
                    ref={backRef}
                    onClick={onBack}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors mb-1 -ml-0.5 min-h-[44px] px-1"
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back to comparison
                </button>
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-100 rounded-xl">
                        <Monitor className="w-4.5 h-4.5 text-emerald-600" />
                    </div>
                    <div>
                        <DialogTitle className="text-lg">Setting Up Local Ollama</DialogTitle>
                        <DialogDescription className="mt-1">
                            Run AI privately on your own computer — no data leaves your device.
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/60 space-y-2">
                <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    Connecting the Website to your Computer
                </h4>
                <p className="text-sm text-emerald-800/80 leading-relaxed">
                    Because you are using the live site, you need to give Ollama permission to talk to <strong>storyline-paulokwa-v2.netlify.app</strong>. This is a one-time setup step for security.
                </p>
            </div>

            <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mb-3">
                    Setup Steps
                </h4>

                <StepItem number={1} title="Install Ollama" active>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Download and install the free Ollama app for Mac, Windows, or Linux.
                    </p>
                    <a
                        href="https://ollama.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 mt-1.5 hover:underline"
                    >
                        Download Ollama
                        <ExternalLink className="w-3 h-3" />
                        <span className="sr-only">(opens in new tab)</span>
                    </a>
                </StepItem>

                <StepItem number={2} title="Download a Model">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Open your terminal (or Command Prompt) and run:
                    </p>
                    <code className="block mt-2 px-3 py-2 bg-slate-800 text-emerald-300 rounded-lg text-xs font-mono">
                        ollama pull llama3
                    </code>
                </StepItem>

                <StepItem number={3} title="Enable Website Access">
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 leading-relaxed">
                            To allow this app to connect to your local Ollama, you must grant permission using <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-bold">OLLAMA_ORIGINS</code>.
                        </p>

                        <div className="grid gap-3">
                            {/* Option A */}
                            <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                                        Option A — Temporary (Quick Test)
                                    </h5>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Terminal</span>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mac / Linux</p>
                                        <code className="block px-3 py-2 bg-slate-800 text-emerald-300 rounded-lg text-[11px] font-mono break-all leading-relaxed">
                                            OLLAMA_ORIGINS="https://storyline-paulokwa-v2.netlify.app" ollama serve
                                        </code>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Windows (PowerShell)</p>
                                        <code className="block px-3 py-2 bg-slate-800 text-emerald-300 rounded-lg text-[11px] font-mono break-all leading-relaxed">
                                            $env:OLLAMA_ORIGINS="https://storyline-paulokwa-v2.netlify.app"; ollama serve
                                        </code>
                                    </div>
                                </div>
                                
                                <p className="text-[11px] text-slate-500 italic">
                                    Best for testing. You must run this every time you restart.
                                </p>
                            </div>

                            {/* Option B */}
                            <div className="p-3.5 rounded-xl border-2 border-emerald-100 bg-emerald-50/20 shadow-sm space-y-3 relative overflow-hidden">
                                <div className="absolute top-0 right-0">
                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-bl-lg uppercase tracking-wider">
                                        Recommended
                                    </span>
                                </div>
                                <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    Option B — Permanent
                                </h5>

                                <div className="space-y-4">
                                    {/* Windows Section */}
                                    <div className="space-y-1.5 p-3 bg-white/60 rounded-lg border border-emerald-100/50">
                                        <p className="text-[11px] font-bold text-slate-700 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                            Windows (System Environment Variable)
                                        </p>
                                        <ol className="text-[11px] text-slate-600 space-y-1 list-decimal ml-4">
                                            <li>Search for <strong>"Environment Variables"</strong> in Start.</li>
                                            <li>Click <strong>Edit the system environment variables</strong>.</li>
                                            <li>Under <strong>User variables</strong>, click <strong>New</strong>.</li>
                                            <li>Name: <code className="font-bold text-slate-800 bg-slate-100 px-1">OLLAMA_ORIGINS</code></li>
                                            <li>Value: <code className="font-bold text-slate-800 bg-slate-100 px-1 whitespace-nowrap">https://storyline-paulokwa-v2.netlify.app</code></li>
                                            <li>Click OK and <strong>restart your computer</strong>.</li>
                                        </ol>
                                    </div>

                                    {/* Mac/Linux Section */}
                                    <div className="space-y-1.5 p-3 bg-white/60 rounded-lg border border-emerald-100/50">
                                        <p className="text-[11px] font-bold text-slate-700 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                            Mac / Linux (Terminal Config)
                                        </p>
                                        <p className="text-[10px] text-slate-500 mb-1">Add this to your <code className="bg-slate-50 px-1">~/.zshrc</code> or <code className="bg-slate-50 px-1">~/.bashrc</code>:</p>
                                        <code className="block px-2.5 py-1.5 bg-slate-800 text-emerald-300 rounded-lg text-[10px] font-mono break-all leading-relaxed">
                                            export OLLAMA_ORIGINS="https://storyline-paulokwa-v2.netlify.app"
                                        </code>
                                        <p className="text-[10px] text-slate-500 italic mt-1 leading-tight">
                                            Note: If you use the Ollama App (GUI), you may need to restart the app after setting this in your terminal shell.
                                        </p>
                                    </div>
                                </div>

                                <p className="text-[11px] text-emerald-700/70 italic font-medium">
                                    The setting is now permanent. Just start Ollama normally (open the App or run <code className="font-bold">ollama serve</code>) after your restart.
                                </p>
                            </div>
                        </div>
                    </div>
                </StepItem>

                <StepItem number={4} title="Connect & Test" done>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Select <strong>Local Ollama</strong> below and click <strong>"Test Local Connection"</strong>.
                    </p>
                </StepItem>
            </div>

            {/* Quick Summary Table */}
            <div className="rounded-xl border border-slate-100 overflow-hidden bg-white shadow-sm mt-2">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Info className="w-3.5 h-3.5" />
                        🧠 Quick Summary
                    </h5>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-50">
                            <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mode</th>
                            <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Setup</th>
                            <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Repeat?</th>
                            <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Best For</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        <tr>
                            <td className="px-4 py-2.5 text-xs font-bold text-slate-700">Temporary</td>
                            <td className="px-4 py-2.5 text-xs text-slate-600 text-center">Easy</td>
                            <td className="px-4 py-2.5 text-xs text-amber-600 text-center font-bold">Yes</td>
                            <td className="px-4 py-2.5 text-xs text-slate-500">Quick testing</td>
                        </tr>
                        <tr className="bg-emerald-50/10">
                            <td className="px-4 py-2.5 text-xs font-bold text-emerald-700">Permanent</td>
                            <td className="px-4 py-2.5 text-xs text-emerald-600 text-center">Medium</td>
                            <td className="px-4 py-2.5 text-xs text-emerald-600 text-center font-bold">No</td>
                            <td className="px-4 py-2.5 text-xs text-emerald-700 font-medium">Daily use</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="rounded-xl border border-slate-100 overflow-hidden">
                <button
                    onClick={onToggleAdvanced}
                    aria-expanded={showAdvanced}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/80 hover:bg-slate-50 transition-colors text-left"
                >
                    <span className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <HelpCircle className="w-3.5 h-3.5" />
                        Having trouble? Advanced help
                    </span>
                    <ChevronDown className={cn(
                        "w-4 h-4 text-slate-400 transition-transform duration-200",
                        showAdvanced && "rotate-180"
                    )} />
                </button>

                {showAdvanced && (
                    <div className="p-4 space-y-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm">
                            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5 text-blue-500" />
                                Browser Connection Issues
                            </h5>
                            
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-slate-700">1. Localhost vs 127.0.0.1</p>
                                    <p className="text-[11px] text-slate-600 leading-relaxed">
                                        Browsers sometimes treat "localhost" differently than "127.0.0.1". If one doesn't work, try the other in your settings: 
                                        <code className="bg-slate-50 px-1 font-bold">http://127.0.0.1:11434</code>
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-slate-700">2. The "Mixed Content" Block</p>
                                    <p className="text-[11px] text-slate-600 leading-relaxed">
                                        Because Storyline uses <strong>HTTPS</strong> for security, your browser might block it from talking to Ollama's <strong>HTTP</strong> connection. This is a standard security feature.
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-slate-700">3. Brave Browser Users</p>
                                    <p className="text-[11px] text-slate-600 leading-relaxed">
                                        Brave blocks local network access by default. To fix this:
                                        <br />
                                        Go to <code className="bg-slate-50 px-1">Settings</code> → <code className="bg-slate-50 px-1">Privacy and security</code> → <code className="bg-slate-50 px-1">Shields</code> → Ensure "Block fingerprinting" or "Block scripts" isn't stopping the connection.
                                    </p>
                                </div>
                                
                                <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                                    <p className="text-[10px] text-amber-800 leading-tight">
                                        <strong>Pro Tip:</strong> Most connection issues are solved by correctly setting the <code>OLLAMA_ORIGINS</code> variable (Step 3) and restarting Ollama.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onBack} className="gap-1.5">
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back
                </Button>
                <Button onClick={onSelect} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Check className="w-3.5 h-3.5" />
                    Use Local Ollama
                </Button>
            </DialogFooter>
        </div>
    )
}

function StepItem({ number, title, active, done, children }: { number: number, title: string, active?: boolean, done?: boolean, children: React.ReactNode }) {
    return (
        <div className="flex gap-3">
            <div className="flex flex-col items-center">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono transition-colors", done ? "bg-green-100 text-green-600" : active ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400")}>{done ? <Check className="w-3 h-3" /> : number}</div>
                <div className="w-px flex-1 bg-slate-100 min-h-[1.5rem]" />
            </div>
            <div><h5 className="text-xs font-bold text-slate-800">{title}</h5>{children}</div>
        </div>
    )
}
