import React from 'react'
import Link from 'next/link'
import { ArrowLeft, PenLine, ShieldCheck } from 'lucide-react'

export default function PrivacyPage() {
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
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#546354]/5 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-[#546354]" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-serif text-slate-800">Privacy Policy</h1>
                        <p className="text-slate-400 text-sm uppercase tracking-widest font-bold">Last Updated: April 15, 2026</p>
                    </div>
                </div>

                <div className="prose prose-slate prose-headings:font-serif prose-headings:font-normal prose-p:text-slate-600 prose-p:leading-relaxed space-y-8 mt-12">
                    <section>
                        <h2 className="text-2xl text-slate-800 mb-4">What we collect</h2>
                        <ul className="list-disc pl-6 space-y-2 text-slate-600">
                            <li><strong>Authentication data:</strong> Your email address, used to identify you and protect your account.</li>
                            <li><strong>User content:</strong> The stories, notes, characters, and other narrative data you create while using the service.</li>
                            <li><strong>Usage data:</strong> Basic analytics such as which features you use most frequently, to help us improve the product.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl text-slate-800 mb-4">What we do with it</h2>
                        <p>
                            We use your data primarily to run the service—storing your work so you can access it from anywhere. We also use aggregated, non-identifiable usage data to improve Storyline and fix bugs.
                        </p>
                    </section>

                    <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                        <h2 className="text-2xl text-slate-800 mb-4">AI Processing</h2>
                        <p>
                            Storyline allows users to connect their own AI provider accounts (such as Google Gemini, OpenAI, or OpenRouter) by entering personal API keys.
                        </p>
                        <p className="mt-4">
                            When you use AI features, requests are securely processed through Storyline’s backend systems. This allows the application to interact with AI providers without exposing your API keys in your browser.
                        </p>
                        <p className="mt-4">
                            Your API keys are stored securely in our database and protected using industry-standard security measures, including access controls that ensure only you can access your own keys. We do not log or expose your API keys in application logs.
                        </p>
                        <p className="mt-4">
                            AI prompts and responses are processed temporarily to generate results and are not stored by default. They are only saved if you explicitly choose to store them within the app (for example, by saving a response to your project).
                        </p>
                        <p className="mt-4">
                            Your content may be transmitted to third-party AI providers (such as Google Gemini, OpenAI, or OpenRouter) solely for the purpose of generating responses. These providers process your data according to their own privacy policies and terms. Storyline does not use your personal content to train general-purpose AI models.
                        </p>
                        <p className="mt-6 text-sm text-slate-400 italic">
                            While we take reasonable measures to protect your data, no system can guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl text-slate-800 mb-4">Our Commitment</h2>
                        <p className="font-semibold text-[#546354] text-lg">
                            We do not sell your personal data or your creative work to third parties.
                        </p>
                        <p className="mt-2 text-slate-500 italic">
                            Your stories are yours. Our job is simply to provide the sanctuary where they can grow.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl text-slate-800 mb-4">Contact Information</h2>
                        <p>
                            If you have any questions or would like to request that your data be deleted, please contact us at:
                        </p>
                        <a href="mailto:mwake.dev@gmail.com" className="text-[#546354] font-medium hover:underline text-lg">
                            mwake.dev@gmail.com
                        </a>
                    </section>
                </div>

                <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-center bg-transparent">
                    <Link href="/" className="text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-[#546354] transition-colors">
                        © 2026 Storyline
                    </Link>
                    <div className="flex gap-6">
                        <Link href="/terms" className="text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-[#546354] transition-colors">Terms</Link>
                        <Link href="/ai-disclaimer" className="text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-[#546354] transition-colors">AI Disclaimer</Link>
                    </div>
                </div>
            </main>
        </div>
    )
}
