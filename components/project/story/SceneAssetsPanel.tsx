'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
    ImageIcon, 
    Plus, 
    X, 
    Loader2, 
    Trash2,
    Check,
    Expand,
    Search,
    ChevronRight,
    LayoutGrid,
    ExternalLink,
    Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/providers/ThemeProvider'
import {
    deleteLocalProjectAsset,
    getLocalAssetUrl,
    listLocalProjectAssets,
    listLocalSceneAssets,
    toggleLocalSceneAsset,
} from '@/lib/persistence/local-assets'
import { isLocalProjectId } from '@/lib/persistence/project-mode'

import { Tables } from '@/lib/supabase/types'

type ProjectAsset = Tables<'project_assets'>

interface SceneAsset {
    id: string
    asset_id: string
    asset: Pick<ProjectAsset, 'id' | 'storage_path' | 'file_name' | 'mime_type'>
}

interface SceneAssetsPanelProps {
    projectId: string
    sceneId: string
    onClose?: () => void
    projectType?: 'novel' | 'tv_script'
}

export default function SceneAssetsPanel({ projectId, sceneId, onClose, projectType }: SceneAssetsPanelProps) {
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    const isLocalOnly = isLocalProjectId(projectId)
    const isScreenplay = projectType === 'tv_script'
    const title = isScreenplay ? 'Scene Visual References' : 'Scene Gallery'
    const selectorSubtitle = isScreenplay
        ? 'Select images to attach as scene visual references'
        : 'Select images to attach to this scene gallery'
    const emptyStateMessage = isScreenplay
        ? 'No visual references attached to this scene yet.'
        : 'No gallery images attached to this scene yet.'
    const browseButtonLabel = isScreenplay ? 'Browse Assets' : 'Open Gallery'
    const attachButtonLabel = isScreenplay ? 'Attach Reference' : 'Add to Gallery'
    const [attachedAssets, setAttachedAssets] = useState<SceneAsset[]>([])
    const [loading, setLoading] = useState(true)
    const [isSelecting, setIsSelecting] = useState(false)
    const [availableAssets, setAvailableAssets] = useState<ProjectAsset[]>([])
    const [fetchingAssets, setFetchingAssets] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [confirmingAssetId, setConfirmingAssetId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    
    const supabase = createClient()

    useEffect(() => {
        if (sceneId) {
            fetchAttachedAssets()
        }
    }, [sceneId])

    async function fetchAttachedAssets() {
        setLoading(true)
        try {
            if (isLocalOnly) {
                setAttachedAssets(await listLocalSceneAssets(sceneId))
                return
            }

            const { data, error } = await supabase
                .from('scene_assets')
                .select('id, asset_id, asset:project_assets(*)')
                .eq('scene_id', sceneId)
                .order('sort_order', { ascending: true })

            if (error) throw error
            setAttachedAssets(data || [])
        } catch (error) {
            console.error('Error fetching scene assets:', error)
        } finally {
            setLoading(false)
        }
    }

    async function openSelector() {
        setIsSelecting(true)
        setFetchingAssets(true)
        try {
            if (isLocalOnly) {
                setAvailableAssets(await listLocalProjectAssets(projectId))
                return
            }

            const { data, error } = await supabase
                .from('project_assets')
                .select('*')
                .eq('project_id', projectId)
                .eq('asset_type', 'image')
                .order('created_at', { ascending: false })

            if (error) throw error
            setAvailableAssets(data || [])
        } catch (error) {
            console.error('Error fetching project assets:', error)
            toast.error('Failed to load project assets')
        } finally {
            setFetchingAssets(false)
        }
    }

    async function toggleAsset(assetId: string) {
        const existing = attachedAssets.find(a => a.asset_id === assetId)
        
        try {
            if (isLocalOnly) {
                await toggleLocalSceneAsset(projectId, sceneId, assetId)
                await fetchAttachedAssets()
                return
            }

            if (existing) {
                const { error } = await supabase
                    .from('scene_assets')
                    .delete()
                    .eq('id', existing.id)
                if (error) throw error
                setAttachedAssets(prev => prev.filter(a => a.id !== existing.id))
            } else {
                const { data, error } = await supabase
                    .from('scene_assets')
                    .insert({
                        project_id: projectId,
                        scene_id: sceneId,
                        asset_id: assetId,
                        sort_order: attachedAssets.length
                    })
                    .select('id, asset_id, asset:project_assets(id, storage_path, file_name, mime_type)')
                    .single()
                
                if (error) throw error
                setAttachedAssets(prev => [...prev, data])
            }
        } catch (error) {
            console.error('Error toggling asset:', error)
            toast.error('Operation failed')
        }
    }

    async function handleDeleteProjectAsset(e: React.MouseEvent, asset: ProjectAsset) {
        e.stopPropagation()
        setIsDeleting(true)

        try {
            if (isLocalOnly) {
                await deleteLocalProjectAsset(asset.id)
                setAvailableAssets(prev => prev.filter(a => a.id !== asset.id))
                setAttachedAssets(prev => prev.filter(a => a.asset_id !== asset.id))
                toast.success('Asset deleted')
                return
            }

            await supabase.storage.from('project-assets').remove([asset.storage_path])
            const { error } = await supabase.from('project_assets').delete().eq('id', asset.id)
            if (error) throw error

            setAvailableAssets(prev => prev.filter(a => a.id !== asset.id))
            setAttachedAssets(prev => prev.filter(a => a.asset_id !== asset.id))
            toast.success('Asset deleted')
        } catch (error: any) {
            console.error('Delete failed:', error)
            toast.error('Failed to delete asset')
        } finally {
            setIsDeleting(false)
            setConfirmingAssetId(null)
        }
    }

    const getImageUrl = (path: string) => {
        return isLocalOnly ? getLocalAssetUrl({ storage_path: path }) : supabase.storage.from('project-assets').getPublicUrl(path).data.publicUrl
    }

    const filteredAvailable = availableAssets.filter(a => 
        a.file_name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className={cn(
            "flex flex-col h-full min-h-0 border-l shadow-2xl overflow-hidden",
            isMidnight
                ? "bg-[linear-gradient(180deg,#0f1729_0%,#111c2e_52%,#0e1625_100%)] border-slate-700/60"
                : "bg-[linear-gradient(180deg,#f5f4ef_0%,#fbf9f5_52%,#f8f6f1_100%)] border-[#d8ddcf]"
        )}>
            {/* Header */}
            <div className={cn(
                "px-6 pt-5 pb-4 border-b backdrop-blur-sm flex items-center justify-between",
                isMidnight
                    ? "border-slate-700/60 bg-[linear-gradient(180deg,rgba(15,23,41,0.96)_0%,rgba(17,28,46,0.92)_100%)]"
                    : "border-[#ddd8ce] bg-[linear-gradient(180deg,rgba(251,249,245,0.96)_0%,rgba(245,244,239,0.92)_100%)]"
            )}>
                <div>
                    <div className={cn("flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]", isMidnight ? "text-slate-500" : "text-[#546354]/60")}>
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>{title}</span>
                    </div>
                </div>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className={cn("rounded-full h-8 w-8 transition-colors", isMidnight ? "hover:bg-white/8" : "hover:bg-white/80")}>
                        <X className={cn("w-4 h-4", isMidnight ? "text-slate-500" : "text-slate-400")} />
                    </Button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className={cn("w-6 h-6 animate-spin", isMidnight ? "text-slate-600" : "text-stone-200")} />
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest", isMidnight ? "text-slate-500" : "text-stone-300")}>Syncing Assets...</p>
                    </div>
                ) : attachedAssets.length === 0 ? (
                    <div className={cn(
                        "flex flex-col items-center justify-center py-16 px-6 text-center backdrop-blur-sm rounded-[2.5rem] border shadow-sm",
                        isMidnight
                            ? "bg-slate-800/40 border-slate-700/60"
                            : "bg-white/40 border-[#ddd8ce]"
                    )}>
                        <div className={cn(
                            "w-12 h-12 rounded-2xl border flex items-center justify-center mb-4 shadow-sm",
                            isMidnight ? "bg-slate-700/60 border-slate-600/50" : "bg-white border-[#ddd8ce]/50"
                        )}>
                            <Plus className={cn("w-5 h-5", isMidnight ? "text-slate-500" : "text-stone-300")} />
                        </div>
                        <p className={cn("text-sm font-serif italic mb-6", isMidnight ? "text-slate-400" : "text-slate-400")}>{emptyStateMessage}</p>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className={cn(
                                "rounded-full shadow-sm border-none uppercase text-[10px] font-bold tracking-widest px-6",
                                isMidnight
                                    ? "bg-slate-700/60 text-slate-300 hover:bg-slate-700 ring-0"
                                    : "bg-white ring-1 ring-stone-100"
                            )}
                            onClick={openSelector}
                        >
                            {browseButtonLabel}
                        </Button>

                        {!isScreenplay && (
                            <div className={cn(
                                "mt-8 p-4 rounded-2xl text-left",
                                isMidnight ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50/40 border border-amber-100/50 shadow-[0_2px_10px_rgba(251,191,36,0.05)]"
                            )}>
                                <div className="flex gap-3">
                                    <Sparkles className={cn("w-4 h-4 shrink-0 mt-0.5", isMidnight ? "text-amber-400/60" : "text-amber-500/70")} />
                                    <div className="space-y-1">
                                        <p className={cn("text-[11px] font-serif italic leading-relaxed", isMidnight ? "text-amber-200/80" : "text-amber-900/80")}>
                                            Staging images for your book?
                                        </p>
                                        <p className={cn("text-[10px] leading-relaxed", isMidnight ? "text-amber-300/60" : "text-amber-800/60")}>
                                            To insert an illustration into the actual prose, right-click in the editor and select the <span className="font-bold">Picture</span> icon.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            {attachedAssets.map((item) => (
                                <div key={item.id} className="group relative aspect-video rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
                                    <img 
                                        src={getImageUrl(item.asset.storage_path)} 
                                        alt={item.asset.file_name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full" onClick={() => window.open(getImageUrl(item.asset.storage_path), '_blank')}>
                                            <Expand className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <Button size="icon" variant="destructive" className="w-7 h-7 rounded-full shadow-lg" onClick={() => toggleAsset(item.asset_id)}>
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                                        <p className="text-[10px] text-white font-medium truncate">{item.asset.file_name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button 
                            variant="ghost" 
                            className={cn(
                                "w-full rounded-2xl border-2 border-dashed h-20 flex flex-col gap-1 transition-all group/add shadow-sm",
                                isMidnight
                                    ? "border-slate-600/50 hover:bg-slate-700/40 hover:border-indigo-500/30"
                                    : "border-[#ddd8ce] hover:bg-white/60 hover:border-indigo-200/50"
                            )}
                            onClick={openSelector}
                        >
                            <Plus className={cn("w-4 h-4 transition-colors", isMidnight ? "text-slate-500 group-hover/add:text-indigo-400" : "text-stone-300 group-hover/add:text-indigo-400")} />
                            <span className={cn("text-[10px] uppercase tracking-widest font-bold transition-colors", isMidnight ? "text-slate-500 group-hover/add:text-indigo-400" : "text-stone-300 group-hover/add:text-indigo-500")}>{attachButtonLabel}</span>
                        </Button>

                        {!isScreenplay && (
                            <div className={cn(
                                "mt-6 p-4 rounded-2xl",
                                isMidnight ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50/40 border border-amber-100/50 shadow-[0_2px_10px_rgba(251,191,36,0.05)]"
                            )}>
                                <div className="flex gap-3">
                                    <Sparkles className={cn("w-4 h-4 shrink-0 mt-0.5", isMidnight ? "text-amber-400/60" : "text-amber-500/70")} />
                                    <div className="space-y-1">
                                        <p className={cn("text-[11px] font-serif italic leading-relaxed", isMidnight ? "text-amber-200/80" : "text-amber-900/80")}>
                                            Tip: Direct Insertion
                                        </p>
                                        <p className={cn("text-[10px] leading-relaxed", isMidnight ? "text-amber-300/60" : "text-amber-800/60")}>
                                            Right-click in the editor and select the <span className={cn("font-bold", isMidnight ? "text-amber-300" : "text-amber-700/80")}>Picture</span> icon to insert these gallery images directly into your story text.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Selector Overlay */}
            {isSelecting && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className={cn("absolute inset-0 backdrop-blur-sm", isMidnight ? "bg-black/60" : "bg-stone-900/40")} onClick={() => setIsSelecting(false)} />
                    <div className={cn(
                        "relative w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 border",
                        isMidnight ? "bg-[linear-gradient(180deg,#111c2e_0%,#0f1729_100%)] border-slate-700/60" : "bg-[linear-gradient(180deg,#fcfbf9_0%,#fbf9f5_100%)] border-[#ddd8ce]"
                    )}>
                        <div className={cn(
                            "p-6 border-b flex items-center justify-between",
                            isMidnight ? "border-slate-700/60 bg-slate-800/40" : "border-[#ddd8ce] bg-white/40"
                        )}>
                            <div>
                                <h3 className={cn("text-xl font-serif italic", isMidnight ? "text-slate-100" : "text-slate-800")}>Project Assets</h3>
                                <p className={cn("text-[10px] uppercase tracking-widest font-bold mt-1", isMidnight ? "text-slate-500" : "text-[#546354]/60")}>{selectorSubtitle}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsSelecting(false)} className={cn("rounded-full", isMidnight ? "hover:bg-white/8" : "hover:bg-white/80")}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        
                        <div className={cn("px-6 py-4 border-b", isMidnight ? "border-slate-700/60 bg-slate-800/20" : "bg-white/20 border-[#ddd8ce]")}>
                            <div className="relative">
                                <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isMidnight ? "text-slate-500" : "text-stone-400")} />
                                <input 
                                    className={cn(
                                        "w-full rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 transition-all shadow-sm",
                                        isMidnight
                                            ? "bg-slate-700/60 border border-slate-600/40 text-slate-200 placeholder:text-slate-500 focus:ring-slate-500/30"
                                            : "bg-white/80 border border-[#ddd8ce]/50 focus:ring-indigo-100"
                                    )}
                                    placeholder="Find asset..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 scroll-smooth grid grid-cols-2 gap-4">
                            {fetchingAssets ? (
                                <div className="col-span-2 py-20 flex justify-center"><Loader2 className={cn("w-6 h-6 animate-spin", isMidnight ? "text-slate-600" : "text-stone-200")} /></div>
                            ) : filteredAvailable.length === 0 ? (
                                <div className={cn("col-span-2 py-10 text-center italic text-sm", isMidnight ? "text-slate-500" : "text-stone-400")}>No assets found.</div>
                            ) : filteredAvailable.map((asset) => {
                                const isAttached = attachedAssets.some(a => a.asset_id === asset.id)
                                return (
                                    <div key={asset.id} className="flex flex-col group/asset">
                                        <div 
                                            onClick={() => toggleAsset(asset.id)}
                                            className={cn(
                                                "relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all",
                                                isAttached
                                                    ? "ring-2 ring-indigo-400 scale-[0.98] shadow-md"
                                                    : cn(isMidnight
                                                        ? "ring-1 ring-slate-600/50 hover:ring-indigo-400/50 bg-slate-800/40 shadow-sm"
                                                        : "ring-1 ring-[#ddd8ce]/50 hover:ring-indigo-200 bg-white/40 shadow-sm"
                                                    )
                                            )}
                                        >
                                            <img src={getImageUrl(asset.storage_path)} className="w-full h-full object-cover" />
                                            {isAttached && (
                                                <div className={cn("absolute inset-0 flex items-center justify-center animate-in fade-in duration-200", isMidnight ? "bg-indigo-500/30" : "bg-[#546354]/40")}>
                                                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shadow-lg", isMidnight ? "bg-slate-700" : "bg-white")}>
                                                        <Check className={cn("w-4 h-4", isMidnight ? "text-slate-200" : "text-[#546354]")} />
                                                    </div>
                                                </div>
                                            )}
                                            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-100 md:opacity-0 md:group-hover/asset:opacity-100 transition-opacity">
                                                <p className="text-[9px] text-white truncate text-center font-medium">{asset.file_name}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-2 px-1 min-h-[24px]">
                                            {confirmingAssetId === asset.id ? (
                                                <div className="flex items-center gap-2 animate-in slide-in-from-right-1 duration-200">
                                                    <span className="text-[10px] text-red-500 font-bold uppercase tracking-tight">Delete?</span>
                                                    <div className="flex items-center gap-1 ml-auto">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setConfirmingAssetId(null) }}
                                                            className={cn("text-[10px] font-bold px-2 py-1", isMidnight ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")}
                                                        >No</button>
                                                        <button 
                                                            onClick={(e) => handleDeleteProjectAsset(e, asset)}
                                                            disabled={isDeleting}
                                                            className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
                                                        >{isDeleting ? '...' : 'Yes'}</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between opacity-100 md:opacity-0 md:group-hover/asset:opacity-100 transition-opacity duration-300">
                                                    <span className={cn("text-[9px] truncate max-w-[50%] font-medium uppercase tracking-tight", isMidnight ? "text-slate-500" : "text-slate-400")}>{asset.file_name}</span>
                                                    <div className="flex items-center gap-1">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); window.open(getImageUrl(asset.storage_path), '_blank') }}
                                                            className={cn("transition-colors p-1", isMidnight ? "text-slate-600 hover:text-indigo-400" : "text-slate-300 hover:text-indigo-500")}
                                                            title="Open in new tab"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setConfirmingAssetId(asset.id) }}
                                                            className={cn("transition-colors p-1", isMidnight ? "text-slate-600 hover:text-red-400" : "text-slate-300 hover:text-red-500")}
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
