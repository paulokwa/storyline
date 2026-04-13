import { create } from 'zustand'

interface ProjectActionsState {
  exportAction: (() => void) | null
  shareAction: (() => void) | null
  settingsAction: (() => void) | null
  statsAction: (() => void) | null
  canShare: boolean
  setActions: (actions: { 
    export: () => void, 
    share: () => void, 
    settings: () => void, 
    stats: () => void,
    canShare: boolean 
  } | null) => void
}

export const useProjectActionsStore = create<ProjectActionsState>((set) => ({
  exportAction: null,
  shareAction: null,
  settingsAction: null,
  statsAction: null,
  canShare: false,
  setActions: (actions) => {
    if (!actions) {
      set({ exportAction: null, shareAction: null, settingsAction: null, statsAction: null, canShare: false })
    } else {
      set({ 
        exportAction: actions.export, 
        shareAction: actions.share, 
        settingsAction: actions.settings,
        statsAction: actions.stats,
        canShare: actions.canShare
      })
    }
  }
}))
