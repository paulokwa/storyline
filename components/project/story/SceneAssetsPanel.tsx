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
        <div className="flex flex-col h-full min-h-0 bg-[linear-gradient(180deg,#f5f4ef_0%,#fbf9f5_52%,#f8f6f1_100%)] border-l border-[#d8ddcf] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-[#ddd8ce] bg-[linear-gradient(180deg,rgba(251,249,245,0.96)_0%,rgba(245,244,239,0.92)_100%)] backdrop-blur-sm flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#546354]/60">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>{title}</span>
                    </div>
                </div>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 hover:bg-white/80 transition-colors">
                        <X className="w-4 h-4 text-[#a8a9a2]" />
                    </Button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-stone-200" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-300">Syncing Assets...</p>
                    </div>
                ) : attachedAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white/40 backdrop-blur-sm rounded-[2.5rem] border border-[#ddd8ce] shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-[#ddd8ce]/50 flex items-center justify-center mb-4 shadow-sm">
                            <Plus className="w-5 h-5 text-stone-300" />
                        </div>
                        <p className="text-sm font-serif italic text-[#a8a9a2] mb-6">{emptyStateMessage}</p>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-full bg-white shadow-sm ring-1 ring-stone-100 border-none uppercase text-[10px] font-bold tracking-widest px-6"
                            onClick={openSelector}
                        >
                            {browseButtonLabel}
                        </Button>

                        {!isScreenplay && (
                            <div className="mt-8 p-4 bg-amber-50/40 border border-amber-100/50 rounded-2xl text-left shadow-[0_2px_10px_rgba(251,191,36,0.05)]">
                                <div className="flex gap-3">
                                    <Sparkles className="w-4 h-4 text-amber-500/70 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-serif italic text-amber-900/80 leading-relaxed">
                                            Staging images for your book?
                                        </p>
                                        <p className="text-[10px] text-amber-800/60 leading-relaxed">
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
                            className="w-full rounded-2xl border-2 border-dashed border-[#ddd8ce] h-20 hover:bg-white/60 hover:border-indigo-200/50 flex flex-col gap-1 transition-all group/add shadow-sm"
                            onClick={openSelector}
                        >
                            <Plus className="w-4 h-4 text-stone-300 group-hover/add:text-indigo-400 transition-colors" />
                            <span className="text-[10px] uppercase tracking-widest font-bold text-stone-300 group-hover/add:text-indigo-500 transition-colors">{attachButtonLabel}</span>
                        </Button>

                        {!isScreenplay && (
                            <div className="mt-6 p-4 bg-amber-50/40 border border-amber-100/50 rounded-2xl shadow-[0_2px_10px_rgba(251,191,36,0.05)]">
                                <div className="flex gap-3">
                                    <Sparkles className="w-4 h-4 text-amber-500/70 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-serif italic text-amber-900/80 leading-relaxed">
                                            Tip: Direct Insertion
                                        </p>
                                        <p className="text-[10px] text-amber-800/60 leading-relaxed">
                                            Right-click in the editor and select the <span className="font-bold text-amber-700/80">Picture</span> icon to insert these gallery images directly into your story text.
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
                    <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setIsSelecting(false)} />
                    <div className="relative w-full max-w-xl bg-[linear-gradient(180deg,#fcfbf9_0%,#fbf9f5_100%)] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 border border-[#ddd8ce]">
                        <div className="p-6 border-b border-[#ddd8ce] bg-white/40 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-serif italic text-[#31332f]">Project Assets</h3>
                                <p className="text-[10px] uppercase tracking-widest text-[#546354]/60 font-bold mt-1">{selectorSubtitle}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsSelecting(false)} className="rounded-full hover:bg-white/80">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        
                        <div className="px-6 py-4 bg-white/20 border-b border-[#ddd8ce]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                <input 
                                    className="w-full bg-white/80 border border-[#ddd8ce]/50 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                                    placeholder="Find asset..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 scroll-smooth grid grid-cols-2 gap-4">
                            {fetchingAssets ? (
                                <div className="col-span-2 py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-stone-200" /></div>
                            ) : filteredAvailable.length === 0 ? (
                                <div className="col-span-2 py-10 text-center italic text-stone-400 text-sm">No assets found.</div>
                            ) : filteredAvailable.map((asset) => {
                                const isAttached = attachedAssets.some(a => a.asset_id === asset.id)
                                return (
                                    <div key={asset.id} className="flex flex-col group/asset">
                                        <div 
                                            onClick={() => toggleAsset(asset.id)}
                                            className={cn(
                                                "relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all",
                                                isAttached ? "ring-2 ring-indigo-400 scale-[0.98] shadow-md" : "ring-1 ring-[#ddd8ce]/50 hover:ring-indigo-200 bg-white/40 shadow-sm"
                                            )}
                                        >
                                            <img src={getImageUrl(asset.storage_path)} className="w-full h-full object-cover" />
                                            {isAttached && (
                                                <div className="absolute inset-0 bg-[#546354]/40 flex items-center justify-center animate-in fade-in duration-200">
                                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg">
                                                        <Check className="w-4 h-4 text-[#546354]" />
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
                                                            className="text-[10px] font-bold text-[#a8a9a2] hover:text-[#5e605b] px-2 py-1"
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
                                                    <span className="text-[9px] text-[#a8a9a2] truncate max-w-[50%] font-medium uppercase tracking-tight">{asset.file_name}</span>
                                                    <div className="flex items-center gap-1">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); window.open(getImageUrl(asset.storage_path), '_blank') }}
                                                            className="text-[#ccc9c0] hover:text-indigo-500 transition-colors p-1"
                                                            title="Open in new tab"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setConfirmingAssetId(asset.id) }}
                                                            className="text-[#ccc9c0] hover:text-red-500 transition-colors p-1"
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
