import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ProjectShell from '@/components/project/ProjectShell'

export default async function ProjectLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: projectData } = await supabase
        .from('projects')
        .select('*, project_members!inner(role)')
        .eq('id', id)
        .single()

    if (!projectData) notFound()

    const project = {
        ...projectData,
        role: (projectData.project_members as any)?.[0]?.role as 'owner' | 'editor' | 'viewer'
    }

    // Update last accessed time asynchronously via RPC (safe for all members)
    supabase.rpc('touch_project', { p_id: id }).then(({ error }) => {
        if (error) console.error('Failed to update last_accessed_at:', error)
    })

    return <ProjectShell project={project} role={project.role}>{children}</ProjectShell>
}
