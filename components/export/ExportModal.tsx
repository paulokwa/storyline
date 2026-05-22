'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
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
    Download, DownloadCloud, 
    Settings2, 
    Eye
} from 'lucide-react'
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
import { toast } from 'sonner'
import { useTheme } from '@/components/providers/ThemeProvider'
import { isLocalProjectId } from '@/lib/persistence/project-mode'
import { getLocalProject } from '@/lib/persistence/local-projects'

interface ExportModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: string
    projectTitle: string
    projectType?: 'tv_script' | 'novel'
    role?: 'owner' | 'editor' | 'viewer'
    allowCollaboratorExports?: boolean
    onOpenSettings?: () => void
}

export default function ExportModal({
    open,
    onOpenChange,
    projectId,
    projectTitle,
    projectType,
    role = 'owner',
    allowCollaboratorExports = false,
    onOpenSettings,
}: ExportModalProps) {
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    const canExport = role === 'owner' || allowCollaboratorExports
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
    const optionsRef = useRef<ExportOptions>({
        format: 'md',
        scope: 'entire_project',
        includeProjectTitle: true,
        includeChapterTitles: true,
        includeSceneSubtitles: true,
        contentMode: 'prose_only'
    })

    // Stats for preview
    const [stats, setStats] = useState<{ chapters: number, scenes: number, hasProse: boolean } | null>(null)
    const exportRestrictionMessage = useMemo(
        () => role === 'owner'
            ? null
            : 'The owner has disabled exports for collaborators. They can enable it later in Project Settings.',
        [role]
    )

    useEffect(() => {
        if (!open) return
        
        async function fetchStats() {
            try {
                if (isLocalProjectId(projectId)) {
                    const localProject = await getLocalProject(projectId)
                    if (localProject?.export_metadata) {
                        setMetadata(localProject.export_metadata as ExportMetadata)
                    }
                } else {
                    const supabase = createClient()
                    const { data: project } = await supabase
                        .from('projects')
                        .select('export_metadata')
                        .eq('id', projectId)
                        .single()
                    
                    if (project?.export_metadata) {
                        setMetadata(project.export_metadata as ExportMetadata)
                    }
                }

                if (!canExport) {
                    setStats(null)
                    return
                }

                const payload = await buildExportPayload(projectId)
                const chapters = payload.nodes.filter(n => n.type === 'chapter' || n.type === 'episode').length
                const scenes = payload.nodes.filter(n => n.type === 'scene').length
                const hasProse = payload.nodes.some(n => n.content?.content?.length > 0)
                setStats({ chapters, scenes, hasProse })
            } catch (e) {
                console.error('Failed to fetch stats:', e)
            }
        }
        fetchStats()
    }, [canExport, open, projectId])

    async function handleExport() {
        if (!canExport) return
        setLoading(true)
        try {
            const payload = await buildExportPayload(projectId)
            const exportOptions = optionsRef.current
            let blob: Blob
            let extension = 'txt'

            switch (exportOptions.format) {
                case 'md':
                    blob = new Blob([toMarkdown(payload, exportOptions)], { type: 'text/markdown' })
                    extension = 'md'
                    break
                case 'html':
                    blob = new Blob([toHtml(payload, exportOptions)], { type: 'text/html' })
                    extension = 'html'
                    break
                case 'txt':
                    blob = new Blob([toText(payload, exportOptions)], { type: 'text/plain' })
                    extension = 'txt'
                    break
                case 'docx':
                    blob = await toDocx(payload, exportOptions)
                    extension = 'docx'
                    break
                case 'pdf':
                    await toPdf(payload, exportOptions)
                    onOpenChange(false)
                    return
                case 'epub':
                    blob = await toEpub(payload, exportOptions)
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
            toast.error('Failed to export manuscript.', {
                description: 'Please try again.',
            })
        } finally {
            setLoading(false)
        }
    }

    const formats = [
        { id: 'md', label: 'Markdown', icon: Code, ext: '.md', desc: 'Best for backup & generic editors' },
        { id: 'txt', label: 'Plain Text', icon: FileText, ext: '.txt', desc: 'Pure text, no formatting' },
        { id: 'html', label: 'HTML', icon: Files, ext: '.html', desc: 'Ready for browser viewing' },
        { id: 'docx', label: 'MS Word', icon: Files, ext: '.docx', desc: 'Professional manuscript' },
        { id: 'pdf', label: 'Print / Save as PDF', icon: FileText, ext: '.pdf', desc: 'Opens your browser print dialog' },
        { id: 'epub', label: 'EPUB Ebook', icon: Files, ext: '.epub', desc: 'Ready for Kindle/iBooks' },
    ]

    const scopeLabel = 'Entire project'

    const formatPreviewLabel = formats.find((format) => format.id === options.format)?.label ?? options.format.toUpperCase()

    const contentModePreviewLabel = 'Manuscript prose'
    const includesPreviewLabel = [
        options.includeProjectTitle ? 'project title' : null,
        options.includeChapterTitles ? (projectType === 'tv_script' ? 'episode and act titles' : 'chapter titles') : null,
        options.includeSceneSubtitles ? 'scene subtitles' : null,
    ].filter(Boolean).join(', ') || 'manuscript text only'

    function updateOptions(next: ExportOptions | ((current: ExportOptions) => ExportOptions)) {
        setOptions((current) => {
            const resolved = typeof next === 'function' ? next(current) : next
            optionsRef.current = resolved
            return resolved
        })
    }

    function toggleIncludeOption(option: 'includeProjectTitle' | 'includeChapterTitles' | 'includeSceneSubtitles') {
        if (!canExport) return

        updateOptions((current) => ({
            ...current,
            [option]: !current[option],
        }))
    }

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
                            <DownloadCloud className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                        </div>
                        Export Manuscript
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-slate-500 font-sans mt-2">
                        Collect your work into a single file for sharing or publishing.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[70vh] overflow-y-auto custom-scrollbar p-6 space-y-7 sm:p-8 sm:space-y-8">
                    {!canExport && exportRestrictionMessage && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            {exportRestrictionMessage}
                        </div>
                    )}
                    <div className="space-y-4">
                        <label className="mb-2 flex items-center gap-2 text-[11px] font-sans font-semibold tracking-[0.16em] uppercase text-slate-500">
                            Export Scope
                        </label>
                        <div className="rounded-2xl bg-white/40 px-4 py-3 text-sm text-slate-700">
                            <span className="font-medium text-slate-900">Entire project</span>
                            <span className="ml-2 text-slate-500">All active {projectType === 'tv_script' ? 'episodes, acts, and scenes' : 'chapters and scenes'} will be included.</span>
                        </div>
                    </div>

                    {/* Format Selector */}
                    <div className="space-y-4">
                        <label className="mb-2 flex items-center gap-2 text-[11px] font-sans font-semibold tracking-[0.16em] uppercase text-slate-500">
                            <Settings2 className="w-3 h-3" />
                            Target Format
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {formats.map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => updateOptions((current) => ({ ...current, format: f.id as any }))}
                                    disabled={!canExport}
                                    className={cn(
                                        "flex flex-col items-start p-4 rounded-2xl border transition-all duration-300 text-left",
                                        options.format === f.id
                                            ? "bg-white border-amber-300 shadow-lg shadow-amber-900/5 ring-1 ring-amber-300"
                                            : "border-slate-100 bg-white/40 hover:bg-white hover:border-slate-200",
                                        !canExport && "cursor-not-allowed opacity-60"
                                    )}
                                >
                                    <div className="flex items-center gap-1.5 mb-1.5 overflow-hidden w-full">
                                        <f.icon className={cn("w-3.5 h-3.5 shrink-0", options.format === f.id ? "text-amber-700" : "text-slate-400")} />
                                        <span className={cn("font-medium text-xs sm:text-sm truncate", options.format === f.id ? "text-slate-950" : "text-slate-600")}>
                                            {f.label}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-mono shrink-0">{f.ext}</span>
                                    </div>
                                    <p className={cn("text-[11px] leading-tight", options.format === f.id ? "text-slate-500" : "text-slate-400")}>
                                        {f.desc}
                                    </p>
                                </button>
                            ))}
                        </div>
                        {options.format === 'pdf' && (
                            <p className="text-[11px] leading-relaxed text-slate-500 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                                PDF uses your browser&rsquo;s print dialog. Choose &ldquo;Save as PDF&rdquo; when the print window opens. If nothing appears, allow pop-ups for this site and try again.
                            </p>
                        )}
                    </div>

                    {/* Export Metadata Summary */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 text-[11px] font-sans font-semibold tracking-[0.16em] uppercase text-slate-500">
                                <FileText className="w-3 h-3" />
                                Export Metadata
                            </label>
                            <button
                                onClick={onOpenSettings}
                                className="text-[10px] font-sans tracking-wide uppercase text-amber-600 font-bold hover:text-amber-700 transition-colors"
                            >
                                Edit Metadata
                            </button>
                        </div>
                        <div className="p-4 rounded-2xl bg-white border border-[#f0eee9] space-y-3">
                            {metadata && (metadata.authorName || metadata.penName || metadata.copyrightHolder) ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">Author / Pen Name</p>
                                        <p className="text-xs text-slate-700 font-medium">
                                            {metadata.penName || metadata.authorName || 'Not set'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">Copyright</p>
                                        <p className="text-xs text-slate-700 font-medium">
                                            {metadata.copyrightHolder ? `© ${metadata.copyrightYear || ''} ${metadata.copyrightHolder}` : 'Not set'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">Language</p>
                                        <p className="text-xs text-slate-700 font-medium">
                                            {metadata.language || 'Not set'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">Publisher</p>
                                        <p className="text-xs text-slate-700 font-medium">
                                            {metadata.publisher || 'Not set'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-slate-500">Add author, copyright, and publishing details before export.</p>
                                    <Button variant="ghost" size="sm" onClick={onOpenSettings} className="h-7 text-[10px] rounded-lg">
                                        Edit Metadata
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-5">
                        <label className="flex items-center gap-2 text-[11px] font-sans font-semibold tracking-[0.16em] uppercase text-slate-500">
                            Includes
                        </label>
                        <p className="text-xs leading-5 text-slate-500">
                            Choose which project and structure titles should appear in the exported file. Manuscript text is included automatically.
                        </p>
                        <div className="space-y-4 rounded-2xl bg-white/40 p-4 sm:p-5">
                            <div
                                role="button"
                                tabIndex={canExport ? 0 : -1}
                                aria-disabled={!canExport}
                                onClick={() => toggleIncludeOption('includeProjectTitle')}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault()
                                        toggleIncludeOption('includeProjectTitle')
                                    }
                                }}
                                className={cn(
                                    "group flex items-center justify-between gap-4 rounded-xl px-3 py-2 transition-colors",
                                    canExport ? "cursor-pointer hover:bg-white/70 focus-visible:bg-white/70" : "cursor-not-allowed opacity-60"
                                )}
                            >
                                <Label
                                    htmlFor="inc-title"
                                    onClick={(event) => event.stopPropagation()}
                                    className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors"
                                >
                                    Project Title
                                </Label>
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "min-w-[2rem] text-right text-[11px] font-semibold uppercase tracking-[0.12em]",
                                        options.includeProjectTitle ? "text-[#546354]" : "text-slate-400"
                                    )}>
                                        {options.includeProjectTitle ? 'On' : 'Off'}
                                    </span>
                                    <Switch
                                        id="inc-title"
                                        checked={options.includeProjectTitle}
                                        onCheckedChange={(v) => updateOptions((current) => ({ ...current, includeProjectTitle: v }))}
                                        onClick={(event) => event.stopPropagation()}
                                        disabled={!canExport}
                                        className="border border-[#cfc7b8] data-checked:bg-[#546354] data-checked:border-[#546354] data-unchecked:bg-[#ece7dc] data-unchecked:border-[#cfc7b8] dark:data-checked:bg-[#aac0ad] dark:data-checked:border-[#aac0ad] dark:data-unchecked:bg-slate-700 dark:data-unchecked:border-slate-500"
                                    />
                                </div>
                            </div>
                            <div
                                role="button"
                                tabIndex={canExport ? 0 : -1}
                                aria-disabled={!canExport}
                                onClick={() => toggleIncludeOption('includeChapterTitles')}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault()
                                        toggleIncludeOption('includeChapterTitles')
                                    }
                                }}
                                className={cn(
                                    "group flex items-center justify-between gap-4 rounded-xl px-3 py-2 transition-colors",
                                    canExport ? "cursor-pointer hover:bg-white/70 focus-visible:bg-white/70" : "cursor-not-allowed opacity-60"
                                )}
                            >
                                <Label
                                    htmlFor="inc-chapters"
                                    onClick={(event) => event.stopPropagation()}
                                    className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors"
                                >
                                    {stats?.chapters ? (stats.chapters > 0 ? 'Chapter / Act Titles' : 'Titles') : 'Titles'}
                                </Label>
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "min-w-[2rem] text-right text-[11px] font-semibold uppercase tracking-[0.12em]",
                                        options.includeChapterTitles ? "text-[#546354]" : "text-slate-400"
                                    )}>
                                        {options.includeChapterTitles ? 'On' : 'Off'}
                                    </span>
                                    <Switch
                                        id="inc-chapters"
                                        checked={options.includeChapterTitles}
                                        onCheckedChange={(v) => updateOptions((current) => ({ ...current, includeChapterTitles: v }))}
                                        onClick={(event) => event.stopPropagation()}
                                        disabled={!canExport}
                                        className="border border-[#cfc7b8] data-checked:bg-[#546354] data-checked:border-[#546354] data-unchecked:bg-[#ece7dc] data-unchecked:border-[#cfc7b8] dark:data-checked:bg-[#aac0ad] dark:data-checked:border-[#aac0ad] dark:data-unchecked:bg-slate-700 dark:data-unchecked:border-slate-500"
                                    />
                                </div>
                            </div>
                            <div
                                role="button"
                                tabIndex={canExport ? 0 : -1}
                                aria-disabled={!canExport}
                                onClick={() => toggleIncludeOption('includeSceneSubtitles')}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault()
                                        toggleIncludeOption('includeSceneSubtitles')
                                    }
                                }}
                                className={cn(
                                    "group flex items-center justify-between gap-4 rounded-xl px-3 py-2 transition-colors",
                                    canExport ? "cursor-pointer hover:bg-white/70 focus-visible:bg-white/70" : "cursor-not-allowed opacity-60"
                                )}
                            >
                                <Label
                                    htmlFor="inc-scenes"
                                    onClick={(event) => event.stopPropagation()}
                                    className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors"
                                >
                                    Scene Subtitles
                                </Label>
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "min-w-[2rem] text-right text-[11px] font-semibold uppercase tracking-[0.12em]",
                                        options.includeSceneSubtitles ? "text-[#546354]" : "text-slate-400"
                                    )}>
                                        {options.includeSceneSubtitles ? 'On' : 'Off'}
                                    </span>
                                    <Switch
                                        id="inc-scenes"
                                        checked={options.includeSceneSubtitles}
                                        onCheckedChange={(v) => updateOptions((current) => ({ ...current, includeSceneSubtitles: v }))}
                                        onClick={(event) => event.stopPropagation()}
                                        disabled={!canExport}
                                        className="border border-[#cfc7b8] data-checked:bg-[#546354] data-checked:border-[#546354] data-unchecked:bg-[#ece7dc] data-unchecked:border-[#cfc7b8] dark:data-checked:bg-[#aac0ad] dark:data-checked:border-[#aac0ad] dark:data-unchecked:bg-slate-700 dark:data-unchecked:border-slate-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview Box */}
                    <div className="bg-slate-900/5 rounded-[2rem] p-6 border border-slate-900/5">
                        <div className="mb-4 flex items-center gap-2 text-[11px] font-sans font-semibold tracking-[0.16em] uppercase text-slate-500">
                            <Eye className="w-3 h-3" />
                            Export Preview
                        </div>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-700">
                                    {projectTitle}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {stats
                                        ? `${stats.chapters} ${projectType === 'tv_script' ? `episode${stats.chapters !== 1 ? 's' : ''}` : `chapter group${stats.chapters !== 1 ? 's' : ''}`}, ${stats.scenes} scene${stats.scenes !== 1 ? 's' : ''}`
                                        : canExport ? 'Loading project stats...' : 'Export stats unavailable while export is disabled'}
                                </p>
                                <div className="space-y-1 text-xs leading-5 text-slate-500">
                                    <p><span className="font-medium text-slate-700">Scope:</span> {scopeLabel}</p>
                                    <p><span className="font-medium text-slate-700">Format:</span> {formatPreviewLabel}</p>
                                    <p><span className="font-medium text-slate-700">Content:</span> {contentModePreviewLabel}</p>
                                    <p><span className="font-medium text-slate-700">Includes:</span> {includesPreviewLabel}</p>
                                </div>
                            </div>
                            <div className="text-left sm:text-right">
                                <p className="text-lg font-serif text-slate-900">
                                    {options.format.toUpperCase()}
                                </p>
                                <p className="text-[11px] text-slate-500 uppercase tracking-[0.14em] font-semibold">
                                    Prose manuscript
                                </p>
                            </div>
                        </div>
                        <p className="mt-4 text-[10px] text-slate-400 italic">
                            Counts are based on Storyline structure types, not item titles.
                        </p>
                    </div>
                </div>

                <DialogFooter className={cn(
                    "p-8 flex flex-col sm:flex-row gap-4 sm:justify-end items-center",
                    isMidnight ? "bg-[#182239]/88 border-slate-700/60" : "bg-white border-[#f0eee9]"
                )}>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl flex-1 sm:flex-none">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleExport}
                            disabled={loading || !canExport}
                            className="bg-[#546354] hover:bg-[#3d4a3d] text-white rounded-xl px-8 flex-1 sm:flex-none shadow-lg shadow-slate-900/10 transition-all duration-300"
                        >
                            <Download className={cn("w-4 h-4 mr-2", loading && "animate-pulse")} />
                            {loading ? 'Generating...' : canExport ? (options.format === 'pdf' ? 'Open Print Dialog' : 'Generate Export') : 'Export Disabled by Owner'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
