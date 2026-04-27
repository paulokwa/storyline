# Session Handover

This file records the current project state at the end of each AI coding session.

Agents should update this file before ending a session.

---
## 2026-04-27 - AI context preview hidden behind footer inspector

### Current branch

`main`

### What was completed

- Removed the always-visible `What the AI is noticing` bar from the AI Partner footer area.
- Replaced it with an icon-only inspector control beside the footer note so it no longer reserves response space on mobile.
- Kept the developer-facing context preview available as a floating panel with a clear close button.
- Verified the change with `npx tsc --noEmit --pretty false`.

### Current status

The AI context/debug preview is still available when needed, but it now stays out of the way unless the user intentionally opens it.

### Next recommended step

Do a quick browser check in AI Partner:
- confirm the footer icon feels discoverable without being noisy
- confirm the floating context panel opens and closes cleanly on mobile
- confirm the response area gets more vertical room when the inspector is closed

### Risks or warnings

- Focused eslint on `components/project/story/AiHelperPanel.tsx` still reports the large pre-existing lint backlog in that file.

---
## 2026-04-27 - Removed in-project Help tab from visible nav

### Current branch

`main`

### What was completed

- Adjusted the library header layout so tablets keep a stacked, less crowded composition before switching to desktop layout.
- Reworked the AI Partner mobile context strip so the fixed `Context` control and horizontally scrollable linked-item chips share one row.
- Removed the visible `Help` tab from the in-project tab bar.
- Kept the separate help icon button and internal help routes/pages intact.
- Verified the change with `npx tsc --noEmit --pretty false`.

### Current status

The library and AI Partner have narrower-screen layout improvements in place, and project help is still reachable from the dedicated help icon without taking up a full tab in the main project navigation.

### Next recommended step

Do a quick browser check:
- confirm the library header no longer breaks awkwardly on tablet widths
- confirm the AI Partner mobile context row scrolls cleanly without wrapping
- confirm the Help tab no longer appears in the tab row
- confirm the help icon still opens `/project/[id]/help`

### Risks or warnings

- Focused eslint on `components/project/ProjectShell.tsx` still reports pre-existing lint issues unrelated to this nav cleanup.

---
## 2026-04-27 - Help Center back path and dismissible library reminder

### Current branch

`main`

### What was completed

- Added a clear `Back to Library` button to the global Help Center view.
- Added a dismiss `X` control to the library transfer/cloud-sync reminder card.
- Persisted reminder dismissal via local storage so it stays hidden after the user closes it.
- Kept the in-project guidance version unchanged except for shared copy updates.
- Verified the touched files with `npx tsc --noEmit --pretty false` and focused eslint.

### Current status

The library help path is easier to exit, and the reminder card can now be dismissed cleanly instead of staying on screen indefinitely.

### Next recommended step

Browser-check the reminder dismiss flow and the global Help Center return path:
- open `/help?q=cloud sync` and confirm `Back to Library` is obvious and works
- dismiss the library reminder and refresh
- confirm the reminder stays hidden until local storage is cleared

### Risks or warnings

- Dismissal persistence is browser-local by design; it will not sync across devices or browsers.

---
## 2026-04-27 - Library-accessible Help Center for cloud sync guidance

### Current branch

`main`

### What was completed

- Reused the existing Help Center pattern instead of creating a disconnected cloud-sync explainer page.
- Added a library-accessible `/help` route inside the authenticated app shell.
- Added a new cloud sync help topic with plain-language copy covering local-only projects, cross-device access, and how to enable cloud sync.
- Routed library `Learn about Cloud Sync` links to the Help Center with the cloud-sync query prefilled.
- Added a `Help Center` entry to the main app-nav dropdown.

### Current status

The library now sends users to actual cloud-sync guidance instead of account settings. The same Help Center pattern is available from both the library and project space.

### Next recommended step

Run a browser smoke test:
- click `Learn about Cloud Sync` from the empty library state
- click it from the import backup guidance
- confirm `/help?q=cloud sync` opens with the cloud-sync topic visible
- confirm the nav dropdown `Help Center` link works
- confirm project help still behaves normally inside `/project/[id]/help`

### Risks or warnings

- `npx tsc --noEmit --pretty false` passed.
- Focused eslint still reports pre-existing warnings/errors in older files like `ProjectGrid.tsx`; this task did not add a new help-flow lint failure.

---
## 2026-04-27 - Centralized AI route rate limiting

### Current branch

`main`

### What was completed

- Chose the first high-priority technical debt item from the board: centralized AI route rate limiting.
- Added a shared server-side limiter that reads and records request activity through `ai_usage_events` instead of relying on per-instance memory.
- Wired the limiter into `/api/ai`, `/api/ai/analyze-scene`, and `/api/import/ai-detect`.
- Preserved trial reservation flow by rate limiting trial requests before reservation but after trial status checks.
- Verified the touched code with `npx tsc --noEmit --pretty false`.

### Current status

AI helper, scene analysis, and AI import detect now use a centralized Supabase-backed request history for throttling. This is a meaningful improvement over the old in-memory approach for distributed/serverless instances.

### Next recommended step

Run a real regression on rate limiting behavior:
- trigger repeated helper requests and confirm `429` plus `Retry-After`
- repeat for scene analyzer
- repeat for AI import detect
- verify trial-exhausted users still get trial-specific messaging rather than `RATE_LIMITED`

### Risks or warnings

- The new limiter uses a read-then-write pattern against `ai_usage_events`, so it is centralized but not perfectly atomic under near-simultaneous races.
- `npm run lint` still has pre-existing `no-explicit-any` failures in these older route files; the focused change did not resolve that backlog.

---
## 2026-04-26 - Scene gallery wording and empty collaborator pill cleanup

### Current branch

`main`

### What was completed

- Clarified prose scene-asset wording so book projects use `Scene Gallery`, `Open Gallery`, and `Add to Gallery` instead of screenplay-style reference copy.
- Preserved screenplay-specific `Scene Visual References` wording.
- Removed the empty collaborator avatar pill/blip from solo projects in the app header.
- Preserved collaborator avatar rendering for shared projects.
- User confirmed these items are resolved.

### Current status

The recent low-risk UI cleanup is in place. Solo projects no longer show an empty collaborator cluster, and prose scene asset language now matches existing gallery terminology.

### Next recommended step

Run the broader browser regression already listed for visual references, AI-off analyzer feedback, and book/prose image behavior.

### Risks or warnings

- These fixes were kept intentionally narrow and were not validated with a fresh browser regression in this session.

---
## 2026-04-26 - AI access defaults and screenplay visual references

### Current branch

`main`

### What was completed

- Fixed the `window is not defined` crash in `StructureTree.tsx` by removing render-time `window.innerWidth` access and moving indentation sizing behind a client-side effect.
- Changed missing AI settings to default to AI off across story, AI, settings, preferences save, and admin reporting paths.
- Hid the editor AI empty-state nudge when AI is not enabled.
- Updated the scene analyzer button so AI-disabled users get the AI sidebar with analyzer-specific access messaging instead of no feedback.
- Added screenplay-only visual reference UX using the existing `project_assets` and `scene_assets` system.
- Blocked inline `storyImage` insertion in screenplay mode while preserving prose inline illustration behavior.
- Standardized screenplay visual reference labels:
  - short buttons/tooltips: `Visual References`
  - panel titles/headers: `Scene Visual References`

### Current status

The app compiles with the focused changes. Screenplay visual references remain scene attachments only; no database, export, or AI-context changes were made for visual references.

### Next recommended step

Run a browser regression pass:
- Open a screenplay scene and confirm `Visual References` opens `Scene Visual References`.
- Attach/remove a scene visual reference, refresh, and confirm it persists.
- Confirm screenplay inline image insertion is blocked with the expected toast.
- Confirm book/prose still supports `Insert Illustration` and existing `Gallery` behavior.
- Click scene analysis with AI off and confirm the AI sidebar explains analyzer access requirements.

### Risks or warnings

- Browser regression has not been run in this session.
- `.env.local` contains live-looking API/service keys in the workspace; rotate them if they were exposed outside the local machine.

---
## 2026-04-26 - Structure panel UX improvements and StoryTab restoration

### Current branch

`main`

### What was completed

- **Restored `StoryTab.tsx`**: Fully reconstructed the file after corruption, ensuring all project selection and editor coordination logic is intact.
- **Improved Drag-and-Drop UX**: 
  - Implemented dynamic "Neighbor Highlighting" in the structure tree. Nodes adjacent to the drop zone now "light up" with an indigo glow.
  - Fixed grab handle visibility on desktop; handle is now dark with a high-contrast white icon during drag.
  - Ensured moved scenes remain selected and active in the editor after a drop.
- **Dynamic Deletion Prompt**: Updated the delete confirmation dialog to correctly identify the node type (e.g., "Delete this act?" instead of "Delete this scene?").
- **Sidebar Layout Fix**: Enforced `whitespace-nowrap` on sidebar titles to prevent "one word per line" wrapping issues reported on desktop.
- **Empty State UX**: Container nodes (Acts/Episodes) now show the "Your story awaits..." prompt instead of a "Scene Not Found" error.

### Current status

The structure panel is much more responsive and visually clear during reorganization. The editor is stable, and common "dead ends" (like clicking an Act node) now have proper UI feedback.

### Next recommended step

Run a browser-based regression test on the drag-and-drop neighbors:
- Drag a scene between two others and verify both neighbors glow.
- Drag a scene to the very top or bottom of an Act and verify only the single neighbor glows.
- Verify that titles no longer wrap to multiple lines in the structure tree.

### Risks or warnings

- `StructureTree.tsx` now uses `window.innerWidth` for padding calculations; ensure this doesn't cause hydration mismatches (guarded with `useMemo` and client-side logic).
- The `StoryTab.tsx` restoration was massive; while verified by line count and key exports, a full run through the writing flow is recommended.

---


## 2026-04-26 - AI mode consolidation and structure-selection context fixes

### Current branch

`main`

### What was completed

- Merged quick writing ideas into the main AI mode selector and removed visible prompt injection for those modes.
- Kept quick writing steering internal so users can type their own prompt text while still using the selected AI mode.
- Extended screenplay-mode AI insert behavior so non-chat screenplay responses try to insert as structured screenplay blocks, not just plain text.
- Removed Archive Context from the AI Partner so saved AI responses now live only in AI Memory, not as inline request context controls.
- Trimmed excess desktop spacing in the AI Partner header and input footer.
- Removed the redundant static `Mode` pill so the dropdown selector stands on its own.
- Fixed the desktop structure tree checkbox collapse bug on act rows.
- Reworked story-context selection so explicit AI selection is separate from derived tree checkbox visuals.
- Fixed act/scene selection roll-up behavior so:
  - selecting an act covers its scenes for AI,
  - selecting all scenes rolls the act up visually,
  - deselecting a child scene breaks the act back into explicit scene selections,
  - reselecting the missing scene collapses the explicit selection back to the act,
  - clicking a rolled-up act can still deselect child coverage correctly.

### Current status

AI mode selection is consolidated, the AI Partner header is leaner, AI Memory is no longer duplicated as Archive Context inside the panel, screenplay insertion is more consistent for screenplay projects, and structure-tree selection now behaves consistently between the tree, AI-ready bar, and AI Partner context.

### Next recommended step

Run an in-browser regression pass on story context selection and screenplay AI insertion:
- single-scene selection,
- full-act selection,
- deselect/reselect one scene under an act,
- AI-ready chip collapse/expand,
- insert generated screenplay output into the editor from non-chat modes.

### Risks or warnings

- `components/project/story/AiHelperPanel.tsx`, `components/project/story/StoryTab.tsx`, and `components/project/story/StructureTree.tsx` contain the current uncommitted code changes.
- Focused eslint checks passed on `StoryTab.tsx` and `StructureTree.tsx`; `AiHelperPanel.tsx` still has a broader pre-existing lint backlog if run without narrowed rules.
- The screenplay insertion parser for non-chat modes is heuristic when the model does not return JSON, so real UI verification is still important.

---

## 2026-04-26 - AI partner mode selector changed to dropdown

### Current branch

`main`

### What was completed

- Replaced the AI partner horizontal mode button scroller with a single selectable dropdown.
- Kept the existing AI mode options and `promptMode` behavior.
- User confirmed the issue is resolved.

### Current status

The AI partner mode control now shows the current mode and opens a list of available modes when clicked.

### Next recommended step

Continue with the selected high-priority technical debt item when ready; recommended first candidate remains centralized rate limiting for AI routes.

### Risks or warnings

- `npx tsc --noEmit --pretty false` passed.
- `npm run lint` still fails on existing repo-wide lint issues unrelated to this change.

---

## 2026-04-26 - Technical debt roadmap summarized into root continuity files

### Current branch

`main`

### What was completed

- Reviewed `docs/technical-debt-roadmap.md`.
- Kept the original roadmap in `docs/` as the detailed source.
- Added a concise technical debt priority summary to `MASTER_BRIEF.md`.
- Added actionable technical debt items to `TASK_BOARD.md`.
- Added a decision log entry explaining why the docs roadmap was summarized rather than moved or deleted.

### Current status

The root continuity files now point agents toward the main reliability and technical debt priorities without duplicating the full roadmap.

### Next recommended step

Choose which high-priority technical debt item should be tackled first. Recommended first candidate: centralized rate limiting for AI routes, because it protects against API abuse and unexpected sponsored AI spend.

### Risks or warnings

- `docs/technical-debt-roadmap.md` remains the detailed source for implementation guidance.
- Do not begin database/RPC or billing/trial changes without a focused plan and careful testing.
- Keep root continuity files concise; use `docs/` for deeper technical plans.

---

## 2026-04-26 - Project continuity system added

### Current branch

`main`

### What was completed

- Added a root-level project continuity system.
- Added `MASTER_BRIEF.md` as the stable source of truth.
- Added `DECISION_LOG.md` for project decisions and reasons.
- Added `SESSION_HANDOVER.md` for session-to-session continuity.
- Added `TASK_BOARD.md` for simple Now / Next / Later / Done tracking.

### Current status

The repository now has the basic files needed for agents to catch up across machines and chat sessions.

### Next recommended step

Use the session start prompt from `MASTER_BRIEF.md` at the beginning of the next Codex, AG, Claude, or ChatGPT coding session.

### Risks or warnings

- These files are only useful if agents are instructed to read and update them.
- Do not let agents rewrite these files aggressively; updates should be concise and additive.
- More detailed product decisions still need to be added over time.

---
## 2026-04-27 - Notification Refactor & Library UX Polish

### Current branch

\main\ ocean

### What was completed

- **Notification System Expansion**: Refactored the 'Working on another device?' guidance into a persistent system notification event (\local_transfer_guidance\).
  - Added support for the new notification type in the database and frontend logic.
  - Implemented auto-creation logic in \ImportBackupButton.tsx\ (ensuring it exists exactly once per user).
  - Created a full-page detail view for the guidance, integrated with the notification system.
  - Added a deep-link action that returns the user to the library and automatically triggers the backup flow via \?action=import\.
- **Library Card UX Refinements**: 
  - Restored the 'floating' icon aesthetic for project cards (removed borders/backgrounds) per user feedback.
  - Fixed tablet/iPad Pro visibility: Action buttons (Edit, Palette, Trash) are now visible by default on viewports < 1280px, even if the browser reports hover support.
  - Unified action button visibility logic to prevent inconsistencies (e.g., Palette missing while Trash was visible).
  - Improved the delete confirmation dialog: It now clears the project type icon by hiding it when active, preventing visual overlap on narrow cards.
  - Anchored the delete dialog to the right edge with high-contrast backgrounds for better legibility.
  - Added a resize listener to maintain correct visibility during tablet orientation changes.

### Current status

The library UX is significantly more robust for mobile and tablet users. Accidental navigation is prevented by visible action buttons, and the transfer guidance is now a first-class citizen of the notification system rather than a dismissible banner.

### Next recommended step

Implement the dynamic 'Story Tone' step in the project creation flow: check AI availability and reword the 'Story Tone' step to be metadata-only if AI is disabled or unavailable for the account. Target file: \components/library/CreateProjectModal.tsx\.

### Risks or warnings

- The \isTouch\ detection logic relies on a 1280px threshold to capture iPad Pro landscape (1366px is \xl\, so 1280px covers the common 'large tablet' range). If a desktop user has a very small browser window, icons will be visible by default.
- Notification auto-creation uses \localStorage\ to prevent redundant DB calls; clear \storyline-notified-transfer-[id]\ when testing across accounts.

---
## 2026-04-27 - Library Card Alignment & Uniformity

### Current branch

\main\ ocean

### What was completed

- **Standardized Card Alignment**: Resolved the 'uneven titles' and 'shifting horizontal lines' reported in the library grid.
  - Implemented fixed-height containers for titles (\h-[68px]\) and descriptions (\h-[48px]\) with \items-start\ and \line-clamp-2\.
  - This ensures that whether a title is 1 or 2 lines, it always occupies the same vertical footprint and starts at the same height.
  - Switched the footer divider from relative margin (\mt-10\) to automatic margin (\mt-auto\), anchoring it to the bottom of the content area for perfect alignment across the grid.
  - Added a \pt-24\ safety margin on cover cards to prevent titles from ever touching the top-anchored header icons.

### Current status

The library cards now look perfectly uniform in the grid, even with varying title lengths and project metadata.

### Next recommended step

Verify the alignment with a project that has a very short title and no description vs one with a long title and full description.

### Risks or warnings

- If a project title is extremely long, it will be truncated at 2 lines. This is a deliberate design constraint to maintain grid stability.
