'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PenLine, AlertCircle, CheckCircle2, ChevronLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        console.log('Forgot password submit triggered for:', email)
        setLoading(true)
        setError('')

        try {
            const supabase = createClient()
            console.log('Supabase client created, calling reset API...')
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
            })
            console.log('Reset API responded. Error:', error)

            if (error) {
                setError(error.message)
                setLoading(false)
            } else {
                console.log('Success, updating UI state...')
                setSubmitted(true)
                setLoading(false)
            }
        } catch (err: any) {
            console.error('Caught exception during reset:', err)
            setError(err.message || 'An unexpected error occurred')
            setLoading(false)
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
                    {submitted ? (
                        <div className="text-center space-y-6 py-4">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                            <h1 className="text-3xl font-serif text-slate-800 leading-tight">Check your email</h1>
                            <p className="text-slate-500 font-medium leading-relaxed italic">
                                We've sent a recovery link to <span className="text-slate-800 font-semibold not-italic">{email}</span>.
                            </p>
                            <div className="pt-6">
                                <Link href="/login">
                                    <Button variant="ghost" className="text-[#546354] font-semibold flex items-center gap-2 mx-auto">
                                        <ChevronLeft className="w-4 h-4" /> Return to Login
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-3xl font-serif text-slate-800 mb-2 leading-tight">Recover your access</h1>
                            <p className="text-slate-400 font-medium mb-8">We'll help you find your way back</p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-[11px] font-sans tracking-widest uppercase text-slate-400 ml-1">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
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

                                <Button onClick={handleSubmit} type="submit" className="w-full h-12 bg-[#546354] hover:bg-[#3d4a3d] text-white rounded-full font-serif italic text-lg shadow-lg hover:shadow-xl transition-all duration-300" disabled={loading}>
                                    {loading ? 'Sending link…' : 'Send Recovery Link'}
                                </Button>
                            </form>

                            <div className="mt-8 text-center pt-2">
                                <Link href="/login" className="text-slate-400 text-sm font-medium hover:text-[#546354] transition-colors flex items-center justify-center gap-2">
                                    <ChevronLeft className="w-4 h-4" /> Back to login
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
