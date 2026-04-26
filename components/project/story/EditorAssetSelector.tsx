'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
    X, 
    Loader2, 
    Image as ImageIcon
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getLocalAssetUrl, listLocalProjectAssets } from '@/lib/persistence/local-assets'
import { isLocalProjectId } from '@/lib/persistence/project-mode'

import { Tables } from '@/lib/supabase/types'

type ProjectAsset = Tables<'project_assets'>

interface EditorAssetSelectorProps {
    projectId: string
    isOpen: boolean
    onClose: () => void
    onSelect: (asset: { id: string, url: string, alt: string }) => void
    inlineImagesDisabled?: boolean
    disabledMessage?: string
}

export default function EditorAssetSelector({
    projectId,
    isOpen,
    onClose,
    onSelect,
    inlineImagesDisabled = false,
    disabledMessage = 'Inline image insertion is disabled here.',
}: EditorAssetSelectorProps) {
    const isLocalOnly = isLocalProjectId(projectId)
    const [assets, setAssets] = useState<ProjectAsset[]>([])
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        if (isOpen) {
            fetchAssets()
        }
    }, [isOpen, projectId])

    const fetchAssets = async () => {
        setLoading(true)
        try {
            if (isLocalOnly) {
                setAssets(await listLocalProjectAssets(projectId))
                return
            }

            const { data, error } = await supabase
                .from('project_assets')
                .select('*')
                .eq('project_id', projectId)
                .eq('asset_type', 'image')
                .order('created_at', { ascending: false })

            if (error) throw error
            setAssets(data || [])
        } catch (error) {
            console.error('Error fetching assets:', error)
            toast.error('Failed to load assets')
        } finally {
            setLoading(false)
        }
    }

    const getImageUrl = (path: string) => {
        return isLocalOnly ? getLocalAssetUrl({ storage_path: path }) : supabase.storage.from('project-assets').getPublicUrl(path).data.publicUrl
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-[#fbf9f5]">
                    <div>
                        <h3 className="text-2xl font-serif italic text-slate-800">Insert Illustration</h3>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">Select an image from your project library</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white">
                        <X className="w-5 h-5 text-slate-400" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-emerald-500/20" />
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Summoning library...</p>
                        </div>
                    ) : assets.length === 0 ? (
                        <div className="text-center py-32">
                            <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mx-auto mb-6">
                                <ImageIcon className="w-10 h-10 text-slate-200" />
                            </div>
                            <h4 className="text-xl font-serif text-slate-400 mb-2">Your library is empty</h4>
                            <p className="text-sm text-slate-400 max-w-xs mx-auto mb-8">Upload images to your project's Asset Manager to use them here.</p>
                            <Button 
                                variant="outline" 
                                className="rounded-2xl px-6 border-slate-200 text-slate-500 hover:text-slate-900"
                                onClick={() => window.open(`/project/${projectId}/assets`, '_blank')}
                            >
                                Open Asset Manager
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                            {assets.map((asset) => (
                                <div 
                                    key={asset.id}
                                    onClick={() => {
                                        if (inlineImagesDisabled) {
                                            toast.error(disabledMessage)
                                            onClose()
                                            return
                                        }

                                        onSelect({
                                            id: asset.id,
                                            url: getImageUrl(asset.storage_path),
                                            alt: asset.alt_text || asset.file_name
                                        })
                                        onClose()
                                    }}
                                    className="group relative cursor-pointer"
                                >
                                    <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-slate-50 ring-1 ring-slate-100 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-emerald-900/10 group-hover:-translate-y-1 group-hover:ring-emerald-500/30">
                                        <img 
                                            src={getImageUrl(asset.storage_path)} 
                                            alt={asset.file_name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-end p-4">
                                            <p className="text-[10px] text-white font-bold uppercase tracking-widest truncate w-full">
                                                {asset.file_name}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 px-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-emerald-600 transition-colors truncate">
                                            {asset.file_name}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-[#fbf9f5] flex justify-end">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mr-auto flex items-center">
                        <ImageIcon className="w-3 h-3 mr-2" />
                        Tip: You can reorder images after inserting
                    </p>
                    <Button variant="ghost" onClick={onClose} className="rounded-xl px-6 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    )
}
