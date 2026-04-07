'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { ChevronLeft } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export default function SettingsView({ user, maskedApiKey, aiSettings }: { 
    user: User, 
    maskedApiKey: string | null,
    aiSettings: {
        ai_enabled: boolean,
        ai_provider: string,
        ai_fallback_enabled: boolean,
        ollama_model: string,
        ollama_url: string
    }
}) {
    const supabase = createClient()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Form state
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [apiKey, setApiKey] = useState('')
    
    // AI Settings State
    const [aiEnabled, setAiEnabled] = useState(aiSettings.ai_enabled)
    const [aiProvider, setAiProvider] = useState(aiSettings.ai_provider)
    const [aiFallback, setAiFallback] = useState(aiSettings.ai_fallback_enabled)
    const [ollamaModel, setOllamaModel] = useState(aiSettings.ollama_model)
    const [ollamaUrl, setOllamaUrl] = useState(aiSettings.ollama_url)

    // Deletion states
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')

    // Existing data
    const existingApiKey = maskedApiKey

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
        
        const { error } = await supabase.auth.updateUser({ password })
        if (error) {
            setErrorMessage(error.message)
        } else {
            setSuccessMessage('Password updated successfully.')
            setPassword('')
        }
        setLoading(false)
    }

    const handleSaveAiSettings = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setSuccessMessage(null)
        setErrorMessage(null)

        // Store the actual key in the secure user_api_keys table
        const updatePayload: any = {
            user_id: user.id,
            ai_enabled: aiEnabled,
            ai_provider: aiProvider,
            ai_fallback_enabled: aiFallback,
            ollama_model: ollamaModel,
            ollama_url: ollamaUrl
        }
        
        if (apiKey) {
            updatePayload.api_key = apiKey
        }

        const { error: dbError } = await (supabase as any)
            .from('user_api_keys')
            .upsert(updatePayload, { onConflict: 'user_id' })

        if (dbError) {
            setErrorMessage(dbError.message)
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

        const { error: dbError } = await (supabase as any)
            .from('user_api_keys')
            .delete()
            .eq('user_id', user.id)

        if (dbError) {
            setErrorMessage(dbError.message)
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

    return (
        <div className="fade-in max-w-2xl mx-auto space-y-8 py-8 md:py-12 px-4 w-full">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
                    <p className="text-slate-500 mt-2">Manage your account and app preferences.</p>
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
                    <h2 className="text-xl font-semibold mb-4">AI Features Settings</h2>
                    
                    <form onSubmit={handleSaveAiSettings} className="space-y-6">
                        
                        {/* Master Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="space-y-0.5">
                                <Label className="text-base">Enable AI Features</Label>
                                <p className="text-sm text-slate-500">Master switch to turn all AI features on or off.</p>
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
                                {/* Provider Selection */}
                                <div className="space-y-3">
                                    <Label>Preferred AI Provider</Label>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <label className={`flex-1 border p-4 rounded-lg cursor-pointer transition-all ${aiProvider === 'gemini' ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}>
                                            <div className="flex items-center gap-2">
                                                <input type="radio" name="provider" value="gemini" checked={aiProvider === 'gemini'} onChange={(e) => setAiProvider(e.target.value)} />
                                                <span className="font-medium text-slate-900">Gemini Cloud</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 ml-5">Fast, highly capable, cloud-hosted.</p>
                                        </label>
                                        <label className={`flex-1 border p-4 rounded-lg cursor-pointer transition-all ${aiProvider === 'ollama' ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}>
                                            <div className="flex items-center gap-2">
                                                <input type="radio" name="provider" value="ollama" checked={aiProvider === 'ollama'} onChange={(e) => setAiProvider(e.target.value)} />
                                                <span className="font-medium text-slate-900">Local Ollama</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 ml-5">Private, runs completely on your machine.</p>
                                        </label>
                                    </div>
                                </div>

                                {/* Gemini Config */}
                                {aiProvider === 'gemini' && (
                                    <div className="p-5 border border-slate-200 rounded-lg space-y-4 bg-slate-50">
                                        <h3 className="font-semibold text-slate-800">Google Gemini Configuration</h3>
                                        {existingApiKey ? (
                                            <div className="p-3 bg-white border border-slate-200 rounded-md flex justify-between items-center shadow-sm">
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Active API Key</p>
                                                    <p className="text-sm font-mono text-slate-600">{existingApiKey}</p>
                                                </div>
                                                <Button type="button" variant="ghost" size="sm" onClick={handleRemoveApiKey} disabled={loading} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                    Remove
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-sm shadow-sm">
                                                No Gemini API key found. Some features may be disabled.
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <Label htmlFor="apiKey">{existingApiKey ? 'Update API Key' : 'Enter Google Gemini API Key'}</Label>
                                            <Input id="apiKey" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="AIzaSy..." className="bg-white" />
                                        </div>
                                    </div>
                                )}

                                {/* Ollama Config */}
                                {aiProvider === 'ollama' && (
                                    <div className="p-5 border border-slate-200 rounded-lg space-y-5 bg-slate-50">
                                        <h3 className="font-semibold text-slate-800">Local Ollama Configuration</h3>
                                        <div className="space-y-2">
                                            <Label htmlFor="ollamaUrl">Local API URL</Label>
                                            <Input id="ollamaUrl" type="text" value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)} placeholder="http://127.0.0.1:11434" className="bg-white" />
                                            <p className="text-xs text-slate-500">Change this if accessing Ollama from a different device on your network.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ollamaModel">Local Model Name</Label>
                                            <Input id="ollamaModel" type="text" value={ollamaModel} onChange={(e) => setOllamaModel(e.target.value)} placeholder="llama3" className="bg-white" />
                                            <p className="text-xs text-slate-500">Make sure this model is pulled via your terminal: `ollama pull {ollamaModel || 'llama3'}`</p>
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
                        )}

                        <Button type="submit" disabled={loading} className="w-full">
                            Save AI Settings
                        </Button>
                    </form>
                </Card>

                {/* Profile Settings */}
                <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Account Profile</h2>
                    
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
                        </div>
                        <Button type="submit" disabled={loading || !password}>Update Password</Button>
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
