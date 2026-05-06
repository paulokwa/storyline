import { redirect } from 'next/navigation'
import SurveyPreviewPage from '@/components/survey/SurveyPreviewPage'
import { isAdminEmail } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Survey Preview - Storyline Admin' }
export const dynamic = 'force-dynamic'

export default async function AdminSurveyPreviewPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user || !isAdminEmail(user.email)) {
        redirect('/library')
    }

    return <SurveyPreviewPage />
}
