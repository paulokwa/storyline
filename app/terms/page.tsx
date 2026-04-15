import React from 'react'
import Link from 'next/link'
import { ArrowLeft, PenLine } from 'lucide-react'

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[#fbf9f5] text-slate-800 font-sans selection:bg-[#546354]/10 pb-20">
            {/* Simple Header */}
            <header className="h-16 border-b border-slate-100 flex items-center px-6 sticky top-0 bg-[#fbf9f5]/80 backdrop-blur-md z-10">
                <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-[#546354] transition-colors" />
                        <span className="text-sm font-medium text-slate-500 group-hover:text-slate-800 transition-colors">Back to Storyline</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-[#546354] flex items-center justify-center">
                            <PenLine className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-serif italic text-slate-800">Storyline</span>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 pt-16">
                <h1 className="text-4xl font-serif text-slate-800 mb-2">Terms of Service</h1>
                <p className="text-slate-400 text-sm mb-12 uppercase tracking-widest font-bold">Last Updated: April 15, 2026</p>

                <div className="prose prose-slate prose-headings:font-serif prose-headings:font-normal prose-p:text-slate-600 prose-p:leading-relaxed space-y-8">
                    <section>
                        <h2 className="text-2xl text-slate-800 mb-4">1. Introduction</h2>
                        <p>
                            Welcome to Storyline. By using our service, you agree to these terms. Please read them carefully. Storyline is a focused writing environment designed for authors, provided by mwake.dev.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl text-slate-800 mb-4">2. Use of the Service</h2>
                        <p>
                            Storyline provides tools for writing, organizing, and collaborating on creative projects. You must be at least 13 years old to use the service. You are responsible for maintaining the security of your account and any content you create.
                        </p>
                    </section>

                    <section className="bg-[#546354]/5 p-8 rounded-3xl border border-[#546354]/10">
                        <h2 className="text-2xl text-slate-800 mb-4">3. Beta Status Disclaimer</h2>
                        <p className="font-medium text-slate-700">
                            Storyline is currently in <strong>Beta</strong>. This means the service is still being actively developed and tested.
                        </p>
                        <p className="mt-4">
                            The service is provided on an "AS IS" and "AS AVAILABLE" basis. We do not guarantee that the service will be uninterrupted, timely, secure, or error-free. We may modify or discontinue features at any time without notice.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl text-slate-800 mb-4">4. User Responsibilities</h2>
                        <p>
                            You retain all rights to the content you create on Storyline. However, you are solely responsible for your content and how you use the tools provided. You must not use the service for any illegal or unauthorized purpose.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl text-slate-800 mb-4">5. AI Usage Disclaimer</h2>
                        <p>
                            Storyline includes AI-powered features to assist with your writing. AI outputs are generated based on mathematical models and may be inaccurate, incomplete, or biased.
                        </p>
                        <p className="mt-4 font-semibold text-slate-700">
                            You are responsible for reviewing and verifying all AI-generated content. We are not liable for any damages resulting from your reliance on AI outputs.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl text-slate-800 mb-4">6. Limitation of Liability</h2>
                        <p>
                            To the maximum extent permitted by law, mwake.dev shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl text-slate-800 mb-4">7. Changes to the Service</h2>
                        <p>
                            We reserved the right to modify or discontinue, temporarily or permanently, the service (or any part thereof) with or without notice. We also reserve the right to change these terms at any time.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl text-slate-800 mb-4">8. Contact Information</h2>
                        <p>
                            If you have any questions about these Terms, please contact us at:
                        </p>
                        <a href="mailto:mwake.dev@gmail.com" className="text-[#546354] font-medium hover:underline">
                            mwake.dev@gmail.com
                        </a>
                    </section>
                </div>

                <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-center bg-transparent">
                    <Link href="/" className="text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-[#546354] transition-colors">
                        © 2026 Storyline
                    </Link>
                    <div className="flex gap-6">
                        <Link href="/privacy" className="text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-[#546354] transition-colors">Privacy</Link>
                        <Link href="/ai-disclaimer" className="text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-[#546354] transition-colors">AI Disclaimer</Link>
                    </div>
                </div>
            </main>
        </div>
    )
}
