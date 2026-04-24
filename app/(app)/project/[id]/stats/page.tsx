'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isLocalProjectId } from '@/lib/persistence/project-mode'
import { loadLocalStoryWorkspaceData } from '@/lib/persistence/local-projects'
import { 
    BarChart3, 
    BookOpen, 
    FileText, 
    Layers, 
    Users, 
    Lightbulb, 
    Timer, 
    Clock,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    ArrowLeft,
    SortAsc,
    SortDesc,
    Search,
    ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { calculateProjectStats, ProjectStatsData, SceneStats } from '@/lib/project-stats'
import { getProjectTypeLabel } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/providers/ThemeProvider'

export default function ProjectStatsPage() {
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    const { id } = useParams()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [project, setProject] = useState<any>(null)
    const [stats, setStats] = useState<ProjectStatsData | null>(null)
    const [sortConfig, setSortConfig] = useState<{ key: keyof SceneStats; direction: 'asc' | 'desc' }>({
        key: 'sceneOrder',
        direction: 'asc'
    })
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        async function fetchData() {
            if (!id) return
            
            let projectData: any
            let nodesData: any[] = []
            let scenesData: any[] = []
            let charactersData: any[] = []
            let ideasData: any[] = []
            let charLinksData: any[] = []
            let ideaLinksData: any[] = []

            if (isLocalProjectId(id as string)) {
                // Fetch from LOCAL storage
                const workspaceData = await loadLocalStoryWorkspaceData(id as string)
                projectData = workspaceData.project
                nodesData = workspaceData.nodes
                scenesData = workspaceData.allScenes
                charactersData = workspaceData.projectCharacters
                ideasData = workspaceData.projectIdeas
                // Local linking not supported yet, so links remain empty
            } else {
                // Fetch from SUPABASE
                const supabase = createClient()
                
                const [
                    { data: pData },
                    { data: nData },
                    { data: sData },
                    { data: cData },
                    { data: iData },
                ] = await Promise.all([
                    supabase.from('projects').select('*').eq('id', id as string).single(),
                    supabase.from('structure_nodes').select('*').eq('project_id', id as string).is('deleted_at', null),
                    supabase.from('scenes').select('*').eq('project_id', id as string),
                    supabase.from('characters').select('id').eq('project_id', id as string),
                    supabase.from('ideas').select('id').eq('project_id', id as string),
                ])

                projectData = pData
                nodesData = nData || []
                scenesData = sData || []
                charactersData = cData || []
                ideasData = iData || []

                if (projectData && nodesData && scenesData.length > 0) {
                    const sceneIds = scenesData.map(s => s.id)
                    const [
                        { data: cLinks },
                        { data: iLinks },
                    ] = await Promise.all([
                        supabase.from('scene_characters').select('*').in('scene_id', sceneIds),
                        supabase.from('scene_ideas').select('*').in('scene_id', sceneIds),
                    ])
                    charLinksData = cLinks || []
                    ideaLinksData = iLinks || []
                }
            }

            if (projectData && nodesData && scenesData) {
                setProject(projectData)
                const computedStats = calculateProjectStats(
                    projectData,
                    nodesData as any[],
                    scenesData as any[],
                    { 
                        characters: charactersData?.length || 0, 
                        ideas: ideasData?.length || 0 
                    },
                    { 
                        characters: charLinksData, 
                        ideas: ideaLinksData
                    }
                )
                setStats(computedStats)
            }
            setLoading(false)
        }
        fetchData()
    }, [id])

    const handleSort = (key: keyof SceneStats) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    const filteredScenes = useMemo(() => {
        if (!stats) return []
        let scenes = [...stats.sceneBreakdown]
        
        if (searchQuery) {
            scenes = scenes.filter(s => 
                s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.parentTitle.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        scenes.sort((a, b) => {
            const aVal = a[sortConfig.key]
            const bVal = b[sortConfig.key]
            if (aVal === null) return 1
            if (bVal === null) return -1
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
            return 0
        })

        return scenes
    }, [stats, sortConfig, searchQuery])

    if (loading) {
        return (
            <div className={cn(
                "project-stats-page flex-1 flex items-center justify-center",
                isMidnight ? "bg-[#0b1120]" : "bg-[#fbf9f5]"
            )}>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-slate-400 font-serif italic">Gathering project insights...</p>
                </div>
            </div>
        )
    }

    if (!stats || !project) return null

    const typeLabel = getProjectTypeLabel(project.type)

    return (
        <div className={cn(
            "project-stats-page flex-1 overflow-y-auto scroll-smooth no-scrollbar",
            isMidnight ? "bg-[#0b1120]" : "bg-[#fbf9f5]"
        )}>
            <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <button 
                            onClick={() => router.back()}
                            className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-600 transition-colors text-xs font-bold uppercase tracking-widest mb-4"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to Story
                        </button>
                        <h1 className="text-4xl font-serif font-bold text-slate-900 tracking-tight">Project Stats</h1>
                        <p className="text-slate-500 font-serif italic text-lg">{project.title} &middot; {typeLabel} Analysis</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <Badge variant="outline" className="bg-white px-3 py-1 text-slate-500 font-semibold rounded-lg border-slate-200">
                             Last updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Badge>
                    </div>
                </div>

                {/* Section 1: Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard 
                        title="Total Word Count" 
                        value={stats.totalWords.toLocaleString()} 
                        icon={FileText} 
                        color="text-indigo-600" 
                        bg="bg-indigo-50"
                        description="Across all active scenes"
                    />
                    <StatCard 
                        title={`Total ${typeLabel === 'Screenplay' ? 'Scenes' : 'Scenes'}`} 
                        value={stats.totalScenes.toString()} 
                        icon={Layers} 
                        color="text-emerald-600" 
                        bg="bg-emerald-50"
                        description="Completed & in-progress"
                    />
                    <StatCard 
                        title={`Total ${typeLabel === 'Screenplay' ? 'Acts' : 'Chapters'}`} 
                        value={typeLabel === 'Screenplay' ? stats.totalActs.toString() : stats.totalChapters.toString()} 
                        icon={BookOpen} 
                        color="text-amber-600" 
                        bg="bg-amber-50"
 description={`${typeLabel} structure units`}
                    />
                    <StatCard 
                        title="Reading Time" 
                        value={`${stats.estimatedReadingTime} min`} 
                        icon={Timer} 
                        color="text-rose-600" 
                        bg="bg-rose-50"
                        description="At 250 words per minute"
                    />
                </div>

                {/* Section 2: Book Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 rounded-2xl border-slate-200/60 bg-white/50 shadow-sm overflow-hidden">
                        <CardHeader className="border-b border-slate-100 bg-white/50 py-4">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-indigo-500" />
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">{typeLabel} Intelligence</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
                                <div className="space-y-4">
                                    <DetailItem label="Word Count" value={stats.totalWords.toLocaleString()} />
                                    <DetailItem label="Chapter Count" value={stats.totalChapters} />
                                    <DetailItem label="Scene Count" value={stats.totalScenes} />
                                    <DetailItem label="Characters" value={stats.totalCharacters} />
                                    <DetailItem label="Empty Scenes" value={stats.emptyScenesCount} subValue={`${((stats.emptyScenesCount / stats.totalScenes) * 100).toFixed(0)}% of total`} />
                                </div>
                                <div className="space-y-4">
                                    <DetailItem label="Avg. Words / Scene" value={stats.avgWordsPerScene.toFixed(0)} />
                                    <DetailItem label="Avg. Words / Chapter" value={stats.avgWordsPerChapter.toFixed(0)} />
                                    <DetailItem 
                                        label="Longest Scene" 
                                        value={stats.longestScene.count.toLocaleString()} 
                                        subValue={stats.longestScene.title} 
                                    />
                                    <DetailItem 
                                        label="Longest Chapter" 
                                        value={stats.longestChapter.count.toLocaleString()} 
                                        subValue={stats.longestChapter.title} 
                                    />
                                    <DetailItem label="Reading Time" value={`${stats.estimatedReadingTime}m`} subValue="Approximate" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-slate-200/60 bg-white/50 shadow-sm overflow-hidden">
                         <CardHeader className="border-b border-slate-100 bg-white/50 py-4">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-500" />
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Assets & Links</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Linked Entities</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-indigo-50 rounded-lg">
                                                <Users className="w-3.5 h-3.5 text-indigo-600" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-600">Characters</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900">{stats.totalCharacters}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-amber-50 rounded-lg">
                                                <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-600">Ideas</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900">{stats.totalIdeas}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Structure Alerts</h4>
                                <div className="space-y-3">
                                    {stats.emptyScenesCount > 0 && (
                                        <div className="flex items-start gap-2 text-rose-600 bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <p className="text-xs font-medium leading-relaxed">
                                                {stats.emptyScenesCount} scene{stats.emptyScenesCount > 1 ? 's are' : ' is'} currently empty.
                                            </p>
                                        </div>
                                    )}
                                    {stats.outlierChapters.map((o, i) => (
                                        <div key={i} className="flex items-start gap-2 text-amber-600 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <p className="text-xs font-medium leading-relaxed">
                                                <span className="font-bold">"{o.title}"</span> is unusually {o.status === 'low' ? 'short' : 'long'} ({o.count.toLocaleString()} words).
                                            </p>
                                        </div>
                                    ))}
                                    {stats.emptyScenesCount === 0 && stats.outlierChapters.length === 0 && (
                                        <div className="flex items-start gap-2 text-emerald-600 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                            <p className="text-xs font-medium leading-relaxed">
                                                Structure looks balanced. No major outliers detected.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Section 3: Structure & Coverage */}
                <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-slate-100 bg-white py-5">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Draft Coverage</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                            <CoverageItem label="Prose Coverage" percent={stats.percentProse} icon={FileText} color="bg-indigo-600" />
                            <CoverageItem label="Character Linking" percent={stats.percentLinkedCharacters} icon={Users} color="bg-emerald-600" />
                            <CoverageItem label="Idea Mapping" percent={stats.percentLinkedIdeas} icon={Lightbulb} color="bg-amber-600" />
                            <CoverageItem label="Summarization" percent={stats.percentSummary} icon={BookOpen} color="bg-violet-600" />
                        </div>
                    </CardContent>
                </Card>

                {/* Section 4: Scene Breakdown */}
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="text-xl font-serif font-bold text-slate-800">Scene Breakdown</h2>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input 
                                placeholder="Search scenes..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 rounded-xl border-slate-200 focus:ring-indigo-500 bg-white"
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors">
                                            <button onClick={() => handleSort('title')} className="flex items-center gap-1.5 hover:text-indigo-600">
                                                Scene Title
                                                {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                                            </button>
                                        </th>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                             <button onClick={() => handleSort('parentTitle')} className="flex items-center gap-1.5 hover:text-indigo-600">
                                                Parent Unit
                                                {sortConfig.key === 'parentTitle' && (sortConfig.direction === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                                            </button>
                                        </th>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            <button onClick={() => handleSort('wordCount')} className="flex items-center gap-1.5 hover:text-indigo-600">
                                                Words
                                                {sortConfig.key === 'wordCount' && (sortConfig.direction === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                                            </button>
                                        </th>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Coverage</th>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Last Edited</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredScenes.map((scene) => (
                                        <tr key={scene.id} className="hover:bg-slate-50/50 group transition-colors cursor-pointer" onClick={() => router.push(`/project/${id}/story?nodeId=${scene.nodeId}`)}>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{scene.title}</span>
                                                    {scene.wordCount < 300 && scene.wordCount > 0 && (
                                                        <span className="text-[10px] text-amber-500 font-bold uppercase tracking-tighter">Short Scene</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium rounded-lg no-border text-[10px]">
                                                    {scene.parentTitle}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "text-sm font-mono",
                                                    scene.wordCount === 0 ? "text-slate-300" : "text-slate-600"
                                                )}>
                                                    {scene.wordCount.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <StatusIcon active={scene.hasProse} icon={FileText} tooltip="Prose" color="text-indigo-500" />
                                                    <StatusIcon active={scene.linkedCharactersCount > 0} icon={Users} tooltip="Characters" color="text-emerald-500" />
                                                    <StatusIcon active={scene.linkedIdeasCount > 0} icon={Lightbulb} tooltip="Ideas" color="text-amber-500" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-[11px] font-medium text-slate-400">
                                                    {scene.lastEdited ? new Date(scene.lastEdited).toLocaleDateString() : '—'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredScenes.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-serif italic">
                                                No scenes found matching your filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, icon: Icon, color, bg, description }: any) {
    return (
        <Card className="rounded-2xl border-slate-200/60 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</span>
                    <div className={cn("p-2 rounded-xl", bg)}>
                        <Icon className={cn("w-4 h-4", color)} />
                    </div>
                </div>
                <div>
                    <div className="text-2xl font-serif font-bold text-slate-900">{value}</div>
                    <p className="text-[11px] text-slate-400 font-medium">{description}</p>
                </div>
            </CardContent>
        </Card>
    )
}

function DetailItem({ label, value, subValue }: any) {
    return (
        <div className="flex items-center justify-between group">
            <span className="text-sm font-medium text-slate-500">{label}</span>
            <div className="text-right">
                <div className="text-lg font-serif font-bold text-slate-800">{value}</div>
                {subValue && <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{subValue}</div>}
            </div>
        </div>
    )
}

function CoverageItem({ label, percent, icon: Icon, color }: any) {
    return (
        <div className="px-6 py-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{label}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{percent.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                    className={cn("h-full transition-all duration-1000", color)} 
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    )
}

function StatusIcon({ active, icon: Icon, tooltip, color }: any) {
    return (
         <div className={cn(
            "p-1.5 rounded-lg transition-colors border",
            active ? cn("border-slate-100 bg-white shadow-sm", color) : "border-slate-50 bg-slate-50/50 text-slate-200"
        )}>
            <Icon className="w-3 h-3" />
        </div>
    )
}
