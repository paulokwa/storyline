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
        .order('updated_at', { ascending: false })

    if (error) {
        console.error('Error fetching projects:', error)
    }

    return (
        <div className="fade-in">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800">My Projects</h1>
                    <p className="text-slate-500 text-sm mt-0.5">All your stories in one place</p>
                </div>
                {(projects?.length ?? 0) > 0 && (
                    <Link href="/new">
                        <Button variant="outline" className="gap-2 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium">
                            <Plus className="w-4 h-4" />
                            Start New Project
                        </Button>
                    </Link>
                )}
            </div>

            <ProjectGrid projects={projects ?? []} />
        </div>
    )
}
