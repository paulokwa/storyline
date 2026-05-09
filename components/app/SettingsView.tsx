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
import { ChevronLeft, Palette, Moon, Trees, Check, HelpCircle, Upload, UserRound, ImageMinus } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { THEMES, useTheme } from '@/components/providers/ThemeProvider'
import { cn } from '@/lib/utils'
import AiSetupGuide from '@/components/app/AiSetupGuide'
import { getAiProviderLabel, OPENROUTER_CURATED_MODELS } from '@/lib/ai/providers'
import { getBillingModeLabel, type AiContextMode, type BillingMode } from '@/lib/ai/modes'
import { formatTrialRemainingPct, getTrialStatusMessage, isLowTrialBalance } from '@/lib/ai/trial'
import { uploadUserAvatar } from '@/lib/supabase/user-avatars'

type StatusMessage = {
    success: boolean
    message: string
    details?: string
}

type OllamaModelInfo = {
    name?: string
    model?: string
}

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
        ai_context_mode: AiContextMode,
        ai_fallback_enabled: boolean,
        ollama_model: string,
        ollama_url: string,
        openrouter_model: string,
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
    const [aiContextMode, setAiContextMode] = useState<AiContextMode>(aiSettings.ai_context_mode)
    const [aiFallback, setAiFallback] = useState(aiSettings.ai_fallback_enabled)
    const [ollamaModel, setOllamaModel] = useState(aiSettings.ollama_model)
    const [ollamaUrl, setOllamaUrl] = useState(aiSettings.ollama_url)
    const [openrouterModel, setOpenrouterModel] = useState(aiSettings.openrouter_model)

    // AI Setup Guide
    const [showAiGuide, setShowAiGuide] = useState(false)

    // Deletion states
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [uploadingAvatar] = useState(false)
    const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
    const [pendingAvatarPreviewUrl, setPendingAvatarPreviewUrl] = useState<string | null>(null)

    // Connection testing state
    const [testingConnection, setTestingConnection] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState<StatusMessage | null>(null)
    const [cloudStatus, setCloudStatus] = useState<StatusMessage | null>(null)
    const [testingCloud, setTestingCloud] = useState(false)

    // Existing data
    const existingApiKey = maskedApiKey
    const trial = aiSettings.trial
    const trialStatusMessage = getTrialStatusMessage(trial)
    const trialUsedMicros = Math.max(trial?.consumed_micros ?? 0, 0)
    const trialProgress = trial?.granted_micros
        ? Math.min(100, Math.round((trialUsedMicros / trial.granted_micros) * 100))
        : 0
    const trialRemainingPct = formatTrialRemainingPct(trial?.remaining_micros, trial?.granted_micros)
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
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Unable to upload avatar.'
                setErrorMessage(message)
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
                aiContextMode,
                aiFallbackEnabled: aiFallback,
                ollamaModel,
                ollamaUrl,
                openrouterModel,
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
                aiContextMode,
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

    const handleTestCloudConnection = async (provider: 'gemini' | 'openai' | 'openrouter') => {
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
        } catch (err: unknown) {
            const details = err instanceof Error ? err.message : 'Invalid API key or network error.'
            setCloudStatus({
                success: false,
                message: `${providerLabel} connection failed.`,
                details,
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

            const data: { models?: OllamaModelInfo[] } = await response.json()
            const models = data.models || []
            const modelName = ollamaModel.trim()
            
            const modelFound = models.some((m) => 
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
                    details: models.length > 0 ? `Available models: ${models.map((m) => m.name ?? m.model ?? 'Unknown model').join(', ')}` : "No models found. Please run 'ollama pull " + modelName + "'"
                })
            }
        } catch (err: unknown) {
            // We catch everything here so it doesn't bubble up to the Next.js/Turbopack error overlay
            const errorName = err instanceof Error ? err.name : ''
            const isTimeout = errorName === 'AbortError'
            const isNetworkError = errorName === 'TypeError' // Often indicates CORS/Blocked Local Network
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
            console.warn('Ollama check failed:', err instanceof Error ? err.message : err)
        } finally {
            setTestingConnection(false)
        }
    }

    return (
        <div className={cn(
            "settings-view fade-in max-w-2xl mx-auto space-y-8 py-8 md:py-12 px-4 w-full",
            isMidnight && "settings-view--midnight"
        )}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        Manage your profile, account security, appearance, and optional AI setup.
                    </p>
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

            {(successMessage || errorMessage) && (
                <div className="fixed bottom-6 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4">
                    {successMessage && (
                        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 shadow-lg">
                            {successMessage}
                        </div>
                    )}
                    {errorMessage && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-lg">
                            {errorMessage}
                        </div>
                    )}
                </div>
            )}

            <div className="grid gap-8">
                {/* Profile Settings */}
                <Card className="p-6">
                    <div className="mb-6">
                        <div className="mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Account</div>
                        <h2 className="mb-2 text-xl font-semibold">Profile and Security</h2>
                        <p className="max-w-2xl text-sm leading-6 text-slate-500">
                            Update the details other people see, then review the email, password, and account controls tied to your sign-in.
                        </p>
                    </div>

                    <div className="space-y-5">
                        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <div className="mb-4">
                                <h3 className="text-base font-semibold text-slate-900">Profile</h3>
                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    These details appear on your account and help personalize your writing workspace.
                                </p>
                            </div>

                            <form onSubmit={handleSaveProfile} className="space-y-5">
                                <div className="flex flex-col gap-5 md:flex-row md:items-start">
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
                                        <p className="max-w-[180px] text-center text-sm leading-5 text-slate-500">
                                            {pendingAvatarPreviewUrl
                                                ? 'Previewing your next avatar. Save your profile to upload it.'
                                                : 'Images are shown inside a circular frame, so this preview matches the final crop.'}
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
                                            <p className="text-sm text-slate-500">{bio.length}/280</p>
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
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="mb-4">
                                <h3 className="text-base font-semibold text-slate-900">Change Email Address</h3>
                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    We&apos;ll send a confirmation link to your new address before the change takes effect.
                                </p>
                            </div>
                            <form onSubmit={handleUpdateEmail} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">New Email Address</Label>
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
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="mb-4">
                                <div className="mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Security</div>
                                <h3 className="text-base font-semibold text-slate-900">Change Password</h3>
                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Choose a password that is easy for you to keep safe and hard for anyone else to guess.
                                </p>
                            </div>

                            <form onSubmit={handleUpdatePassword} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">New Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="New password"
                                        required
                                    />
                                    <p className="text-sm leading-6 text-slate-500">Use at least 8 characters.</p>
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
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <div className="mb-4">
                                <div className="mb-2 inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Danger Zone</div>
                                <h3 className="text-base font-semibold text-slate-900">Delete Account</h3>
                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Deleting your account removes your projects, scenes, characters, ideas, and related account data. This is permanent.
                                </p>
                            </div>
                            
                            {!showDeleteConfirm ? (
                                <Button 
                                    variant="destructive" 
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={loading}
                                >
                                    Delete Account & All Data
                                </Button>
                            ) : (
                                <div className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-5">
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
                                    <div className="flex flex-col gap-3 sm:flex-row">
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
                        </section>
                    </div>
                </Card>

                {/* Appearance Settings */}
                <Card className="border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Palette className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-semibold text-slate-800">Appearance</h2>
                    </div>
                    <p className="mb-6 text-sm leading-6 text-slate-500">Choose between the warm default workspace and a darker midnight writing environment.</p>

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
                                        className="relative mb-4 flex aspect-[2/1] w-full items-center justify-center rounded-xl shadow-inner"
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
                                            <div
                                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full shadow-md"
                                                style={{
                                                    backgroundColor: isMidnight ? 'hsl(147 18% 72%)' : '#546354',
                                                    color: isMidnight ? 'hsl(222 30% 10%)' : '#ffffff',
                                                }}
                                            >
                                                <Check className="h-3.5 w-3.5" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </Card>

                {/* AI API Settings */}
                <Card className="border border-slate-200 bg-white p-6">
                    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <div className="mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Optional</div>
                            <h2 className="text-xl font-semibold text-slate-900">AI Partner Settings</h2>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                Add AI support to your account if you want brainstorming, analysis, or rewriting help inside Storyline. You can leave AI off and keep writing normally.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAiGuide(true)}
                            className="gap-1.5 self-start text-primary hover:bg-slate-50 hover:text-primary text-sm font-semibold"
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
                        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                                <Label className="text-base">Enable AI Partner</Label>
                                <p className="text-sm leading-6 text-slate-500">
                                    Turn AI help on or off for this account. You can still use Storyline without it.
                                </p>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={aiEnabled} 
                                onChange={(e) => setAiEnabled(e.target.checked)}
                                className="h-5 w-5 rounded border-slate-300 bg-slate-100 text-primary focus:ring-primary"
                            />
                        </div>

                        {aiEnabled && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-3">
                                    <Label>AI Partner context</Label>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <label className={`cursor-pointer rounded-xl border p-4 transition-all ${aiContextMode === 'smart' ? 'border-primary bg-slate-50 ring-1 ring-primary/30' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                                            <div className="flex items-start gap-2">
                                                <input
                                                    type="radio"
                                                    name="aiContextMode"
                                                    checked={aiContextMode === 'smart'}
                                                    onChange={() => setAiContextMode('smart')}
                                                    className="mt-0.5 shrink-0"
                                                />
                                                <span className="font-medium text-slate-900">Smart Context</span>
                                            </div>
                                            <p className="ml-5 mt-2 text-sm leading-6 text-slate-500">
                                                Storyline automatically includes eligible story details for AI Partner.
                                            </p>
                                        </label>
                                        <label className={`cursor-pointer rounded-xl border p-4 transition-all ${aiContextMode === 'manual' ? 'border-primary bg-slate-50 ring-1 ring-primary/30' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                                            <div className="flex items-start gap-2">
                                                <input
                                                    type="radio"
                                                    name="aiContextMode"
                                                    checked={aiContextMode === 'manual'}
                                                    onChange={() => setAiContextMode('manual')}
                                                    className="mt-0.5 shrink-0"
                                                />
                                                <span className="font-medium text-slate-900">Manual Context</span>
                                            </div>
                                            <p className="ml-5 mt-2 text-sm leading-6 text-slate-500">
                                                You choose which story elements are included for each scene.
                                            </p>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label>How you want to use AI</Label>
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <label className={`cursor-pointer rounded-xl border p-4 transition-all ${billingMode === 'app_managed_trial' ? 'border-primary bg-slate-50 ring-1 ring-primary/30' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                                            <div className="flex items-start gap-2">
                                                <input type="radio" name="billingMode" checked={billingMode === 'app_managed_trial'} onChange={() => {
                                                    setBillingMode('app_managed_trial')
                                                    setAiProvider('openai')
                                                }} className="mt-0.5 shrink-0" />
                                                <span className="font-medium text-slate-900">Free Trial AI</span>
                                            </div>
                                            <p className="ml-5 mt-2 text-sm leading-6 text-slate-500">A small app-managed OpenAI trial for getting started.</p>
                                        </label>
                                        <label className={`cursor-pointer rounded-xl border p-4 transition-all ${billingMode === 'byok' ? 'border-primary bg-slate-50 ring-1 ring-primary/30' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                                            <div className="flex items-start gap-2">
                                                <input type="radio" name="billingMode" checked={billingMode === 'byok'} onChange={() => {
                                                    setBillingMode('byok')
                                                    if (aiProvider === 'ollama') setAiProvider('openai')
                                                }} className="mt-0.5 shrink-0" />
                                                <span className="font-medium text-slate-900">Use Your Own API Key</span>
                                            </div>
                                            <p className="ml-5 mt-2 text-sm leading-6 text-slate-500">Connect your own OpenAI, Gemini, or OpenRouter account for ongoing use.</p>
                                        </label>
                                        <label className={`cursor-pointer rounded-xl border p-4 transition-all ${billingMode === 'ollama' ? 'border-primary bg-slate-50 ring-1 ring-primary/30' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                                            <div className="flex items-start gap-2">
                                                <input type="radio" name="billingMode" checked={billingMode === 'ollama'} onChange={() => {
                                                    setBillingMode('ollama')
                                                    setAiProvider('ollama')
                                                }} className="mt-0.5 shrink-0" />
                                                <span className="font-medium text-slate-900">Ollama / Local AI</span>
                                            </div>
                                            <p className="ml-5 mt-2 text-sm leading-6 text-slate-500">Keep requests on your own machine and outside the trial.</p>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Current AI setup</p>
                                            <h3 className="text-lg font-semibold text-slate-900">{getBillingModeLabel(billingMode as BillingMode)}</h3>
                                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                                {billingMode === 'app_managed_trial'
                                                    ? 'Storyline sponsors a limited OpenAI trial for this setup.'
                                                    : billingMode === 'byok'
                                                        ? aiProvider === 'openrouter'
                                                            ? `Requests use OpenRouter (${OPENROUTER_CURATED_MODELS.find(m => m.id === openrouterModel)?.label ?? openrouterModel}). ${OPENROUTER_CURATED_MODELS.find(m => m.id === openrouterModel)?.pricing === 'free' ? 'Free model — rate limits may apply.' : 'Requires OpenRouter credits.'}`
                                                            : `Requests use ${getAiProviderLabel(aiProvider)} with your own API key.`
                                                        : 'Requests go directly to your local Ollama server.'}
                                            </p>
                                        </div>
                                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                            {billingMode === 'app_managed_trial' ? 'App-managed trial' : billingMode === 'byok' ? 'Your API key' : 'Local only'}
                                        </span>
                                    </div>

                                    {billingMode === 'app_managed_trial' && (
                                        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">Trial Status</p>
                                                    <p className="text-sm leading-6 text-slate-500">{trialStatusMessage}</p>
                                                </div>
                                                <div className="text-left sm:text-right">
                                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Trial remaining</p>
                                                    <p className={`text-lg font-semibold ${lowTrialBalance ? 'text-amber-600' : 'text-slate-900'}`}>
                                                        {trialRemainingPct}%
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className={cn('h-full rounded-full transition-all', lowTrialBalance ? 'bg-amber-500' : 'bg-primary')}
                                                        style={{ width: `${trialProgress}%` }}
                                                    />
                                                </div>
                                                <div className="text-sm text-slate-500">
                                                    <span>{trialProgress}% used</span>
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                                                Free Trial AI is limited. When it runs out, switch to your own API key or Ollama to keep going.
                                            </div>
                                            {trial?.status === 'exhausted' && (
                                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                                    Your sponsored trial is exhausted. Switch to <strong>Use Your Own API Key</strong> or <strong>Ollama / Local AI</strong> to continue.
                                                </div>
                                            )}
                                            {(trial?.status === 'blocked' || trial?.status === 'abuse_review') && (
                                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                                    Trial access is currently limited for this account. You can still use your own API key or Ollama while it is reviewed.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {billingMode === 'byok' && (
                                        <div className="space-y-4">
                                            <div className="space-y-3">
                                                <Label>Choose your provider</Label>
                                                <div className="grid gap-3 sm:grid-cols-3">
                                                    <label className={`cursor-pointer rounded-xl border p-4 transition-all ${aiProvider === 'gemini' ? 'border-primary bg-slate-50 ring-1 ring-primary/30' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                                                        <div className="flex items-center gap-2">
                                                            <input type="radio" name="provider" value="gemini" checked={aiProvider === 'gemini'} onChange={() => setAiProvider('gemini')} />
                                                            <span className="font-medium text-slate-900">Gemini Cloud</span>
                                                        </div>
                                                        <p className="ml-5 mt-2 text-sm leading-6 text-slate-500">Connect your Google account using an API key from Google AI Studio.</p>
                                                    </label>
                                                    <label className={`cursor-pointer rounded-xl border p-4 transition-all ${aiProvider === 'openai' ? 'border-primary bg-slate-50 ring-1 ring-primary/30' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                                                        <div className="flex items-center gap-2">
                                                            <input type="radio" name="provider" value="openai" checked={aiProvider === 'openai'} onChange={() => setAiProvider('openai')} />
                                                            <span className="font-medium text-slate-900">OpenAI Cloud</span>
                                                        </div>
                                                        <p className="ml-5 mt-2 text-sm leading-6 text-slate-500">Connect your OpenAI account using an API key from platform.openai.com.</p>
                                                    </label>
                                                    <label className={`cursor-pointer rounded-xl border p-4 transition-all ${aiProvider === 'openrouter' ? 'border-primary bg-slate-50 ring-1 ring-primary/30' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                                                        <div className="flex items-center gap-2">
                                                            <input type="radio" name="provider" value="openrouter" checked={aiProvider === 'openrouter'} onChange={() => setAiProvider('openrouter')} />
                                                            <span className="font-medium text-slate-900">OpenRouter</span>
                                                        </div>
                                                        <p className="ml-5 mt-2 text-sm leading-6 text-slate-500">Access multiple AI models with a single OpenRouter API key.</p>
                                                    </label>
                                                </div>
                                                {aiProvider === 'openrouter' && (
                                                    <div className="space-y-3">
                                                        <div className="space-y-1.5">
                                                            <Label htmlFor="openrouterModel" className="text-sm font-medium text-slate-700">
                                                                OpenRouter Model
                                                            </Label>
                                                            <select
                                                                id="openrouterModel"
                                                                value={openrouterModel}
                                                                onChange={(e) => setOpenrouterModel(e.target.value)}
                                                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                                            >
                                                                {OPENROUTER_CURATED_MODELS.map((m) => (
                                                                    <option key={m.id} value={m.id}>{m.label}</option>
                                                                ))}
                                                            </select>
                                                            {(() => {
                                                                const selected = OPENROUTER_CURATED_MODELS.find(m => m.id === openrouterModel)
                                                                return selected ? (
                                                                    <p className={`text-xs leading-5 ${selected.pricing === 'free' ? 'text-emerald-700' : 'text-amber-700'}`}>
                                                                        {selected.note}
                                                                    </p>
                                                                ) : null
                                                            })()}
                                                        </div>
                                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                                                            {(() => {
                                                                const selected = OPENROUTER_CURATED_MODELS.find(m => m.id === openrouterModel)
                                                                return selected?.pricing === 'free'
                                                                    ? 'This free OpenRouter model may work without credits, but large requests can still hit rate limits or daily quotas.'
                                                                    : 'This model requires OpenRouter credits or billing. Add credits at '
                                                            })()}
                                                            {(() => {
                                                                const selected = OPENROUTER_CURATED_MODELS.find(m => m.id === openrouterModel)
                                                                return selected?.pricing === 'paid' ? (
                                                                    <a href="https://openrouter.ai/credits" target="_blank" rel="noopener noreferrer" className="font-medium text-[#546354] underline-offset-2 hover:underline">
                                                                        openrouter.ai/credits
                                                                    </a>
                                                                ) : null
                                                            })()}
                                                            {(() => {
                                                                const selected = OPENROUTER_CURATED_MODELS.find(m => m.id === openrouterModel)
                                                                return selected?.pricing === 'paid' ? '.' : null
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {existingApiKey ? (
                                                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Saved API Key</p>
                                                        <p className="text-sm font-mono text-slate-600">{existingApiKey}</p>
                                                    </div>
                                                    <Button type="button" variant="ghost" size="sm" onClick={handleRemoveApiKey} disabled={loading} className="self-start text-red-500 hover:bg-red-50 hover:text-red-700">
                                                        Remove
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 shadow-sm">
                                                    No {aiProvider === 'gemini' ? 'Gemini' : aiProvider === 'openrouter' ? 'OpenRouter' : 'OpenAI'} API key is saved yet.
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label htmlFor="apiKey">
                                                    {existingApiKey
                                                        ? 'Update API Key'
                                                        : aiProvider === 'gemini'
                                                            ? 'Enter Google Gemini API Key'
                                                            : aiProvider === 'openrouter'
                                                                ? 'Enter OpenRouter API Key'
                                                                : 'Enter OpenAI API Key'}
                                                </Label>
                                                <Input
                                                    id="apiKey"
                                                    type="password"
                                                    value={apiKey}
                                                    onChange={(e) => setApiKey(e.target.value)}
                                                    placeholder={aiProvider === 'gemini' ? 'AIzaSy...' : aiProvider === 'openrouter' ? 'sk-or-...' : 'sk-...'}
                                                    className="bg-white"
                                                />
                                                <p className="text-sm leading-6 text-slate-500">Requests in this mode run through your own cloud account.</p>
                                            </div>

                                            <div className="pt-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleTestCloudConnection(aiProvider as 'gemini' | 'openai' | 'openrouter')}
                                                    disabled={testingCloud || (!apiKey && !existingApiKey)}
                                                    className="w-full gap-2 border-slate-300 hover:bg-white"
                                                >
                                                    {testingCloud ? (
                                                        <>
                                                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                                                            Testing Cloud Connection...
                                                        </>
                                                    ) : 'Test Cloud Connection'}
                                                </Button>

                                                {cloudStatus && (
                                                    <div className={`mt-3 rounded-lg p-3 text-xs animate-in fade-in slide-in-from-top-1 duration-300 ${
                                                        cloudStatus.success
                                                            ? 'border border-green-200 bg-green-100/50 text-green-800'
                                                            : 'border border-amber-200 bg-amber-100/50 text-amber-800'
                                                    }`}>
                                                        <div className="mb-1 flex items-center gap-1.5 font-bold">
                                                            <div className={`h-1.5 w-1.5 rounded-full ${cloudStatus.success ? 'bg-green-500' : 'bg-amber-500'}`} />
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
                                        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
                                            <div>
                                                <h3 className="font-semibold text-slate-800">Local Ollama Configuration</h3>
                                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                                    Keep local AI running on your device, with an optional Gemini backup option if your Ollama server is unavailable.
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="ollamaUrl">Local API URL</Label>
                                                <Input id="ollamaUrl" type="text" value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)} placeholder="http://127.0.0.1:11434" className="bg-white" />
                                                <p className="text-sm leading-6 text-slate-500">
                                                    Use <code className="rounded bg-slate-100 px-1">http://127.0.0.1:11434</code> if your browser blocks <code className="rounded bg-slate-100 px-1">localhost</code>.
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="ollamaModel">Local Model Name</Label>
                                                <Input id="ollamaModel" type="text" value={ollamaModel} onChange={(e) => setOllamaModel(e.target.value)} placeholder="llama3" className="bg-white" />
                                                <p className="text-sm leading-6 text-slate-500">Make sure this model is installed in Ollama, for example: <code className="rounded bg-slate-100 px-1">ollama pull {ollamaModel || 'llama3'}</code></p>
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
                                                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                                                            Testing Connection...
                                                        </>
                                                    ) : 'Test Local Connection'}
                                                </Button>

                                                {connectionStatus && (
                                                    <div className={`mt-3 rounded-lg p-3 text-xs animate-in fade-in slide-in-from-top-1 duration-300 ${
                                                        connectionStatus.success 
                                                            ? 'border border-green-200 bg-green-100/50 text-green-800' 
                                                            : 'border border-amber-200 bg-amber-100/50 text-amber-800'
                                                    }`}>
                                                        <div className="mb-1 flex items-center gap-1.5 font-bold">
                                                            <div className={`h-1.5 w-1.5 rounded-full ${connectionStatus.success ? 'bg-green-500' : 'bg-amber-500'}`} />
                                                            {connectionStatus.message}
                                                        </div>
                                                        {connectionStatus.details && (
                                                            <p className="opacity-80 italic">{connectionStatus.details}</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-start">
                                                <input type="checkbox" id="aiFallback" checked={aiFallback} onChange={(e) => setAiFallback(e.target.checked)} className="rounded border-slate-300 bg-white text-primary focus:ring-primary" />
                                                <div className="space-y-2">
                                                    <Label htmlFor="aiFallback" className="cursor-pointer text-sm font-normal">Use Gemini as a backup option if Local Ollama is unavailable</Label>
                                                    {aiFallback && !existingApiKey && (
                                                        <p className="text-sm leading-6 text-amber-600">Backup is on, but no Gemini API key is saved yet.</p>
                                                    )}
                                                    {aiFallback && (
                                                        <div className="space-y-2">
                                                            <Label htmlFor="apiKeyOllamaFallback" className="text-sm">Provide a Gemini API Key for the backup option</Label>
                                                            <Input id="apiKeyOllamaFallback" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={existingApiKey ? "(Key exists)" : "AIzaSy..."} className="h-9 bg-white text-sm" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
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
            </div>
        </div>
    )
}
