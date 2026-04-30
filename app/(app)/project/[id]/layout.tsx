import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProjectShell from '@/components/project/ProjectShell'
import LocalProjectShell from '@/components/project/local/LocalProjectShell'
import { ProjectProvider } from '@/components/project/ProjectContext'
import { isLocalProjectId } from '@/lib/persistence/project-mode'
import type { Database } from '@/lib/supabase/types'
import { requireVerifiedUser } from '@/lib/supabase/auth'
import RouteLoadingScreen from '@/components/app/RouteLoadingScreen'

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
    const { id: rawId } = await params
    const id = decodeURIComponent(rawId)

    return (
        <Suspense
            fallback={
                <RouteLoadingScreen
                    variant="workspace"
                    title="Opening your workspace..."
                    description="Preparing your project structure and preferences."
                    reassurance="Your work is safe."
                />
            }
        >
            <ProjectLayoutLoader id={id}>{children}</ProjectLayoutLoader>
        </Suspense>
    )
}

async function ProjectLayoutLoader({
    id,
    children,
}: {
    id: string
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const user = await requireVerifiedUser()

    if (isLocalProjectId(id)) {
        return (
            <ProjectProvider role="owner">
                <LocalProjectShell
                    projectId={id}
                    currentUserId={user.id}
                    currentUserDisplayName={(user.user_metadata?.display_name as string | undefined) ?? null}
                    currentUserAvatarUrl={(user.user_metadata?.avatar_url as string | undefined) ?? null}
                >
                    {children}
                </LocalProjectShell>
            </ProjectProvider>
        )
    }

    const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .maybeSingle()

    if (!projectData) notFound()

    const { data: currentMembership } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', id)
        .eq('user_id', user.id)
        .maybeSingle()

    const isOwnerWithoutMembership = projectData.user_id === user.id && !currentMembership

    if (!currentMembership && !isOwnerWithoutMembership) {
        notFound()
    }

    const { data: projectMembers } = await supabase
        .from('project_members')
        .select(`
            role,
            user_id,
            profiles(
                display_name,
                avatar_url
            )
        `)
        .eq('project_id', id)

    if (isOwnerWithoutMembership) {
        console.warn('Project owner membership row missing while opening project:', id)
    }

    const projectDataWithMembers = {
        ...projectData,
        project_members: projectMembers ?? [],
    } as ProjectLayoutRow

    const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', projectData.user_id)
        .maybeSingle()

    const project = {
        ...projectData,
        role: currentMembership?.role ?? (projectData.user_id === user.id ? 'owner' : 'viewer'),
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

