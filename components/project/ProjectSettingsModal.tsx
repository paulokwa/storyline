'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, AlertTriangle, Save, Globe, Info, Tag, Hash, Copyright, Book, Type } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import type { Database } from '@/lib/supabase/types'
import type { ExportMetadata } from '@/lib/export/buildExportPayload'
import { cn } from '@/lib/utils'

type Project = Database['public']['Tables']['projects']['Row']

interface ProjectSettingsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    project: Project
}

export default function ProjectSettingsModal({
    open,
    onOpenChange,
    project,
}: ProjectSettingsModalProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const [activeTab, setActiveTab] = useState<'general' | 'metadata'>('general')
    const [title, setTitle] = useState(project.title ?? '')
    const [type, setType] = useState(project.type)
    const [premise, setPremise] = useState(project.premise || '')
    const [tone, setTone] = useState(project.tone || '')
    const [metadata, setMetadata] = useState<ExportMetadata>((project.export_metadata as any) || {})

    const updateMetadata = (key: keyof ExportMetadata, value: string) => {
        setMetadata(prev => ({ ...prev, [key]: value }))
    }

    async function handleSave() {
        setLoading(true)
        const supabase = createClient()
        const { error } = await (supabase
            .from('projects') as any)
            .update({
                title: title.trim(),
                type: type,
                premise: premise.trim() || null,
                tone: tone.trim() || null,
                export_metadata: metadata as any,
            })
            .eq('id', project.id)

        setLoading(false)
        if (!error) {
            onOpenChange(false)
            router.refresh()
        }
    }

    async function handleDelete() {
        setLoading(true)
        const supabase = createClient()
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', project.id)

        if (!error) {
            router.push('/library')
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-3xl border border-slate-200/50 shadow-2xl bg-[#fbf9f5] !opacity-100 backdrop-blur-none">
                {!showDeleteConfirm ? (
                    <>
                        <DialogHeader className="bg-white/50 p-8 border-b border-[#f0eee9]">
                            <DialogTitle className="text-3xl font-serif text-foreground">Project Settings</DialogTitle>
                            <DialogDescription className="text-muted-foreground font-medium">
                                Configure the foundations of your story.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mt-4 mx-8">
                            <button
                                onClick={() => setActiveTab('general')}
                                className={cn(
                                    "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all",
                                    activeTab === 'general' 
                                        ? "bg-card text-foreground shadow-sm" 
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                General
                            </button>
                            <button
                                onClick={() => setActiveTab('metadata')}
                                className={cn(
                                    "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all",
                                    activeTab === 'metadata' 
                                        ? "bg-card text-foreground shadow-sm" 
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Export Metadata
                            </button>
                        </div>

                        <div className="p-8 pb-0 pt-6 font-sans max-h-[50vh] overflow-y-auto custom-scrollbar">
                            {activeTab === 'general' ? (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="title" className="text-sm font-semibold text-foreground ml-1">Project Title</Label>
                                        <Input
                                            id="title"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Enter story title..."
                                            className="rounded-2xl border-border bg-muted/50 focus:bg-card focus:ring-primary/20 transition-all h-12"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="type" className="text-sm font-semibold text-slate-700 ml-1">Project Format</Label>
                                        <div className="relative">
                                            <select 
                                                id="type"
                                                value={type} 
                                                onChange={(e) => setType(e.target.value as any)}
                                                className="w-full rounded-2xl border border-border bg-muted/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all h-12 px-4 appearance-none text-sm"
                                            >
                                                <option value="novel">Novel / Book</option>
                                                <option value="tv_script">Script (Film, TV, Stage)</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="premise" className="text-sm font-semibold text-foreground ml-1">Core Premise</Label>
                                        <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 text-[10px] text-slate-400 font-medium leading-relaxed italic mb-2">
                                            The central spark. This provides context for the AI and serves as the foundation for your narrative arc.
                                        </div>
                                        <Textarea
                                            id="premise"
                                            value={premise}
                                            onChange={(e) => setPremise(e.target.value)}
                                            placeholder="The elevator pitch for your story..."
                                            className="rounded-2xl border-border bg-muted/50 focus:bg-card focus:ring-primary/20 transition-all min-h-[100px] resize-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between ml-1">
                                            <Label htmlFor="tone" className="text-sm font-semibold text-foreground">Story Tone</Label>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Optional</span>
                                        </div>
                                        <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 text-[10px] text-slate-400 font-medium leading-relaxed italic mb-2">
                                            Guides future AI suggestions for atmosphere and style.
                                        </div>
                                        <Textarea
                                            id="tone"
                                            value={tone}
                                            onChange={(e) => setTone(e.target.value)}
                                            placeholder="e.g. Noir, Whimsical, Gritty Realism..."
                                            className="rounded-2xl border-border bg-muted/50 focus:bg-card focus:ring-primary/20 transition-all min-h-[80px] resize-none"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                                <Type className="w-3 h-3" /> Author Name
                                            </Label>
                                            <Input
                                                value={metadata.authorName || ''}
                                                onChange={(e) => updateMetadata('authorName', e.target.value)}
                                                placeholder="Legal name"
                                                className="rounded-xl border-border bg-muted/50 h-10 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                                <Info className="w-3 h-3" /> Pen Name
                                            </Label>
                                            <Input
                                                value={metadata.penName || ''}
                                                onChange={(e) => updateMetadata('penName', e.target.value)}
                                                placeholder="Byline"
                                                className="rounded-xl border-border bg-muted/50 h-10 text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                                <Copyright className="w-3 h-3" /> Copyright
                                            </Label>
                                            <Input
                                                value={metadata.copyrightHolder || ''}
                                                onChange={(e) => updateMetadata('copyrightHolder', e.target.value)}
                                                placeholder="Holder"
                                                className="rounded-xl border-border bg-muted/50 h-10 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                                <Info className="w-3 h-3" /> Year
                                            </Label>
                                            <Input
                                                value={metadata.copyrightYear || ''}
                                                onChange={(e) => updateMetadata('copyrightYear', e.target.value)}
                                                placeholder="e.g. 2024"
                                                className="rounded-xl border-border bg-muted/50 h-10 text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                                <Globe className="w-3 h-3" /> Language
                                            </Label>
                                            <Input
                                                value={metadata.language || ''}
                                                onChange={(e) => updateMetadata('language', e.target.value)}
                                                placeholder="e.g. English"
                                                className="rounded-xl border-border bg-muted/50 h-10 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                                <Book className="w-3 h-3" /> Publisher
                                            </Label>
                                            <Input
                                                value={metadata.publisher || ''}
                                                onChange={(e) => updateMetadata('publisher', e.target.value)}
                                                placeholder="Imprint"
                                                className="rounded-xl border-border bg-muted/50 h-10 text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                            <Info className="w-3 h-3" /> Blurb / Description
                                        </Label>
                                        <Textarea
                                            value={metadata.description || ''}
                                            onChange={(e) => updateMetadata('description', e.target.value)}
                                            placeholder="A short summary for publishing metadata..."
                                            className="rounded-xl border-border bg-muted/50 min-h-[80px] text-sm resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                                <Tag className="w-3 h-3" /> Keywords
                                            </Label>
                                            <Input
                                                value={metadata.keywords || ''}
                                                onChange={(e) => updateMetadata('keywords', e.target.value)}
                                                placeholder="Comma separated"
                                                className="rounded-xl border-border bg-muted/50 h-10 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                                <Hash className="w-3 h-3" /> ISBN
                                            </Label>
                                            <Input
                                                value={metadata.isbn || ''}
                                                onChange={(e) => updateMetadata('isbn', e.target.value)}
                                                placeholder="Optional"
                                                className="rounded-xl border-border bg-muted/50 h-10 text-sm"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Testing Tip</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            This metadata will be automatically injected into your EPUB, DOCX, and PDF exports.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="p-6 bg-white border-t border-[#f0eee9] flex flex-col sm:flex-row gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="sm:mr-auto rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Project
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="rounded-full px-6 h-11 border-border"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={loading || !title.trim()}
                                className="sanctuary-btn-primary rounded-full px-8 h-11 transition-all active:scale-95"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <div className="py-6 space-y-6">
                        <div className="w-20 h-20 bg-destructive/10 rounded-[2rem] flex items-center justify-center mx-auto text-destructive">
                            <AlertTriangle className="w-10 h-10" />
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-serif text-foreground">Delete Project?</h2>
                            <p className="text-muted-foreground max-w-xs mx-auto">
                                This will permanently delete <span className="font-bold text-foreground">"{project.title}"</span> and all its scenes, characters, and ideas.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={loading}
                                className="h-14 rounded-full text-base font-semibold shadow-lg shadow-red-200"
                            >
                                {loading ? 'Deleting...' : 'Yes, Delete Everything'}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={loading}
                                className="h-12 rounded-full text-muted-foreground"
                            >
                                No, Keep My Story
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
