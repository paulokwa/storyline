import AssetManager from '@/components/project/assets/AssetManager'

export default async function ProjectAssetsPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    
    return (
        <div className="flex-1 flex flex-col min-h-0">
            <AssetManager projectId={id} />
        </div>
    )
}
