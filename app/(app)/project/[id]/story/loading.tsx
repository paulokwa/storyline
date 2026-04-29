import RouteLoadingScreen from '@/components/app/RouteLoadingScreen'

export default function Loading() {
    return (
        <RouteLoadingScreen
            variant="workspace"
            title="Opening your workspace..."
            description="Loading story structure, notes, and scene data for this project."
            reassurance="Your work is safe."
        />
    )
}
