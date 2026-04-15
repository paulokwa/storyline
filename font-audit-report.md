# Font Audit Report

Project root: `C:\Coding\Storytime\storyline`

Files scanned: **119**

## Executive Summary

- Distinct font families found: **21**
- Distinct font-related class/tokens found: **9**
- Distinct font imports found: **5**
- Potential dynamic/unresolved usages: **255**

## Fonts Ranked Most Used -> Least Used

### serif
- Count: **4**
- Status: **Light usage**
- Top files:
- lib/export/toHtml.ts (3)
- lib/export/toEpub.ts (1)

### Newsreader
- Count: **3**
- Status: **Light usage**
- Top files:
- components/project/story/SceneEditor.tsx (2)
- app/globals.css (1)

### Georgia
- Count: **3**
- Status: **Light usage**
- Top files:
- lib/export/toHtml.ts (3)

### var(--ui-font)
- Count: **2**
- Status: **Light usage**
- Top files:
- app/globals.css (2)

### var(--editor-font)
- Count: **2**
- Status: **Light usage**
- Top files:
- app/globals.css (2)

### inherit !important
- Count: **2**
- Status: **Light usage**
- Top files:
- app/globals.css (2)

### Courier Prime
- Count: **1**
- Status: **Rare outlier**
- Top files:
- app/globals.css (1)

### Courier Final Draft
- Count: **1**
- Status: **Rare outlier**
- Top files:
- app/globals.css (1)

### Courier New
- Count: **1**
- Status: **Rare outlier**
- Top files:
- app/globals.css (1)

### monospace !important
- Count: **1**
- Status: **Rare outlier**
- Top files:
- app/globals.css (1)

### var(--editor-font
- Count: **1**
- Status: **Rare outlier**
- Top files:
- app/globals.css (1)

### serif) !important
- Count: **1**
- Status: **Rare outlier**
- Top files:
- app/globals.css (1)

### viewSettings.fontFamily
- Count: **1**
- Status: **Rare outlier**
- Top files:
- components/project/story/SceneEditor.tsx (1)

### VIEW_FONT_STACKS[font.id] ?? font.id
- Count: **1**
- Status: **Rare outlier**
- Top files:
- components/project/story/SceneEditor.tsx (1)

### -apple-system
- Count: **1**
- Status: **Rare outlier**
- Top files:
- lib/export/toHtml.ts (1)

### BlinkMacSystemFont
- Count: **1**
- Status: **Rare outlier**
- Top files:
- lib/export/toHtml.ts (1)

### Segoe UI
- Count: **1**
- Status: **Rare outlier**
- Top files:
- lib/export/toHtml.ts (1)

### Roboto
- Count: **1**
- Status: **Rare outlier**
- Top files:
- lib/export/toHtml.ts (1)

### Helvetica
- Count: **1**
- Status: **Rare outlier**
- Top files:
- lib/export/toHtml.ts (1)

### Arial
- Count: **1**
- Status: **Rare outlier**
- Top files:
- lib/export/toHtml.ts (1)

### sans-serif
- Count: **1**
- Status: **Rare outlier**
- Top files:
- lib/export/toHtml.ts (1)

## Font-Related Classes / Tokens

### font-bold
- Count: **334**
- Status: **Likely system-wide / core**
- Top files:
- components/project/story/AiHelperPanel.tsx (28)
- components/project/recovery/RecoveryTab.tsx (25)
- app/(app)/project/[id]/stats/page.tsx (24)
- components/app/AiSetupGuide.tsx (21)
- components/project/story/SceneEditor.tsx (20)
- components/project/SavedResponsesTab.tsx (16)
- components/project/sidebar/CommentsPanel.tsx (14)
- components/project/characters/RelationshipManager.tsx (13)
- components/project/ProjectSettingsModal.tsx (12)
- components/export/ExportModal.tsx (11)

### font-medium
- Count: **147**
- Status: **Likely system-wide / core**
- Top files:
- components/new-project/ImportWizard.tsx (14)
- app/(app)/project/[id]/stats/page.tsx (9)
- components/project/SavedResponsesTab.tsx (9)
- components/project/ai/SaveAiResponseModal.tsx (7)
- components/project/story/AiHelperPanel.tsx (7)
- app/(app)/new/page.tsx (6)
- components/project/characters/CharactersTab.tsx (6)
- components/project/story/SceneEditor.tsx (6)
- components/export/ExportModal.tsx (5)
- components/library/ProjectGrid.tsx (5)

### font-serif
- Count: **133**
- Status: **Likely system-wide / core**
- Top files:
- components/project/recovery/RecoveryTab.tsx (14)
- components/project/SavedResponsesTab.tsx (9)
- app/(app)/project/[id]/stats/page.tsx (7)
- components/project/story/AiHelperPanel.tsx (7)
- components/new-project/ImportWizard.tsx (6)
- app/(app)/new/page.tsx (5)
- components/library/ProjectGrid.tsx (5)
- components/project/characters/CharactersTab.tsx (5)
- components/project/ideas/IdeasTab.tsx (5)
- components/project/locations/LocationsTab.tsx (5)

### font-sans
- Count: **53**
- Status: **Likely system-wide / core**
- Top files:
- components/export/ExportModal.tsx (8)
- components/project/characters/CharactersTab.tsx (6)
- components/project/ideas/IdeasTab.tsx (4)
- components/project/locations/LocationsTab.tsx (4)
- components/project/objects/ObjectsTab.tsx (4)
- components/project/story/SceneEditor.tsx (4)
- app/(auth)/login/page.tsx (3)
- app/(auth)/signup/page.tsx (3)
- components/project/ai/AIHelpTab.tsx (3)
- app/(auth)/reset-password/page.tsx (2)

### font-semibold
- Count: **49**
- Status: **Likely system-wide / core**
- Top files:
- components/app/SettingsView.tsx (8)
- components/app/AppNav.tsx (7)
- components/new-project/ImportWizard.tsx (6)
- components/project/ProjectSettingsModal.tsx (6)
- components/app/AiSetupGuide.tsx (3)
- components/project/ai/SaveAiResponseModal.tsx (3)
- app/(auth)/forgot-password/page.tsx (2)
- app/(auth)/login/page.tsx (2)
- components/library/ProjectGrid.tsx (2)
- components/project/ShareModal.tsx (2)

### font-mono
- Count: **14**
- Status: **Moderately used**
- Top files:
- components/app/AiSetupGuide.tsx (3)
- components/app/SettingsView.tsx (2)
- components/project/story/ReaderMode.tsx (2)
- components/export/ExportModal.tsx (1)
- components/project/assets/AssetManager.tsx (1)
- components/project/characters/CharactersTab.tsx (1)
- components/project/ideas/IdeasTab.tsx (1)
- components/project/locations/LocationsTab.tsx (1)
- components/project/objects/ObjectsTab.tsx (1)
- components/project/story/AiHelperPanel.tsx (1)

### font-black
- Count: **7**
- Status: **Moderately used**
- Top files:
- components/project/ShortcutsLegend.tsx (4)
- components/project/OnboardingTour.tsx (1)
- components/project/story/AiPartnerTour.tsx (1)
- components/project/story/SceneEditor.tsx (1)

### font-extrabold
- Count: **3**
- Status: **Light usage**
- Top files:
- app/(app)/new/page.tsx (1)
- components/new-project/GuidedFlow.tsx (1)
- components/project/story/FirstTimeGuidance.tsx (1)

### font-normal
- Count: **3**
- Status: **Light usage**
- Top files:
- components/app/SettingsView.tsx (1)
- components/project/locations/LocationsTab.tsx (1)
- components/project/objects/ObjectsTab.tsx (1)

## Imported Fonts

### Atkinson_Hyperlegible (next/font/google)
- Import count: **1**
- Files:
- app/layout.tsx (1)

### Inter (next/font/google)
- Import count: **1**
- Files:
- app/layout.tsx (1)

### Lora (next/font/google)
- Import count: **1**
- Files:
- app/layout.tsx (1)

### Manrope (next/font/google)
- Import count: **1**
- Files:
- app/layout.tsx (1)

### Newsreader (next/font/google)
- Import count: **1**
- Files:
- app/layout.tsx (1)

## Font Definitions / Theme Tokens

_No explicit font definitions/tokens found._

## Likely Problems To Inspect First

### Fonts used only once
- **Courier Prime** -> app/globals.css
- **Courier Final Draft** -> app/globals.css
- **Courier New** -> app/globals.css
- **monospace !important** -> app/globals.css
- **var(--editor-font** -> app/globals.css
- **serif) !important** -> app/globals.css
- **viewSettings.fontFamily** -> components/project/story/SceneEditor.tsx
- **VIEW_FONT_STACKS[font.id] ?? font.id** -> components/project/story/SceneEditor.tsx
- **-apple-system** -> lib/export/toHtml.ts
- **BlinkMacSystemFont** -> lib/export/toHtml.ts
- **Segoe UI** -> lib/export/toHtml.ts
- **Roboto** -> lib/export/toHtml.ts
- **Helvetica** -> lib/export/toHtml.ts
- **Arial** -> lib/export/toHtml.ts
- **sans-serif** -> lib/export/toHtml.ts


### Font-related classes used only once
- None found.


### Inline / dynamic font usage to manually inspect
- **components/project/story/SceneEditor.tsx** -> `fontFamily: viewSettings.fontFamily`
- **components/project/story/SceneEditor.tsx** -> `fontFamily: VIEW_FONT_STACKS[font.id]`
- **components/project/story/SceneEditor.tsx** -> `className={cn(
                                                                    "py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all text-center",
                                                                    viewSettings.fontFamily === font.id 
                                                                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
                                                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
                                                                )}`
- **components/project/story/SceneEditor.tsx** -> `className={cn(
                                                                    "py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all text-center",
                                                                    viewSettings.fontFamily === font.id 
                                                                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
                                                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
                                                                )}`


### Imported fonts that may be underused
- **Atkinson_Hyperlegible (next/font/google)** -> app/layout.tsx
- **Inter (next/font/google)** -> app/layout.tsx
- **Lora (next/font/google)** -> app/layout.tsx
- **Manrope (next/font/google)** -> app/layout.tsx


## Unresolved / Dynamic Usages

These may need a human look because they are computed or indirect.

- **app/(app)/new/page.tsx** [dynamic] -> `className={cn(
                'group text-left p-8 rounded-[2rem] transition-all duration-500 relative border-2 active:scale-[0.98] outline-none',
                selected
                    ? 'bg-white border-[#546354]/20 shadow-[0_20px_50px_rgba(84,99,84,0.1)] ring-1 ring-[#546354]/10'
                    : 'bg-stone-50/50 hover:bg-white hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)] hover:-translate-y-1 border-transparent hover:border-slate-100',
                disabled && 'opacity-50 cursor-not-allowed'
            )}`
- **app/(app)/new/page.tsx** [dynamic] -> `className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 shadow-sm",
                selected ? "bg-[#546354] text-white scale-110 shadow-xl shadow-[#546354]/20" : "bg-white text-slate-400 group-hover:bg-[#546354]/5 group-hover:text-[#546354]"
            )}`
- **app/(app)/project/[id]/stats/page.tsx** [dynamic] -> `className={cn(
                                                    "text-sm font-mono",
                                                    scene.wordCount === 0 ? "text-slate-300" : "text-slate-600"
                                                )}`
- **app/(app)/project/[id]/stats/page.tsx** [dynamic] -> `className={cn(
                                                    "text-sm font-mono",
                                                    scene.wordCount === 0 ? "text-slate-300" : "text-slate-600"
                                                )}`
- **app/(app)/project/[id]/stats/page.tsx** [dynamic] -> `className={cn("p-2 rounded-xl", bg)}`
- **app/(app)/project/[id]/stats/page.tsx** [dynamic] -> `className={cn("w-4 h-4", color)}`
- **app/(app)/project/[id]/stats/page.tsx** [dynamic] -> `className={cn("h-full transition-all duration-1000", color)}`
- **app/(app)/project/[id]/stats/page.tsx** [dynamic] -> `className={cn(
            "p-1.5 rounded-lg transition-colors border",
            active ? cn("border-slate-100 bg-white shadow-sm", color) : "border-slate-50 bg-slate-50/50 text-slate-200"
        )}`
- **app/layout.tsx** [dynamic] -> `className={`${manrope.variable}`
- **components/app/AiSetupGuide.tsx** [dynamic] -> `className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono transition-colors", done ? "bg-green-100 text-green-600" : active ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400")}`
- **components/app/AiSetupGuide.tsx** [dynamic] -> `className={cn(
                        "w-4 h-4 text-slate-400 transition-transform duration-200",
                        showAdvanced && "rotate-180"
                    )}`
- **components/app/AiSetupGuide.tsx** [dynamic] -> `className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono transition-colors", done ? "bg-green-100 text-green-600" : active ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400")}`
- **components/app/SettingsView.tsx** [dynamic] -> `className={cn(
                                        "text-xs font-bold uppercase tracking-widest",
                                        theme === t.id ? "text-primary" : "text-slate-400"
                                    )}`
- **components/app/SettingsView.tsx** [dynamic] -> `className={cn(
                                        "text-sm font-semibold",
                                        theme === t.id ? "text-slate-900" : "text-slate-600"
                                    )}`
- **components/app/SettingsView.tsx** [dynamic] -> `className={`flex-1 border p-4 rounded-lg cursor-pointer transition-all ${aiProvider === 'gemini' ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`
- **components/app/SettingsView.tsx** [dynamic] -> `className={`flex-1 border p-4 rounded-lg cursor-pointer transition-all ${aiProvider === 'ollama' ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`
- **components/app/SettingsView.tsx** [dynamic] -> `className={`mt-3 p-3 rounded-lg text-xs animate-in fade-in slide-in-from-top-1 duration-300 ${
                                                    geminiStatus.success 
                                                        ? 'bg-green-100/50 border border-green-200 text-green-800' 
                                                        : 'bg-amber-100/50 border border-amber-200 text-amber-800'
                                                }`
- **components/app/SettingsView.tsx** [dynamic] -> `className={`w-1.5 h-1.5 rounded-full ${geminiStatus.success ? 'bg-green-500' : 'bg-amber-500'}`
- **components/app/SettingsView.tsx** [dynamic] -> `className={`mt-3 p-3 rounded-lg text-xs animate-in fade-in slide-in-from-top-1 duration-300 ${
                                                    connectionStatus.success 
                                                        ? 'bg-green-100/50 border border-green-200 text-green-800' 
                                                        : 'bg-amber-100/50 border border-amber-200 text-amber-800'
                                                }`
- **components/app/SettingsView.tsx** [dynamic] -> `className={`w-1.5 h-1.5 rounded-full ${connectionStatus.success ? 'bg-green-500' : 'bg-amber-500'}`
- **components/app/SettingsView.tsx** [dynamic] -> `className={cn(
                                    "relative flex flex-col items-start gap-3 p-4 rounded-[1.5rem] border-2 transition-all duration-300 group overflow-hidden",
                                    theme === t.id 
                                        ? "border-primary bg-primary/5 shadow-lg active:scale-95" 
                                        : "border-slate-100 hover:border-slate-200 bg-white active:scale-95"
                                )}`
- **components/app/SettingsView.tsx** [dynamic] -> `className={cn(
                                        "text-xs font-bold uppercase tracking-widest",
                                        theme === t.id ? "text-primary" : "text-slate-400"
                                    )}`
- **components/app/SettingsView.tsx** [dynamic] -> `className={cn(
                                        "text-sm font-semibold",
                                        theme === t.id ? "text-slate-900" : "text-slate-600"
                                    )}`
- **components/export/ExportModal.tsx** [dynamic] -> `className={cn(
                                                "px-4 py-2 rounded-xl text-xs font-medium transition-all duration-300",
                                                options.scope === s
                                                    ? "bg-white text-slate-900 shadow-sm"
                                                    : "text-slate-500 hover:text-slate-700 hover:bg-white/40",
                                                s !== 'entire_project' && "opacity-50 grayscale cursor-not-allowed" // Disabled for V1
                                            )}`
- **components/export/ExportModal.tsx** [dynamic] -> `className={cn("font-medium text-xs sm:text-sm truncate", options.format === f.id ? "text-slate-900" : "text-slate-600")}`
- **components/export/ExportModal.tsx** [dynamic] -> `className={cn(
                                            "w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-all duration-300",
                                            options.contentMode === mode
                                                ? "bg-amber-50 border-amber-200 text-amber-900 font-medium"
                                                : "bg-white/40 border-transparent text-slate-500 hover:bg-white hover:border-slate-100"
                                        )}`
- **components/export/ExportModal.tsx** [dynamic] -> `className={cn(
                                                "px-4 py-2 rounded-xl text-xs font-medium transition-all duration-300",
                                                options.scope === s
                                                    ? "bg-white text-slate-900 shadow-sm"
                                                    : "text-slate-500 hover:text-slate-700 hover:bg-white/40",
                                                s !== 'entire_project' && "opacity-50 grayscale cursor-not-allowed" // Disabled for V1
                                            )}`
- **components/export/ExportModal.tsx** [dynamic] -> `className={cn(
                                        "flex flex-col items-start p-4 rounded-2xl border transition-all duration-300 text-left",
                                        options.format === f.id
                                            ? "bg-white border-amber-200 shadow-lg shadow-amber-900/5 ring-1 ring-amber-200"
                                            : "border-slate-100 bg-white/40 hover:bg-white hover:border-slate-200"
                                    )}`
- **components/export/ExportModal.tsx** [dynamic] -> `className={cn("w-3.5 h-3.5 shrink-0", options.format === f.id ? "text-amber-600" : "text-slate-400")}`
- **components/export/ExportModal.tsx** [dynamic] -> `className={cn("font-medium text-xs sm:text-sm truncate", options.format === f.id ? "text-slate-900" : "text-slate-600")}`
- **components/export/ExportModal.tsx** [dynamic] -> `className={cn(
                                            "w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-all duration-300",
                                            options.contentMode === mode
                                                ? "bg-amber-50 border-amber-200 text-amber-900 font-medium"
                                                : "bg-white/40 border-transparent text-slate-500 hover:bg-white hover:border-slate-100"
                                        )}`
- **components/export/ExportModal.tsx** [dynamic] -> `className={cn("w-4 h-4 mr-2", loading && "animate-pulse")}`
- **components/library/ProjectGrid.tsx** [dynamic] -> `className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                        isTV ? "bg-stone-50 text-stone-600 group-hover:bg-primary/10 group-hover:text-primary" : "bg-stone-50 text-stone-500 group-hover:bg-primary/10 group-hover:text-primary"
                    )}`
- **components/new-project/GuidedFlow.tsx** [dynamic] -> `className={cn(
                                    'text-sm py-4 px-5 rounded-2xl transition-all text-left font-medium border-2 active:scale-[0.98]',
                                    data.tone === t
                                        ? 'border-primary bg-primary/5 text-primary shadow-inner'
                                        : 'border-transparent bg-stone-50/50 text-slate-500 hover:bg-stone-100 hover:text-slate-800'
                                )}`
- **components/new-project/GuidedFlow.tsx** [dynamic] -> `className={cn(
                                    'text-sm py-4 px-5 rounded-2xl transition-all text-left font-medium border-2 active:scale-[0.98]',
                                    data.tone === t
                                        ? 'border-primary bg-primary/5 text-primary shadow-inner'
                                        : 'border-transparent bg-stone-50/50 text-slate-500 hover:bg-stone-100 hover:text-slate-800'
                                )}`
- **components/new-project/ImportWizard.tsx** [dynamic] -> `className={cn(
                                        "w-full h-14 rounded-full text-base font-semibold gap-3 transition-all duration-500",
                                        sanityInput === 'IMPORT' ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200" : "bg-slate-100 text-slate-300"
                                    )}`
- **components/new-project/ImportWizard.tsx** [dynamic] -> `className={cn("font-medium mb-1", active ? "text-primary" : "text-slate-700")}`
- **components/new-project/ImportWizard.tsx** [dynamic] -> `className={cn(
                        "border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300",
                        uploading 
                            ? "border-primary/50 bg-primary/5" 
                            : "border-slate-200 hover:border-primary/50 hover:bg-stone-50"
                    )}`
- **components/new-project/ImportWizard.tsx** [dynamic] -> `className={cn(
                                        "w-full h-14 rounded-full text-base font-semibold gap-3 transition-all duration-500",
                                        sanityInput === 'IMPORT' ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200" : "bg-slate-100 text-slate-300"
                                    )}`
- **components/new-project/ImportWizard.tsx** [dynamic] -> `className={cn(
                "cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 text-left h-full",
                active 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-slate-100 hover:border-primary/30 hover:bg-stone-50"
            )}`
