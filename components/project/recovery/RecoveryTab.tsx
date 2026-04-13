'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
    Trash2, 
    History, 
    Layers, 
    RotateCcw, 
    Search, 
    Filter, 
    Clock, 
    ChevronRight, 
    BookOpen, 
    Users, 
    Lightbulb, 
    MapPin, 
    Package, 
    Sparkles,
    Loader2,
    Calendar,
    ArrowUpRight,
    Eye,
    ChevronDown,
    X,
    FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { 
    restoreStructureNode, 
    restoreEntity, 
    captureSceneVersion, 
    createProjectSnapshot,
    restoreProjectSnapshot,
    permanentlyDeleteTrashItem,
    permanentlyDeleteHistoryVersion
} from '@/lib/supabase/recovery'
import { useRouter } from 'next/navigation'

type RecoverySection = 'trash' | 'history' | 'snapshots'
type TrashFilter = 'all' | 'structure' | 'assets' | 'ai'

interface RecoveryTabProps {
    projectId: string
    deletedNodes: any[]
    deletedCharacters: any[]
    deletedIdeas: any[]
    deletedLocations: any[]
    deletedObjects: any[]
    deletedResponses: any[]
    allNodes: any[]
    historyEntries: any[]
    snapshots: any[]
}

export default function RecoveryTab({
    projectId,
    deletedNodes,
    deletedCharacters,
    deletedIdeas,
    deletedLocations,
    deletedObjects,
    deletedResponses,
    allNodes,
    historyEntries,
    snapshots
}: RecoveryTabProps) {
    const router = useRouter()
    const [activeSection, setActiveSection] = useState<RecoverySection>('trash')
    const [trashFilter, setTrashFilter] = useState<TrashFilter>('all')
    const [isRestoring, setIsRestoring] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [previewVersion, setPreviewVersion] = useState<any | null>(null)
    const [selectedSceneId, setSelectedSceneId] = useState<string | 'all'>('all')

    // Snapshot States
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [snapshotName, setSnapshotName] = useState('')
    const [snapshotDescription, setSnapshotDescription] = useState('')
    const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false)
    const [snapshotToRestore, setSnapshotToRestore] = useState<any | null>(null)
    const [isRestoringSnapshot, setIsRestoringSnapshot] = useState(false)
    const [snapshotToDelete, setSnapshotToDelete] = useState<any | null>(null)
    const [isDeletingSnapshot, setIsDeletingSnapshot] = useState(false)

    // Permanent Deletion States
    const [itemToPermanentlyDelete, setItemToPermanentlyDelete] = useState<any | null>(null)
    const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false)
    const [versionToDelete, setVersionToDelete] = useState<any | null>(null)
    const [isDeletingVersion, setIsDeletingVersion] = useState(false)

    const searchParams = useSearchParams()

    // Handle deep links from search params
    useEffect(() => {
        const section = searchParams.get('section')
        const sceneId = searchParams.get('sceneId')
        
        if (section === 'history') {
            setActiveSection('history')
        } else if (section === 'snapshots') {
            setActiveSection('snapshots')
        }
        
        if (sceneId) {
            setSelectedSceneId(sceneId)
        }
    }, [searchParams])

    const supabase = createClient()

    // Helper to get descendants for a node
    const getDescendants = (nodeId: string): string[] => {
        const children = allNodes.filter(n => n.parent_id === nodeId)
        return children.flatMap(c => [c.id, ...getDescendants(c.id)])
    }

    const handleRestoreNode = async (nodeId: string) => {
        setIsRestoring(nodeId)
        try {
            const descendants = getDescendants(nodeId)
            await restoreStructureNode(supabase, nodeId, descendants)
            router.refresh()
        } catch (error) {
            console.error('Error restoring node:', error)
        } finally {
            setIsRestoring(null)
        }
    }

    const handleRestoreEntity = async (table: any, id: string) => {
        setIsRestoring(id)
        try {
            await restoreEntity(supabase, table, id)
            router.refresh()
        } catch (error) {
            console.error('Error restoring entity:', error)
        } finally {
            setIsRestoring(null)
        }
    }

    const handleRestoreVersion = async (version: any) => {
        setIsRestoring(version.id)
        try {
            const { data: currentScene } = await supabase
                .from('scenes')
                .select('*')
                .eq('id', version.scene_id)
                .single()

            if (currentScene) {
                await captureSceneVersion(supabase, projectId, version.scene_id, currentScene.content)
            }

            const { error } = await supabase
                .from('scenes')
                .update({ 
                    content: version.content,
                    updated_at: new Date().toISOString()
                })
                .eq('id', version.scene_id)

            if (error) throw error
            router.refresh()
        } catch (error) {
            console.error('Error restoring version:', error)
        } finally {
            setIsRestoring(null)
            setPreviewVersion(null)
        }
    }

    const handleCreateSnapshot = async () => {
        if (!snapshotName.trim()) return
        setIsCreatingSnapshot(true)
        try {
            await createProjectSnapshot(supabase, projectId, snapshotName, snapshotDescription)
            setShowCreateModal(false)
            setSnapshotName('')
            setSnapshotDescription('')
            router.refresh()
        } catch (error: any) {
            alert(error.message || 'Error creating snapshot')
        } finally {
            setIsCreatingSnapshot(false)
        }
    }

    const handleRestoreSnapshot = async () => {
        if (!snapshotToRestore) return
        setIsRestoringSnapshot(true)
        try {
            await restoreProjectSnapshot(supabase, snapshotToRestore.id)
            setSnapshotToRestore(null)
            router.refresh()
            router.push(`/project/${projectId}/story`)
        } catch (error) {
            console.error('Error restoring snapshot:', error)
            alert('Restore failed. Please check the console.')
        } finally {
            setIsRestoringSnapshot(false)
        }
    }

    const handleDeleteSnapshot = async () => {
        if (!snapshotToDelete) return
        setIsDeletingSnapshot(true)
        try {
            const { error } = await supabase.from('project_snapshots').delete().eq('id', snapshotToDelete.id)
            if (error) throw error
            setSnapshotToDelete(null)
            router.refresh()
        } catch (error) {
            console.error('Error deleting snapshot:', error)
        } finally {
            setIsDeletingSnapshot(false)
        }
    }

    const handlePermanentlyDeleteTrashItem = async () => {
        if (!itemToPermanentlyDelete) return
        setIsPermanentlyDeleting(true)
        try {
            await permanentlyDeleteTrashItem(
                supabase, 
                itemToPermanentlyDelete.trashType, 
                itemToPermanentlyDelete.id,
                itemToPermanentlyDelete.typeLabel
            )
            setItemToPermanentlyDelete(null)
            router.refresh()
        } catch (error) {
            console.error('Error permanently deleting item:', error)
        } finally {
            setIsPermanentlyDeleting(false)
        }
    }

    const handlePermanentlyDeleteHistoryVersion = async () => {
        if (!versionToDelete) return
        setIsDeletingVersion(true)
        try {
            await permanentlyDeleteHistoryVersion(supabase, versionToDelete.id)
            setVersionToDelete(null)
            router.refresh()
        } catch (error) {
            console.error('Error deleting version:', error)
        } finally {
            setIsDeletingVersion(false)
        }
    }

    const handleClearTrash = async () => {
        if (!confirm('Are you sure you want to permanently clear all items in the trash? This cannot be undone.')) return
        setIsPermanentlyDeleting(true)
        try {
            // Bulk delete active structure nodes that are soft-deleted for this project
            const nodesToDelete = deletedNodes.map(n => n.id)
            if (nodesToDelete.length > 0) {
                await supabase.from('scenes').delete().in('node_id', nodesToDelete)
                await supabase.from('structure_nodes').delete().in('id', nodesToDelete)
            }
            
            // Delete other entities
            const entities = [
                { table: 'characters', list: deletedCharacters },
                { table: 'ideas', list: deletedIdeas },
                { table: 'locations', list: deletedLocations },
                { table: 'objects', list: deletedObjects },
                { table: 'ai_responses', list: deletedResponses }
            ]

            for (const ent of entities) {
                const ids = ent.list.map(i => i.id)
                if (ids.length > 0) {
                    await (supabase.from(ent.table as any)).delete().in('id', ids)
                }
            }

            router.refresh()
        } catch (error) {
            console.error('Error clearing trash:', error)
        } finally {
            setIsPermanentlyDeleting(false)
        }
    }

    // Process and filter trash items
    const trashItems = useMemo(() => {
        const items: any[] = [
            ...deletedNodes.map(n => ({ ...n, trashType: 'structure', icon: BookOpen, typeLabel: n.type.charAt(0).toUpperCase() + n.type.slice(1) })),
            ...deletedCharacters.map(c => ({ ...c, trashType: 'assets', icon: Users, typeLabel: 'Character', title: c.name })),
            ...deletedIdeas.map(i => ({ ...i, trashType: 'assets', icon: Lightbulb, typeLabel: 'Idea' })),
            ...deletedLocations.map(l => ({ ...l, trashType: 'assets', icon: MapPin, typeLabel: 'Location', title: l.name })),
            ...deletedObjects.map(o => ({ ...o, trashType: 'assets', icon: Package, typeLabel: 'Object', title: o.name })),
            ...deletedResponses.map(r => ({ ...r, trashType: 'ai', icon: Sparkles, typeLabel: 'AI Response', title: r.prompt_summary || 'AI Response' }))
        ]

        return items
            .sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime())
            .filter(item => {
                const matchesFilter = trashFilter === 'all' || item.trashType === trashFilter
                const matchesSearch = !searchQuery || 
                    (item.title || item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.typeLabel.toLowerCase().includes(searchQuery.toLowerCase())
                return matchesFilter && matchesSearch
            })
    }, [deletedNodes, deletedCharacters, deletedIdeas, deletedLocations, deletedObjects, deletedResponses, trashFilter, searchQuery])

    // Filter and group history entries
    const filteredHistory = useMemo(() => {
        return historyEntries.filter(entry => {
            const matchesScene = selectedSceneId === 'all' || entry.scene_id === selectedSceneId
            const matchesSearch = !searchQuery || 
                (entry.scenes?.structure_nodes?.title || '').toLowerCase().includes(searchQuery.toLowerCase())
            return matchesScene && matchesSearch
        })
    }, [historyEntries, selectedSceneId, searchQuery])

    const uniqueScenes = useMemo(() => {
        const scenesMap = new Map()
        historyEntries.forEach(entry => {
            if (entry.scenes?.id) {
                scenesMap.set(entry.scenes.id, entry.scenes.structure_nodes?.title || 'Untitled Scene')
            }
        })
        return Array.from(scenesMap.entries()).map(([id, title]) => ({ id, title }))
    }, [historyEntries])

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#fbf9f5]">
            {/* Header / Sub-nav */}
            <div className="px-8 pt-8 pb-4 border-b border-slate-200/50 bg-[#f5f4ef]">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] font-sans tracking-[0.2em] uppercase text-stone-400 font-bold">
                            <History className="w-3.5 h-3.5" />
                            <span>System Recovery</span>
                        </div>
                        <h1 className="text-3xl font-serif italic text-slate-800">Project Timeline & Safety</h1>
                    </div>

                    <div className="flex p-1 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-sm w-fit">
                        {[
                            { id: 'trash', label: 'Trash', icon: Trash2 },
                            { id: 'history', label: 'History', icon: History },
                            { id: 'snapshots', label: 'Snapshots', icon: Layers }
                        ].map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setActiveSection(s.id as RecoverySection)}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer",
                                    activeSection === s.id 
                                        ? "bg-white text-[#546354] shadow-sm ring-1 ring-slate-100" 
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <s.icon className="w-3.5 h-3.5" />
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
                <div className="max-w-5xl mx-auto px-8 py-10">
                    {activeSection === 'trash' ? (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* Trash Filters and Search */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 min-w-0">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 min-w-0 w-full sm:w-auto">
                                    <div className="flex items-center gap-2 p-1 bg-white rounded-full ring-1 ring-slate-100 shadow-sm overflow-x-auto w-full sm:w-auto no-scrollbar">
                                        {[
                                            { id: 'all', label: 'All Items' },
                                            { id: 'structure', label: 'Story Structure' },
                                            { id: 'assets', label: 'Story Assets' },
                                            { id: 'ai', label: 'AI Content' }
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => setTrashFilter(f.id as TrashFilter)}
                                                className={cn(
                                                    "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                                                    trashFilter === f.id 
                                                        ? "bg-[#546354] text-white" 
                                                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                                )}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                    {trashItems.length > 0 && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={handleClearTrash}
                                            disabled={isPermanentlyDeleting}
                                            className="text-[9px] font-bold uppercase tracking-widest text-red-400 hover:text-red-500 hover:bg-red-50 rounded-full h-9 px-4"
                                        >
                                            <Trash2 className="w-3 h-3 mr-2" />
                                            Clear Trash
                                        </Button>
                                    )}
                                </div>

                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                    <input 
                                        type="text"
                                        placeholder="Search trash..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white rounded-xl pl-9 pr-4 py-2 text-xs border-none shadow-sm ring-1 ring-slate-100 focus:ring-[#546354]/20 outline-none transition-all placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            {/* Trash List */}
                            {trashItems.length === 0 ? (
                                <div className="py-24 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="w-24 h-24 bg-white rounded-[30%] flex items-center justify-center mb-8 rotate-3 shadow-sm ring-1 ring-slate-100">
                                        <Trash2 className="w-10 h-10 text-stone-100" />
                                    </div>
                                    <h2 className="text-3xl font-serif italic text-slate-800 mb-4">Trash is clear</h2>
                                    <p className="text-[10px] font-sans tracking-[0.4em] uppercase text-stone-300 mb-6 font-bold">No deleted assets found</p>
                                    <p className="text-slate-500 font-medium leading-relaxed italic text-base max-w-sm">
                                        Deleted scenes, chapters, and assets will appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3 pb-20">
                                    {trashItems.map((item) => (
                                        <div key={item.id} className="group relative bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-md transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-50">
                                                    <item.icon className="w-5 h-5 text-slate-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border bg-slate-50 text-slate-500">
                                                            {item.typeLabel}
                                                        </span>
                                                        <span className="text-[10px] text-slate-300 font-medium flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(item.deleted_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-lg font-serif italic text-slate-800 truncate">{item.title || item.name || 'Untitled'}</h3>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (item.trashType === 'structure') handleRestoreNode(item.id)
                                                            else handleRestoreEntity(item.trashType === 'ai' ? 'ai_responses' : item.typeLabel.toLowerCase() + 's', item.id)
                                                        }}
                                                        disabled={isRestoring === item.id}
                                                        className="rounded-full bg-white border-slate-100 text-[#546354] hover:bg-[#546354] hover:text-white uppercase tracking-widest text-[9px] font-bold h-9 px-6 transition-all"
                                                    >
                                                        {isRestoring === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <RotateCcw className="w-3.5 h-3.5 mr-2" />}
                                                        Restore
                                                    </Button>
                                                    <button 
                                                        onClick={() => setItemToPermanentlyDelete(item)}
                                                        className="p-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-slate-300 rounded-full transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : activeSection === 'history' ? (
                        <div className="space-y-8 animate-in fade-in duration-500">
                             {/* History Filters and Search */}
                             <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 min-w-0">
                                 <div className="flex items-center gap-2 p-1 bg-white rounded-xl ring-1 ring-slate-100 shadow-sm w-full sm:w-auto overflow-hidden">
                                     <Filter className="w-3 h-3 text-slate-400 ml-3 shrink-0" />
                                     <select 
                                         value={selectedSceneId}
                                         onChange={(e) => setSelectedSceneId(e.target.value)}
                                         className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-[#546354] focus:ring-0 outline-none pr-8 cursor-pointer"
                                     >
                                         <option value="all">All Scenes</option>
                                         {uniqueScenes.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                     </select>
                                 </div>
                                 <div className="relative w-full sm:w-64">
                                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                     <input 
                                         type="text"
                                         placeholder="Search history..."
                                         value={searchQuery}
                                         onChange={(e) => setSearchQuery(e.target.value)}
                                         className="w-full bg-white rounded-xl pl-9 pr-4 py-2 text-xs border-none shadow-sm ring-1 ring-slate-100 focus:ring-[#546354]/20 outline-none transition-all placeholder:text-slate-300"
                                     />
                                 </div>
                             </div>

                             {/* History List */}
                             <div className="grid grid-cols-1 gap-3 pb-20">
                                 {filteredHistory.map((version) => (
                                     <div key={version.id} className="group relative bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-md transition-all">
                                         <div className="flex items-center gap-5">
                                             <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-50 text-slate-400">
                                                 <Clock className="w-5 h-5" />
                                             </div>
                                             <div className="flex-1 min-w-0">
                                                 <div className="flex items-center gap-2 mb-1">
                                                     <span className="text-[10px] text-slate-300 font-medium">{new Date(version.created_at).toLocaleString()}</span>
                                                 </div>
                                                 <h3 className="text-lg font-serif italic text-slate-800 truncate">{version.scenes?.structure_nodes?.title || 'Untitled Scene'}</h3>
                                             </div>
                                             <div className="flex items-center gap-2">
                                                 <Button variant="ghost" size="sm" onClick={() => setPreviewVersion(version)} className="rounded-full text-slate-400 hover:text-[#546354] uppercase tracking-widest text-[9px] font-bold h-9 px-4">
                                                     <Eye className="w-3.5 h-3.5 mr-2" /> Preview
                                                 </Button>
                                                 <Button variant="outline" size="sm" onClick={() => handleRestoreVersion(version)} disabled={isRestoring === version.id} className="rounded-full bg-white border-slate-100 text-[#546354] uppercase tracking-widest text-[9px] font-bold h-9 px-6 shadow-sm">
                                                     {isRestoring === version.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <RotateCcw className="w-3.5 h-3.5 mr-2" />}
                                                     Restore
                                                 </Button>
                                                 <button 
                                                     onClick={() => setVersionToDelete(version)}
                                                     className="p-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-slate-300 rounded-full transition-all"
                                                  >
                                                     <Trash2 className="w-4 h-4" />
                                                 </button>
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* Snapshots Header */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-serif italic text-slate-800">Project Snapshots</h2>
                                    <p className="text-xs text-slate-400">Manual restore points for major milestones.</p>
                                </div>
                                <Button
                                    onClick={() => setShowCreateModal(true)}
                                    disabled={snapshots.length >= 5}
                                    className="rounded-xl bg-[#546354] hover:bg-[#435243] text-white h-10 px-6 uppercase tracking-widest text-[10px] font-bold"
                                >
                                    <Layers className="w-3.5 h-3.5 mr-2" />
                                    Create Snapshot
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                                {snapshots.map((snapshot) => {
                                    const meta = snapshot.snapshot_data?.metadata
                                    return (
                                        <div key={snapshot.id} className="group bg-white rounded-[2rem] p-8 border border-slate-100 hover:shadow-xl transition-all flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-[#546354] border border-slate-100 group-hover:bg-white transition-all">
                                                            <Layers className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(snapshot.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setSnapshotToDelete(snapshot)} className="p-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-slate-300 rounded-full transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <h3 className="text-xl font-serif italic text-slate-800 mb-2 truncate">{snapshot.name}</h3>
                                                {snapshot.description && <p className="text-slate-500 text-xs mb-6 line-clamp-2 italic">{snapshot.description}</p>}
                                                {meta && (
                                                    <div className="flex flex-wrap gap-2 mb-8">
                                                        <span className="bg-slate-50 px-3 py-1.5 rounded-full flex items-center gap-2 border border-slate-100 text-[10px] font-bold text-slate-600">
                                                            <BookOpen className="w-3 h-3 text-slate-400" /> {meta.nodeCount} Nodes
                                                        </span>
                                                        <span className="bg-slate-50 px-3 py-1.5 rounded-full flex items-center gap-2 border border-slate-100 text-[10px] font-bold text-slate-600">
                                                            <FileText className="w-3 h-3 text-slate-400" /> {meta.sceneCount} Scenes
                                                        </span>
                                                        <span className="bg-slate-50 px-3 py-1.5 rounded-full flex items-center gap-2 border border-slate-100 text-[10px] font-bold text-slate-600">
                                                            <Users className="w-3 h-3 text-slate-400" /> {meta.characterCount} Chars
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <Button variant="outline" onClick={() => setSnapshotToRestore(snapshot)} className="w-full rounded-2xl bg-white border-slate-100 text-[#546354] hover:bg-[#546354] hover:text-white uppercase tracking-widest text-[10px] font-bold h-12 transition-all">
                                                <RotateCcw className="w-4 h-4 mr-2" /> Restore Project
                                            </Button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {previewVersion && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[85vh]">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
                            <h3 className="text-xl font-serif italic text-slate-800">{previewVersion.scenes?.structure_nodes?.title || 'Untitled Scene'}</h3>
                            <button onClick={() => setPreviewVersion(null)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-12 bg-[#fdfcfb]">
                            <div className="max-w-[80ch] mx-auto prose prose-slate prose-lg font-serif">
                                <div dangerouslySetInnerHTML={{ __html: previewVersion.content || '' }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8">
                        <h3 className="text-xl font-serif italic text-slate-800 mb-6">New Project Snapshot</h3>
                        <div className="space-y-4">
                            <input type="text" placeholder="Snapshot Name" value={snapshotName} onChange={(e) => setSnapshotName(e.target.value)} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm ring-1 ring-slate-100 outline-none" />
                            <textarea placeholder="Description (Optional)" value={snapshotDescription} onChange={(e) => setSnapshotDescription(e.target.value)} rows={3} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm ring-1 ring-slate-100 outline-none resize-none" />
                        </div>
                        <div className="mt-8 flex gap-3">
                            <Button variant="ghost" onClick={() => setShowCreateModal(false)} className="flex-1 uppercase tracking-widest text-[10px] font-bold text-slate-400">Cancel</Button>
                            <Button onClick={handleCreateSnapshot} disabled={!snapshotName.trim() || isCreatingSnapshot} className="flex-2 bg-[#546354] hover:bg-[#435243] text-white uppercase tracking-widest text-[10px] font-bold px-8">
                                {isCreatingSnapshot ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {snapshotToRestore && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-red-900/20 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-10 text-center">
                        <RotateCcw className="w-12 h-12 text-red-500 mx-auto mb-6" />
                        <h3 className="text-2xl font-serif italic text-slate-800 mb-4">Restore Snapshot?</h3>
                        <p className="text-slate-500 italic text-sm mb-8 leading-relaxed">Restore "{snapshotToRestore.name}"? This replaces the active project state (moved to Trash).</p>
                        <div className="flex flex-col gap-3">
                            <Button onClick={handleRestoreSnapshot} disabled={isRestoringSnapshot} className="w-full h-14 bg-red-600 hover:bg-red-700 text-white uppercase tracking-widest font-bold">
                                {isRestoringSnapshot ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Restore'}
                            </Button>
                            <Button variant="ghost" onClick={() => setSnapshotToRestore(null)} className="uppercase tracking-widest text-[10px] font-bold text-slate-400">Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

             {snapshotToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-white rounded-3xl p-8 text-center">
                         <h3 className="text-xl font-serif italic text-slate-800 mb-8">Delete Snapshot?</h3>
                         <div className="grid grid-cols-2 gap-3">
                            <Button variant="ghost" onClick={() => setSnapshotToDelete(null)} className="uppercase tracking-widest text-[10px] font-bold text-slate-400">Cancel</Button>
                            <Button onClick={handleDeleteSnapshot} disabled={isDeletingSnapshot} className="bg-red-500 hover:bg-red-600 text-white uppercase tracking-widest text-[10px] font-bold">
                                {isDeletingSnapshot ? <Loader2 className="animate-spin w-4 h-4" /> : 'Delete Permanently'}
                            </Button>
                         </div>
                    </div>
                </div>
            )}

            {itemToPermanentlyDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-white rounded-3xl p-8 text-center">
                         <h3 className="text-xl font-serif italic text-slate-800 mb-2">Delete Permanently?</h3>
                         <p className="text-xs text-slate-400 mb-8 font-medium italic leading-relaxed">
                            This will permanently remove <span className="text-slate-800 font-bold font-serif">"{itemToPermanentlyDelete.title || itemToPermanentlyDelete.name || 'Untitled'}"</span>. 
                            This action cannot be undone.
                         </p>
                         <div className="grid grid-cols-2 gap-3">
                            <Button variant="ghost" onClick={() => setItemToPermanentlyDelete(null)} className="uppercase tracking-widest text-[10px] font-bold text-slate-400">Cancel</Button>
                            <Button onClick={handlePermanentlyDeleteTrashItem} disabled={isPermanentlyDeleting} className="bg-red-500 hover:bg-red-600 text-white uppercase tracking-widest text-[10px] font-bold">
                                {isPermanentlyDeleting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Delete Forever'}
                            </Button>
                         </div>
                    </div>
                </div>
            )}

            {versionToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-white rounded-3xl p-8 text-center">
                         <h3 className="text-xl font-serif italic text-slate-800 mb-2">Remove Version?</h3>
                         <p className="text-xs text-slate-400 mb-8 font-medium italic leading-relaxed">
                            Permanently delete this version from {new Date(versionToDelete.created_at).toLocaleDateString()}?
                         </p>
                         <div className="grid grid-cols-2 gap-3">
                            <Button variant="ghost" onClick={() => setVersionToDelete(null)} className="uppercase tracking-widest text-[10px] font-bold text-slate-400">Cancel</Button>
                            <Button onClick={handlePermanentlyDeleteHistoryVersion} disabled={isDeletingVersion} className="bg-red-500 hover:bg-red-600 text-white uppercase tracking-widest text-[10px] font-bold">
                                {isDeletingVersion ? <Loader2 className="animate-spin w-4 h-4" /> : 'Delete'}
                            </Button>
                         </div>
                    </div>
                </div>
            )}
        </div>
    )
}
