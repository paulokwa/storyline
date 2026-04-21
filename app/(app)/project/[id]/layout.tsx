import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProjectShell from '@/components/project/ProjectShell'
import { ProjectProvider } from '@/components/project/ProjectContext'
import type { Database } from '@/lib/supabase/types'
import { requireVerifiedUser } from '@/lib/supabase/auth'

type ProjectRole = Database['public']['Enums']['project_role']
type ProjectLayoutRow = Database['public']['Tables']['projects']['Row'] & {
    project_members: Array<{
        role: ProjectRole
        user_id: string
        profiles: {
            display_name: string | null
            avatar_url: string | null
        } | null
    }> | null
}
type OwnerProfile = Pick<Database['public']['Tables']['profiles']['Row'], 'display_name' | 'avatar_url'>

export default async function ProjectLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()
    const user = await requireVerifiedUser()

    const { data: projectData } = await supabase
        .from('projects')
        .select(`
            *,
            project_members!inner(
                role,
                user_id,
                profiles(
                    display_name,
                    avatar_url
                )
            )
        `)
        .eq('id', id)
        .single()

    if (!projectData) notFound()

    const projectDataWithMembers = projectData as ProjectLayoutRow

    const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', projectData.user_id)
        .maybeSingle()

    const project = {
        ...projectData,
        role: projectDataWithMembers.project_members?.[0]?.role ?? 'viewer'
    }

    // Update last accessed time asynchronously via RPC (safe for all members)
    void supabase.rpc('touch_project', { p_id: id }).then(({ error }) => {
        if (error) console.error('Failed to update last_accessed_at:', error)
    })

    return (
        <ProjectProvider role={project.role}>
            <ProjectShell
                project={project}
                currentUserId={user.id}
                role={project.role}
                owner={{
                    user_id: projectData.user_id,
                    display_name: (ownerProfile as OwnerProfile | null)?.display_name ?? null,
                    avatar_url: (ownerProfile as OwnerProfile | null)?.avatar_url ?? null,
                }}
                members={(projectDataWithMembers.project_members ?? []).map((member) => ({
                    role: member.role,
                    user_id: member.user_id,
                    display_name: member.profiles?.display_name ?? null,
                    avatar_url: member.profiles?.avatar_url ?? null,
                }))}
            >
                {children}
            </ProjectShell>
        </ProjectProvider>
    )
}
