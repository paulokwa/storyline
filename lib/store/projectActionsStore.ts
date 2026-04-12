import { create } from 'zustand'

interface ProjectActionsState {
  exportAction: (() => void) | null
  shareAction: (() => void) | null
  settingsAction: (() => void) | null
  canShare: boolean
  setActions: (actions: { export: () => void, share: () => void, settings: () => void, canShare: boolean } | null) => void
}

export const useProjectActionsStore = create<ProjectActionsState>((set) => ({
  exportAction: null,
  shareAction: null,
  settingsAction: null,
  canShare: false,
  setActions: (actions) => {
    if (!actions) {
      set({ exportAction: null, shareAction: null, settingsAction: null, canShare: false })
    } else {
      set({ 
        exportAction: actions.export, 
        shareAction: actions.share, 
        settingsAction: actions.settings,
        canShare: actions.canShare
      })
    }
  }
}))
