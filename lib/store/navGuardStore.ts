import { create } from 'zustand'

interface NavGuardState {
  importDirty: boolean
  showImportLeaveWarning: boolean
  pendingNavAction: (() => void) | null
  setImportDirty: (dirty: boolean) => void
  setShowImportLeaveWarning: (show: boolean) => void
  setPendingNavAction: (action: (() => void) | null) => void
}

export const useNavGuardStore = create<NavGuardState>((set) => ({
  importDirty: false,
  showImportLeaveWarning: false,
  pendingNavAction: null,
  setImportDirty: (dirty) => set({ importDirty: dirty }),
  setShowImportLeaveWarning: (show) => set({ showImportLeaveWarning: show }),
  setPendingNavAction: (action) => set({ pendingNavAction: action }),
}))
