export const AI_TOUR_PENDING_KEY = 'storyline-ai-tour-pending'
export const AI_TOUR_STARTED_KEY = 'storyline-ai-tour-started'
export const AI_TOUR_COMPLETE_KEY = 'storyline-ai-tour-complete'
export const AI_TOUR_START_EVENT = 'storyline:start-ai-tour'

export function queueAiTourStart() {
    if (typeof window === 'undefined') return

    sessionStorage.setItem(AI_TOUR_PENDING_KEY, 'true')

    window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent(AI_TOUR_START_EVENT))
    }, 0)
}
