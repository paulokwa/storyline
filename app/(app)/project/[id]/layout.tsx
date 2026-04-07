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

    const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

    if (!project) notFound()

    // Update last accessed time asynchronously (we don't need to wait for this to show the page)
    supabase.from('projects').update({ last_accessed_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
        if (error) console.error('Failed to update last_accessed_at:', error)
    })

    return <ProjectShell project={project}>{children}</ProjectShell>
}
