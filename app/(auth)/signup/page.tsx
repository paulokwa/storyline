'use client'

import { useEffect } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { startGuardedAuthRedirect } from '@/lib/auth/client-navigation'
import { getGoogleOAuthCallbackUrl, getOAuthCallbackUrl, LOCAL_FIRST_AUTH_REASSURANCE } from '@/lib/auth/oauth'
import { featureFlags } from '@/lib/feature-flags'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PenLine, AlertCircle, MailCheck } from 'lucide-react'
import { getDeviceFingerprint } from '@/lib/client/device-fingerprint'

function AppleIcon() {
    return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" />
        </svg>
    )
}

export default function SignupPage() {
    const router = useRouter()
    const [displayName, setDisplayName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [appleLoading, setAppleLoading] = useState(false)
    const [sentEmail, setSentEmail] = useState('')

    useEffect(() => {
        let mounted = true
        const supabase = createClient()

        supabase.auth.getUser().then(({ data }) => {
            if (mounted && data.user) {
                router.replace('/library')
            }
        }).catch(() => {
            // Signup remains available when the current browser has no valid session.
        })

        return () => {
            mounted = false
        }
    }, [router])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const deviceFingerprint = await getDeviceFingerprint()
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    displayName,
                    email,
                    password,
                    deviceFingerprint,
                }),
            })

            const data = await response.json().catch(() => null)

            if (!response.ok) {
                setError(data?.error || 'Unable to create your account right now.')
                setLoading(false)
                return
            }

            if (data?.verificationRequired) {
                setSentEmail(data.email ?? email)
                setPassword('')
                setLoading(false)
                return
            }

            startGuardedAuthRedirect({
                router,
                onStalled: () => {
                    setError('Your account was created, but your library did not open yet. Please try signing in again.')
                    setLoading(false)
                },
            })
        } catch {
            setError('Unable to create your account right now.')
            setLoading(false)
        }
    }

    async function handleGoogleSignUp() {
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
        } catch {
            setError('Unable to start Google sign-in right now.')
            setGoogleLoading(false)
        }
    }

    function handleReset() {
        setSentEmail('')
        setDisplayName('')
        setEmail('')
        setPassword('')
        setError('')
    }

    async function handleAppleSignUp() {
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
        } catch {
            setError('Unable to start Apple sign-in right now.')
            setAppleLoading(false)
        }
    }

    const authBusy = loading || googleLoading || appleLoading

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fbf9f5] relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 -z-10">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#546354]/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#546354]/10 rounded-full blur-[100px]" />
            </div>
            <div className="w-full max-w-md px-6 fade-in">
                {/* Logo */}
                <div className="flex items-center gap-2 justify-center mb-10">
                    <div className="w-9 h-9 rounded-xl bg-[#546354] flex items-center justify-center shadow-lg shadow-[#546354]/20">
                        <PenLine className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-serif italic text-slate-800 tracking-tight">Storyline</span>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-10">
                    {sentEmail ? (
                        <div className="text-center">
                            <div className="mx-auto mb-6 w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                <MailCheck className="w-7 h-7 text-emerald-600" />
                            </div>
                            <h1 className="text-3xl font-serif text-slate-800 mb-3 leading-tight">Check your email</h1>
                            <p className="text-slate-500 mb-1">We sent a verification link to</p>
                            <p className="text-[#546354] font-semibold mb-5 break-all">{sentEmail}</p>
                            <p className="text-slate-400 text-sm mb-2 leading-relaxed">
                                Open the email and click the link to finish creating your account.
                            </p>
                            <p className="text-slate-300 text-xs mb-8">Can&apos;t find it? Check your spam or junk folder.</p>
                            <Link href="/login">
                                <Button className="w-full h-12 bg-[#546354] hover:bg-[#3d4a3d] text-white rounded-full font-serif italic text-lg shadow-lg hover:shadow-xl transition-all duration-300 mb-4">
                                    Go to sign in
                                </Button>
                            </Link>
                            <button
                                type="button"
                                onClick={handleReset}
                                className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                Use a different email
                            </button>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-3xl font-serif text-slate-800 mb-2 leading-tight">Start your journey</h1>
                            <p className="text-slate-400 font-medium mb-8">Begin your narrative in a focused space</p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleGoogleSignUp}
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
                                        onClick={handleAppleSignUp}
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
                                    <Label htmlFor="name" className="text-[11px] font-sans tracking-widest uppercase text-slate-400 ml-1">Your name</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="Alex"
                                        className="h-12 rounded-2xl border-transparent bg-stone-50/50 px-4 text-slate-800 placeholder:text-slate-400 transition-all focus:bg-white focus:border-primary/20"
                                    />
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
                                    <Label htmlFor="password" className="text-[11px] font-sans tracking-widest uppercase text-slate-400 ml-1">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="At least 8 characters"
                                        minLength={8}
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
                                    {loading ? 'Preparing your manuscript…' : 'Begin Writing'}
                                </Button>

                                <p className="text-sm leading-6 text-slate-500">
                                    {LOCAL_FIRST_AUTH_REASSURANCE}
                                </p>
                            </form>
                        </>
                    )}
                </div>

                {!sentEmail && (
                    <p className="text-center text-sm text-slate-400 mt-8">
                        Already a resident?{' '}
                        <Link href="/login" className="text-[#546354] font-semibold hover:underline">
                            Sign in
                        </Link>
                    </p>
                )}
            </div>
        </div>
    )
}
