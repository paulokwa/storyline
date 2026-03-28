import AIHelpTab from '@/components/project/ai/AIHelpTab'

export default async function AIPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return <AIHelpTab projectId={id} />
}
