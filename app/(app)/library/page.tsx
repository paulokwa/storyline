import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProjectGrid from '@/components/library/ProjectGrid'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export const metadata = { title: 'My Projects — Storyline' }

export const dynamic = 'force-dynamic'

export default async function LibraryPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('last_accessed_at', { ascending: false })

    if (error) {
        console.error('Error fetching projects:', error)
    }

    return (
        <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50">
            <ProjectGrid projects={projects ?? []} />
        </div>
    )
}
