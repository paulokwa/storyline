'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PenLine, Sparkles, BookOpen, Layers, Zap, MessageSquare, ChevronRight, Layout, Database, BarChart3, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Showcase() {
    return (
        <div className="min-h-screen bg-[#fbf9f5] text-slate-800 font-sans selection:bg-[#546354]/10">
            {/* Navigation */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#fbf9f5]/80 backdrop-blur-xl border-b border-slate-100 px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#546354] flex items-center justify-center shadow-lg shadow-[#546354]/10">
                        <PenLine className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xl font-serif italic text-slate-800 tracking-tight flex items-center gap-2">
                        Storyline
                        <span className="text-[10px] font-sans font-bold tracking-widest uppercase bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md mt-0.5">Beta</span>
                    </span>
                </div>
                <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
                    <a href="#features" className="hover:text-[#546354] transition-colors">Features</a>
                    <a href="#workflow" className="hover:text-[#546354] transition-colors">How it works</a>
                    <a href="#beta" className="hover:text-[#546354] transition-colors">The Beta</a>
                </nav>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-sm font-medium text-slate-500 hover:text-[#546354] transition-colors px-2">Sign In</Link>
                    <Link href="/signup">
                        <Button className="bg-[#546354] hover:bg-[#3d4a3d] text-white rounded-full px-6 font-serif italic shadow-md hover:shadow-lg transition-all">
                            Get Started
                        </Button>
                    </Link>
                </div>
            </header>

            <main>
                {/* Hero Section */}
                <section className="relative pt-40 pb-20 px-6 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[120%] -z-10 opacity-40">
                        <Image 
                            src="/showcase/hero.png" 
                            alt="Creative Sanctuary" 
                            fill 
                            priority
                            className="object-cover opacity-60"
                            quality={100}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#fbf9f5] via-transparent to-[#fbf9f5]" />
                    </div>

                    <div className="max-w-5xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#546354]/5 border border-[#546354]/10 text-[#546354] text-xs font-semibold mb-8 animate-fade-in-up">
                            <Sparkles className="w-3 h-3" />
                            <span>Free during beta</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-serif text-slate-800 mb-6 leading-[1.1] animate-fade-in-up animation-delay-100">
                            Your Creative Sanctuary <br /> for Storytelling
                        </h1>
                        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up animation-delay-200">
                            A focused writing environment that combines elegant structure, <br className="hidden md:block" /> AI collaboration, and deep organization to help you finish your best work.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-300">
                            <Link href="/signup">
                                <Button className="h-14 px-6 md:px-10 bg-[#546354] hover:bg-[#3d4a3d] text-white rounded-full font-serif italic text-lg md:text-xl shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto">
                                    Start Writing Free
                                </Button>
                            </Link>
                            <Link href="/login">
                                <Button variant="ghost" className="h-14 px-8 rounded-full font-medium text-slate-500 hover:text-slate-800 transition-colors">
                                    Continue your story
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* App Teaser Mockup */}
                    <div className="max-w-6xl mx-auto mt-20 relative p-4 bg-white/50 backdrop-blur-sm rounded-[32px] border border-white/50 shadow-2xl animate-fade-in-up animation-delay-500">
                        <div className="rounded-[24px] overflow-hidden border border-slate-100 shadow-inner bg-slate-50 aspect-[16/10] relative">
                            <Image 
                                src="/showcase/editor.png"
                                alt="Storyline Editor Interface"
                                fill
                                priority
                                className="object-contain"
                            />
                        </div>
                    </div>
                </section>

                {/* Feature Pills / Trusted By style area */}
                <section className="py-20 bg-white border-y border-slate-50">
                    <div className="max-w-6xl mx-auto px-6">
                        <p className="text-center text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-12">Designed for modern authors</p>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="flex flex-col items-center text-center p-6 grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                                    <BookOpen className="w-6 h-6 text-slate-400" />
                                </div>
                                <h3 className="font-serif italic text-lg text-slate-700">Manuscript Focused</h3>
                            </div>
                            <div className="flex flex-col items-center text-center p-6 grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                                    <Sparkles className="w-6 h-6 text-slate-400" />
                                </div>
                                <h3 className="font-serif italic text-lg text-slate-700">AI Partner</h3>
                            </div>
                            <div className="flex flex-col items-center text-center p-6 grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                                    <Layers className="w-6 h-6 text-slate-400" />
                                </div>
                                <h3 className="font-serif italic text-lg text-slate-700">Structural Clarity</h3>
                            </div>
                            <div className="flex flex-col items-center text-center p-6 grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                                    <Zap className="w-6 h-6 text-slate-400" />
                                </div>
                                <h3 className="font-serif italic text-lg text-slate-700">Fluid Workflow</h3>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Primary Features Showcase */}
                <section id="features" className="py-20 bg-[#fbf9f5]">
                    <div className="max-w-6xl mx-auto px-6 space-y-40">
                        {/* Feature 1: Structure */}
                        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                            <div className="flex-1 space-y-6">
                                <div className="w-12 h-12 rounded-2xl bg-[#546354]/10 flex items-center justify-center">
                                    <Layout className="w-6 h-6 text-[#546354]" />
                                </div>
                                <h2 className="text-4xl font-serif text-slate-800 leading-tight">Plan your story <br className="hidden md:block" /> with visual clarity</h2>
                                <p className="text-lg text-slate-500 leading-relaxed">
                                    Storyline helps you see the forest through the trees. Manage complex structures of episodes, acts, and scenes with an intuitive sidebar that mirrors your creative intent.
                                </p>
                                <ul className="space-y-4 pt-4">
                                    {['Deep hierarchical organization', 'Instant scene navigation', 'Visual flow of your narrative'].map((item) => (
                                        <li key={item} className="flex items-center gap-3 text-slate-600">
                                            <div className="w-5 h-5 rounded-full bg-[#546354]/10 flex items-center justify-center flex-shrink-0">
                                                <ChevronRight className="w-3 h-3 text-[#546354]" />
                                            </div>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex-1 relative">
                                <div className="relative z-10 p-2 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform lg:rotate-2 hover:rotate-0 transition-transform duration-500">
                                    <Image src="/showcase/structure.png" alt="Story Planning" width={1200} height={800} className="rounded-2xl" />
                                </div>
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#546354]/5 rounded-full blur-3xl -z-10" />
                                <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-[#546354]/3 rounded-full blur-3xl -z-10" />
                            </div>
                        </div>

                        {/* Feature 2: AI Partner */}
                        <div className="flex flex-col lg:flex-row-reverse items-center gap-16 lg:gap-24">
                            <div className="flex-1 space-y-6">
                                <div className="w-12 h-12 rounded-2xl bg-[#546354]/10 flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-[#546354]" />
                                </div>
                                <h2 className="text-4xl font-serif text-slate-800 leading-tight">Collaborate with an <br className="hidden md:block" /> AI partner in context</h2>
                                <p className="text-lg text-slate-500 leading-relaxed">
                                    Our AI Partner doesn't just write for you—it writes *with* you. Integrated directly into your editor, it understands your characters, your world, and your voice.
                                </p>
                                <ul className="space-y-4 pt-4">
                                    {['Scene analysis and feedback', 'Context-aware brainstorming', 'Worldbuilding consistency checks'].map((item) => (
                                        <li key={item} className="flex items-center gap-3 text-slate-600">
                                            <div className="w-5 h-5 rounded-full bg-[#546354]/10 flex items-center justify-center flex-shrink-0">
                                                <ChevronRight className="w-3 h-3 text-[#546354]" />
                                            </div>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex-1 relative">
                                <div className="relative z-10 p-2 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform lg:-rotate-2 hover:rotate-0 transition-transform duration-500">
                                    <Image src="/showcase/editor_ai.png" alt="AI Integrated Editor" width={1200} height={800} className="rounded-2xl" />
                                </div>
                                <div className="absolute -top-20 -left-20 w-80 h-80 bg-[#546354]/5 rounded-full blur-[80px] -z-10" />
                            </div>
                        </div>

                        {/* Feature 3: Worldbuilding */}
                        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                            <div className="flex-1 space-y-6">
                                <div className="w-12 h-12 rounded-2xl bg-[#546354]/10 flex items-center justify-center">
                                    <Database className="w-6 h-6 text-[#546354]" />
                                </div>
                                <h2 className="text-4xl font-serif text-slate-800 leading-tight">Organize your entire <br className="hidden md:block" /> narrative universe</h2>
                                <p className="text-lg text-slate-500 leading-relaxed">
                                    Keep notes, characters, locations, and objects in one central sanctuary. Link them directly to scenes so the information you need is always one click away.
                                </p>
                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="font-serif italic text-lg text-slate-800 mb-1">Characters</p>
                                        <p className="text-sm text-slate-400">Track arcs and relationships</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="font-serif italic text-lg text-slate-800 mb-1">Locations</p>
                                        <p className="text-sm text-slate-400">Map out your world</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="font-serif italic text-lg text-slate-800 mb-1">Objects</p>
                                        <p className="text-sm text-slate-400">Manage important relics</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="font-serif italic text-lg text-slate-800 mb-1">Ideas</p>
                                        <p className="text-sm text-slate-400">Save sparks for later</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 relative">
                                <div className="relative z-10 p-2 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                                    <Image src="/showcase/characters.png" alt="Worldbuilding Database" width={1200} height={800} className="rounded-2xl" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Workflow / How it works */}
                <section id="workflow" className="py-20 bg-white overflow-hidden">
                    <div className="max-w-6xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl font-serif text-slate-800 mb-4">Craft your masterpiece in three steps</h2>
                            <p className="text-slate-500 max-w-xl mx-auto">From nascent spark to polished manuscript, Storyline supports every phase of the creative cycle.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-12 relative">
                            {/* Connector line for desktop */}
                            <div className="hidden md:block absolute top-[52px] left-0 w-full h-px bg-slate-100 -z-10" />
                            
                            <div className="space-y-6">
                                <div className="w-12 h-12 rounded-full bg-[#546354] text-white flex items-center justify-center text-xl font-serif italic shadow-lg mx-auto md:mx-0">1</div>
                                <h3 className="text-2xl font-serif text-slate-800 text-center md:text-left">Plant the Seed</h3>
                                <p className="text-slate-500 leading-relaxed text-center md:text-left">
                                    Create your project, define your premise, and set the tone. Use the AI to brainstorm initial concepts and structural pillars.
                                </p>
                            </div>
                            <div className="space-y-6 md:mt-12">
                                <div className="w-12 h-12 rounded-full bg-[#546354] text-white flex items-center justify-center text-xl font-serif italic shadow-lg mx-auto md:mx-0">2</div>
                                <h3 className="text-2xl font-serif text-slate-800 text-center md:text-left">Nurture the Story</h3>
                                <p className="text-slate-500 leading-relaxed text-center md:text-left">
                                    Write scene by scene in our focused editor. Summon your AI partner for real-time feedback and assistance whenever you feel stuck.
                                </p>
                            </div>
                            <div className="space-y-6 md:mt-24">
                                <div className="w-12 h-12 rounded-full bg-[#546354] text-white flex items-center justify-center text-xl font-serif italic shadow-lg mx-auto md:mx-0">3</div>
                                <h3 className="text-2xl font-serif text-slate-800 text-center md:text-left">Harvest the Insights</h3>
                                <p className="text-slate-500 leading-relaxed text-center md:text-left">
                                    Review your work with automated stats and AI insights. Refine your narrative until it resonates perfectly.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Beta Note */}
                <section id="beta" className="py-32 px-6 bg-[#fbf9f5]">
                    <div className="max-w-4xl mx-auto bg-white rounded-[40px] p-12 md:p-20 shadow-xl border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Sparkles className="w-40 h-40 text-[#546354]" />
                        </div>
                        <div className="relative z-10 text-center space-y-8">
                            <div className="w-16 h-16 rounded-2xl bg-[#546354]/5 flex items-center justify-center mx-auto mb-6">
                                <Zap className="w-8 h-8 text-[#546354]" />
                            </div>
                            <h2 className="text-4xl md:text-5xl font-serif text-slate-800">Storyline is in Beta</h2>
                            <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                                We're actively building the future of storytelling. During this phase, <strong>all features are free to use</strong>. We simply ask for your feedback to help us reach our final form.
                            </p>
                            <div className="pt-4">
                                <Link href="/signup">
                                    <Button className="h-14 px-6 md:px-12 bg-[#546354] hover:bg-[#3d4a3d] text-white rounded-full font-serif italic text-lg md:text-xl shadow-lg transition-all w-full sm:w-auto">
                                        Join the Beta — It's Free
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-20 bg-[#546354] relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <Image src="/showcase/abstract.png" alt="Abstract creativity" fill className="object-cover" />
                    </div>
                    <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                        <h2 className="text-4xl font-serif text-white mb-8">Ready to start your next masterpiece?</h2>
                        <Link href="/signup">
                            <Button className="h-16 px-6 md:px-12 bg-white text-[#546354] hover:bg-slate-50 rounded-full font-serif italic text-xl md:text-2xl shadow-2xl transition-all w-full sm:w-auto whitespace-normal sm:whitespace-nowrap">
                                Step into the Sanctuary
                            </Button>
                        </Link>
                        <p className="text-white/60 mt-8 text-sm font-medium">No credit card required. Pure creative focus.</p>
                    </div>
                </section>

                {/* Support / Contact */}
                <section className="py-20 border-t border-slate-100 bg-white">
                    <div className="max-w-4xl mx-auto px-6 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-100 text-slate-400 text-sm font-medium mb-6">
                            <Mail className="w-4 h-4" />
                            <span>Questions or Feedback?</span>
                        </div>
                        <p className="text-xl text-slate-600 mb-4">We're here to help you throughout your writing journey.</p>
                        <a href="mailto:mwake.dev@gmail.com" className="text-2xl font-serif italic text-[#546354] hover:underline transition-all underline-offset-8 decoration-1">
                            mwake.dev@gmail.com
                        </a>
                    </div>
                </section>
            </main>

            <footer className="bg-white border-t border-slate-100 pt-20 pb-10 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between gap-12 mb-20">
                        <div className="space-y-6 max-w-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-[#546354] flex items-center justify-center shadow-lg shadow-[#546354]/10">
                                    <PenLine className="w-3 h-3 text-white" />
                                </div>
                                <span className="text-lg font-serif italic text-slate-800 tracking-tight">Storyline</span>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                A high-end editorial workspace for the modern author. Built for book and screenplay writers who value structure, focus, and AI-powered creative partnership.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-16">
                            <div className="space-y-4">
                                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-300">Product</p>
                                <ul className="space-y-3 text-sm font-medium text-slate-500">
                                    <li><a href="#features" className="hover:text-[#546354]">Features</a></li>
                                    <li><a href="#workflow" className="hover:text-[#546354]">Workflow</a></li>
                                    <li><a href="#beta" className="hover:text-[#546354]">Beta Access</a></li>
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-300">Support</p>
                                <ul className="space-y-3 text-sm font-medium text-slate-500">
                                    <li><a href="mailto:mwake.dev@gmail.com" className="hover:text-[#546354]">mwake.dev@gmail.com</a></li>
                                    <li><Link href="/terms" className="hover:text-[#546354]">Terms of Service</Link></li>
                                    <li><Link href="/privacy" className="hover:text-[#546354]">Privacy Policy</Link></li>
                                    <li><Link href="/ai-disclaimer" className="hover:text-[#546354]">AI Disclaimer</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-10 border-t border-slate-50">
                        <p className="text-[11px] font-bold tracking-widest uppercase text-slate-300">© 2026 Storyline — Built for Authors</p>
                        <div className="text-[11px] font-bold tracking-widest uppercase text-[#546354] flex gap-4">
                            <span>Storyline is Free During Beta</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
