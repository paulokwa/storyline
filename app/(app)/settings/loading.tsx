import RouteLoadingScreen from '@/components/app/RouteLoadingScreen'

export default function Loading() {
    return (
        <RouteLoadingScreen
            variant="settings"
            title="Loading your settings..."
            description="Checking profile, cloud, and AI preferences before the page opens."
            reassurance="Your work is safe."
        />
    )
}
