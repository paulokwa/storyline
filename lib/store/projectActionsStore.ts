import { create } from 'zustand'

interface ProjectActionsState {
  exportAction: (() => void) | null
  saveAction: (() => void) | null
  saveAsAction: (() => void) | null
  restoreAction: (() => void) | null
  shareAction: (() => void) | null
  settingsAction: (() => void) | null
  statsAction: (() => void) | null
  canShare: boolean
  canExport: boolean
  exportDisabledReason: string | null
  linkedFileName: string | null
  lastFileSaveAt: string | null
  setActions: (actions: { 
    export: () => void, 
    save?: () => void,
    saveAs?: () => void,
    restore?: () => void,
    share: () => void, 
    settings: () => void, 
    stats: () => void,
    canShare: boolean,
    canExport: boolean,
    exportDisabledReason?: string | null,
    linkedFileName?: string | null,
    lastFileSaveAt?: string | null
  } | null) => void
}

export const useProjectActionsStore = create<ProjectActionsState>((set) => ({
  exportAction: null,
  saveAction: null,
  saveAsAction: null,
  restoreAction: null,
  shareAction: null,
  settingsAction: null,
  statsAction: null,
  canShare: false,
  canExport: true,
  exportDisabledReason: null,
  linkedFileName: null,
  lastFileSaveAt: null,
  setActions: (actions) => {
    if (!actions) {
      set({ 
        exportAction: null, 
        saveAction: null,
        saveAsAction: null,
        restoreAction: null, 
        shareAction: null, 
        settingsAction: null, 
        statsAction: null, 
        canShare: false, 
        canExport: true, 
        exportDisabledReason: null,
        linkedFileName: null,
        lastFileSaveAt: null
      })
    } else {
      set({ 
        exportAction: actions.export, 
        saveAction: actions.save ?? null,
        saveAsAction: actions.saveAs ?? null,
        restoreAction: actions.restore ?? null,
        shareAction: actions.share, 
        settingsAction: actions.settings,
        statsAction: actions.stats,
        canShare: actions.canShare,
        canExport: actions.canExport,
        exportDisabledReason: actions.exportDisabledReason ?? null,
        linkedFileName: actions.linkedFileName ?? null,
        lastFileSaveAt: actions.lastFileSaveAt ?? null
      })
    }
  }
}))
