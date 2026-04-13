'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
    Upload, 
    Image as ImageIcon, 
    X, 
    Loader2, 
    Trash2, 
    Search,
    Info,
    Expand,
    Clock
} from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Tables } from '@/lib/supabase/types'

type ProjectAsset = Tables<'project_assets'>

interface AssetManagerProps {
    projectId: string
}

export default function AssetManager({ projectId }: AssetManagerProps) {
    const [assets, setAssets] = useState<ProjectAsset[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    useEffect(() => {
        fetchAssets()
    }, [projectId])

    async function fetchAssets() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('project_assets')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setAssets(data || [])
        } catch (error: any) {
            console.error('Error fetching assets:', error)
            toast.error('Failed to load assets')
        } finally {
            setLoading(false)
        }
    }

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files
        if (!files || files.length === 0) return

        setUploading(true)
        const file = files[0]

        // Validations
        if (!file.type.startsWith('image/')) {
            toast.error('Only image files are allowed')
            setUploading(false)
            return
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error('File size must be less than 5MB')
            setUploading(false)
            return
        }

        try {
            // 1. Get image dimensions
            const dimensions = await getImageDimensions(file)

            // 2. Upload to Storage
            const assetId = crypto.randomUUID()
            const extension = file.name.split('.').pop()
            const storagePath = `projects/${projectId}/images/${assetId}.${extension}`

            const { error: uploadError } = await supabase.storage
                .from('project-assets')
                .upload(storagePath, file)

            if (uploadError) throw uploadError

            // 3. Save to Database
            const { error: dbError } = await supabase
                .from('project_assets')
                .insert({
                    id: assetId,
                    project_id: projectId,
                    storage_path: storagePath,
                    file_name: file.name,
                    mime_type: file.type,
                    file_size: file.size,
                    width: dimensions.width,
                    height: dimensions.height,
                    uploaded_by: (await supabase.auth.getUser()).data.user?.id,
                    asset_type: 'image'
                })

            if (dbError) throw dbError

            toast.success('Asset uploaded successfully')
            fetchAssets()
        } catch (error: any) {
            console.error('Upload failed:', error)
            toast.error('Upload failed: ' + error.message)
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    async function handleDelete(asset: ProjectAsset) {
        try {
            await supabase.storage
                .from('project-assets')
                .remove([asset.storage_path])

            const { error } = await supabase
                .from('project_assets')
                .delete()
                .eq('id', asset.id)

            if (error) throw error

            setAssets(prev => prev.filter(a => a.id !== asset.id))
            toast.success('Asset deleted')
        } catch (error: any) {
            console.error('Delete failed:', error)
            toast.error('Failed to delete asset')
        }
    }

    function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
        return new Promise((resolve) => {
            const img = new Image()
            img.onload = () => {
                resolve({ width: img.width, height: img.height })
            }
            img.src = URL.createObjectURL(file)
        })
    }

    const filteredAssets = assets.filter(a => 
        a.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.alt_text?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const getPublicUrl = (path: string) => {
        return supabase.storage.from('project-assets').getPublicUrl(path).data.publicUrl
    }

    return (
        <TooltipProvider>
            <div className="flex-1 flex flex-col min-h-0 bg-background">
            <div className="p-6 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-serif text-foreground">Project Assets</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage images and illustrations for this project.
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search assets..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-secondary/50 border-none"
                        />
                    </div>
                    
                    <Button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="rounded-xl shadow-lg shadow-primary/20 gap-2"
                    >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploading ? 'Uploading...' : 'Upload Image'}
                    </Button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleUpload}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
                        <p className="text-sm font-medium text-muted-foreground">Loading your gallery...</p>
                    </div>
                ) : filteredAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-secondary/20 rounded-3xl border-2 border-dashed border-border">
                        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                            <ImageIcon className="w-8 h-8 text-primary/40" />
                        </div>
                        <h3 className="font-serif text-lg text-foreground">No assets found</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-xs text-center px-4">
                            {searchQuery ? "No matches found for your search." : "Upload your first image to start building your project's visual library."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredAssets.map((asset) => (
                            <AssetCard 
                                key={asset.id} 
                                asset={asset} 
                                url={getPublicUrl(asset.storage_path)} 
                                onDelete={() => handleDelete(asset)}
                            />
                        ))}
                    </div>
                )}
            </div>
            </div>
        </TooltipProvider>
    )
}

function AssetCard({ asset, url, onDelete }: { asset: ProjectAsset, url: string, onDelete: () => void }) {
    const formattedSize = (asset.file_size / 1024).toFixed(1) + ' KB'
    const [showInfo, setShowInfo] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    async function handleConfirmedDelete() {
        setIsDeleting(true)
        await onDelete()
        setIsDeleting(false)
        setConfirmDelete(false)
    }

    return (
        <div className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
            <div className="aspect-[4/3] relative bg-secondary/50 overflow-hidden">
                <img 
                    src={url} 
                    alt={asset.alt_text || asset.file_name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                
                {/* Overlay - only expand button */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-end p-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="secondary" className="rounded-full w-8 h-8" onClick={() => window.open(url, '_blank')}>
                                <Expand className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Open in new tab</TooltipContent>
                    </Tooltip>
                </div>

                <button 
                    onClick={() => setShowInfo(!showInfo)}
                    className="absolute bottom-2 left-2 p-1.5 rounded-lg bg-black/50 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"
                >
                    <Info className="w-4 h-4" />
                </button>
            </div>

            <div className="p-3">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <h4 className="font-medium text-sm truncate text-foreground cursor-help">
                            {asset.file_name}
                        </h4>
                    </TooltipTrigger>
                    <TooltipContent side="top">{asset.file_name}</TooltipContent>
                </Tooltip>
                <div className="flex items-center justify-between mt-1">
                    <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-tight">
                        <span>{formattedSize}</span>
                        {asset.width && asset.height && (
                            <span className="ml-2">{asset.width} × {asset.height}</span>
                        )}
                    </div>

                    {confirmDelete ? (
                        <div className="flex items-center gap-1.5 animate-in slide-in-from-right-2 duration-200">
                            <span className="text-[10px] text-red-500 font-bold uppercase tracking-tight">Delete?</span>
                            <button
                                onClick={() => setConfirmDelete(false)}
                                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-1.5 py-0.5"
                            >No</button>
                            <button
                                onClick={handleConfirmedDelete}
                                disabled={isDeleting}
                                className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-md transition-colors disabled:opacity-50"
                            >{isDeleting ? '...' : 'Yes'}</button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setConfirmDelete(true)}
                            className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Info Drawer */}
            {showInfo && (
                <div className="absolute inset-x-0 bottom-0 bg-card/95 backdrop-blur-sm border-t border-border p-4 animate-in slide-in-from-bottom duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-primary italic">Metadata</span>
                        <button onClick={() => setShowInfo(false)}><X className="w-3 h-3" /></button>
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between"><span className="text-muted-foreground">Type:</span> <span>{asset.mime_type}</span></div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Path:</span> 
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="truncate max-w-[120px] cursor-help">{asset.storage_path}</span>
                                </TooltipTrigger>
                                <TooltipContent side="left">{asset.storage_path}</TooltipContent>
                            </Tooltip>
                        </div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Date:</span> <span>{asset.created_at ? new Date(asset.created_at).toLocaleDateString() : 'N/A'}</span></div>
                    </div>
                </div>
            )}
        </div>
    )
}
