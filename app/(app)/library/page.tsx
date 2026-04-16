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

    const { data: projectsData, error } = await supabase
        .from('projects')
        .select(`
            *,
            project_members(
                role,
                user_id,
                profiles(
                    display_name,
                    avatar_url
                )
            )
        `)
        .is('deleted_at', null)
        .order('order_index', { ascending: true })
        .order('last_accessed_at', { ascending: false })

    const { data: deletedData } = await supabase
        .from('projects')
        .select(`
            *,
            project_members(
                role,
                user_id,
                profiles(
                    display_name,
                    avatar_url
                )
            )
        `)
        .not('deleted_at', 'is', null)
        .order('order_index', { ascending: true })
        .order('deleted_at', { ascending: false })

    if (error) {
        console.error('Error fetching projects:', error)
    }

    const mapProject = (p: any) => ({
        ...p,
        role: p.project_members?.find((m: any) => m.user_id === user.id)?.role || 'viewer',
        members: p.project_members?.map((m: any) => ({
            role: m.role,
            user_id: m.user_id,
            display_name: m.profiles?.display_name,
            avatar_url: m.profiles?.avatar_url
        })) || []
    })

    const projects = projectsData?.map(mapProject) || []
    const deletedProjects = deletedData?.map(mapProject) || []

    return (
        <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50">
            <ProjectGrid projects={projects} deletedProjects={deletedProjects} />
        </div>
    )
}
