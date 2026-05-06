import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StorageFirstOnboarding from '@/components/app/StorageFirstOnboarding'

type WelcomePageProps = {
    searchParams: Promise<{ preview?: string | string[] }>
}

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const resolvedSearchParams = await searchParams
    const previewParam = resolvedSearchParams.preview
    const previewValue = Array.isArray(previewParam) ? previewParam[0] : previewParam
    const isPreviewMode = process.env.NODE_ENV === 'development' && previewValue === '1'

    const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle()

    if (profile?.onboarding_completed && !isPreviewMode) {
        redirect('/library')
    }

    return (
        <div className="flex min-h-0 flex-1 overflow-y-auto bg-background">
            <StorageFirstOnboarding displayName={profile?.display_name ?? ''} />
        </div>
    )
}
