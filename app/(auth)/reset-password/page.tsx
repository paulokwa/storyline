'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PenLine, AlertCircle, Sparkles } from 'lucide-react'

export default function ResetPasswordPage() {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)
        setError('')

        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({ password })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            // Success! Password updated.
            router.push('/library')
            router.refresh()
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50">
            <div className="w-full max-w-md px-6 fade-in">
                {/* Logo */}
                <div className="flex items-center gap-2 justify-center mb-10">
                    <div className="w-9 h-9 rounded-xl bg-[#546354] flex items-center justify-center shadow-lg shadow-[#546354]/20">
                        <PenLine className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-serif italic text-slate-800 tracking-tight">Storyline</span>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-10">
                    <h1 className="text-3xl font-serif text-slate-800 mb-2 leading-tight">Secure your account</h1>
                    <p className="text-slate-400 font-medium mb-8">Set your new manuscript key</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-[11px] font-sans tracking-widest uppercase text-slate-400 ml-1">New Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="At least 8 characters"
                                minLength={8}
                                required
                                className="h-12 bg-stone-50/50 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl px-4 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-[11px] font-sans tracking-widest uppercase text-slate-400 ml-1">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repeat your new password"
                                required
                                className="h-12 bg-stone-50/50 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl px-4 transition-all"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50/50 border border-red-100 rounded-xl px-4 py-3">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span className="font-medium">{error}</span>
                            </div>
                        )}

                        <Button type="submit" className="w-full h-12 bg-[#546354] hover:bg-[#3d4a3d] text-white rounded-full font-serif italic text-lg shadow-lg hover:shadow-xl transition-all duration-300" disabled={loading}>
                            {loading ? 'Securing…' : 'Update Password'}
                        </Button>
                    </form>
                </div>

                <div className="mt-8 text-center pt-2">
                    <p className="text-slate-400 text-sm font-medium">
                        Remembered it?{' '}
                        <Link href="/login" className="text-[#546354] font-semibold hover:underline transition-colors">
                            Sign in instead
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
