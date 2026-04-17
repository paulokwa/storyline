'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
    FileText, 
    Code, 
    Files, 
    Download, 
    Settings2, 
    Eye,
    CheckCircle2,
    AlertCircle
} from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from '@/lib/utils'
import { buildExportPayload, ExportOptions } from '@/lib/export/buildExportPayload'
import { toMarkdown } from '@/lib/export/toMarkdown'
import { toText } from '@/lib/export/toText'
import { toHtml } from '@/lib/export/toHtml'
import { toDocx } from '@/lib/export/toDocx'
import { toEpub } from '@/lib/export/toEpub'
import { toPdf } from '@/lib/export/toPdf'
import { ExportMetadata } from '@/lib/export/buildExportPayload'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/providers/ThemeProvider'

interface ExportModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: string
    projectTitle: string
    projectType?: 'tv_script' | 'novel'
    onOpenSettings?: () => void
}

export default function ExportModal({ open, onOpenChange, projectId, projectTitle, projectType, onOpenSettings }: ExportModalProps) {
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    const [loading, setLoading] = useState(false)
    const [metadata, setMetadata] = useState<ExportMetadata | null>(null)
    const [options, setOptions] = useState<ExportOptions>({
        format: 'md',
        scope: 'entire_project',
        includeProjectTitle: true,
        includeChapterTitles: true,
        includeSceneSubtitles: true,
        contentMode: 'prose_only'
    })

    // Stats for preview
    const [stats, setStats] = useState<{ chapters: number, scenes: number, hasProse: boolean, hasSummaries: boolean } | null>(null)

    useEffect(() => {
        if (!open) return
        
        async function fetchStats() {
            try {
                const supabase = createClient()
                const { data: project } = await supabase
                    .from('projects')
                    .select('export_metadata')
                    .eq('id', projectId)
                    .single()
                
                if (project?.export_metadata) {
                    setMetadata(project.export_metadata as ExportMetadata)
                }

                const payload = await buildExportPayload(projectId)
                const chapters = payload.nodes.filter(n => n.type === 'chapter' || n.type === 'episode').length
                const scenes = payload.nodes.filter(n => n.type === 'scene').length
                const hasProse = payload.nodes.some(n => n.content?.content?.length > 0)
                const hasSummaries = payload.nodes.some(n => n.summary && n.summary.trim().length > 0)
                setStats({ chapters, scenes, hasProse, hasSummaries })
            } catch (e) {
                console.error('Failed to fetch stats:', e)
            }
        }
        fetchStats()
    }, [open, projectId])

    async function handleExport() {
        setLoading(true)
        try {
            const payload = await buildExportPayload(projectId)
            let blob: Blob
            let extension = 'txt'

            switch (options.format) {
                case 'md':
                    blob = new Blob([toMarkdown(payload, options)], { type: 'text/markdown' })
                    extension = 'md'
                    break
                case 'html':
                    blob = new Blob([toHtml(payload, options)], { type: 'text/html' })
                    extension = 'html'
                    break
                case 'txt':
                    blob = new Blob([toText(payload, options)], { type: 'text/plain' })
                    extension = 'txt'
                    break
                case 'docx':
                    blob = await toDocx(payload, options)
                    extension = 'docx'
                    break
                case 'pdf':
                    blob = await toPdf(payload, options)
                    extension = 'pdf'
                    break
                case 'epub':
                    blob = await toEpub(payload, options)
                    extension = 'epub'
                    break
                default:
                    throw new Error('Unsupported format')
            }

            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${projectTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${extension}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            onOpenChange(false)
        } catch (error) {
            console.error('Export failed:', error)
            alert('Failed to export project. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const formats = [
        { id: 'md', label: 'Markdown', icon: Code, ext: '.md', desc: 'Best for backup & generic editors' },
        { id: 'txt', label: 'Plain Text', icon: FileText, ext: '.txt', desc: 'Pure text, no formatting' },
        { id: 'html', label: 'HTML', icon: Files, ext: '.html', desc: 'Ready for browser viewing' },
        { id: 'docx', label: 'MS Word', icon: Files, ext: '.docx', desc: 'Professional manuscript' },
        { id: 'pdf', label: 'PDF Document', icon: FileText, ext: '.pdf', desc: 'Fixed layout for printing' },
        { id: 'epub', label: 'EPUB Ebook', icon: Files, ext: '.epub', desc: 'Ready for Kindle/iBooks' },
    ]

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn(
                "export-modal w-[95vw] sm:max-w-[640px] p-0 overflow-hidden rounded-3xl shadow-2xl max-h-[90vh] flex flex-col",
                isMidnight
                    ? "border border-slate-600/30 bg-[#10192b]"
                    : "border-none bg-[#fbf9f5]"
            )}>
                <DialogHeader className={cn(
                    "p-6 pt-12 sm:p-8 sm:pb-4 border-b shrink-0",
                    isMidnight ? "bg-[#182239]/88 border-slate-700/60" : "bg-white border-[#f0eee9]"
                )}>
                    <DialogTitle className="text-xl sm:text-2xl font-serif text-[#31332f] flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                            <Download className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                        </div>
                        Export Project
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-slate-500 font-sans mt-2">
                        Collect your work into a single file for sharing or publishing.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                        <label className="flex items-center gap-2 text-[10px] font-sans tracking-[0.2em] uppercase text-slate-400 font-bold mb-2">
                            Scope
                        </label>
                        <div className="flex gap-2 p-1 bg-slate-900/5 rounded-2xl w-fit">
                            {(['entire_project', 'selected_chapters', 'selected_scenes'] as const).map((s) => (
                                <Tooltip key={s}>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => setOptions({ ...options, scope: s })}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-xs font-medium transition-all duration-300",
                                                options.scope === s
                                                    ? "bg-white text-slate-900 shadow-sm"
                                                    : "text-slate-500 hover:text-slate-700 hover:bg-white/40",
                                                s !== 'entire_project' && "opacity-50 grayscale cursor-not-allowed" // Disabled for V1
                                            )}
                                        >
                                            {s === 'entire_project' ? 'Entire Project' : s === 'selected_chapters' ? (projectType === 'tv_script' ? 'Episodes' : 'Chapters') : 'Scenes'}
                                        </button>
                                    </TooltipTrigger>
                                    {s !== 'entire_project' && (
                                        <TooltipContent side="top">Coming soon in V2</TooltipContent>
                                    )}
                                </Tooltip>
                            ))}
                        </div>
                    </div>

                    {/* Format Selector */}
                    <div className="space-y-4">
                        <label className="flex items-center gap-2 text-[10px] font-sans tracking-[0.2em] uppercase text-slate-400 font-bold mb-2">
                            <Settings2 className="w-3 h-3" />
                            Target Format
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {formats.map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setOptions({ ...options, format: f.id as any })}
                                    className={cn(
                                        "flex flex-col items-start p-4 rounded-2xl border transition-all duration-300 text-left",
                                        options.format === f.id
                                            ? "bg-white border-amber-200 shadow-lg shadow-amber-900/5 ring-1 ring-amber-200"
                                            : "border-slate-100 bg-white/40 hover:bg-white hover:border-slate-200"
                                    )}
                                >
                                    <div className="flex items-center gap-1.5 mb-1.5 overflow-hidden w-full">
                                        <f.icon className={cn("w-3.5 h-3.5 shrink-0", options.format === f.id ? "text-amber-600" : "text-slate-400")} />
                                        <span className={cn("font-medium text-xs sm:text-sm truncate", options.format === f.id ? "text-slate-900" : "text-slate-600")}>
                                            {f.label}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-mono shrink-0">{f.ext}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-tight">
                                        {f.desc}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Export Metadata Summary */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 text-[10px] font-sans tracking-[0.2em] uppercase text-slate-400 font-bold">
                                <FileText className="w-3 h-3" />
                                Export Metadata
                            </label>
                            <button
                                onClick={onOpenSettings}
                                className="text-[10px] font-sans tracking-wide uppercase text-amber-600 font-bold hover:text-amber-700 transition-colors"
                            >
                                Edit metadata
                            </button>
                        </div>
                        <div className="p-4 rounded-2xl bg-white border border-[#f0eee9] space-y-3">
                            {metadata && (metadata.authorName || metadata.penName || metadata.copyrightHolder) ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Author / Pen Name</p>
                                        <p className="text-xs text-slate-700 font-medium">
                                            {metadata.penName || metadata.authorName || 'Not set'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Copyright</p>
                                        <p className="text-xs text-slate-700 font-medium">
                                            {metadata.copyrightHolder ? `© ${metadata.copyrightYear || ''} ${metadata.copyrightHolder}` : 'Not set'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Language</p>
                                        <p className="text-xs text-slate-700 font-medium">
                                            {metadata.language || 'Not set'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Publisher</p>
                                        <p className="text-xs text-slate-700 font-medium">
                                            {metadata.publisher || 'Not set'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-slate-400 italic">No publishing metadata defined yet.</p>
                                    <Button variant="ghost" size="sm" onClick={onOpenSettings} className="h-7 text-[10px] rounded-lg">
                                        Set Metadata
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <label className="flex items-center gap-2 text-[10px] font-sans tracking-[0.2em] uppercase text-slate-400 font-bold">
                                Includes
                            </label>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between group">
                                    <Label htmlFor="inc-title" className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                                        Project Title
                                    </Label>
                                    <Switch
                                        id="inc-title"
                                        checked={options.includeProjectTitle}
                                        onCheckedChange={(v) => setOptions({ ...options, includeProjectTitle: v })}
                                    />
                                </div>
                                <div className="flex items-center justify-between group">
                                    <Label htmlFor="inc-chapters" className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                                        {stats?.chapters ? (stats.chapters > 0 ? 'Chapter / Act Titles' : 'Titles') : 'Titles'}
                                    </Label>
                                    <Switch
                                        id="inc-chapters"
                                        checked={options.includeChapterTitles}
                                        onCheckedChange={(v) => setOptions({ ...options, includeChapterTitles: v })}
                                    />
                                </div>
                                <div className="flex items-center justify-between group">
                                    <Label htmlFor="inc-scenes" className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                                        Scene Subtitles
                                    </Label>
                                    <Switch
                                        id="inc-scenes"
                                        checked={options.includeSceneSubtitles}
                                        onCheckedChange={(v) => setOptions({ ...options, includeSceneSubtitles: v })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <label className="flex items-center gap-2 text-[10px] font-sans tracking-[0.2em] uppercase text-slate-400 font-bold">
                                Content Mode
                            </label>
                            <div className="space-y-2">
                                {(['prose_only', 'summaries_only', 'both'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setOptions({ ...options, contentMode: mode })}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-all duration-300",
                                            options.contentMode === mode
                                                ? "bg-amber-50 border-amber-200 text-amber-900 font-medium"
                                                : "bg-white/40 border-transparent text-slate-500 hover:bg-white hover:border-slate-100"
                                        )}
                                    >
                                        <span>
                                            {mode === 'prose_only' && 'Manuscript Prose'}
                                            {mode === 'summaries_only' && 'Outline Summaries'}
                                            {mode === 'both' && 'Outline + Prose'}
                                        </span>
                                        {options.contentMode === mode && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Preview Box */}
                    <div className="bg-slate-900/5 rounded-[2rem] p-6 border border-slate-900/5">
                        <div className="flex items-center gap-2 text-[10px] font-sans tracking-[0.2em] uppercase text-slate-400 font-bold mb-4">
                            <Eye className="w-3 h-3" />
                            Export Preview
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-700">
                                    {projectTitle}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {stats ? `${stats.chapters} chapters, ${stats.scenes} scenes` : 'Loading project stats...'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-serif text-slate-900">
                                    {options.format.toUpperCase()}
                                </p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                                    {options.contentMode === 'prose_only' ? 'Prose' : options.contentMode === 'summaries_only' ? 'Summary' : 'Mixed'}
                                </p>
                            </div>
                        </div>
                        {options.contentMode === 'summaries_only' && stats && !stats.hasSummaries && (
                            <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-700 text-xs">
                                <AlertCircle className="w-4 h-4" />
                                No summaries found. Export will be empty for summaries only.
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className={cn(
                    "p-8 flex flex-col sm:flex-row gap-4 sm:justify-between items-center",
                    isMidnight ? "bg-[#182239]/88 border-slate-700/60" : "bg-white border-[#f0eee9]"
                )}>
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <AlertCircle className="w-4 h-4" />
                        Selected structure order preserved
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl flex-1 sm:flex-none">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleExport}
                            disabled={loading}
                            className="bg-[#546354] hover:bg-[#3d4a3d] text-white rounded-xl px-8 flex-1 sm:flex-none shadow-lg shadow-slate-900/10 transition-all duration-300"
                        >
                            <Download className={cn("w-4 h-4 mr-2", loading && "animate-pulse")} />
                            {loading ? 'Generating...' : 'Generate Export'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
