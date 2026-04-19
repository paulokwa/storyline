export const WORKSPACE_TOUR_PENDING_KEY = 'storyline-workspace-tour-pending'

export function queueWorkspaceTourStart() {
    if (typeof window === 'undefined') return

    sessionStorage.setItem(WORKSPACE_TOUR_PENDING_KEY, 'true')
}
