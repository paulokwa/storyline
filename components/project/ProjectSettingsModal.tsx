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
import { Trash2, AlertTriangle, Save } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

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

    const [title, setTitle] = useState(project.title ?? '')
    const [type, setType] = useState(project.type)
    const [premise, setPremise] = useState(project.premise || '')

    async function handleSave() {
        setLoading(true)
        const supabase = createClient()
        const { error } = await (supabase
            .from('projects') as any)
            .update({
                title: title.trim(),
                type: type,
                premise: premise.trim() || null,
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
            <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-8 border-none shadow-2xl bg-white">
                {!showDeleteConfirm ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-serif text-slate-800">Project Settings</DialogTitle>
                            <DialogDescription className="text-slate-500 font-medium">
                                Configure the foundations of your story.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-6 font-sans">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-sm font-semibold text-slate-700 ml-1">Project Title</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter story title..."
                                    className="rounded-2xl border-slate-100 bg-slate-50 focus:bg-white focus:ring-primary/20 transition-all h-12"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type" className="text-sm font-semibold text-slate-700 ml-1">Project Format</Label>
                                <div className="relative">
                                    <select 
                                        id="type"
                                        value={type} 
                                        onChange={(e) => setType(e.target.value as any)}
                                        className="w-full rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all h-12 px-4 appearance-none text-sm"
                                    >
                                        <option value="novel">Novel / Book</option>
                                        <option value="tv_script">TV / Movie Script</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="premise" className="text-sm font-semibold text-slate-700 ml-1">Core Premise</Label>
                                <Textarea
                                    id="premise"
                                    value={premise}
                                    onChange={(e) => setPremise(e.target.value)}
                                    placeholder="The elevator pitch for your story..."
                                    className="rounded-2xl border-slate-100 bg-slate-50 focus:bg-white focus:ring-primary/20 transition-all min-h-[100px] resize-none"
                                />
                            </div>
                        </div>

                        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
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
                                className="rounded-full px-6 h-11 border-slate-200"
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
                        <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto text-red-500">
                            <AlertTriangle className="w-10 h-10" />
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-serif text-slate-800">Delete Project?</h2>
                            <p className="text-slate-500 max-w-xs mx-auto">
                                This will permanently delete <span className="font-bold text-slate-700">"{project.title}"</span> and all its scenes, characters, and ideas.
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
                                className="h-12 rounded-full text-slate-500"
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
