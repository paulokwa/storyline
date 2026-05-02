import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
    const adminClient = createAdminClient()
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
    const ownerEmailsByProjectId = new Map<string, string>()

    if (ownerIds.length > 0) {
        const ownerProfiles = await Promise.all(
            ownerIds.map(async (ownerId) => {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('display_name, avatar_url')
                    .eq('id', ownerId)
                    .maybeSingle()

                return profile ? { ownerId, profile } : null
            })
        )

        ownerProfiles.forEach((entry) => {
            if (!entry) return
            ownerProfilesById.set(entry.ownerId, {
                display_name: entry.profile.display_name,
                avatar_url: entry.profile.avatar_url,
            })
        })

        const missingOwnerIds = ownerIds.filter((ownerId) => !ownerProfilesById.has(ownerId))
        if (adminClient && missingOwnerIds.length > 0) {
            const adminOwnerProfiles = await Promise.all(
                missingOwnerIds.map(async (ownerId) => {
                    const { data: profile } = await adminClient
                        .from('profiles')
                        .select('display_name, avatar_url')
                        .eq('id', ownerId)
                        .maybeSingle()

                    return profile ? { ownerId, profile } : null
                })
            )

            adminOwnerProfiles.forEach((entry) => {
                if (!entry) return
                ownerProfilesById.set(entry.ownerId, {
                    display_name: entry.profile.display_name,
                    avatar_url: entry.profile.avatar_url,
                })
            })
        }
    }

    if (allProjectRows.length > 0) {
        const ownerMembers = await Promise.all(
            allProjectRows.map(async (project) => {
                const { data } = await supabase.rpc('get_project_members_extended', { project_id_arg: project.id })
                const ownerMember = (data ?? []).find((member) => member.user_id === project.user_id || member.role === 'owner')
                return ownerMember?.email ? { projectId: project.id, email: ownerMember.email } : null
            })
        )

        ownerMembers.forEach((entry) => {
            if (!entry) return
            ownerEmailsByProjectId.set(entry.projectId, entry.email)
        })
    }

    const mapProject = (p: ProjectWithMembers) => ({
        ...p,
        owner_display_name: ownerProfilesById.get(p.user_id)?.display_name ?? null,
        owner_avatar_url: ownerProfilesById.get(p.user_id)?.avatar_url ?? null,
        owner_email: ownerEmailsByProjectId.get(p.id) ?? null,
        role:
            p.project_members?.find((m) => m.user_id === user.id)?.role
            || (p.user_id === user.id ? ('owner' as ProjectMemberRole) : ('viewer' as ProjectMemberRole)),
        members: (() => {
            const ownerProfile = ownerProfilesById.get(p.user_id)
            const members = p.project_members?.map((m) => ({
                role: m.role,
                user_id: m.user_id,
                display_name: m.user_id === p.user_id
                    ? (m.profiles?.display_name ?? ownerProfile?.display_name ?? null)
                    : (m.profiles?.display_name ?? null),
                avatar_url: m.user_id === p.user_id
                    ? (m.profiles?.avatar_url ?? ownerProfile?.avatar_url ?? null)
                    : (m.profiles?.avatar_url ?? null)
            })) || []

            if (!members.some((member) => member.user_id === p.user_id)) {
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
