'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import type { User } from '@supabase/supabase-js'

export default function SettingsView({ user, maskedApiKey }: { user: User, maskedApiKey: string | null }) {
    const supabase = createClient()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Form state
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [apiKey, setApiKey] = useState('')
    
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

    const handleSaveApiKey = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setSuccessMessage(null)
        setErrorMessage(null)

        // Store the actual key in the secure user_api_keys table
        const { error: dbError } = await (supabase as any)
            .from('user_api_keys')
            .upsert({ user_id: user.id, api_key: apiKey }, { onConflict: 'user_id' })

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

        setSuccessMessage('API Key saved successfully.')
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
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
                <p className="text-slate-500 mt-2">Manage your account and app preferences.</p>
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
                    <div className="space-y-4">
                        {existingApiKey ? (
                            <div className="p-4 bg-indigo-50 text-indigo-900 rounded-md flex justify-between items-center">
                                <div>
                                    <p className="font-medium">Active API Key</p>
                                    <p className="text-sm opacity-80">
                                        {existingApiKey}
                                    </p>
                                </div>
                                <Button 
                                    variant="outline"
                                    onClick={handleRemoveApiKey}
                                    disabled={loading}
                                    className="bg-white"
                                >
                                    Remove Key
                                </Button>
                            </div>
                        ) : (
                            <div className="p-4 bg-amber-50 text-amber-900 rounded-md mb-4 text-sm">
                                No API key found. AI features are currently disabled. Please provide a Google Gemini API Key to enable AI assistance.
                            </div>
                        )}

                        <form onSubmit={handleSaveApiKey} className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <Label htmlFor="apiKey">Set / Update Google Gemini API Key</Label>
                                <Input
                                    id="apiKey"
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="AIzaSy..."
                                    required
                                />
                            </div>
                            <Button type="submit" disabled={loading || !apiKey}>
                                {existingApiKey ? 'Update Key' : 'Save Key'}
                            </Button>
                        </form>
                    </div>
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
