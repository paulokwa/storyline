'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import CoverPicker from '@/components/project/CoverPicker'
import { toast } from 'sonner'
import { Loader2, Palette } from 'lucide-react'

interface CoverEditModalProps {
    project: {
        id: string
        title: string
        cover_url: string | null
    }
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export default function CoverEditModal({ project, isOpen, onOpenChange }: CoverEditModalProps) {
    const router = useRouter()
    const [coverUrl, setCoverUrl] = useState(project.cover_url || '')
    const [saving, setSaving] = useState(false)
    const supabase = createClient()

    async function handleSave() {
        try {
            setSaving(true)
            const { error } = await supabase
                .from('projects')
                .update({ cover_url: coverUrl })
                .eq('id', project.id)

            if (error) throw error

            toast.success("Project cover updated.")
            onOpenChange(false)
            router.refresh()
        } catch (error: any) {
            console.error("Update error:", error)
            toast.error(error.message || "Failed to update cover.")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-8">
                <DialogHeader className="mb-6">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                            <Palette className="w-6 h-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-serif">Update Project Cover</DialogTitle>
                            <DialogDescription className="font-medium text-slate-500 italic">
                                &ldquo;{project.title}&rdquo; — Choose how your project appears in the archive.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="py-2">
                    <CoverPicker 
                        value={coverUrl} 
                        onChange={setCoverUrl} 
                    />
                </div>

                <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
                    <Button 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)}
                        className="rounded-full text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest text-[10px]"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || coverUrl === project.cover_url}
                        className="sanctuary-btn-primary rounded-full px-8 h-12 font-semibold gap-2"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
