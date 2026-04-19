'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PenLine, AlertCircle } from 'lucide-react'
import { getDeviceFingerprint } from '@/lib/client/device-fingerprint'

export default function SignupPage() {
    const router = useRouter()
    const [displayName, setDisplayName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

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

            router.push('/library')
            router.refresh()
        } catch {
            setError('Unable to create your account right now.')
            setLoading(false)
        }
    }

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
                    <h1 className="text-3xl font-serif text-slate-800 mb-2 leading-tight">Start your journey</h1>
                    <p className="text-slate-400 font-medium mb-8">Begin your narrative in a focused space</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-[11px] font-sans tracking-widest uppercase text-slate-400 ml-1">Your name</Label>
                            <Input
                                id="name"
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Alex"
                                className="h-12 bg-stone-50/50 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl px-4 transition-all"
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
                                className="h-12 bg-stone-50/50 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl px-4 transition-all"
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
                            {loading ? 'Preparing your manuscript…' : 'Begin Writing'}
                        </Button>
                    </form>
                </div>

                <p className="text-center text-sm text-slate-400 mt-8">
                    Already a resident?{' '}
                    <Link href="/login" className="text-[#546354] font-semibold hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}
