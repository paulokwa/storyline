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
    ExternalLink,
    HardDrive,
} from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getUserSafely } from '@/lib/supabase/client-auth'
import {
    createLocalProjectAsset,
    deleteLocalProjectAsset,
    getLocalAssetUrl,
    listLocalProjectAssets,
} from '@/lib/persistence/local-assets'
import { isLocalProjectId } from '@/lib/persistence/project-mode'

import { Tables } from '@/lib/supabase/types'

type ProjectAsset = Tables<'project_assets'>
type StorageQuotaCheckResult = {
    within_quota: boolean
    current_usage_bytes: number
    effective_quota_bytes: number
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error)
}

function formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function parseStorageQuotaCheckResult(value: unknown): StorageQuotaCheckResult | null {
    const candidate = Array.isArray(value) ? value[0] : value
    if (!candidate || typeof candidate !== 'object') return null

    const record = candidate as Record<string, unknown>
    if (
        typeof record.within_quota !== 'boolean' ||
        typeof record.current_usage_bytes !== 'number' ||
        typeof record.effective_quota_bytes !== 'number'
    ) {
        return null
    }

    return {
        within_quota: record.within_quota,
        current_usage_bytes: record.current_usage_bytes,
        effective_quota_bytes: record.effective_quota_bytes,
    }
}

interface AssetManagerProps {
    projectId: string
}

export default function AssetManager({ projectId }: AssetManagerProps) {
    const isLocalOnly = isLocalProjectId(projectId)
    const [assets, setAssets] = useState<ProjectAsset[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [quotaInfo, setQuotaInfo] = useState<{ current_usage_bytes: number; effective_quota_bytes: number } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    useEffect(() => {
        fetchAssets()
        fetchQuota()
    }, [projectId])

    async function fetchAssets() {
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
                .order('created_at', { ascending: false })

            if (error) throw error
            setAssets(data || [])
        } catch (error: unknown) {
            console.error('Error fetching assets:', error)
            toast.error('Failed to load assets')
        } finally {
            setLoading(false)
        }
    }

    async function fetchQuota() {
        if (isLocalOnly) return
        try {
            const { user } = await getUserSafely(supabase)
            if (!user) return
            const { data } = await supabase.rpc('check_storage_quota', {
                p_user_id: user.id,
                p_incoming_file_size: 0,
            })
            const result = parseStorageQuotaCheckResult(data)
            if (result) {
                setQuotaInfo({
                    current_usage_bytes: result.current_usage_bytes,
                    effective_quota_bytes: result.effective_quota_bytes,
                })
            }
        } catch {
            // fail quietly — quota bar is informational only
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

        if (file.size > 5 * 1024 * 1024) { // 5MB individual file limit
            toast.error('File size must be less than 5MB')
            setUploading(false)
            return
        }

        try {
            if (isLocalOnly) {
                const asset = await createLocalProjectAsset(projectId, file, null)
                setAssets(prev => [asset, ...prev])
                toast.success('Asset saved locally')
                return
            }

            // 0. Quota Check (Phase 5.5)
            const { user } = await getUserSafely(supabase)
            if (!user) throw new Error('Not authenticated')

            const { data: quota, error: quotaError } = await supabase.rpc('check_storage_quota', {
                p_user_id: user.id,
                p_incoming_file_size: file.size
            })

            if (quotaError) throw quotaError
            const storageQuota = parseStorageQuotaCheckResult(quota)
            if (!storageQuota) throw new Error('Unable to verify storage quota')

            if (!storageQuota.within_quota) {
                const usedMb = (storageQuota.current_usage_bytes / (1024 * 1024)).toFixed(1)
                const quotaMb = (storageQuota.effective_quota_bytes / (1024 * 1024)).toFixed(1)
                
                toast.error('Storage quota exceeded', {
                    description: `You are using ${usedMb}MB of your ${quotaMb}MB limit. This file requires more space than you have left.`
                })
                setUploading(false)
                return
            }

            // 1. Get image dimensions
            const dimensions = await getImageDimensions(file)

            const formData = new FormData()
            formData.append('projectId', projectId)
            formData.append('file', file)
            formData.append('width', String(dimensions.width))
            formData.append('height', String(dimensions.height))

            const uploadResponse = await fetch('/api/project-assets/upload', {
                method: 'POST',
                body: formData,
            })

            if (!uploadResponse.ok) {
                const body = await uploadResponse.json().catch(() => ({})) as { error?: string }
                throw new Error(body.error ?? `Upload failed with status ${uploadResponse.status}`)
            }

            toast.success('Asset uploaded successfully')
            fetchAssets()
            fetchQuota()
        } catch (error: unknown) {
            console.error('Upload failed:', error)
            toast.error('Upload failed: ' + getErrorMessage(error))
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    async function handleDelete(asset: ProjectAsset) {
        try {
            if (isLocalOnly) {
                await deleteLocalProjectAsset(asset.id)
                setAssets(prev => prev.filter(a => a.id !== asset.id))
                toast.success('Asset deleted')
                return
            }

            await supabase.storage
                .from('project-assets')
                .remove([asset.storage_path])

            const { error } = await supabase
                .from('project_assets')
                .delete()
                .eq('id', asset.id)

            if (error) throw error

            setAssets(prev => prev.filter(a => a.id !== asset.id))
            fetchQuota()
            toast.success('Asset deleted')
        } catch (error: unknown) {
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
        return isLocalOnly ? getLocalAssetUrl({ storage_path: path }) : supabase.storage.from('project-assets').getPublicUrl(path).data.publicUrl
    }

    const quotaPct = quotaInfo
        ? Math.min(100, Math.round((quotaInfo.current_usage_bytes / quotaInfo.effective_quota_bytes) * 100))
        : 0
    const quotaIsCritical = quotaPct >= 90
    const quotaIsWarning = quotaPct >= 80 && quotaPct < 90

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

            {!isLocalOnly && quotaInfo && (
                <div className={cn(
                    'px-6 py-3 border-b border-border',
                    quotaIsCritical ? 'bg-red-50/60' : quotaIsWarning ? 'bg-amber-50/60' : 'bg-slate-50/50'
                )}>
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                            <HardDrive className={cn(
                                'w-3 h-3',
                                quotaIsCritical ? 'text-red-500' : quotaIsWarning ? 'text-amber-500' : 'text-muted-foreground'
                            )} />
                            <span className={cn(
                                'text-xs font-medium',
                                quotaIsCritical ? 'text-red-600' : quotaIsWarning ? 'text-amber-600' : 'text-muted-foreground'
                            )}>
                                {quotaIsCritical ? 'Storage almost full' : quotaIsWarning ? 'Nearing storage limit' : 'Storage'}
                            </span>
                        </div>
                        <span className={cn(
                            'text-xs tabular-nums',
                            quotaIsCritical ? 'text-red-500' : quotaIsWarning ? 'text-amber-500' : 'text-muted-foreground'
                        )}>
                            {formatBytes(quotaInfo.current_usage_bytes)} of {formatBytes(quotaInfo.effective_quota_bytes)}
                        </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className={cn(
                                'h-full rounded-full transition-all duration-500',
                                quotaIsCritical ? 'bg-red-500' : quotaIsWarning ? 'bg-amber-500' : 'bg-primary/50'
                            )}
                            style={{ width: `${quotaPct}%` }}
                        />
                    </div>
                </div>
            )}

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
                
                <button 
                    onClick={() => setShowInfo(!showInfo)}
                    className="absolute bottom-2 left-2 p-1.5 rounded-lg bg-black/50 text-white backdrop-blur-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
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
                    <div className="flex items-center gap-1">
                        {!confirmDelete && (
                            <button
                                onClick={() => window.open(url, '_blank')}
                                className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 p-1 rounded-lg text-slate-300 hover:text-indigo-500 hover:bg-indigo-50"
                                title="Open in new tab"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </button>
                        )}
                        {confirmDelete ? (
                            <div className="flex items-center gap-1 animate-in slide-in-from-right-1 duration-200">
                                <span className="text-[10px] text-red-500 font-bold uppercase tracking-tight">Delete?</span>
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => setConfirmDelete(false)}
                                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1"
                                    >No</button>
                                    <button 
                                        onClick={handleConfirmedDelete}
                                        disabled={isDeleting}
                                        className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
                                    >{isDeleting ? '...' : 'Yes'}</button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setConfirmDelete(true)}
                                className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
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
