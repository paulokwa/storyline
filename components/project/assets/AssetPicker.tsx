'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
    Image as ImageIcon, 
    Plus, 
    X, 
    Loader2, 
    Trash2,
    Check,
    ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
    deleteLocalProjectAsset,
    getLocalAssetUrl,
    getLocalPrimaryEntityAsset,
    listLocalProjectAssets,
    removeLocalPrimaryEntityAsset,
    setLocalPrimaryEntityAsset,
} from '@/lib/persistence/local-assets'
import { isLocalProjectId } from '@/lib/persistence/project-mode'

import { Tables } from '@/lib/supabase/types'

type ProjectAsset = Tables<'project_assets'>

interface AssetPickerProps {
    projectId: string
    entityId: string
    entityType: 'character' | 'location' | 'object' | 'idea'
    className?: string
    disabled?: boolean
}

export default function AssetPicker({ projectId, entityId, entityType, className, disabled = false }: AssetPickerProps) {
    const isLocalOnly = isLocalProjectId(projectId)
    const [selectedAsset, setSelectedAsset] = useState<ProjectAsset | null>(null)
    const [loading, setLoading] = useState(true)
    const [isSelecting, setIsSelecting] = useState(false)
    const [availableAssets, setAvailableAssets] = useState<ProjectAsset[]>([])
    const [fetchingAssets, setFetchingAssets] = useState(false)
    const [confirmingAssetId, setConfirmingAssetId] = useState<string | null>(null)
    const [isDeletingAsset, setIsDeletingAsset] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        fetchAttachedAsset()
    }, [entityId])

    async function fetchAttachedAsset() {
        setLoading(true)
        try {
            if (isLocalOnly) {
                setSelectedAsset(await getLocalPrimaryEntityAsset(entityId))
                return
            }

            const { data, error } = await supabase
                .from('entity_assets')
                .select('asset:project_assets(*)')
                .eq('entity_id', entityId)
                .eq('is_primary', true)
                .maybeSingle()

            if (error) throw error
            setSelectedAsset(data?.asset ? (data.asset as any) : null)
        } catch (error) {
            console.error('Error fetching attached asset:', error)
        } finally {
            setLoading(false)
        }
    }

    async function openSelector() {
        if (disabled) return
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

    async function attachAsset(assetId: string) {
        if (disabled) return
        try {
            if (isLocalOnly) {
                await setLocalPrimaryEntityAsset(projectId, entityId, entityType, assetId)
                setIsSelecting(false)
                await fetchAttachedAsset()
                toast.success('Asset linked')
                return
            }

            // 1. Unset any existing primary
            await supabase
                .from('entity_assets')
                .update({ is_primary: false })
                .eq('entity_id', entityId)

            // 2. Upsert the new primary
            const { error } = await supabase
                .from('entity_assets')
                .upsert({
                    project_id: projectId,
                    entity_id: entityId,
                    entity_type: entityType,
                    asset_id: assetId,
                    is_primary: true
                }, { onConflict: 'entity_id, asset_id' })

            if (error) throw error

            setIsSelecting(false)
            fetchAttachedAsset()
            toast.success('Asset linked')
        } catch (error) {
            console.error('Error linking asset:', error)
            toast.error('Failed to link asset')
        }
    }

    async function handleDeleteProjectAsset(e: React.MouseEvent, asset: ProjectAsset) {
        if (disabled) return
        e.stopPropagation()
        setIsDeletingAsset(true)

        try {
            if (isLocalOnly) {
                await deleteLocalProjectAsset(asset.id)
                setAvailableAssets(prev => prev.filter(a => a.id !== asset.id))
                if (selectedAsset?.id === asset.id) setSelectedAsset(null)
                toast.success('Asset deleted')
                return
            }

            await supabase.storage.from('project-assets').remove([asset.storage_path])
            const { error } = await supabase.from('project_assets').delete().eq('id', asset.id)
            if (error) throw error

            setAvailableAssets(prev => prev.filter(a => a.id !== asset.id))
            if (selectedAsset?.id === asset.id) setSelectedAsset(null)
            toast.success('Asset deleted')
        } catch (error: any) {
            console.error('Delete failed:', error)
            toast.error('Failed to delete asset')
        } finally {
            setIsDeletingAsset(false)
            setConfirmingAssetId(null)
        }
    }

    async function removeAsset() {
        if (disabled) return
        try {
            if (isLocalOnly) {
                await removeLocalPrimaryEntityAsset(entityId)
                setSelectedAsset(null)
                toast.success('Asset unlinked')
                return
            }

            const { error } = await supabase
                .from('entity_assets')
                .delete()
                .eq('entity_id', entityId)
                .eq('is_primary', true)

            if (error) throw error
            setSelectedAsset(null)
            toast.success('Asset unlinked')
        } catch (error) {
            console.error('Error unlinking asset:', error)
            toast.error('Failed to unlink asset')
        }
    }

    const getImageUrl = (path: string) => {
        return isLocalOnly ? getLocalAssetUrl({ storage_path: path }) : supabase.storage.from('project-assets').getPublicUrl(path).data.publicUrl
    }

    if (loading) {
        return <div className="w-20 h-20 rounded-2xl bg-stone-100 animate-pulse" />
    }

    return (
        <div className={cn("relative group", className)}>
            {selectedAsset ? (
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-[2rem] overflow-hidden shadow-xl ring-4 ring-white transition-transform hover:scale-[1.02]">
                    <img 
                        src={getImageUrl(selectedAsset.storage_path)} 
                        alt={selectedAsset.file_name}
                        className="w-full h-full object-cover"
                    />
                    {!disabled && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button 
                                variant="secondary" 
                                size="icon" 
                                className="w-8 h-8 rounded-full"
                                onClick={openSelector}
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                            <Button 
                                variant="destructive" 
                                size="icon" 
                                className="w-8 h-8 rounded-full"
                                onClick={removeAsset}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <button 
                    onClick={openSelector}
                    disabled={disabled}
                    className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2.5rem] bg-white border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-2 hover:border-[#546354]/40 hover:bg-[#fbf9f5] transition-all group/btn"
                >
                    <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                        <ImageIcon className="w-5 h-5 text-stone-300 group-hover/btn:text-[#546354]/40" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-300">
                        {disabled ? 'No Image' : 'Add Image'}
                    </span>
                </button>
            )}

            {/* Selection Modal/Overlay */}
            {isSelecting && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setIsSelecting(false)} />
                    <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-[#fbf9f5]">
                            <div>
                                <h3 className="text-xl font-serif italic text-slate-800">Select Project Asset</h3>
                                <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mt-1">Choose an image for this {entityType}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsSelecting(false)} className="rounded-full">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                            {fetchingAssets ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
                                </div>
                            ) : availableAssets.length === 0 ? (
                                <div className="text-center py-20">
                                    <p className="text-sm text-stone-400 font-serif italic">No images in your project library yet.</p>
                                    <Button 
                                        variant="outline" 
                                        className="mt-4 rounded-full"
                                        onClick={() => window.location.href = `/project/${projectId}/assets`}
                                    >
                                        Go to Asset Manager
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {availableAssets.map((asset) => (
                                        <div key={asset.id} className="flex flex-col group/asset">
                                            <div 
                                                onClick={() => attachAsset(asset.id)}
                                                className={cn(
                                                    "relative aspect-square rounded-xl overflow-hidden cursor-pointer ring-offset-2 transition-all",
                                                    selectedAsset?.id === asset.id ? "ring-2 ring-[#546354]" : "ring-1 ring-stone-100 hover:ring-stone-200"
                                                )}
                                            >
                                                <img 
                                                    src={getImageUrl(asset.storage_path)} 
                                                    alt={asset.file_name}
                                                    className="w-full h-full object-cover"
                                                />
                                                {selectedAsset?.id === asset.id && (
                                                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#546354] flex items-center justify-center">
                                                        <Check className="w-3.5 h-3.5 text-white" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/asset:opacity-100 transition-opacity">
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
                                                                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-1 py-1"
                                                            >No</button>
                                                            <button 
                                                                onClick={(e) => handleDeleteProjectAsset(e, asset)}
                                                                disabled={isDeletingAsset}
                                                                className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                                                            >{isDeletingAsset ? '...' : 'Yes'}</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between opacity-100 md:opacity-0 md:group-hover/asset:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] text-slate-400 truncate max-w-[50%] font-medium uppercase tracking-tight">{asset.file_name}</span>
                                                        <div className="flex items-center gap-1">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); window.open(supabase.storage.from('project-assets').getPublicUrl(asset.storage_path).data.publicUrl, '_blank') }}
                                                                className="text-slate-300 hover:text-indigo-500 transition-colors p-1"
                                                                title="Open in new tab"
                                                            >
                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setConfirmingAssetId(asset.id) }}
                                                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
