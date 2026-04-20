import { create } from 'zustand'

interface ProjectActionsState {
  exportAction: (() => void) | null
  shareAction: (() => void) | null
  settingsAction: (() => void) | null
  statsAction: (() => void) | null
  canShare: boolean
  canExport: boolean
  exportDisabledReason: string | null
  setActions: (actions: { 
    export: () => void, 
    share: () => void, 
    settings: () => void, 
    stats: () => void,
    canShare: boolean,
    canExport: boolean,
    exportDisabledReason?: string | null
  } | null) => void
}

export const useProjectActionsStore = create<ProjectActionsState>((set) => ({
  exportAction: null,
  shareAction: null,
  settingsAction: null,
  statsAction: null,
  canShare: false,
  canExport: true,
  exportDisabledReason: null,
  setActions: (actions) => {
    if (!actions) {
      set({ exportAction: null, shareAction: null, settingsAction: null, statsAction: null, canShare: false, canExport: true, exportDisabledReason: null })
    } else {
      set({ 
        exportAction: actions.export, 
        shareAction: actions.share, 
        settingsAction: actions.settings,
        statsAction: actions.stats,
        canShare: actions.canShare,
        canExport: actions.canExport,
        exportDisabledReason: actions.exportDisabledReason ?? null
      })
    }
  }
}))
