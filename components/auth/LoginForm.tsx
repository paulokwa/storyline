'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getErrorMessage, startGuardedAuthRedirect } from '@/lib/auth/client-navigation'
import { getGoogleOAuthCallbackUrl, getOAuthCallbackUrl, LOCAL_FIRST_AUTH_REASSURANCE } from '@/lib/auth/oauth'
import { featureFlags } from '@/lib/feature-flags'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PenLine, AlertCircle } from 'lucide-react'

function AppleIcon() {
    return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" />
        </svg>
    )
}

type LoginFormProps = {
    verificationStatus?: string
}

export default function LoginForm({ verificationStatus = '' }: LoginFormProps) {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [appleLoading, setAppleLoading] = useState(false)

    const verificationMessage = verificationStatus === 'already-used'
        ? "That verification link was already used or has expired. If you've already verified your email, sign in below."
        : verificationStatus === 'failed'
            ? 'We could not finish verifying that email link. Please sign in or request a new verification email.'
            : ''

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithPassword({ email, password })

            if (error) {
                setError(error.message)
                setLoading(false)
            } else {
                startGuardedAuthRedirect({
                    router,
                    onStalled: () => {
                        setError('You are signed in, but your library did not open yet. Please try again.')
                        setLoading(false)
                    },
                })
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Unable to sign in right now.'))
            setLoading(false)
        }
    }

    async function handleGoogleSignIn() {
        setGoogleLoading(true)
        setError('')

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: getGoogleOAuthCallbackUrl(),
                },
            })

            if (error) {
                setError(error.message)
                setGoogleLoading(false)
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Unable to start Google sign-in right now.'))
            setGoogleLoading(false)
        }
    }

    async function handleAppleSignIn() {
        setAppleLoading(true)
        setError('')

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'apple',
                options: {
                    redirectTo: getOAuthCallbackUrl(),
                },
            })

            if (error) {
                setError(error.message)
                setAppleLoading(false)
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Unable to start Apple sign-in right now.'))
            setAppleLoading(false)
        }
    }

    const authBusy = loading || googleLoading || appleLoading

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fbf9f5] relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 -z-10">
                <div className="absolute top-0 left-0 w-80 h-80 bg-[#546354]/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#546354]/10 rounded-full blur-[100px]" />
            </div>
            <div className="w-full max-w-md px-6 fade-in">
                <div className="flex items-center gap-2 justify-center mb-10">
                    <div className="w-9 h-9 rounded-xl bg-[#546354] flex items-center justify-center shadow-lg shadow-[#546354]/20">
                        <PenLine className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-serif italic text-slate-800 tracking-tight">Storyline</span>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-10">
                    <h1 className="text-3xl font-serif text-slate-800 mb-2 leading-tight">Welcome back</h1>
                    <p className="text-slate-400 font-medium mb-8">Step back into your creative workspace.</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {verificationMessage && (
                            <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span className="font-medium">{verificationMessage}</span>
                            </div>
                        )}

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleGoogleSignIn}
                            className="w-full h-12 rounded-full border-slate-200 bg-white text-slate-700 hover:bg-stone-50 hover:text-slate-900 font-semibold transition-all"
                            disabled={authBusy}
                        >
                            <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-700" aria-hidden="true">
                                G
                            </span>
                            {googleLoading ? 'Opening Google...' : 'Continue with Google'}
                        </Button>

                        {featureFlags.appleOAuth && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleAppleSignIn}
                                className="w-full h-12 rounded-full border-slate-200 bg-white text-slate-700 hover:bg-stone-50 hover:text-slate-900 font-semibold transition-all"
                                disabled={authBusy}
                            >
                                <span className="mr-2 flex h-5 w-5 items-center justify-center" aria-hidden="true">
                                    <AppleIcon />
                                </span>
                                {appleLoading ? 'Opening Apple...' : 'Continue with Apple'}
                            </Button>
                        )}

                        <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                            <span className="h-px flex-1 bg-slate-100" />
                            <span>Email</span>
                            <span className="h-px flex-1 bg-slate-100" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[11px] font-sans tracking-widest uppercase text-slate-400 ml-1">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="h-12 rounded-2xl border-transparent bg-stone-50/50 px-4 text-slate-800 placeholder:text-slate-400 transition-all focus:bg-white focus:border-primary/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <Label htmlFor="password" className="text-[11px] font-sans tracking-widest uppercase text-slate-400">Password</Label>
                                <Link href="/forgot-password" className="text-[11px] font-sans tracking-widest uppercase text-[#546354] hover:underline font-semibold transition-all">
                                    Forgot password?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="********"
                                required
                                className="h-12 rounded-2xl border-transparent bg-stone-50/50 px-4 text-slate-800 placeholder:text-slate-400 transition-all focus:bg-white focus:border-primary/20"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50/50 border border-red-100 rounded-xl px-4 py-3">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span className="font-medium">{error}</span>
                            </div>
                        )}

                        <Button type="submit" className="w-full h-12 bg-[#546354] hover:bg-[#3d4a3d] text-white rounded-full font-serif italic text-lg shadow-lg hover:shadow-xl transition-all duration-300" disabled={authBusy}>
                            {loading ? 'Opening the gates...' : 'Step Inside'}
                        </Button>

                        <p className="text-sm leading-6 text-slate-500">
                            {LOCAL_FIRST_AUTH_REASSURANCE}
                        </p>
                    </form>
                </div>

                <p className="text-center text-sm text-slate-400 mt-8">
                    New to the sanctuary?{' '}
                    <Link href="/signup" className="text-[#546354] font-semibold hover:underline">
                        Create an account
                    </Link>
                </p>
            </div>
        </div>
    )
}
