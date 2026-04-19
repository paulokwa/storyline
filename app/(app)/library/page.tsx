import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProjectGrid from '@/components/library/ProjectGrid'
import type { Database } from '@/lib/supabase/types'

export const metadata = { title: 'My Projects — Storyline' }

export const dynamic = 'force-dynamic'

type ProjectMemberRole = Database['public']['Enums']['project_role']
type ProjectRow = Database['public']['Tables']['projects']['Row']
type MemberProfile = Pick<Database['public']['Tables']['profiles']['Row'], 'display_name' | 'avatar_url'>
type ProjectMemberRow = Database['public']['Tables']['project_members']['Row'] & {
    profiles: MemberProfile | null
}
type ProjectWithMembers = ProjectRow & {
    project_members: ProjectMemberRow[] | null
}

export default async function LibraryPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('ai_onboarding_completed')
        .eq('id', user.id)
        .maybeSingle()

    if (!profile?.ai_onboarding_completed) {
        redirect('/welcome')
    }

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

    const mapProject = (p: ProjectWithMembers) => ({
        ...p,
        role: p.project_members?.find((m) => m.user_id === user.id)?.role || ('viewer' as ProjectMemberRole),
        members: p.project_members?.map((m) => ({
            role: m.role,
            user_id: m.user_id,
            display_name: m.profiles?.display_name,
            avatar_url: m.profiles?.avatar_url
        })) || []
    })

    const projects = (projectsData as ProjectWithMembers[] | null)?.map(mapProject) || []
    const deletedProjects = (deletedData as ProjectWithMembers[] | null)?.map(mapProject) || []

    return (
        <div className="library-page-shell flex h-full min-h-0 flex-1 flex-col overflow-auto bg-slate-50/50 custom-scrollbar">
            <ProjectGrid projects={projects} deletedProjects={deletedProjects} />
        </div>
    )
}
