import RouteLoadingScreen from '@/components/app/RouteLoadingScreen'

export default function Loading() {
    return (
        <RouteLoadingScreen
            variant="library"
            title="Loading your library..."
            description="Still loading your projects, covers, and recent activity."
            reassurance="Your work is safe."
        />
    )
}
