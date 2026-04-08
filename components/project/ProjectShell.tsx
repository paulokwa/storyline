'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    BookOpen, Users, Lightbulb,
    ChevronLeft, Settings, Check, X,
    Tv,
    Download,
    MapPin,
    Package,
    PanelLeft,
    Sparkles,
    Volume2,
    Wand2,
    Bookmark
} from 'lucide-react'
import ExportModal from '@/components/export/ExportModal'
import ProjectSettingsModal from '@/components/project/ProjectSettingsModal'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/supabase/types'
import { ReaderProvider, useSpeech } from '@/hooks/useSpeech'
import { FloatingPlayer } from '@/components/project/story/ReaderMode'
import { ProjectProvider, useProjectActions } from '@/components/project/ProjectContext'

type Project = Database['public']['Tables']['projects']['Row']

const TABS = [
    { slug: 'story', label: 'Story', icon: BookOpen },
    { slug: 'characters', label: 'Characters', icon: Users },
    { slug: 'ideas', label: 'Ideas', icon: Lightbulb },
    { slug: 'locations', label: 'Locations', icon: MapPin },
    { slug: 'objects', label: 'Objects', icon: Package },
    { slug: 'archive', label: 'Archive', icon: Bookmark },
] as const

export default function ProjectShell({
    project: initialProject,
    children,
}: {
    project: Project
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const [project, setProject] = useState(initialProject)
    const [editingTitle, setEditingTitle] = useState(false)
    const [titleDraft, setTitleDraft] = useState(project.title ?? '')
    const [exportModalOpen, setExportModalOpen] = useState(false)
    const [settingsModalOpen, setSettingsModalOpen] = useState(false)

    async function saveTitle() {
        if (!titleDraft.trim()) return setEditingTitle(false)
        const supabase = createClient()
        const { data } = await (supabase
            .from('projects') as any)
            .update({ title: titleDraft.trim() })
            .eq('id', project.id)
            .select()
            .single()
        if (data) setProject(data)
        setEditingTitle(false)
        router.refresh()
    }

    return (
        <ProjectProvider>
            <ReaderProvider>
                <ProjectShellInner 
                    project={project} 
                    editingTitle={editingTitle} 
                    setEditingTitle={setEditingTitle} 
                    titleDraft={titleDraft} 
                    setTitleDraft={setTitleDraft} 
                    saveTitle={saveTitle} 
                    exportModalOpen={exportModalOpen}
                    setExportModalOpen={setExportModalOpen}
                    settingsModalOpen={settingsModalOpen}
                    setSettingsModalOpen={setSettingsModalOpen}
                    pathname={pathname} 
                >
                    {children}
                </ProjectShellInner>
                
                <ExportModal 
                    open={exportModalOpen} 
                    onOpenChange={setExportModalOpen} 
                    projectId={project.id}
                    projectTitle={project.title ?? 'Untitled'}
                />
                
                <ProjectSettingsModal 
                    open={settingsModalOpen} 
                    onOpenChange={setSettingsModalOpen} 
                    project={project} 
                />
                <FloatingPlayer />
            </ReaderProvider>
        </ProjectProvider>
    )
}

function ProjectShellInner({ 
    project, 
    editingTitle, 
    setEditingTitle, 
    titleDraft, 
    setTitleDraft, 
    saveTitle, 
    exportModalOpen,
    setExportModalOpen, 
    settingsModalOpen,
    setSettingsModalOpen, 
    pathname, 
    children 
}: any) {
    const { 
        sidebarOpen, setSidebarOpen, 
        aiPanelOpen, setAiPanelOpen, 
        currentSceneText, 
        analyzeScene, isAnalyzing 
    } = useProjectActions()
    const { speak, speechState } = useSpeech()
    const isReading = speechState === 'speaking'
    const isStoryTab = pathname.includes('/story')
    const activeTab = TABS.find(t => pathname.includes(`/${t.slug}`))?.slug ?? 'story'

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Project header */}
            <div className="bg-[#f5f4ef] px-4 sm:px-6 lg:px-8">
                <div className="max-w-[1440px] mx-auto">
                    {/* Top row */}
                    <div className="flex items-center gap-3 pt-4 pb-3">
                        <Link href="/library" className="text-slate-400 hover:text-slate-700 transition-colors shrink-0">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>

                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${project.type === 'tv_script' ? 'bg-violet-100' : 'bg-amber-50'
                            }`}>
                            {project.type === 'tv_script'
                                ? <Tv className="w-4 h-4 text-violet-600" />
                                : <BookOpen className="w-4 h-4 text-amber-600" />}
                        </div>

                        {editingTitle ? (
                            <div className="flex items-center gap-2 flex-1">
                                <Input
                                    value={titleDraft}
                                    onChange={(e) => setTitleDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveTitle()
                                        if (e.key === 'Escape') setEditingTitle(false)
                                    }}
                                    className="h-8 text-base font-semibold max-w-sm"
                                    autoFocus
                                />
                                <button onClick={saveTitle} className="text-green-600 hover:text-green-700">
                                    <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditingTitle(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => { setTitleDraft(project.title ?? ''); setEditingTitle(true) }}
                                className="text-2xl sm:text-3xl font-serif text-[#31332f] hover:text-[#546354] transition-colors text-left flex-1 truncate py-2"
                                title="Click to rename"
                            >
                                {project.title}
                            </button>
                        )}

                        <div className="flex items-center gap-2">
                             {/* Tab Actions (Dynamic) */}
                             {isStoryTab && (
                                <div className="flex items-center gap-1.5 mr-2 pr-2 border-r border-[#e0ded9]">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSidebarOpen(!sidebarOpen)}
                                        className={cn(
                                            "rounded-xl transition-all h-9 px-2.5",
                                            sidebarOpen ? "bg-[#546354]/10 text-[#546354] hover:bg-[#546354]/20" : "text-slate-500 hover:bg-[#efeee9]"
                                        )}
                                        title="Toggle structure panel"
                                    >
                                        <PanelLeft className="w-4 h-4" />
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => speak(currentSceneText, 'Scene')}
                                        className={cn(
                                            "rounded-xl transition-all h-9 px-2.5 gap-2",
                                            isReading ? "bg-amber-100 text-amber-700 animate-pulse" : "text-slate-500 hover:bg-[#efeee9]"
                                        )}
                                        title="Read aloud"
                                    >
                                        <Volume2 className={cn("w-4 h-4", isReading && "animate-bounce")} />
                                        <span className="text-xs font-medium hidden md:inline">Read Aloud</span>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => analyzeScene()}
                                        disabled={isAnalyzing || !currentSceneText}
                                        className={cn(
                                            "rounded-xl transition-all h-9 px-2.5 gap-2",
                                            isAnalyzing ? "bg-violet-100 text-violet-700 animate-pulse" : "text-slate-500 hover:bg-[#efeee9]"
                                        )}
                                        title="Analyze scene"
                                    >
                                        <Wand2 className="w-4 h-4" />
                                        <span className="text-xs font-medium hidden md:inline">Analyze</span>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setAiPanelOpen(!aiPanelOpen)}
                                        className={cn(
                                            "rounded-xl transition-all h-9 px-2.5 gap-2",
                                            aiPanelOpen ? "bg-violet-100 text-violet-700 hover:bg-violet-200" : "text-slate-500 hover:bg-[#efeee9]"
                                        )}
                                        title="Toggle AI helper"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        <span className="text-xs font-medium hidden md:inline">AI Helper</span>
                                    </Button>
                                </div>
                            )}

                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex rounded-xl bg-white/50 border-[#e0ded9] text-[#546354] hover:bg-white hover:border-[#546354]/20 transition-all duration-300 gap-1.5 px-2.5 sm:px-4"
                                onClick={() => setExportModalOpen(true)}
                                title="Export Project"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Export</span>
                            </Button>
                            
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-xl text-slate-400 hover:text-slate-600 hover:bg-[#efeee9]"
                                onClick={() => setSettingsModalOpen(true)}
                                title="Project Settings"
                            >
                                <Settings className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-2 overflow-x-auto no-scrollbar scroll-smooth">
                        {TABS.map(({ slug, label, icon: Icon }) => (
                            <Link
                                key={slug}
                                href={`/project/${project.id}/${slug}`}
                                className={cn(
                                    'flex items-center gap-1.5 px-4 sm:px-6 py-3 text-sm font-medium transition-all duration-300 rounded-t-xl shrink-0',
                                    activeTab === slug
                                        ? 'bg-[#fbf9f5] text-[#546354] shadow-[0_-4px_12px_rgba(49,51,47,0.03)]'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-[#efeee9]'
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span className="font-sans tracking-wide uppercase text-[10px]">{label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Page content */}
            <div className="flex-1 overflow-hidden max-w-[1440px] w-full mx-auto flex flex-col">
                {children}
            </div>
        </div>
    )
}
