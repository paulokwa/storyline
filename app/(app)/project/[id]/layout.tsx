import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProjectShell from '@/components/project/ProjectShell'
import { ProjectProvider } from '@/components/project/ProjectContext'
import type { Database } from '@/lib/supabase/types'
import { requireVerifiedUser } from '@/lib/supabase/auth'

type ProjectRole = Database['public']['Enums']['project_role']
type ProjectLayoutRow = Database['public']['Tables']['projects']['Row'] & {
    project_members: Array<{ role: ProjectRole }> | null
}

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
        .select('*, project_members!inner(role)')
        .eq('id', id)
        .single()

    if (!projectData) notFound()

    const projectDataWithMembers = projectData as ProjectLayoutRow

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
            <ProjectShell project={project} currentUserId={user.id} role={project.role}>
                {children}
            </ProjectShell>
        </ProjectProvider>
    )
}
