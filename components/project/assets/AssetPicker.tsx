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
    Check
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Tables } from '@/lib/supabase/types'

type ProjectAsset = Tables<'project_assets'>

interface AssetPickerProps {
    projectId: string
    entityId: string
    entityType: 'character' | 'location' | 'object' | 'idea'
    className?: string
}

export default function AssetPicker({ projectId, entityId, entityType, className }: AssetPickerProps) {
    const [selectedAsset, setSelectedAsset] = useState<ProjectAsset | null>(null)
    const [loading, setLoading] = useState(true)
    const [isSelecting, setIsSelecting] = useState(false)
    const [availableAssets, setAvailableAssets] = useState<ProjectAsset[]>([])
    const [fetchingAssets, setFetchingAssets] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        fetchAttachedAsset()
    }, [entityId])

    async function fetchAttachedAsset() {
        setLoading(true)
        try {
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
        setIsSelecting(true)
        setFetchingAssets(true)
        try {
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
        try {
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

    async function removeAsset() {
        try {
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
        return supabase.storage.from('project-assets').getPublicUrl(path).data.publicUrl
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
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            ) : (
                <button 
                    onClick={openSelector}
                    className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2.5rem] bg-white border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-2 hover:border-[#546354]/40 hover:bg-[#fbf9f5] transition-all group/btn"
                >
                    <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                        <ImageIcon className="w-5 h-5 text-stone-300 group-hover/btn:text-[#546354]/40" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-300">Add Image</span>
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
                                        <div 
                                            key={asset.id}
                                            onClick={() => attachAsset(asset.id)}
                                            className={cn(
                                                "relative aspect-square rounded-2xl overflow-hidden cursor-pointer ring-offset-2 transition-all hover:scale-[1.02]",
                                                selectedAsset?.id === asset.id ? "ring-2 ring-[#546354]" : "ring-1 ring-stone-100 hover:ring-[#546354]/40"
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
                                            <div className="absolute inset-x-0 bottom-0 p-2 bg-black/40 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity">
                                                <p className="text-[9px] text-white truncate text-center">{asset.file_name}</p>
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
