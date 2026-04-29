import RouteLoadingScreen from '@/components/app/RouteLoadingScreen'

export default function Loading() {
    return (
        <RouteLoadingScreen
            variant="form"
            title="Preparing a fresh page..."
            description="Setting up project options, import tools, and your drafting flow."
            reassurance="Nothing from your existing work is being changed."
        />
    )
}
