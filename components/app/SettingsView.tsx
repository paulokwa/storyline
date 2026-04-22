'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChevronLeft, Palette, Moon, Trees, Check, HelpCircle, Shield, Upload, UserRound, ImageMinus } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { THEMES, useTheme } from '@/components/providers/ThemeProvider'
import { cn } from '@/lib/utils'
import AiSetupGuide from '@/components/app/AiSetupGuide'
import { getAiProviderLabel } from '@/lib/ai/providers'
import { getBillingModeLabel } from '@/lib/ai/modes'
import { formatMicrosAsUsd, getTrialStatusMessage, isLowTrialBalance } from '@/lib/ai/trial'
import { uploadUserAvatar } from '@/lib/supabase/user-avatars'

export default function SettingsView({ user, profile, maskedApiKey, aiSettings }: { 
    user: User, 
    profile: {
        display_name: string | null
        avatar_url: string | null
        bio: string | null
    },
    maskedApiKey: string | null,
    aiSettings: {
        ai_enabled: boolean,
        billing_mode: string,
        ai_provider: string,
        ai_fallback_enabled: boolean,
        ollama_model: string,
        ollama_url: string
        trial: {
            status: string
            remaining_micros: number
            granted_micros: number
            consumed_micros: number
            blocked_reason: string | null
        } | null
    }
}) {
    const { theme, setTheme } = useTheme()
    const isMidnight = theme === 'midnight'
    const supabase = createClient()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const avatarInputRef = useRef<HTMLInputElement | null>(null)

    // Form state
    const [displayName, setDisplayName] = useState(profile.display_name || (user.user_metadata?.display_name as string) || user.email?.split('@')[0] || '')
    const [bio, setBio] = useState(profile.bio || '')
    const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || (user.user_metadata?.avatar_url as string) || '')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [apiKey, setApiKey] = useState('')
    
    // AI Settings State
    const [aiEnabled, setAiEnabled] = useState(aiSettings.ai_enabled)
    const [billingMode, setBillingMode] = useState(aiSettings.billing_mode)
    const [aiProvider, setAiProvider] = useState(aiSettings.ai_provider)
    const [aiFallback, setAiFallback] = useState(aiSettings.ai_fallback_enabled)
    const [ollamaModel, setOllamaModel] = useState(aiSettings.ollama_model)
    const [ollamaUrl, setOllamaUrl] = useState(aiSettings.ollama_url)

    // AI Setup Guide
    const [showAiGuide, setShowAiGuide] = useState(false)

    // Deletion states
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
    const [pendingAvatarPreviewUrl, setPendingAvatarPreviewUrl] = useState<string | null>(null)

    // Connection testing state
    const [testingConnection, setTestingConnection] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState<{
        success: boolean;
        message: string;
        details?: any;
    } | null>(null)
    const [cloudStatus, setCloudStatus] = useState<{
        success: boolean;
        message: string;
        details?: any;
    } | null>(null)
    const [testingCloud, setTestingCloud] = useState(false)

    // Existing data
    const existingApiKey = maskedApiKey
    const trial = aiSettings.trial
    const trialStatusMessage = getTrialStatusMessage(trial)
    const trialUsedMicros = Math.max(trial?.consumed_micros ?? 0, 0)
    const trialProgress = trial?.granted_micros
        ? Math.min(100, Math.round((trialUsedMicros / trial.granted_micros) * 100))
        : 0
    const lowTrialBalance = isLowTrialBalance(trial?.remaining_micros)

    useEffect(() => {
        return () => {
            if (pendingAvatarPreviewUrl) {
                URL.revokeObjectURL(pendingAvatarPreviewUrl)
            }
        }
    }, [pendingAvatarPreviewUrl])

    const handleUpdateEmail = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setSuccessMessage(null)
        setErrorMessage(null)
        
        const { error } = await supabase.auth.updateUser({ email })
        if (error) {
            setErrorMessage(error.message)
        } else {
            setSuccessMessage('Email updated. Please check your inbox for a confirmation link.')
            setEmail('')
        }
        setLoading(false)
    }

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setSuccessMessage(null)
        setErrorMessage(null)

        if (password.length < 8) {
            setErrorMessage('Password must be at least 8 characters long.')
            setLoading(false)
            return
        }

        if (password !== confirmPassword) {
            setErrorMessage('Password confirmation does not match.')
            setLoading(false)
            return
        }
        
        const { error } = await supabase.auth.updateUser({ password })
        if (error) {
            setErrorMessage(error.message)
        } else {
            setSuccessMessage('Password updated successfully.')
            setPassword('')
            setConfirmPassword('')
        }
        setLoading(false)
    }

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setSuccessMessage(null)
        setErrorMessage(null)

        const trimmedName = displayName.trim()
        const trimmedBio = bio.trim()

        if (!trimmedName) {
            setErrorMessage('Display name is required.')
            setLoading(false)
            return
        }

        let nextAvatarUrl = avatarUrl

        if (pendingAvatarFile) {
            try {
                const { publicUrl } = await uploadUserAvatar(supabase, user.id, pendingAvatarFile)
                nextAvatarUrl = publicUrl
                setAvatarUrl(publicUrl)
            } catch (error: any) {
                setErrorMessage(error.message || 'Unable to upload avatar.')
                setLoading(false)
                return
            }
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                display_name: trimmedName,
                avatar_url: nextAvatarUrl || null,
                bio: trimmedBio || null,
            })
            .eq('id', user.id)

        if (profileError) {
            setErrorMessage(profileError.message)
            setLoading(false)
            return
        }

        const { error: authError } = await supabase.auth.updateUser({
            data: {
                display_name: trimmedName,
                avatar_url: nextAvatarUrl || null,
            }
        })

        if (authError) {
            setErrorMessage(authError.message)
            setLoading(false)
            return
        }

        setSuccessMessage('Profile updated successfully.')
        if (pendingAvatarPreviewUrl) {
            URL.revokeObjectURL(pendingAvatarPreviewUrl)
        }
        setPendingAvatarFile(null)
        setPendingAvatarPreviewUrl(null)
        router.refresh()
        setLoading(false)
    }

    const handleAvatarSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setSuccessMessage(null)
        setErrorMessage(null)
        if (pendingAvatarPreviewUrl) {
            URL.revokeObjectURL(pendingAvatarPreviewUrl)
        }

        setPendingAvatarFile(file)
        setPendingAvatarPreviewUrl(URL.createObjectURL(file))
        setSuccessMessage('Avatar preview ready. Save profile to upload and apply it everywhere.')

        if (avatarInputRef.current) {
            avatarInputRef.current.value = ''
        }
    }

    const handleRemoveAvatar = () => {
        if (pendingAvatarPreviewUrl) {
            URL.revokeObjectURL(pendingAvatarPreviewUrl)
        }
        setAvatarUrl('')
        setPendingAvatarFile(null)
        setPendingAvatarPreviewUrl(null)
        setSuccessMessage('Avatar removed. Save profile to apply the change.')
        setErrorMessage(null)
    }

    const handleCancelAvatarPreview = () => {
        if (pendingAvatarPreviewUrl) {
            URL.revokeObjectURL(pendingAvatarPreviewUrl)
        }
        setPendingAvatarFile(null)
        setPendingAvatarPreviewUrl(null)
        setSuccessMessage(null)
        setErrorMessage(null)
    }

    const handleSaveAiSettings = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setSuccessMessage(null)
        setErrorMessage(null)

        const response = await fetch('/api/ai/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                aiEnabled,
                billingMode,
                aiProvider,
                aiFallbackEnabled: aiFallback,
                ollamaModel,
                ollamaUrl,
                apiKey: apiKey || undefined,
            }),
        })

        const data = await response.json().catch(() => null)
        if (!response.ok) {
            setErrorMessage(data?.error || 'Unable to save AI settings.')
            setLoading(false)
            return
        }

        // Clean up any old key from user_metadata to fix security leak
        if (user.user_metadata?.ai_api_key) {
            await supabase.auth.updateUser({
                data: { ai_api_key: null }
            })
        }

        setSuccessMessage('AI Settings saved successfully.')
        setApiKey('')
        router.refresh()
        setLoading(false)
    }

    const handleRemoveApiKey = async () => {
        setLoading(true)
        setSuccessMessage(null)
        setErrorMessage(null)

        const response = await fetch('/api/ai/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                billingMode: billingMode === 'byok' ? 'app_managed_trial' : billingMode,
                aiProvider: billingMode === 'ollama' ? 'ollama' : 'openai',
                aiEnabled,
                aiFallbackEnabled: aiFallback,
                ollamaModel,
                ollamaUrl,
                removeApiKey: true,
            }),
        })

        const data = await response.json().catch(() => null)
        if (!response.ok) {
            setErrorMessage(data?.error || 'Unable to remove API key.')
            setLoading(false)
            return
        }

        // Clean up old metadata as well
        if (user.user_metadata?.ai_api_key) {
            await supabase.auth.updateUser({
                data: { ai_api_key: null }
            })
        }

        setSuccessMessage('API Key removed successfully.')
        router.refresh()
        setLoading(false)
    }

    const handleDeleteAccount = async () => {
        setLoading(true)
        setSuccessMessage(null)
        setErrorMessage(null)

        // Run the secure RPC function to delete the core auth.users row
        // This will automatically cascade and delete everything else!
        const { error: dbError } = await supabase.rpc('delete_user')
        if (dbError) {
            setErrorMessage(dbError.message)
            setLoading(false)
            return
        }

        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const handleTestCloudConnection = async (provider: 'gemini' | 'openai') => {
        const providerLabel = getAiProviderLabel(provider)
        setTestingCloud(true)
        setCloudStatus(null)

        try {
            if (!apiKey && !existingApiKey) {
                setCloudStatus({
                    success: false,
                    message: 'No API Key to test.',
                    details: 'Please enter a key or ensure you have one saved.',
                })
                return
            }

            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'heartbeat',
                    provider,
                    apiKeyOverride: apiKey || undefined,
                }),
            })

            const data = await response.json()

            if (!data.ok) {
                throw new Error(data.error || 'Stored API Key failed connection test.')
            } else {
                setCloudStatus({
                    success: true,
                    message: apiKey
                        ? `New ${providerLabel} API key is valid!`
                        : `Saved ${providerLabel} API key is connected and working!`,
                })
            }
        } catch (err: any) {
            setCloudStatus({
                success: false,
                message: `${providerLabel} connection failed.`,
                details: err.message || 'Invalid API key or network error.',
            })
        } finally {
            setTestingCloud(false)
        }
    }

    const handleTestOllamaConnection = async () => {
        setTestingConnection(true)
        setConnectionStatus(null)
        setSuccessMessage(null)
        setErrorMessage(null)

        // Ensure URL is at least somewhat valid before trying
        if (!ollamaUrl || !ollamaUrl.startsWith('http')) {
            setConnectionStatus({
                success: false,
                message: "Invalid URL format.",
                details: "Please provide a valid URL starting with http:// or https://"
            })
            setTestingConnection(false)
            return
        }

        try {
            // Use a manual abort controller for maximum compatibility and control
            const controller = new AbortController()
            const id = setTimeout(() => controller.abort(), 5000)

            const response = await fetch(`${ollamaUrl.replace(/\/$/, '')}/api/tags`, {
                method: 'GET',
                signal: controller.signal,
                // 'no-cache' and 'no-cors' settings can sometimes help with local dev quirks
                cache: 'no-cache',
            }).finally(() => clearTimeout(id))

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`)
            }

            const data = await response.json()
            const models = data.models || []
            const modelName = ollamaModel.trim()
            
            const modelFound = models.some((m: any) => 
                m.name === modelName || 
                m.name === `${modelName}:latest` ||
                m.model === modelName
            )

            if (modelFound) {
                setConnectionStatus({
                    success: true,
                    message: `Successfully connected to Ollama! Found model: ${modelName}`
                })
            } else {
                setConnectionStatus({
                    success: false,
                    message: `Connected to Ollama, but model "${modelName}" was not found.`,
                    details: models.length > 0 ? `Available models: ${models.map((m: any) => m.name).join(', ')}` : "No models found. Please run 'ollama pull " + modelName + "'"
                })
            }
        } catch (err: any) {
            // We catch everything here so it doesn't bubble up to the Next.js/Turbopack error overlay
            const isTimeout = err.name === 'AbortError'
            const isNetworkError = err.name === 'TypeError' // Often indicates CORS/Blocked Local Network
            const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
            
            setConnectionStatus({
                success: false,
                message: isTimeout ? 'Connection timed out.' : 'Ollama is unreachable.',
                details: isTimeout 
                    ? "The server took too long to respond. Is it running?" 
                    : (isNetworkError && isHttps)
                        ? "Your browser might be blocking the connection to your local machine (Mixed Content/CORS). Try using 127.0.0.1 or check the 'Advanced help' in the setup guide above."
                        : `Could not connect to ${ollamaUrl}. Make sure Ollama is running and OLLAMA_ORIGINS is set.`
            })
            
            // Log to console for debugging, but don't rethrow
            console.warn('Ollama check failed:', err.message)
        } finally {
            setTestingConnection(false)
        }
    }

    return (
        <div className={cn(
            "settings-view fade-in max-w-2xl mx-auto space-y-8 py-8 md:py-12 px-4 w-full",
            isMidnight && "settings-view--midnight"
        )}>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
                    <p className="text-slate-500 mt-2">Manage your profile, account security, and app preferences.</p>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.back()}
                    className="text-slate-500 hover:text-slate-800 gap-1.5 border-slate-200"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Go Back</span>
                </Button>
            </div>

            {successMessage && (
                <div className="p-4 bg-green-50 text-green-700 rounded-md border border-green-200">
                    {successMessage}
                </div>
            )}
            
            {errorMessage && (
                <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                    {errorMessage}
                </div>
            )}

            <div className="grid gap-8">
                {/* AI API Settings */}
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">AI Partner Settings</h2>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAiGuide(true)}
                            className="gap-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs font-semibold"
                        >
                            <HelpCircle className="w-3.5 h-3.5" />
                            Help me choose
                        </Button>
                    </div>

                    <AiSetupGuide
                        open={showAiGuide}
                        onOpenChange={setShowAiGuide}
                        onSelectTrial={() => {
                            setAiEnabled(true)
                            setBillingMode('app_managed_trial')
                            setAiProvider('openai')
                        }}
                        onNavigateToProvider={(provider) => {
                            setAiEnabled(true)
                            setAiProvider(provider)
                            setBillingMode(provider === 'ollama' ? 'ollama' : 'byok')
                        }}
                    />
                    
                    <form onSubmit={handleSaveAiSettings} className="space-y-6">
                        
                        {/* Master Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="space-y-0.5">
                                <Label className="text-base">Enable AI Partner</Label>
                                <p className="text-sm text-slate-500">Master switch to enable or disable your AI Partner.</p>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={aiEnabled} 
                                onChange={(e) => setAiEnabled(e.target.checked)}
                                className="w-5 h-5 text-indigo-600 rounded bg-slate-100 border-slate-300 focus:ring-indigo-500"
                            />
                        </div>

                        {aiEnabled && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-3">
                                    <Label>AI Mode</Label>
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <label className={`border p-4 rounded-lg cursor-pointer transition-all ${billingMode === 'app_managed_trial' ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}>
                                            <div className="flex items-center gap-2">
                                                <input type="radio" name="billingMode" checked={billingMode === 'app_managed_trial'} onChange={() => {
                                                    setBillingMode('app_managed_trial')
                                                    setAiProvider('openai')
                                                }} />
                                                <span className="font-medium text-slate-900">Free Trial AI</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 ml-5">Sponsored OpenAI access with a strict, app-managed limit.</p>
                                        </label>
                                        <label className={`border p-4 rounded-lg cursor-pointer transition-all ${billingMode === 'byok' ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}>
                                            <div className="flex items-center gap-2">
                                                <input type="radio" name="billingMode" checked={billingMode === 'byok'} onChange={() => {
                                                    setBillingMode('byok')
                                                    if (aiProvider === 'ollama') setAiProvider('openai')
                                                }} />
                                                <span className="font-medium text-slate-900">Use Your Own Key</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 ml-5">Keep your existing BYOK workflow with OpenAI or Gemini.</p>
                                        </label>
                                        <label className={`border p-4 rounded-lg cursor-pointer transition-all ${billingMode === 'ollama' ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}>
                                            <div className="flex items-center gap-2">
                                                <input type="radio" name="billingMode" checked={billingMode === 'ollama'} onChange={() => {
                                                    setBillingMode('ollama')
                                                    setAiProvider('ollama')
                                                }} />
                                                <span className="font-medium text-slate-900">Ollama / Local AI</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 ml-5">Runs locally and never touches the sponsored trial balance.</p>
                                        </label>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Current Mode</p>
                                            <h3 className="text-lg font-semibold text-slate-900">{getBillingModeLabel(billingMode as any)}</h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {billingMode === 'app_managed_trial'
                                                    ? 'Storyline sponsors a limited OpenAI trial for this mode.'
                                                    : billingMode === 'byok'
                                                        ? `Requests use ${getAiProviderLabel(aiProvider)} with your own key.`
                                                        : 'Requests go directly to your local Ollama server.'}
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 border border-slate-200">
                                            {billingMode === 'app_managed_trial' ? 'Sponsored' : billingMode === 'byok' ? 'BYOK' : 'Local'}
                                        </span>
                                    </div>

                                    {billingMode === 'app_managed_trial' && (
                                        <div className="rounded-2xl border border-indigo-100 bg-white p-4 space-y-3">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">Trial Status</p>
                                                    <p className="text-sm text-slate-500">{trialStatusMessage}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400 font-bold">Remaining</p>
                                                    <p className={`text-lg font-semibold ${lowTrialBalance ? 'text-amber-600' : 'text-slate-900'}`}>
                                                        ${formatMicrosAsUsd(trial?.remaining_micros)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                                    <div
                                                        className={cn('h-full rounded-full transition-all', lowTrialBalance ? 'bg-amber-500' : 'bg-indigo-500')}
                                                        style={{ width: `${trialProgress}%` }}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-slate-500">
                                                    <span>Used ${formatMicrosAsUsd(trialUsedMicros)}</span>
                                                    <span>Budget ${formatMicrosAsUsd(trial?.granted_micros)}</span>
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                                                Free Trial AI is limited and sponsored by the app. When it runs out, switch to BYOK or Ollama to keep going.
                                            </div>
                                            {trial?.status === 'exhausted' && (
                                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                                    Your sponsored trial is exhausted. Switch to <strong>Use Your Own Key</strong> or <strong>Ollama / Local AI</strong> to continue.
                                                </div>
                                            )}
                                            {(trial?.status === 'blocked' || trial?.status === 'abuse_review') && (
                                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                                    Trial access is currently limited for this account. You can still use your own key or Ollama while it is reviewed.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {billingMode === 'byok' && (
                                        <div className="space-y-4">
                                            <div className="space-y-3">
                                                <Label>BYOK Provider</Label>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <label className={`border p-4 rounded-lg cursor-pointer transition-all ${aiProvider === 'gemini' ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}>
                                                        <div className="flex items-center gap-2">
                                                            <input type="radio" name="provider" value="gemini" checked={aiProvider === 'gemini'} onChange={() => setAiProvider('gemini')} />
                                                            <span className="font-medium text-slate-900">Gemini Cloud</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-1 ml-5">Google BYOK. Fast and easy to start with.</p>
                                                    </label>
                                                    <label className={`border p-4 rounded-lg cursor-pointer transition-all ${aiProvider === 'openai' ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}>
                                                        <div className="flex items-center gap-2">
                                                            <input type="radio" name="provider" value="openai" checked={aiProvider === 'openai'} onChange={() => setAiProvider('openai')} />
                                                            <span className="font-medium text-slate-900">OpenAI Cloud</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-1 ml-5">OpenAI BYOK inside Storyline.</p>
                                                    </label>
                                                </div>
                                            </div>

                                            {existingApiKey ? (
                                                <div className="p-3 bg-white border border-slate-200 rounded-md flex justify-between items-center shadow-sm">
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Saved API Key</p>
                                                        <p className="text-sm font-mono text-slate-600">{existingApiKey}</p>
                                                    </div>
                                                    <Button type="button" variant="ghost" size="sm" onClick={handleRemoveApiKey} disabled={loading} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                        Remove
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-sm shadow-sm">
                                                    No {aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API key is saved yet.
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label htmlFor="apiKey">
                                                    {existingApiKey
                                                        ? 'Update API Key'
                                                        : aiProvider === 'gemini'
                                                            ? 'Enter Google Gemini API Key'
                                                            : 'Enter OpenAI API Key'}
                                                </Label>
                                                <Input
                                                    id="apiKey"
                                                    type="password"
                                                    value={apiKey}
                                                    onChange={(e) => setApiKey(e.target.value)}
                                                    placeholder={aiProvider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
                                                    className="bg-white"
                                                />
                                                <p className="text-xs text-slate-500">Storyline uses BYOK here, so requests run through your own cloud account.</p>
                                            </div>

                                            <div className="pt-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleTestCloudConnection(aiProvider as 'gemini' | 'openai')}
                                                    disabled={testingCloud || (!apiKey && !existingApiKey)}
                                                    className="w-full gap-2 border-slate-300 hover:bg-white"
                                                >
                                                    {testingCloud ? (
                                                        <>
                                                            <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                                            Testing Cloud Connection...
                                                        </>
                                                    ) : 'Test Cloud Connection'}
                                                </Button>

                                                {cloudStatus && (
                                                    <div className={`mt-3 p-3 rounded-lg text-xs animate-in fade-in slide-in-from-top-1 duration-300 ${
                                                        cloudStatus.success
                                                            ? 'bg-green-100/50 border border-green-200 text-green-800'
                                                            : 'bg-amber-100/50 border border-amber-200 text-amber-800'
                                                    }`}>
                                                        <div className="font-bold flex items-center gap-1.5 mb-1">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${cloudStatus.success ? 'bg-green-500' : 'bg-amber-500'}`} />
                                                            {cloudStatus.message}
                                                        </div>
                                                        {cloudStatus.details && (
                                                            <p className="opacity-80 italic">{cloudStatus.details}</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {billingMode === 'ollama' && (
                                    <div className="p-5 border border-slate-200 rounded-lg space-y-5 bg-slate-50">
                                        <h3 className="font-semibold text-slate-800">Local Ollama Configuration</h3>
                                        <div className="space-y-2">
                                            <Label htmlFor="ollamaUrl">Local API URL</Label>
                                            <Input id="ollamaUrl" type="text" value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)} placeholder="http://127.0.0.1:11434" className="bg-white" />
                                            <p className="text-xs text-slate-500">
                                                Use <code className="bg-slate-100 px-1 rounded">http://127.0.0.1:11434</code> if "localhost" is blocked by your browser.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ollamaModel">Local Model Name</Label>
                                            <Input id="ollamaModel" type="text" value={ollamaModel} onChange={(e) => setOllamaModel(e.target.value)} placeholder="llama3" className="bg-white" />
                                            <p className="text-xs text-slate-500">Make sure this model is pulled via your terminal: `ollama pull {ollamaModel || 'llama3'}`</p>
                                        </div>

                                        <div className="pt-2">
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm"
                                                onClick={handleTestOllamaConnection}
                                                disabled={testingConnection || !ollamaUrl}
                                                className="w-full gap-2 border-slate-300 hover:bg-white"
                                            >
                                                {testingConnection ? (
                                                    <>
                                                        <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                                        Testing Connection...
                                                    </>
                                                ) : 'Test Local Connection'}
                                            </Button>

                                            {connectionStatus && (
                                                <div className={`mt-3 p-3 rounded-lg text-xs animate-in fade-in slide-in-from-top-1 duration-300 ${
                                                    connectionStatus.success 
                                                        ? 'bg-green-100/50 border border-green-200 text-green-800' 
                                                        : 'bg-amber-100/50 border border-amber-200 text-amber-800'
                                                }`}>
                                                    <div className="font-bold flex items-center gap-1.5 mb-1">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus.success ? 'bg-green-500' : 'bg-amber-500'}`} />
                                                        {connectionStatus.message}
                                                    </div>
                                                    {connectionStatus.details && (
                                                        <p className="opacity-80 italic">{connectionStatus.details}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
                                            <input type="checkbox" id="aiFallback" checked={aiFallback} onChange={(e) => setAiFallback(e.target.checked)} className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                            <Label htmlFor="aiFallback" className="font-normal cursor-pointer text-sm">Allow fallback to Gemini if Local Ollama is unreachable</Label>
                                        </div>
                                        {aiFallback && !existingApiKey && (
                                            <p className="text-xs text-amber-600 pl-6">Fallback is enabled but you have no Gemini API Key saved.</p>
                                        )}
                                        {aiFallback && (
                                            <div className="pl-6 space-y-2">
                                                <Label htmlFor="apiKeyOllamaFallback" className="text-xs">Provide Fallback Gemini Key</Label>
                                                <Input id="apiKeyOllamaFallback" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={existingApiKey ? "(Key exists)" : "AIzaSy..."} className="bg-white h-8 text-sm" />
                                            </div>
                                        )}
                                    </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <Button type="submit" disabled={loading} className="w-full">
                            Save AI Settings
                        </Button>
                    </form>
                </Card>

                {/* Appearance Settings */}
                <Card className="p-6 border-none shadow-xl bg-white/50 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Palette className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-semibold text-slate-800">Appearance</h2>
                    </div>
                    <p className="text-sm text-slate-500 mb-6">Choose between the warm default workspace and a darker midnight writing environment.</p>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {THEMES.map((id) => {
                            const isActive = theme === id
                            const isMidnight = id === 'midnight'

                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setTheme(id)}
                                    className={cn(
                                        "relative rounded-[1.5rem] border-2 p-4 text-left transition-all duration-300 active:scale-[0.98]",
                                        isActive
                                            ? "border-primary bg-primary/5 shadow-lg"
                                            : "border-slate-100 bg-white hover:border-slate-200"
                                    )}
                                >
                                    <div
                                        className="mb-4 flex aspect-[2/1] w-full items-center justify-center rounded-xl shadow-inner"
                                        style={{
                                            background: isMidnight
                                                ? 'linear-gradient(135deg, #0b1120 0%, #172033 100%)'
                                                : 'linear-gradient(135deg, #fbf9f5 0%, #f2eee6 100%)',
                                        }}
                                    >
                                        <div
                                            className="h-8 w-8 rounded-full shadow-lg"
                                            style={{ backgroundColor: isMidnight ? '#dbe5ff' : '#546354' }}
                                        />
                                        <div className="absolute inset-x-0 bottom-8 flex justify-center">
                                            {isMidnight ? (
                                                <Moon className="h-4 w-4 text-white/70" />
                                            ) : (
                                                <Trees className="h-4 w-4 text-[#546354]/60" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex flex-col items-start">
                                            <span className={cn("text-xs font-bold uppercase tracking-widest", isActive ? "text-primary" : "text-slate-400")}>Theme</span>
                                            <span className="text-sm font-semibold text-slate-900">{isMidnight ? 'Midnight' : 'Sanctuary'}</span>
                                            <span className="mt-1 text-xs text-slate-500">
                                                {isMidnight ? 'Dark editor surfaces with softer contrast around the workspace.' : 'The original warm paper-inspired workspace.'}
                                            </span>
                                        </div>
                                        {isActive && (
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-md">
                                                <Check className="h-3.5 w-3.5" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </Card>

                {/* Profile Settings */}
                <Card className="p-6">
                    <div className="mb-6">
                        <div className="mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Profile</div>
                        <h2 className="text-xl font-semibold mb-2">Account Profile</h2>
                        <p className="text-sm text-slate-500">Update your public-facing details here, then manage email and password in the security section below.</p>
                    </div>

                    <form onSubmit={handleSaveProfile} className="space-y-5">
                        <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 md:flex-row md:items-start">
                            <div className="flex flex-col items-center gap-3">
                                <Avatar className="h-24 w-24 border-2 border-white shadow-md">
                                    <AvatarImage src={pendingAvatarPreviewUrl || avatarUrl || undefined} alt={displayName || 'Profile avatar'} />
                                    <AvatarFallback className="bg-[#546354] text-white text-2xl font-bold uppercase">
                                        {(displayName || user.email?.split('@')[0] || 'U').split(' ').map((part: string) => part[0]).join('').slice(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/gif"
                                    onChange={handleAvatarSelected}
                                    className="hidden"
                                />
                                <div className="flex flex-wrap justify-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => avatarInputRef.current?.click()}
                                        disabled={uploadingAvatar}
                                        className="gap-2"
                                    >
                                        <Upload className="h-3.5 w-3.5" />
                                        Choose Avatar
                                    </Button>
                                    {pendingAvatarPreviewUrl && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleCancelAvatarPreview}
                                            className="gap-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                        >
                                            Cancel Preview
                                        </Button>
                                    )}
                                    {avatarUrl && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleRemoveAvatar}
                                            className="gap-2 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <ImageMinus className="h-3.5 w-3.5" />
                                            Remove
                                        </Button>
                                    )}
                                </div>
                                <p className="max-w-[180px] text-center text-xs text-slate-500">
                                    {pendingAvatarPreviewUrl
                                        ? 'Previewing your next avatar. Save profile to upload it.'
                                        : 'Images are shown inside a circular frame, so the preview reflects the final crop.'}
                                </p>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="displayName">Display Name</Label>
                                    <Input
                                        id="displayName"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="Your name"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bio">Bio</Label>
                                    <Textarea
                                        id="bio"
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        placeholder="A short note about yourself as a writer."
                                        maxLength={280}
                                        className="min-h-24 bg-white"
                                    />
                                    <p className="text-xs text-slate-500">{bio.length}/280</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                    <div className="flex items-center gap-2 font-medium text-slate-800">
                                        <UserRound className="h-4 w-4 text-primary" />
                                        Public profile preview
                                    </div>
                                    <p className="mt-2"><span className="font-semibold">Name:</span> {displayName || 'Unnamed user'}</p>
                                    <p className="mt-1 text-slate-500">{bio || 'No bio yet.'}</p>
                                </div>
                            </div>
                        </div>
                        <Button type="submit" disabled={loading || uploadingAvatar}>Save Profile</Button>
                    </form>

                    <div className="h-px bg-slate-200 my-6" />

                    <form onSubmit={handleUpdateEmail} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Change Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={user.email}
                                required
                            />
                        </div>
                        <Button type="submit" disabled={loading || !email}>Update Email</Button>
                    </form>

                    <div className="h-px bg-slate-200 my-6" />

                    <div className="mb-4">
                        <div className="mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Security</div>
                    </div>

                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Change Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="New password"
                                required
                            />
                            <p className="text-xs text-slate-500">Use at least 8 characters.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repeat new password"
                                required
                            />
                        </div>
                        <Button type="submit" disabled={loading || !password || !confirmPassword}>Update Password</Button>
                    </form>

                    <div className="h-px bg-slate-200 my-6" />

                    <div>
                        <h3 className="text-lg font-medium text-red-600 mb-2">Danger Zone</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Permanently delete your account and all associated user data including projects, scenes, characters, and ideas. This cannot be undone.
                        </p>
                        
                        {!showDeleteConfirm ? (
                            <Button 
                                variant="destructive" 
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={loading}
                            >
                                Delete Account & All Data
                            </Button>
                        ) : (
                            <div className="p-5 border border-red-200 bg-red-50 rounded-xl space-y-4">
                                <p className="text-sm font-semibold text-red-800">
                                    Are you absolutely sure? This cannot be reversed.
                                </p>
                                <div className="space-y-2">
                                    <Label htmlFor="deleteConfirm" className="text-red-700">
                                        Type <span className="font-bold font-mono">DELETE</span> to confirm
                                    </Label>
                                    <Input
                                        id="deleteConfirm"
                                        type="text"
                                        value={deleteConfirmText}
                                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                                        placeholder="DELETE"
                                        className="border-red-300 focus-visible:ring-red-400"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <Button 
                                        variant="destructive" 
                                        onClick={handleDeleteAccount}
                                        disabled={loading || deleteConfirmText !== 'DELETE'}
                                    >
                                        Permanently Delete
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => {
                                            setShowDeleteConfirm(false)
                                            setDeleteConfirmText('')
                                        }}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    )
}
