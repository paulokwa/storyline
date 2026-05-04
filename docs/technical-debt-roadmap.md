# Technical Debt & Reliability Roadmap

This document tracks identified architectural risks, technical debt, and reliability improvements that were deferred during initial development. It serves as a guide for future agents or engineers to harden the application.

## High Priority Later

### 1. Atomic Project Scaffolding (RPC)
*   **Why it matters**: Currently, project creation involves multiple sequential `INSERT` calls (Project -> Episode -> Act -> Scene). If any step fails (network drop, server timeout), it leaves "zombie" projects with missing structural components.
*   **Risk if ignored**: Data corruption and a broken onboarding experience for new users.
*   **Suggested Implementation**: Move the scaffolding logic into a single PostgreSQL Stored Procedure (RPC) in Supabase. This ensures the entire project structure is created in a single database transaction.
*   **Priority**: High

### 2. Centralized Rate Limiting
*   **Why it matters**: The AI routes currently use an in-memory `Map` for rate limiting. In a serverless environment (Next.js/Vercel), this registry is reset on every "cold start" and is not shared across distributed instances.
*   **Risk if ignored**: API exploitation and excessive Gemini API costs.
*   **Suggested Implementation**: Replace the in-memory Map with a centralized store like Upstash Redis or use Supabase Edge Functions with a dedicated rate-limiting middleware.
*   **Priority**: High

### 3. Robust Retry & Initialisation Patterns
*   **Why it matters**: The editor save and project initialization flows rely on standard `async/await` without sophisticated retry logic.
*   **Risk if ignored**: Intermittent network failures can lead to "Save Failed" states that require manual user intervention.
*   **Suggested Implementation**: Implement an exponential backoff retry strategy for core Supabase operations, especially for the `SceneEditor` save flow.
*   **Priority**: High

### 4. AI Trial Reconciliation & RPC Failure Handling
*   **Why it matters**: The free-trial AI system is server-authoritative, but several routes still assume `finalize_ai_trial_usage`, `fail_ai_trial_usage`, and trial-grant RPCs succeed once called.
*   **Risk if ignored**: Balance drift, silent trial-grant failures, or usage-event rows that do not reconcile cleanly with account balances after provider errors or partial failures.
*   **Suggested Implementation**: Add explicit error handling and alerting around all trial RPC calls, add an admin-visible reconciliation check between `ai_trial_accounts`, `ai_usage_events`, and `ai_trial_ledger`, and add tests for duplicate submit / retry / provider failure scenarios.
*   **Priority**: High

### 5. AI Abuse Controls Hardening
*   **Why it matters**: Current trial abuse protections rely on normalized email checks, a static disposable-domain list, forwarded IP headers, and a browser fingerprint. These are useful signals but remain easy to evade.
*   **Risk if ignored**: Trial farming, noisy false negatives, and avoidable sponsored AI spend during wider rollout.
*   **Suggested Implementation**: Add stronger signup friction for suspicious traffic, move rate limiting to centralized infrastructure, expand or externalize disposable-domain intelligence, and treat fingerprint/IP signals as heuristics rather than strong identity.
*   **Priority**: High

## Medium Priority Later

### 1. Unified Type Safety (Supabase Generics)
*   **Why it matters**: Generated `Database` types already exist, but there is still scattered `(supabase as any)` and `any` usage in older data-heavy areas.
*   **Risk if ignored**: Silent runtime errors and regression risks during database schema changes.
*   **Current state**: Shared Supabase clients already use the generated `Database` types. The remaining work is incremental cleanup in older persistence, recovery, comments, export, and sidebar code.
*   **Suggested Implementation**: Reduce legacy `any` usage one problem area at a time rather than attempting a whole-app typing rewrite.
*   **Priority**: Medium

### 2. State Management Consolidation (Zustand)
*   **Why it matters**: Some shared UI state is still coordinated through local component trees and prop-drilling.
*   **Risk if ignored**: Maintainability can become painful if a specific workflow starts needing the same state in too many places.
*   **Current state**: Zustand is already in use for `projectActionsStore`, so this is not a missing dependency problem.
*   **Suggested Implementation**: Only broaden Zustand usage when a concrete shared-state pain point justifies it; do not migrate state into a global store just for architectural neatness.
*   **Priority**: Medium

### 3. Structure Tree Performance
*   **Why it matters**: The `StructureTree` re-renders frequently and uses nested mapping for large trees.
*   **Risk if ignored**: Significant UI lag in projects with hundreds of scenes or chapters.
*   **Suggested Implementation**: Implement `React.memo` for tree nodes and verify performance via React Profiler. Consider a virtualized list if the tree exceeds 500+ nodes.
*   **Priority**: Medium

### 4. Local AI Usage Logging Integrity
*   **Why it matters**: The Ollama logging endpoint is useful for admin analytics, but it currently trusts authenticated client posts for local usage event reporting.
*   **Risk if ignored**: Admin reporting for local AI can become noisy or misleading, especially if clients post malformed or duplicated usage events.
*   **Suggested Implementation**: Validate active mode before accepting local usage logs, deduplicate more aggressively, and clearly separate analytics-grade data from billing-grade data in admin views.
*   **Priority**: Medium

### 5. Help System Feature Audit & Rewrite
*   **Why it matters**: The current Help page likely focuses on obvious features and may miss hidden, advanced, or mode-specific functionality (local/cloud, AI, collaboration, backup, screenplay vs prose).
*   **Risk if ignored**: Users cannot discover key features, leading to confusion, underuse of capabilities, and increased support burden.
*   **Suggested Implementation**: Perform a two-phase process:
    *   **Phase 1: Full Feature Audit** — Scan the entire codebase and extract every user-facing feature, including hidden behaviors, edge cases, role-based restrictions, and mode-specific functionality.
    *   **Phase 2: Help System Rewrite** — Convert the full feature inventory into a structured, searchable Help Center covering all features with clear "what it does," "where to find it," and "how to use it" guidance.
*   **Failure Condition**: If Phase 1 does not produce a comprehensive feature inventory, Phase 2 must not proceed.
*   **Constraints**:
    *   Do not begin until core features have stabilized.
    *   Do not allow AI to skip the audit phase.
    *   Require a final coverage check ensuring every feature is documented.
*   **Execution Prompts**:

    **Phase 1 — Full Feature Audit Prompt**

    ```md
    You are performing a FULL FEATURE AUDIT of this codebase.

    GOAL:
    Extract EVERY user-facing feature, including:
    - Visible UI features
    - Hidden or non-obvious features
    - Settings, toggles, and modes
    - Local/cloud/offline behaviours
    - Import/export/save/open behaviours
    - AI features and AI-related warnings
    - Collaboration and feedback/comment features
    - Backup, restore, merge, and recovery features
    - Asset/image/reference features
    - Screenplay/prose-specific editor behaviours
    - Keyboard shortcuts
    - Error states, fallback behaviours, and disabled states
    - Empty states and onboarding/help text
    - Helper text, tips, and labels (e.g., ensure "Testing Tip" placeholders are replaced with "Export Tip" or similar polished copy)
    - Role-based restrictions such as viewer/editor/owner permissions

    DO NOT summarize.
    DO NOT skip anything.
    ASSUME that missing features is a failure.

    PROCESS:
    1. Scan all frontend components, routes, menus, settings screens, editor extensions, dialogs, onboarding flows, and feature-specific utilities.
    2. Identify anything a user can click, trigger, configure, see, import, export, enable, disable, recover, save, open, dismiss, search, or interact with.
    3. Group features by area, such as Library, Project Creation, Editor, Structure Tree, AI, Local/Cloud, Collaboration, Feedback, Assets, Import/Export, Settings, Help, Onboarding, Admin, and Error/Empty States.
    4. Include related files/components for each feature so later agents can verify the source.
    5. Mark confidence level for each feature area.

    OUTPUT FORMAT:

    # Full Feature Inventory

    ## [Feature Area]

    ### [Feature Name]
    - What it does:
    - Where it appears:
    - When it appears:
    - Who can use it:
    - Related files/components:
    - Hidden or non-obvious behaviours:
    - Edge cases:
    - Help page priority: High / Medium / Low
    - Confidence: High / Medium / Low

    ## Missing Confidence Areas
    List anything unclear, ambiguous, or possibly incomplete.

    ## Coverage Risk
    List app areas that may need manual review by Kwame.

    IMPORTANT:
    If you are not confident that all features are captured, say so clearly. Do not pretend the audit is complete if it is not.
    ```

    **Phase 2 — Help System Rewrite Prompt**

    ```md
    Now convert the FULL FEATURE INVENTORY into a COMPLETE HELP SYSTEM.

    GOAL:
    Create a searchable, user-friendly Help Center that explains all user-facing features discovered in Phase 1.

    RULES:
    - Every feature from the Phase 1 inventory must be documented or explicitly listed as intentionally omitted with a reason.
    - Do not only document obvious features.
    - Assume users do not know hidden behaviours, advanced options, local/cloud differences, AI availability states, or role restrictions.
    - Write in clear, non-technical language for normal users.
    - Include "Where to find it" for important features.
    - Include warnings or limitations where relevant, especially around AI, privacy, local/cloud storage, file saving, collaboration, import/export, backups, and destructive actions.
    - Preserve accurate terminology from the app UI.

    SUGGESTED STRUCTURE:

    # Help Center

    ## Getting Started
    ## Project Basics
    ## Writing and Editing
    ## Planning and Structure
    ## Screenplay Mode
    ## Prose / Book Mode
    ## Local Projects and Offline Use
    ## Cloud Sync and Collaboration
    ## Feedback and Comments
    ## Assets and Visual References
    ## Import, Export, Save, and Backup
    ## AI Features
    ## Privacy and Data Choices
    ## Troubleshooting
    ## Advanced Features
    ## Frequently Asked Questions

    FOR EACH FEATURE SECTION, USE THIS PATTERN WHERE PRACTICAL:

    ### [Feature Name]
    - What it does:
    - Where to find it:
    - How to use it:
    - When it is useful:
    - Limitations or warnings:
    - Related features:

    FINAL STEP:
    Add a coverage check.

    # Coverage Check

    Create a table with:
    - Feature from Phase 1
    - Help section where it is documented
    - Status: Documented / Intentionally omitted
    - Notes

    Do not mark this task complete unless every Phase 1 feature appears in the coverage check.
    ```
*   **Priority**: Medium

## Lower Priority / Future Enhancements

### 0. First-class story summaries for outline export
*   **Why it matters**: Storyline currently has dormant export support for `node.summary` and summary-related content modes, but there is no normal user workflow or data model field for exportable scene, chapter, or act summaries.
*   **Current state**: Exporters can output summaries if `node.summary` exists, but `buildExportPayload()` does not currently populate it. The summary-related export modes were hidden from the Export Manuscript modal to avoid misleading users.
*   **Future product decision needed**:
    *   Decide whether summaries should exist at scene level only, or also chapter and act level.
    *   Decide whether summaries are manually authored, AI-generated, or both.
    *   Decide whether AI Scene Analysis summaries should remain separate from exportable story summaries.
    *   Add proper local and cloud persistence if summaries become first-class story data.
    *   Wire `buildExportPayload()` to populate `node.summary`.
    *   Re-enable `Outline Summaries` and `Outline + Prose` only after the feature is real and tested.
*   **Priority**: Low

### 0.1 Scoped exports for episodes, chapters, scenes, and selected structure nodes
*   **Why it matters**: The Export Manuscript modal previously exposed Episodes and Scenes scope options, but they were globally disabled and not connected to real project structure or export filtering.
*   **Current state**: `buildExportPayload()` currently exports all active nodes and does not use `options.scope` or `selectedIds`. The incomplete scope options were hidden from the modal to avoid confusing users.
*   **Future implementation should**:
    *   Define supported export scopes for Book and Screenplay projects.
    *   Decide whether scope options should be Episodes, Acts, Chapters, Scenes, or selected structure nodes depending on project type.
    *   Add UI for choosing specific nodes or scenes to export.
    *   Preserve selected structure order.
    *   Update `buildExportPayload()` to filter nodes based on scope and `selectedIds`.
    *   Ensure parent headings are handled correctly when exporting selected child nodes.
    *   Update Export Preview to reflect selected scope.
    *   Test Markdown, TXT, HTML, DOCX, EPUB, and PDF outputs.
    *   Verify local and cloud projects behave consistently.
    *   Re-enable scoped export UI only after the pipeline is real and tested.
*   **Priority**: Low

### 0.2 Browser download overwrite friction for same-name exports
*   **Why it matters**: On Chrome desktop for Windows, exporting a file with the same name as a recent prior download can trigger a browser-level `Needs permission to download` interruption, even when new filenames work normally.
*   **Current state**: Storyline uses normal browser blob downloads for manuscript exports. Repeated same-name exports may hit Chrome's automatic-download or overwrite protection behavior on `localhost`, which creates confusing failures during testing.
*   **Future implementation should**:
    *   Reproduce the same-name overwrite/download-permission issue reliably on Chrome desktop for Windows.
    *   Determine whether the best fix is browser guidance, filename strategy, or an in-app warning before download.
    *   Consider a small user-facing note explaining that repeated same-name exports may require allowing automatic downloads or choosing a new filename.
    *   Verify behavior across DOCX, PDF, HTML, EPUB, Markdown, and TXT exports.
*   **Priority**: Low

### 1. Advanced Offline / Pending Sync

*   **Description**: When a cloud scene save fails due to a network drop, the editor shows "Save failed" and stops retrying. If the user's connection is briefly lost while writing, their edits are at risk until they manually re-edit to trigger the next autosave. This task adds a persistent pending-sync queue so failed saves are held and automatically replayed when the connection returns.
*   **Current behaviour (audited 2026-05-03)**:
    *   `lib/persistence/scenes.ts → saveSceneContent()` wraps all Supabase saves in `withPersistenceRetry()` (3 attempts, exponential backoff 250ms–1500ms).
    *   After all retries fail, `SceneEditor.tsx` sets `saveStatus = 'error'` and shows "Save failed".
    *   The autosave effect gate (`if (saveStatus !== 'idle') return`) then prevents further retries until the user makes a new edit.
    *   There is **no `navigator.onLine` / `online` / `offline` event handling** anywhere in the app.
    *   There is **no pending-sync queue** — failed saves are silently dropped after the UI error.
    *   `localStorage` is only used for UI preferences (theme, tour state), not for sync fallback. The task name is slightly misleading; the real gap is no queue at all.
    *   IndexedDB (`lib/persistence/local-db.ts`, DB version 3, 12 stores) is the primary local storage for local-only projects. Cloud projects use Supabase exclusively.
*   **Recommended implementation — Tier 2 (IndexedDB-persisted queue)**:
    1.  Add a `pending_saves` store to IndexedDB (bump `DB_VERSION` to 4 in `local-db.ts`). Key by `scene.id` so there is only ever one pending save per scene (later writes overwrite earlier ones — correct, only latest matters).
    2.  Create `lib/persistence/pending-sync.ts` with `enqueuePendingSave`, `dequeuePendingSave`, `getPendingSave`, and `getPendingSavesByProject` helpers.
    3.  In `SceneEditor.tsx → saveContent`: when `saveSceneContent()` returns `{ status: 'error' }` AND `isRetryablePersistenceError(error)` AND the project is not local-only, enqueue the save and set `saveStatus = 'offline'` instead of `'error'`. Show "Offline — changes queued" in the status bar.
    4.  Add a `window.addEventListener('online', ...)` effect in `SceneEditor`. When fired, reset `saveStatus` to `'idle'` so the existing 1.5s autosave picks up the dirty editor content. On successful save, also call `dequeuePendingSave(scene.id)`.
    5.  On `SceneEditor` mount (scene change): call `getPendingSave(scene.id)`. If a pending save exists and its `local_version === scene.version` (nobody edited on the server while offline), restore the pending content into the editor, set `isDirty = true`, and let the autosave flush it. If `local_version < scene.version`, discard the stale pending save and clear it — the existing update-banner / conflict modal will surface the server-side change.
*   **Version conflict handling**: Already solved. `saveSceneContent()` uses optimistic concurrency (`.eq('version', localVersion)`). If a collaborator edited while the user was offline, the replayed save returns `{ status: 'conflict' }` and the existing Collaboration Conflict modal fires — no new logic needed.
*   **What to skip (Tier 3 — post-launch only)**:
    *   Service Worker / Background Sync API — Chrome-only, major infra addition, overkill for a writing tool.
    *   ProjectShell-level offline indicator for scenes that are not currently mounted.
    *   Multi-scene background queue flush (only relevant if users switch scenes while offline).
*   **Files to change**: `lib/persistence/local-db.ts`, `lib/persistence/pending-sync.ts` (new), `components/project/story/SceneEditor.tsx`
*   **Priority**: Low — the existing 3× retry with backoff handles brief hiccups. The `.storyline` manual-save workflow also gives users an escape hatch. This becomes higher priority if offline writing is a marketed feature.

### 2. Destructive Action Guards

*   **Description**: Strengthen delete confirmations for high-impact actions, particularly deleting container structure nodes that have child content.
*   **Current behaviour (audited 2026-05-03)**:
    *   **Library project delete**: Two-step inline confirmation (click Trash → confirm panel with Cancel/Delete). Moves to trash (soft-delete), not immediate permanent loss. ✅ Adequate.
    *   **Structure tree container nodes (Act, Part, Episode, Chapter)**: Two-step inline confirmation panel (`confirmingDeleteId` state in `StructureTree.tsx`) shows "Delete this Act?" with Cancel/Trash buttons. ✅ Two-step exists — but **no child-count warning**. Deleting an Act with 10 chapters and 30 scenes shows the same small amber panel as deleting a single empty scene. The user has no indication of how much nested content will be trashed.
    *   **Characters, locations, ideas, objects**: Single-click direct delete with **no confirmation**. Lower stakes (planning entities, not prose) — items are removed immediately but are not prose content.
    *   **Account deletion**: Has its own confirmation flow in `SettingsView.tsx`.
    *   **No native browser dialogs remain** — all `window.confirm()` / `window.alert()` calls were replaced in a prior session.
*   **Why not a launch blocker**: Structure node deletes go to recovery/trash, not permanent deletion, so accidental deletes are recoverable. The two-step guard prevents the most common accidents.
*   **Recommended improvements (priority order)**:
    1.  **Child-count warning on container node delete** (highest value): When the node being deleted has children, add a sub-line to the existing inline confirm panel: e.g., "This will also trash 3 chapters and 12 scenes." No modal needed — just add the count to the existing amber panel in `StructureTree.tsx`. Child count is computable from `childrenByParentId` in `StoryTab.tsx`.
    2.  **Entity delete confirmation** (medium value): Add a single-step inline confirm for characters, locations, ideas, and objects tabs, matching the library card pattern. Currently these delete on first click with no guard.
    3.  **"Type DELETE" for permanent destroy** (low value, post-launch only): Only relevant for the permanent destroy action in the trash view, not the soft-delete path.
*   **Files to change**: `components/project/story/StructureTree.tsx`, `components/project/story/StoryTab.tsx`, `components/project/characters/CharactersTab.tsx`, `components/project/locations/LocationsTab.tsx`, `components/project/ideas/IdeasTab.tsx`, `components/project/objects/ObjectsTab.tsx`
*   **Priority**: Low — not a launch blocker. The child-count warning (item 1 above) is the most valuable improvement and would take under a day.

### 3. Writing UX Polish
*   **Description**: Implement subtle animations for cursor focus, smoother "paper" transitions, and customizable font-size/theme settings (Sepia/Dark).
*   **Priority**: Low

### 4. Optional Later Improvements (Backup & Assets)
*   **Description**: Refine the local-only data management and recovery experience.
*   **Status**: Native `.storyline` Save/Save As/Open workflow (Phase 1-3) implemented.
*   **Open Items**:
    *   **Versioning**: Support multiple local backups with timestamps/names rather than a single manual file.
    *   **Better asset handling**: Optimize how binary files and high-res attachments are serialized in the `.storyline` format.
    *   **Backup file size warning**: ✅ **Done (2026-05-03)**. `estimateBackupSizeBytes()` was already implemented in `lib/backup/export-local-backup.ts` and returned from `exportLocalBackup()`, but the return value was discarded by all callers. Added a `toast.warning()` in `BackupBanner.tsx` and both backup callers in `ProjectShell.tsx` when `sizeBytes > 20 MB`. Message explains embedded images are the cause and that it is normal.
*   **Priority**: Low

### 5. Portable image export and asset bundling

Owners should eventually be able to export portable images, not only expiring image URLs or placeholders.

Current state:
- HTML/EPUB/Markdown may reference image URLs.
- Cloud image URLs may be signed and expire.
- Local/blob URLs may not be portable.
- DOCX currently degrades images to placeholders.
- Plain text placeholders are acceptable.

Future implementation should audit:
- local asset storage
- cloud/Supabase signed URL expiry
- image byte fetching
- CORS/PDF rendering
- EPUB image bundling
- DOCX image embedding
- Markdown asset-folder export
- HTML asset-folder or base64 export
- file-size warnings for large exports

Recommended product behavior:
- `.storyline` backup should preserve assets for restore.
- HTML/EPUB/PDF should eventually preserve visible inline images.
- Markdown can use image links or an asset folder.
- DOCX embedded images are desirable but can come later.
- Plain text should keep placeholders only.

Do not treat this as part of the current editor/font/export parity batch.

*   **Priority**: Low

### 6. Feedback Panel: AI filter consistency

**Status:** Open
**Priority:** Low-Medium
**Area:** Feedback / Comments / AI Feedback

**Issue:**
The Feedback panel AI chip currently matches only:
- `anchor_data.type === 'ai-analysis'`

Feedback saved from the AI Helper panel uses:
- `anchor_data.type === 'ai-feedback'`

As a result, AI Helper feedback appears under All/Mine but not under the AI filter chip.

**Why this matters:**
Users may reasonably expect the AI filter to show all AI-generated feedback, not only Scene Analysis feedback.

**Recommendation:**
Confirm intended product behaviour. If the AI chip is meant to include all AI-generated feedback, update the filter/count/badge logic to include both `'ai-analysis'` and `'ai-feedback'`.

**Notes:**
Do this as a separate intentional change. Do not bundle it with comment highlight polish.

*   **Priority**: Low-Medium

### 7. Feedback Panel: Active highlight after resolving active comment

**Status:** Open
**Priority:** Low
**Area:** Feedback / Comments / Editor Highlighting

**Issue:**
If a comment is resolved while it is the active comment, ProseMirror may recreate the inline comment span and drop the manually-applied `.active` class.

**Current behaviour:**
- The comment card remains selected.
- The inline text receives the correct resolved styling.
- The stronger active ring/highlight may disappear until the user clicks or jumps to the comment again.

**Why this matters:**
This is a minor visual polish edge case. It does not affect saved content, comment status, permissions, or manuscript readability.

**Recommendation:**
Only fix if this becomes noticeable in manual testing. Possible fix: reapply active styling after comment status sync, but avoid broad dependencies that cause the effect to run too often.

*   **Priority**: Low

## Future Plans — Editor, Fonts, and Proofing

These items are intentionally separated from the immediate editor polish task. They should not be interpreted as approval to build a Google Docs or Microsoft Word clone. Storyline should remain a focused creative-writing app with strong manuscript-writing comfort, screenplay-aware editing, reliable export, and compatibility with browser/third-party proofing tools.

### 1. Custom dictionary / story dictionary
*   **Why it matters**: Fiction projects often contain invented names, places, species, magic terms, technical jargon, and stylized language. Browser spellcheck will flag many of these repeatedly.
*   **Current state**: No first-party custom dictionary or project dictionary has been identified. The app can reasonably rely on browser spellcheck and third-party tools for now.
*   **Future implementation idea**:
    *   Add a project-level "Story Dictionary" that stores approved custom words.
    *   Allow words to be added manually from settings and, later, from editor context actions.
    *   Consider optional Codex integration so character/location/object names can be treated as known story terms.
    *   Keep this separate from full grammar checking.
*   **Priority**: Future / Nice-to-have

### 2. Ignore word for invented names and terms
*   **Why it matters**: Writers need a quick way to stop seeing repeated false positives for invented words.
*   **Current state**: Not implemented.
*   **Future implementation idea**:
    *   Provide a lightweight "Ignore in this project" action if/when the app gains its own proofing layer or story dictionary UI.
    *   Store ignored terms per project, not globally, unless a later settings design explicitly supports global ignored words.
    *   Avoid building this before a clear dictionary/proofing architecture exists.
*   **Priority**: Future / Nice-to-have

### 3. Codex-aware spellcheck hints
*   **Why it matters**: Storyline already has a Codex-like story knowledge system. In the future, that system could help distinguish genuine typos from valid story terms.
*   **Current state**: Codex/story entities exist, but no first-party spellcheck integration has been identified.
*   **Future implementation idea**:
    *   Treat Codex names and aliases as allowed project terms in a future proofing pass.
    *   Optionally detect near-matches to Codex entries as possible typos, e.g. a misspelled character name.
    *   Keep suggestions gentle and optional to avoid noisy editor behavior.
*   **Priority**: Future / Nice-to-have

### 4. Readability stats
*   **Why it matters**: Some writers like quick feedback on sentence length, reading level, pacing density, or scene complexity.
*   **Current state**: No dedicated readability stats were identified in the editor audit.
*   **Future implementation idea**:
    *   Add non-blocking readability stats as a review/analytics feature rather than intrusive inline warnings.
    *   Consider scene-level and project-level summaries.
    *   Avoid moralizing or prescriptive scoring; present stats as optional writing information.
*   **Priority**: Future / Nice-to-have

### 5. Suggested edits / review mode
*   **Why it matters**: Collaboration may eventually benefit from suggested replacements rather than only comments.
*   **Current state**: Inline comments/feedback exist, but full tracked changes or Google Docs-style suggestion mode is not implemented and is not required now.
*   **Future implementation idea**:
    *   Only revisit after collaboration and comments are stable.
    *   If implemented, keep it narrow: suggested text replacements with accept/reject, not a full word-processor revision engine.
    *   Define export behavior before implementation.
*   **Priority**: Future / Larger candidate

### 6. Compare documents
*   **Why it matters**: Useful for advanced revision workflows, but it is expensive and complex relative to current product goals.
*   **Current state**: Not implemented.
*   **Future implementation idea**:
    *   Defer unless users strongly request it.
    *   Prefer version history / scene snapshots first if revision comparison becomes important.
*   **Priority**: Future / Low

### 7. Citations
*   **Why it matters**: Helpful for academic/nonfiction workflows, but not central to a fiction/screenplay-first writing app.
*   **Current state**: Not implemented.
*   **Future implementation idea**:
    *   Do not build unless Storyline deliberately expands into nonfiction/research workflows.
    *   If ever added, keep it separate from the core creative editor.
*   **Priority**: Future / Low

### 8. Headers, footers, page numbers, and columns
*   **Why it matters**: These are document layout features, not core creative drafting features.
*   **Current state**: Not implemented as editor tools.
*   **Future implementation idea**:
    *   Keep out of the editor for now.
    *   Consider page numbers only inside export templates or manuscript preview, not the live writing surface.
    *   Avoid columns unless a future export/layout system specifically requires them.
*   **Priority**: Future / Avoid for now

### 9. Full export formatting templates
*   **Why it matters**: Writers may eventually want manuscript presets, screenplay formatting presets, or publisher/submission-oriented export styles.
*   **Current state**: Export exists across multiple formats, but editor display settings do not drive export formatting and formatter parity is uneven.
*   **Future implementation idea**:
    *   Design an explicit export formatting model instead of casually wiring live editor display preferences into export.
    *   Start with a small set of presets, e.g. manuscript draft, compact proofing copy, screenplay standard.
    *   Make preview and output match closely before exposing many options.
*   **Priority**: Future / Medium candidate

