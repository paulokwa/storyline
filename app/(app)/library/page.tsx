import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { requireVerifiedUser } from '@/lib/supabase/auth'
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
    const user = await requireVerifiedUser()

    const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .maybeSingle()

    if (!profile?.onboarding_completed) {
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

    const allProjectRows = [
        ...((projectsData as ProjectWithMembers[] | null) ?? []),
        ...((deletedData as ProjectWithMembers[] | null) ?? []),
    ]

    const ownerIds = Array.from(new Set(allProjectRows.map((project) => project.user_id).filter(Boolean)))
    const ownerProfilesById = new Map<string, MemberProfile>()

    if (ownerIds.length > 0) {
        const { data: ownerProfiles } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', ownerIds)

        ownerProfiles?.forEach((profile) => {
            ownerProfilesById.set(profile.id, {
                display_name: profile.display_name,
                avatar_url: profile.avatar_url,
            })
        })
    }

    const mapProject = (p: ProjectWithMembers) => ({
        ...p,
        role: p.project_members?.find((m) => m.user_id === user.id)?.role || ('viewer' as ProjectMemberRole),
        members: (() => {
            const members = p.project_members?.map((m) => ({
                role: m.role,
                user_id: m.user_id,
                display_name: m.profiles?.display_name ?? null,
                avatar_url: m.profiles?.avatar_url ?? null
            })) || []

            if (!members.some((member) => member.user_id === p.user_id)) {
                const ownerProfile = ownerProfilesById.get(p.user_id)
                members.unshift({
                    role: 'owner',
                    user_id: p.user_id,
                    display_name: ownerProfile?.display_name ?? null,
                    avatar_url: ownerProfile?.avatar_url ?? null,
                })
            }

            return members
        })()
    })

    const projects = (projectsData as ProjectWithMembers[] | null)?.map(mapProject) || []
    const deletedProjects = (deletedData as ProjectWithMembers[] | null)?.map(mapProject) || []

    return (
        <div className="library-page-shell flex h-full min-h-0 flex-1 flex-col overflow-auto bg-slate-50/50 custom-scrollbar">
            <ProjectGrid projects={projects} deletedProjects={deletedProjects} currentUserId={user.id} />
        </div>
    )
}
