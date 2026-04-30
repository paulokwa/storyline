# Task Board

Simple repo-based task tracking for agents and humans.

Keep this lightweight. Move items between sections instead of rewriting the whole file.

- Start future AI coding sessions by reading:
  - `MASTER_BRIEF.md`
  - `DECISION_LOG.md`
  - `SESSION_HANDOVER.md`
  - `TASK_BOARD.md`
  - `TESTING.md`


---

## Now

- The sructure and AI partner bar should be full width on desktop and other devices - cutrerntly those rails are pulled inand bot filling out - there empty space on the outside of that - we dont need that wasted sapce

- Centre the row where the stort, Ai partner, AI memory, etc exist.

- AI abuse-controls hardening.
- Improve inline image insertion discoverability in prose/book mode.
- Continue typography and contrast audit beyond AI Partner, especially older low-contrast helper/meta text in less-used screens.

## Next

- If needed later, refactor `app/(app)/project/[id]/layout.tsx` so the very first cloud project-shell load can participate in route-level instant loading; the shared staged loading UX is already implemented for Library, New Project, Settings, `project/[id]/story`, and local-project open states, so do not duplicate that work.
- Clean up Export Metadata helper copy: replace the user-facing "TESTING TIP" label in Project Settings > Export Metadata with polished copy such as "Publishing Tip" / "Export Tip" and ensure this wording is covered during the future Help System Feature Audit & Rewrite in `docs/technical-debt-roadmap.md`.
- Use the session end prompt to update `SESSION_HANDOVER.md`, `TASK_BOARD.md`, and `TESTING.md` after each coding session.

## Later

- Unified Supabase type safety using generated `Database` types.
- State management consolidation, likely with Zustand.
- Structure tree performance improvements for large projects.
- AI trial cost model calibration against real provider usage.
- Advanced offline / pending sync beyond current `localStorage` fallback.
- Stronger destructive action guards for high-impact deletes.
- Writing UX polish: focus, paper transitions, font sizing, and themes.
- Backup and asset handling improvements for `.storyline` files, including file-size warnings for backups with base64-embedded assets.
- Add clearer free trial indicators and onboarding copy for new users.
- Add AI explanation page covering BYOK, Ollama/local AI, optional app-managed AI usage, and using the app without AI.
- Add feature list / benefits page covering autosave, recovery, snapshots, backup, local/cloud options, AI workflow help, and privacy choices.
- Explore non-annoying support prompts for free local users, such as donate, review, share, or upgrade nudges.
- Create YouTube/tutorial content for Ollama, Gemini API, OpenAI API, and general onboarding.
- Consider offline sync options such as Google Drive.

## Decisions / Blockers

- Review whether scene analysis outputs should save directly to AI Memory when the user chooses Add to AI.
- Audit app-wide AI terminology and decide whether to use AI, Assistant, Muse, or another label consistently.
- Update feature/showcase page after a root-and-branch feature audit.
- Rework help menu/page near launch after major feature changes settle; follow the detailed two-phase audit and rewrite process in `docs/technical-debt-roadmap.md` under "Help System Feature Audit & Rewrite" instead of asking AI to simply improve the page.
- Decide launch trial/cloud pricing model before public launch, including trial length, cloud access limits, and showcase/onboarding copy.
- Capture final showcase screenshots after app name, branding, and key UI polish are settled.
- Update verification/welcome email branding after final app name is chosen.
- Create browser icons/favicons after final branding decision.
- Perform full app naming consistency pass after final app name is chosen.
- Consider paying a designer/Fiverr freelancer for branding, assets, and landing/showcase polish.
- Consider adding a GitHub Project board after the Markdown workflow proves useful.
- Consider adding an `AGENTS.md` or `CONTRIBUTING.md` if agents need stricter operating rules.

## Done
- Added first-pass retry/init hardening for cloud project creation and editor saves:
  - cloud project creation now retries transient RPC failures before surfacing an error
  - cloud scene autosave and scene-title saves now retry transient persistence failures
  - scene history capture retries in the background and no longer blocks a successful save
  - editor UI now shows `Save failed` if retries are exhausted
- Atomic cloud project scaffolding now uses Supabase RPC:
  - cloud project creation flows through `lib/persistence/cloud-projects.ts`
  - the app calls `create_cloud_project` to create the project, owner membership, starter nodes, scenes, and entities in one database function
  - keep follow-up verification in `TESTING.md` under `Atomic project scaffolding failure scenario`
- Added local Ollama usage-event logging integrity path:
  - client-side Ollama runs report `completed`, `failed`, and `cancelled` outcomes to `/api/ai/local-usage`
  - server-side route records those events into `ai_usage_events` with provider/billing-mode metadata for admin and abuse visibility
- Browser regression completed for recent image/AI-availability changes:
  - user manually verified screenplay visual references behavior
  - user manually verified AI-off analyzer feedback
  - user manually verified book/prose image behavior regression remained clean
- Clean up profile/account menu legal links: remove the separate Terms of Service, Privacy Policy, and AI Disclaimer links from the main profile dropdown, keep legal links in the showcase/library footer, and optionally replace them with a single lower-priority "Legal & Privacy" entry under Settings/About/Help if in-app access is still needed. Ensure Admin remains admin-only.
- Replaced remaining browser system dialogs across the app:
  - swapped Recovery `Clear Trash` from native `confirm()` to an in-app `AlertDialog`
  - replaced export, recovery, and saved-response `alert()` error boxes with `sonner` toasts
  - replaced Project Settings editor-mode `window.confirm()` with an in-app `AlertDialog`
  - verified via repo-wide search that no `alert()` / `confirm()` / `prompt()` calls remain in `components`, `app`, or `lib`
- Audited AI Partner typography/readability and removed persistent footer clutter:
  - deleted the stale generated `font-audit-report.md` artifact while keeping the reusable `font:audit` script
  - removed the always-visible AI privacy warning below the prompt box
  - moved the AI context preview toggle into the header utility icon row beside the tour/help controls
  - added a one-time per-project AI privacy/context note inside the context preview the first time AI Partner is used
  - tightened low-contrast preview and empty-state text in `AiHelperPanel.tsx`

- Fixed `StructureTree.tsx` server render crash caused by render-time `window` access.
- Made missing AI settings default to AI off across runtime, settings, preferences save, and admin reporting paths.
- Hid AI-specific editor empty-state nudges when AI is disabled.
- Added analyzer-specific AI access feedback when scene analysis is clicked while AI is unavailable.
- Added screenplay-only Visual References UX using existing scene attachments.
- Blocked inline screenplay image insertion while preserving prose inline illustrations.
- Fixed structure tree drag-and-drop neighbor highlighting and grab handle visibility.
- Fixed sidebar title word-wrapping issues on desktop.
- Restored `StoryTab.tsx` after code corruption and added proper empty states for container nodes.
- Made deletion confirmation prompts dynamic based on node type.
- Fixed scene selection persistence after move/reorder.
- Replaced the AI partner horizontal mode buttons with a selectable dropdown.
- Merged quick writing ideas into the main AI mode selector and removed visible prompt injection for those modes.
- Removed Archive Context from the AI Partner while keeping normal AI Memory saving/viewing.
- Tightened redundant AI Partner header and footer spacing on desktop.
- Removed the redundant static Mode pill from the AI Partner header.
- Fixed screenplay AI insertion so non-chat screenplay modes attempt structured screenplay block insertion.
- Fixed structure tree act checkbox collapse on desktop.
- Fixed story-context selection so tree visuals, explicit AI selection, and AI-ready chip roll-up behave consistently.
- Clarified prose scene gallery wording while preserving screenplay visual reference labels.
- Removed the empty collaborator avatar pill from solo projects while preserving shared-project collaborator avatars.
- Replaced per-instance AI throttling with a shared `ai_usage_events`-backed rate limiter for helper, scene analyzer, and AI import detect routes.
- Reused the Help Center for cloud sync guidance and made it accessible from the library and app nav.
- Added root-level continuity files.
- Added session start prompt.
- Added session end prompt.
- Added initial decision log entries.
- Summarized `docs/technical-debt-roadmap.md` into the root continuity files.
- Refined mobile project card UX: Action buttons (Edit, Palette, Trash) are now always visible on touch viewports (including iPad Pro via a <1280px override) to prevent accidental project entry, with added entrance animations and increased metadata contrast.
- Fixed library project-card delete confirmation layout: Dialog now clears the project type icon by hiding it when active, preventing visual overlap on narrow viewports/tablets.
- Standardized library card content alignment: Titles and descriptions now use fixed-height containers to ensure uniform layout and perfectly aligned horizontal lines across the grid.
- Refactored "Working on another device?" guidance from an inline library banner to a persistent system notification event with a full detail view.
- Made the guided project creation `Story Tone` step dynamic based on AI availability, so AI-specific wording only appears when the account has AI enabled.
- Implemented a shared staged loading UX for major app transitions:
  - Added `RouteLoadingScreen` with quiet initial delay, skeleton placeholders, and longer-wait reassurance copy.
  - Wired route-level loading states into Library, New Project, Settings, and `project/[id]/story`.
  - Replaced the old plain-text local project open placeholder with the shared workspace loading treatment.
  - Verified with `npx tsc --noEmit --pretty false`.
  - Important scope note for future agents: the first cloud project-shell load is still limited by same-segment fetches inside `app/(app)/project/[id]/layout.tsx`; do not redo the new loading screens unless you are intentionally addressing that layout-level limitation.
- Implemented manual Save / Save As / Open workflow for `.storyline` files (IMPLEMENTATION COMPLETE, PENDING MANUAL SMOKE TEST):
  - Added native File System Access API support with automated download-based fallbacks.
  - Rebranded "Import Backup" to "Open Project File" in the Library.
  - Added "Save Project" and "Save As..." to the project menu for local projects.
  - Implemented `Ctrl+S` / `Cmd+S` keyboard shortcuts for manual saving.
  - Integrated disk-link status (filename, last save time) into the navigation dropdown.
  - Rebranded manuscript export to "Export Manuscript..." to distinguish from native file saving.
  - Fixed "Export Manuscript" regression where local projects triggered a raw download instead of the export modal.
  - Added full IndexedDB support to the manuscript export payload generator.
  - Fixed a `RangeError` during EPUB/HTML export caused by missing `comment` marks in the TipTap schema.
  - Centralized export extensions in `lib/export/normalize.ts` and ensured `CommentMark` is included.
  - Fixed a critical bug where `ProjectShell.tsx` was passing the project ID instead of content to the save utility.
  - Ensured sanitization of browser-specific file handles in exported files.
