# Task Board

Simple repo-based task tracking for agents and humans.

Keep this lightweight. Move items between sections instead of rewriting the whole file.

- Start future AI coding sessions by reading:
  - `MASTER_BRIEF.md`
  - `DECISION_LOG.md`
  - `SESSION_HANDOVER.md`
  - `TASK_BOARD.md`
  - `TESTING.md`
- Use the session end prompt to update `SESSION_HANDOVER.md`, `TASK_BOARD.md`, and `TESTING.md` after each coding session.

---

## Now

- Continue typography and contrast audit beyond AI Partner, especially older low-contrast helper/meta text in less-used screens.
- Check and fix export issues, starting with PDF, then verify the other export formats as well, especially screenplay-mode output errors.


## Next


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
- Added explicit short-text analyzer feedback for empty / under-50-character scenes and made collapsed structure parents auto-expand when a new child is added, without changing analyzer API rules or structure CRUD/reorder logic.
- Stabilized empty-screenplay Backspace/analyzer behavior by updating `lib/tiptap/screenplay-keyboard.ts` so the default empty paragraph no longer converts on Backspace and empty screenplay nodes consume Backspace safely, and by updating `lib/story/scene-text.ts` so empty screenplay blocks no longer count as analyzable text. Screenplay formatting/export logic was left untouched.
- Simplified the scene editor heading metadata so it now shows a single `SCREENPLAY` or `DRAFT` label, keeps the scene title primary, and hides `Last edited by you` while preserving collaborator attribution for other editors.
- Refined the Story workspace tablet layout so the top action row now keeps only `Analyze` and `Ask AI`, while `Read Aloud`, `Dictate`, `Feedback`, `Gallery` / `Visual References`, and `Help` live in the right rail on tablet.
- Tightened desktop Story shell alignment and moved the project-scoped desktop Help action into the Story right rail while preserving the existing Help route and tour anchor.
- Reworked the Story workspace desktop/tablet right side into a shared utility rail so AI Partner, Feedback, and `Gallery` / `Visual References` share one vertical access point, while Analyze, Dictate, and Read Aloud now live on the same rail as direct actions.
- Fixed the Midnight-mode AI Partner composer regression so the lower chat/prompt area and `PremiumEditor` prompt surface no longer stay light in dark theme.
- Hardened Library sort persistence so it initializes from browser storage with a `Recent` fallback instead of defaulting through `Custom`.
- Fixed incomplete guided setup resume drift by persisting the guided flow sub-step alongside the saved guided draft.
- Normalized the Library incomplete-setup delete confirmation to match the regular project-card confirmation treatment more closely.
- Added a local-only dev test account workflow:
  - removed committed test credential references from continuity docs
  - documented the workflow in `docs/dev-test-account.md`
  - added `scripts/create-test-account.ts`
  - added `npm run create:test-account`
  - ensured `.local/test-account.env` and `.env.test.local` are gitignored
- Fixed standalone `create:test-account` script compatibility with plain Node and `tsx` by removing the shared `server-only` import from `lib/supabase/admin.ts`.
- Added full-app dark mode regression pass test case to `TESTING.md`.
- Hardened project Help shortcuts access:
  - added direct `Open keyboard shortcuts` actions in `/project/[id]/help`
  - clarified shortcuts guidance to use `Shift + /` wording and the non-typing requirement
  - wired project Help into the existing shortcuts modal with shared client-side event dispatch
  - removed the duplicate in-tree shortcuts modal render from `ProjectShell`
- Minimal Help Center Midnight + scanability polish:
  - added a shared Help root class so `/help` and `/project/[id]/help` use the same scoped Help surface styling
  - replaced hardcoded light Help surfaces with Sanctuary-compatible classes and added Help-specific Midnight selectors
  - improved search prominence with a visible label and clearer search wrapper
  - reduced secondary-card competition and tightened article-card spacing for better scanability
  - tightened Help layout spacing on smaller screens without changing Help logic or content
- Minimal Account Settings Sanctuary polish pass:
  - reordered Settings to `Profile / Security`, `Appearance`, then `AI Partner Settings`
  - separated profile, email, password, and danger-zone areas into clearer visual sections
  - reduced AI-section dominance with calmer Sanctuary styling and plain-language copy
  - improved trust-sensitive helper text readability
  - replaced the glassy Appearance card treatment with a flatter Sanctuary surface
  - improved narrow-screen stacking for the header, AI rows, and delete confirmation controls
- Hardened Next 16 local dev-origin and auth navigation reliability:
  - added `127.0.0.1` to `allowedDevOrigins` while keeping the existing LAN origin
  - added guarded client-side auth redirects for login, signup, and reset-password so those pages surface a clear fallback message instead of spinning forever when navigation never leaves the current route
  - documented the confirmed `.next` reset plus dev-origin fix in `TROUBLESHOOTING.md`
- Hide incomplete summary export modes from Export Manuscript modal to avoid confusing users.
- Hide incomplete Episodes/Scenes export scope options from Export Manuscript modal to avoid confusing users.
- Fix Export Manuscript include toggles so they remain visible and the full row is clickable, not just the tiny switch.
- Fix Export Manuscript include toggles so they actually affect exported structure headings consistently across formats.
- Clarify Export Manuscript include switches with explicit On/Off state and conventional switch coloring.
- Align Project Settings and Share modal footer actions to the Export Manuscript footer pattern and document it in `DESIGN.md`.
- Improved inline image insertion discoverability in prose/book mode by adding contextual helper tips to the Scene Gallery.
- Standardized AI Partner button styles: Transitioned all "outline" variants to ghost/borderless styles consistent with the Sanctuary design system.
- Fixed layout alignment between AI Partner and Feedback panels.
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
- Expanded desktop layout to full-width across Library, Project Shell, and AI Sanctuary, removing legacy `max-w-` constraints and adding ultra-wide grid support.
- Centered the project shell navigation tabs (Story, AI Partner, etc.) to improve visual balance on expanded layouts.
- #20 - AI abuse-controls hardening:
  - Upgraded the centralized AI rate limiter in `lib/ai/rate-limit.ts` to detect and throttle IP and Device Fingerprint clusters across different user accounts.
  - Expanded the disposable email domain blocklist in the `evaluate_and_grant_ai_trial` database function to include 40+ known providers.
  - Implemented `lib/ai/abuse-report.ts` to provide admin visibility into suspicious request clusters and multi-accounting behavior.
- Cleaned up Export Metadata helper copy and ensured it is covered in the future Help System Feature Audit roadmap.
- Refactored `app/(app)/project/[id]/layout.tsx` to enable route-level instant loading for cloud projects:
  - Added `app/(app)/project/[id]/loading.tsx` for child route transitions.
  - Wrapped project layout fetching logic in `<Suspense>` with `RouteLoadingScreen` fallback.
  - Enabled the "Workspace" skeleton UI to appear immediately on first load or hard refresh.
