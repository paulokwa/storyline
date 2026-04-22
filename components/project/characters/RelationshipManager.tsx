'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, User, MapPin, Package, Trash2, Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SanctuarySelect } from '@/components/ui/sanctuary-select'

type Entity = { id: string; name: string; type: 'character' | 'location' | 'object' }

type RelationshipOption = {
    value: string
    isSymmetrical?: boolean
}

const RELATIONSHIP_OPTIONS: Record<Entity['type'], RelationshipOption[]> = {
    character: [
        { value: 'friends', isSymmetrical: true },
        { value: 'siblings', isSymmetrical: true },
        { value: 'spouses', isSymmetrical: true },
        { value: 'partners', isSymmetrical: true },
        { value: 'rivals', isSymmetrical: true },
        { value: 'enemies', isSymmetrical: true },
        { value: 'mentor to' },
        { value: 'student of' },
        { value: 'parent of' },
        { value: 'child of' },
        { value: 'allies', isSymmetrical: true },
    ],
    location: [
        { value: 'lives in' },
        { value: 'was born in' },
        { value: 'works in' },
        { value: 'rules' },
        { value: 'is hiding in' },
        { value: 'is from' },
    ],
    object: [
        { value: 'owns' },
        { value: 'carries' },
        { value: 'wears' },
        { value: 'seeks' },
        { value: 'protects' },
        { value: 'created' },
        { value: 'destroyed' },
    ],
}

const LEGACY_SHARED_LABELS: Record<string, string> = {
    friend: 'friends',
    'sibling of': 'siblings',
    'spouse of': 'spouses',
    'partner of': 'partners',
    'rival of': 'rivals',
    'enemy of': 'enemies',
    'works with': 'allies',
}

function formatRelationshipText({
    rel,
    charName,
    entityName,
    isSource,
}: {
    rel: EntityRelationship
    charName: string
    entityName: string
    isSource: boolean
}) {
    const sharedLabel = LEGACY_SHARED_LABELS[rel.relation_label] || rel.relation_label

    if (rel.is_symmetrical) {
        return (
            <>
                <span className="text-slate-800 font-bold">{charName} & {entityName}</span>
                {' are '}
                <span className="text-slate-800 font-bold">{sharedLabel}</span>
            </>
        )
    }

    const subject = isSource ? charName : entityName
    const object = isSource ? entityName : charName

    return (
        <>
            <span className="text-slate-800 font-bold">{subject}</span>
            {' '}
            <span className="text-slate-700">{rel.relation_label}</span>
            {' '}
            <span className="text-slate-800 font-bold">{object}</span>
        </>
    )
}

interface EntityRelationship {
    id: string
    project_id: string
    source_id: string
    target_id: string
    source_type: string
    target_type: string
    relation_label: string
    is_symmetrical: boolean
    created_at: string
}

export default function RelationshipManager({ 
    projectId, 
    charId, 
    charName,
    availableEntities,
    disabled = false,
}: { 
    projectId: string; 
    charId: string; 
    charName: string;
    availableEntities: Entity[]
    disabled?: boolean
}) {
    const [relationships, setRelationships] = useState<EntityRelationship[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [targetId, setTargetId] = useState('')
    const [label, setLabel] = useState('')
    const [error, setError] = useState('')
    const selectedTarget = availableEntities.find(e => e.id === targetId)
    const availableLabels = selectedTarget ? RELATIONSHIP_OPTIONS[selectedTarget.type] : []
    const selectedLabelOption = availableLabels.find(option => option.value === label)

    const fetchRelationships = useCallback(async () => {
        if (!charId) return
        setIsLoading(true)
        setError('')
        const supabase = createClient()
        const { data, error: fetchError } = await supabase
            .from('entity_relationships')
            .select('*')
            .or(`source_id.eq.${charId},target_id.eq.${charId}`)
            .order('created_at', { ascending: false })

        if (fetchError) {
            console.error('Error fetching relationships:', fetchError)
            setError('Failed to load world connections.')
        } else {
            setRelationships((data as EntityRelationship[]) || [])
        }
        setIsLoading(false)
    }, [charId])

    useEffect(() => {
        const timer = setTimeout(() => {
            void fetchRelationships()
        }, 0)

        return () => clearTimeout(timer)
    }, [fetchRelationships])

    async function handleAddRelationship() {
        if (disabled) return
        if (!targetId || !label.trim()) return
        const normalizedLabel = label.trim().replace(/\s+/g, ' ')
        
        // Prevent duplicate check in UI (already guarded in DB but better to check local state)
        const exists = relationships.find(r => 
            (r.source_id === charId && r.target_id === targetId && r.relation_label === normalizedLabel) ||
            (r.source_id === targetId && r.target_id === charId && r.relation_label === normalizedLabel)
        )
        if (exists) {
            setError('This connection already exists.')
            return
        }

        setIsSaving(true)
        setError('')
        const target = availableEntities.find(e => e.id === targetId)
        if (!target) return

        const supabase = createClient()
        const { data, error: errorInsert } = await supabase
            .from('entity_relationships')
            .insert({
                project_id: projectId,
                source_id: charId,
                target_id: targetId,
                source_type: 'character',
                target_type: target.type,
                relation_label: normalizedLabel,
                is_symmetrical: !!selectedLabelOption?.isSymmetrical
            })
            .select()
            .single()

        if (!errorInsert) {
            setRelationships(prev => [data as EntityRelationship, ...prev])
            setTargetId('')
            setLabel('')
            setError('')
        } else {
            console.error('Error adding relationship:', errorInsert)
            setError(errorInsert.message || 'Failed to establish connection.')
        }
        setIsSaving(false)
    }

    async function handleDelete(id: string) {
        if (disabled) return
        const supabase = createClient()
        const { error } = await supabase.from('entity_relationships').delete().eq('id', id)
        if (!error) {
            setRelationships(relationships.filter(r => r.id !== id))
        }
    }

    const renderRelationship = (rel: EntityRelationship) => {
        const isSource = rel.source_id === charId
        const linkedId = isSource ? rel.target_id : rel.source_id
        const entity = availableEntities.find(e => e.id === linkedId)
        if (!entity) return null

        const Icon = entity.type === 'character' ? User : entity.type === 'location' ? MapPin : Package
        const colorClass = entity.type === 'character' ? 'text-slate-400' : entity.type === 'location' ? 'text-emerald-400' : 'text-blue-400'
        const bgClass = entity.type === 'character' ? 'bg-slate-50' : entity.type === 'location' ? 'bg-emerald-50/50' : 'bg-blue-50/50'
        return (
            <div key={rel.id} className="group flex items-center gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-slate-100 hover:shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2 min-h-[112px]">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border border-slate-50", bgClass)}>
                    <Icon className={cn("w-5 h-5", colorClass)} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-slate-300 font-bold mb-0.5">{entity.type}</p>
                    <p className="text-sm leading-relaxed font-medium text-slate-600 break-words pr-2">
                        {formatRelationshipText({
                            rel,
                            charName,
                            entityName: entity.name,
                            isSource,
                        })}
                    </p>
                </div>
                {!disabled && (
                    <button onClick={() => handleDelete(rel.id)} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 text-slate-300 hover:text-red-400 rounded-full transition-all">
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        )
    }

    return (
        <div className="mt-16 pt-16 border-t border-stone-50 space-y-12">
            <div className="flex items-center gap-4">
                <div className="h-px w-8 bg-stone-200" />
                <div className="flex items-center gap-2 text-[11px] font-sans tracking-[0.25em] uppercase text-stone-400 font-bold"><LinkIcon className="w-3.5 h-3.5" /><span>Character Ties</span></div>
                <div className="h-px flex-1 bg-stone-200/50" />
            </div>

            {/* Add Relationship UI */}
            <div className="character-ties-panel bg-[#fcfbf9]/60 rounded-[3rem] p-8 ring-1 ring-[#546354]/5 border border-dashed border-[#546354]/10">
                <div className="space-y-6">
                    {disabled ? (
                        <div className="rounded-[2rem] bg-white/80 ring-1 ring-stone-100 px-6 py-5 text-center">
                            <p className="text-[10px] uppercase tracking-[0.25em] text-stone-300 font-bold">Viewer Access</p>
                            <p className="mt-3 text-sm text-slate-500 italic">
                                Viewers can read character ties, but only the owner or an editor can create or remove them.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] uppercase tracking-widest font-bold text-slate-400 ml-2">Target Entity</label>
                                    <SanctuarySelect
                                        value={targetId}
                                        onValueChange={(nextValue) => {
                                            setTargetId(nextValue)
                                            setLabel('')
                                        }}
                                        placeholder="Select someone or something..."
                                        options={availableEntities
                                            .filter(e => e.id !== charId)
                                            .map(e => ({
                                                value: e.id,
                                                label: `${e.type.charAt(0).toUpperCase() + e.type.slice(1)}: ${e.name}`
                                            }))}
                                        triggerClassName="character-ties-input border-none bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100 hover:bg-white focus-visible:ring-[#546354]/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] uppercase tracking-widest font-bold text-slate-400 ml-2">Nature of Connection</label>
                                    <SanctuarySelect
                                        value={label}
                                        onValueChange={setLabel}
                                        disabled={!selectedTarget}
                                        placeholder={selectedTarget ? 'Select a connection...' : 'Choose a target first...'}
                                        options={availableLabels.map(option => ({
                                            value: option.value,
                                            label: option.value
                                        }))}
                                        triggerClassName="character-ties-input h-[46px] border-none bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100 hover:bg-white focus-visible:ring-[#546354]/20"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button 
                                    onClick={handleAddRelationship} 
                                    disabled={isSaving || !targetId || !label.trim()}
                                    className="rounded-full bg-[#546354] hover:bg-[#435243] text-white px-8 uppercase tracking-widest text-[9px] font-bold h-10"
                                >
                                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-2" />}
                                    Bind Connection
                                </Button>
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-500 text-[10px] px-3 py-2 rounded-lg animate-in fade-in">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {error}
                        </div>
                    ) }
                </div>
            </div>

            {/* List Section */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex items-center gap-2 text-slate-300 text-xs italic ml-4"><Loader2 className="w-3 h-3 animate-spin"/> Loading connections...</div>
                ) : relationships.length === 0 ? (
                    <div className="p-12 text-center border-2 border-dashed border-stone-100 rounded-[3rem] text-slate-300 italic text-sm">
                        No established connections in this character&apos;s world.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {relationships.map(rel => renderRelationship(rel))}
                    </div>
                )}
            </div>
        </div>
    )
}
