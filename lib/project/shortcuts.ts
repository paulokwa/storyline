export const OPEN_SHORTCUTS_EVENT = 'storyline:open-shortcuts'

export function requestOpenShortcuts() {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new Event(OPEN_SHORTCUTS_EVENT))
}
