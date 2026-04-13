'use client'

import { useState } from 'react'
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

type GuideView = 'compare' | 'gemini' | 'ollama'

interface AiSetupGuideProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onNavigateToProvider?: (provider: 'gemini' | 'ollama') => void
}

export default function AiSetupGuide({ open, onOpenChange, onNavigateToProvider }: AiSetupGuideProps) {
    const [view, setView] = useState<GuideView>('compare')
    const [showAdvancedOllama, setShowAdvancedOllama] = useState(false)

    const handleSelectProvider = (provider: 'gemini' | 'ollama') => {
        onNavigateToProvider?.(provider)
        onOpenChange(false)
        setTimeout(() => {
            setView('compare')
            setShowAdvancedOllama(false)
        }, 300)
    }

    const handleClose = () => {
        onOpenChange(false)
        setTimeout(() => {
            setView('compare')
            setShowAdvancedOllama(false)
        }, 300)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent
                className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-white"
                showCloseButton
            >
                {view === 'compare' && (
                    <CompareView 
                        onSetView={setView} 
                        onSelect={handleSelectProvider} 
                    />
                )}
                {view === 'gemini' && (
                    <GeminiGuide
                        onBack={() => setView('compare')}
                        onSelect={() => handleSelectProvider('gemini')}
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
}: {
    onSetView: (v: GuideView) => void
    onSelect: (p: 'gemini' | 'ollama') => void
}) {
    return (
        <div className="space-y-6">
            <DialogHeader>
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl">
                        <Sparkles className="w-4.5 h-4.5 text-indigo-500" />
                    </div>
                    <div>
                        <DialogTitle className="text-lg">Set Up Your AI Writing Partner</DialogTitle>
                        <DialogDescription className="mt-1">
                            Choose the AI option that works best for you. Both are great — they just work differently.
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            {/* Provider Cards */}
            <div className="grid sm:grid-cols-2 gap-4">
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
                        Google's powerful AI, accessible from anywhere. The fastest way to get started.
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 group-hover:gap-3 transition-all">
                        Learn more & set up
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
                        Runs AI entirely on your own computer. Maximum privacy, no ongoing fees.
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:gap-3 transition-all">
                        Learn more & set up
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
                                <th className="px-4 py-3 text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Gemini Cloud</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Local Ollama</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            <CompareRow
                                label="Setup"
                                icon={<Zap className="w-3.5 h-3.5 text-amber-500" />}
                                gemini="Easy (API Key)"
                                ollama="Medium (App Install)"
                            />
                            <CompareRow
                                label="Privacy"
                                icon={<Shield className="w-3.5 h-3.5 text-blue-500" />}
                                gemini="Cloud Hosted"
                                ollama="100% On-Device"
                            />
                            <CompareRow
                                label="Cost"
                                icon={<DollarSign className="w-3.5 h-3.5 text-green-500" />}
                                gemini="Free Utility (Usage Restricted)"
                                ollama="Completely Free"
                            />
                            <CompareRow
                                label="Location"
                                icon={<Globe className="w-3.5 h-3.5 text-sky-500" />}
                                gemini="Works Everywhere"
                                ollama="Best for Local Dev"
                            />
                            <CompareRow
                                label="Performance"
                                icon={<Sparkles className="w-3.5 h-3.5 text-indigo-500" />}
                                gemini="High Speed"
                                ollama="Depends on your PC"
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
                    <span className="font-bold">Not sure which to pick?</span> Gemini Cloud is the recommended starting point for most writers. It's fast, easy to set up, and works seamlessly across all your devices.
                </p>
            </div>
        </div>
    )
}

function CompareRow({
    label,
    icon,
    gemini,
    ollama,
}: {
    label: string
    icon: React.ReactNode
    gemini: string
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
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    <span className="text-xs text-slate-600 leading-snug font-medium">{gemini}</span>
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
    return (
        <div className="space-y-6">
            <DialogHeader>
                <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors mb-1"><ChevronLeft className="w-3.5 h-3.5" />Back</button>
                <div className="flex items-center gap-2.5">
                    <Cloud className="w-5 h-5 text-indigo-600" />
                    <DialogTitle className="text-lg">Setting Up Gemini Cloud</DialogTitle>
                </div>
                <DialogDescription className="text-slate-500">Google's powerful AI assistants without the local setup.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <StepItem number={1} title="Get API Key" active><p className="text-xs text-slate-600">Visit Google AI Studio to create your free API key.</p><a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-xs font-bold text-indigo-600 flex items-center gap-1 mt-1 underline">Open AI Studio <ExternalLink className="w-3 h-3" /></a></StepItem>
                <StepItem number={2} title="Paste Key"><p className="text-xs text-slate-600">Paste the key in the settings panel under "Gemini Cloud".</p></StepItem>
                <StepItem number={3} title="Test & Save" done><p className="text-xs text-slate-600">Click test connection and save your settings.</p></StepItem>
            </div>
            <DialogFooter><Button variant="outline" onClick={onBack}>Back</Button><Button onClick={onSelect} className="bg-indigo-600 text-white">Use Gemini Cloud</Button></DialogFooter>
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
    return (
        <div className="space-y-6">
            <DialogHeader>
                <button
                    onClick={onBack}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors mb-1 -ml-0.5"
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
                        href="https://ollama.com/download"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 mt-1.5 hover:underline"
                    >
                        Download Ollama
                        <ExternalLink className="w-3 h-3" />
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
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Quit Ollama and restart it from your terminal with this "permission" command:
                    </p>
                    <div className="space-y-2 mt-2">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mac / Linux</p>
                            <code className="block px-3 py-2 bg-slate-800 text-emerald-300 rounded-lg text-xs font-mono break-all leading-relaxed">
                                OLLAMA_ORIGINS="https://storyline-paulokwa-v2.netlify.app" ollama serve
                            </code>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Windows (PowerShell)</p>
                            <code className="block px-3 py-2 bg-slate-800 text-emerald-300 rounded-lg text-xs font-mono break-all leading-relaxed">
                                $env:OLLAMA_ORIGINS="https://storyline-paulokwa-v2.netlify.app"; ollama serve
                            </code>
                        </div>
                    </div>
                </StepItem>

                <StepItem number={4} title="Connect & Test" done>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Select <strong>Local Ollama</strong> below and click <strong>"Test Local Connection"</strong>.
                    </p>
                </StepItem>
            </div>

            <div className="rounded-xl border border-slate-100 overflow-hidden">
                <button
                    onClick={onToggleAdvanced}
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
                        <div className="space-y-1.5">
                            <h5 className="text-xs font-bold text-slate-700">Browser Blocking?</h5>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                If it still won't connect, your browser might be blocking the website from talking to your local machine. Try using <code>http://127.0.0.1:11434</code> as the URL in settings instead of "localhost".
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <h5 className="text-xs font-bold text-slate-700">Windows Startup?</h5>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                On Windows, you can permanently set the permission in <strong>System Environment Variables</strong>. Add <code>OLLAMA_ORIGINS</code> with value <code>https://storyline-paulokwa-v2.netlify.app</code> to avoid using the terminal every time.
                            </p>
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
