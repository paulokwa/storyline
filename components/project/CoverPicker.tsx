'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { THEME_COVERS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Upload, Sparkles, Loader2, Link as LinkIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { uploadProjectCover } from '@/lib/supabase/project-covers'

interface CoverPickerProps {
    value: string
    onChange: (url: string) => void
    deferUpload?: boolean
    onPendingFileChange?: (file: File | null) => void
}

export default function CoverPicker({
    value,
    onChange,
    deferUpload = false,
    onPendingFileChange,
}: CoverPickerProps) {
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const localPreviewUrlRef = useRef<string | null>(null)
    const supabase = createClient()

    function clearPendingUpload() {
        onPendingFileChange?.(null)

        if (localPreviewUrlRef.current) {
            URL.revokeObjectURL(localPreviewUrlRef.current)
            localPreviewUrlRef.current = null
        }
    }

    useEffect(() => {
        return () => {
            if (localPreviewUrlRef.current) {
                URL.revokeObjectURL(localPreviewUrlRef.current)
            }
        }
    }, [])

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error("Please upload an image file.")
            e.target.value = ''
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("File is too large. Maximum size is 5MB.")
            e.target.value = ''
            return
        }

        try {
            setUploading(true)
            
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                toast.error("You must be logged in to upload.")
                e.target.value = ''
                return
            }

            if (deferUpload) {
                clearPendingUpload()
                const previewUrl = URL.createObjectURL(file)
                localPreviewUrlRef.current = previewUrl
                onPendingFileChange?.(file)
                onChange(previewUrl)
                toast.success("Cover selected. It will upload when you create the project.")
                return
            }

            const { publicUrl } = await uploadProjectCover(supabase, user.id, file)

            onChange(publicUrl)
            toast.success("Cover uploaded successfully!")
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to upload image."
            console.error("Upload error:", error)
            toast.error(message)
        } finally {
            setUploading(false)
            e.target.value = ''
        }
    }

    const isThemeCover = THEME_COVERS.some(c => c.url === value)
    const [customUrl, setCustomUrl] = useState(!isThemeCover && value ? value : '')

    return (
        <div className="space-y-8 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Upload Button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className={cn(
                        "group relative aspect-[3/4] rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-2",
                        "bg-stone-50/50 border-stone-200 hover:border-primary/40 hover:bg-primary/5 text-slate-400 hover:text-primary",
                        uploading && "opacity-50 cursor-wait"
                    )}
                >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileUpload}
                    />
                    {uploading ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                        <>
                            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Upload className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest">Upload File</span>
                        </>
                    )}
                </button>

                {/* No Cover Option */}
                <button
                    onClick={() => {
                        clearPendingUpload()
                        onChange('')
                        setCustomUrl('')
                    }}
                    className={cn(
                        "group relative aspect-[3/4] rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-2",
                        !value 
                            ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10" 
                            : "border-stone-100 bg-stone-50/30 text-slate-400 hover:border-stone-200 hover:bg-stone-50"
                    )}
                >
                    <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110",
                        !value ? "bg-primary text-white" : "bg-white shadow-sm"
                    )}>
                        <X className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">No Cover</span>
                </button>

                {/* Theme Presets */}
                {THEME_COVERS.map((cover) => (
                    <button
                        key={cover.id}
                        onClick={() => {
                            clearPendingUpload()
                            onChange(cover.url)
                            setCustomUrl('')
                        }}
                        className={cn(
                            "group relative aspect-[3/4] rounded-2xl overflow-hidden border-2 transition-all duration-300",
                            value === cover.url 
                                ? "border-primary scale-[1.02] shadow-lg shadow-primary/20" 
                                : "border-transparent hover:border-slate-200 grayscale-[0.3] hover:grayscale-0"
                        )}
                    >
                        <img src={cover.url} alt={cover.label} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black via-black/60 to-transparent flex items-center justify-center text-center">
                            <span className="text-[9px] font-bold text-white uppercase tracking-wider">{cover.label}</span>
                        </div>
                        {value === cover.url && (
                             <div className="absolute top-2 right-2 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                                <Sparkles className="w-3 h-3" />
                             </div>
                        )}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Or use a custom URL</span>
                    <div className="flex-1 h-px bg-slate-100" />
                </div>
                
                <div className="relative">
                    <Input
                        value={customUrl}
                        onChange={(e) => {
                            clearPendingUpload()
                            setCustomUrl(e.target.value)
                            onChange(e.target.value)
                        }}
                        placeholder="Paste image URL here..."
                        className="h-12 pl-12 pr-12 text-sm bg-stone-50/50 border-transparent focus:bg-white focus:border-primary/20 rounded-xl transition-all"
                    />
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    {customUrl && (
                        <button 
                            onClick={() => { setCustomUrl(''); onChange('') }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {value && !isThemeCover && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                        <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-white shadow-sm">
                            <img src={value} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Previewing Custom Cover</div>
                            <div className="text-xs text-slate-600 truncate opacity-60 font-medium">{value}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
