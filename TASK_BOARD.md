# Task Board

Simple repo-based task tracking for agents and humans.

Keep this lightweight. Move items between sections instead of rewriting the whole file.

---

## 2026-04-28 - Unified Export Schema with CommentMark support

Decision:
Include `CommentMark` in the centralized `exportExtensions` in `normalize.ts` and ensure all export formats use this unified schema.

Reason:
Exporting projects containing editor comments was causing a `RangeError` in formats using `generateHTML` (EPUB, HTML, PDF) because the `comment` mark was missing from the provided schema.

Impact:
- Fixed `RangeError` during manuscript export for projects with comments.
- Streamlined export logic by ensuring `toEpub.ts` and `toHtml.ts` use the same extension set.

Status:
Approved & Implemented.

---

## Now

- Start future AI coding sessions by reading:
  - `MASTER_BRIEF.md`
  - `DECISION_LOG.md`
  - `SESSION_HANDOVER.md`
  - `TASK_BOARD.md`
  - `TESTING.md`
- Run browser regression for screenplay visual references, AI-off analyzer feedback, and book/prose image behavior.
- Run a broader pre-launch regression pass across core project flow, import/export, local/cloud behavior, AI availability states, collaboration, tablet/mobile layout, and onboarding tours.
- Audit app typography and contrast, especially grey text that may cause eye strain.
- Audit local/cloud feature boundaries, wording, and mode-specific UI behavior.
- Verify centralized AI rate limiting across helper, scene analyzer, and import detect flows.
- Browser-check the new library Help Center and cloud sync guidance flow.
- Add consistent loading-state UX for slow pages and actions: use no visible loader for near-instant loads, skeleton placeholders for short waits, and subtle branded loading feedback for longer waits such as a pen-writing/book-glow/Storyline mark animation. For unusually long loads, show reassuring copy such as "Still loading your projects..." and "Your work is safe," especially on Library, Project Open, Project Creation, Import, and Cloud/AI settings flows. Keep this as a trust-building UX layer while separately investigating actual performance causes such as Netlify cold starts, Supabase latency, slow queries, image sizes, pagination, or client-side data waterfalls.

## Next

- Atomic project scaffolding via Supabase RPC.
- Robust retry and initialization patterns for editor save and project initialization flows.
- AI trial reconciliation and RPC failure handling.
- AI abuse-controls hardening.
- Review import AI behavior when AI is disabled or when large books may exceed trial/cost limits.
- Review whether scene analysis outputs should save directly to AI Memory when the user chooses Add to AI.
- Audit app-wide AI terminology and decide whether to use AI, Assistant, Muse, or another label consistently.
- Improve inline image insertion discoverability in prose/book mode.
- Update feature/showcase page after a root-and-branch feature audit.
- Rework help menu/page near launch after major feature changes settle; follow the detailed two-phase audit and rewrite process in `docs/technical-debt-roadmap.md` under "Help System Feature Audit & Rewrite" instead of asking AI to simply improve the page.
- Clean up Export Metadata helper copy: replace the user-facing "TESTING TIP" label in Project Settings > Export Metadata with polished copy such as "Publishing Tip" / "Export Tip" and ensure this wording is covered during the future Help System Feature Audit & Rewrite in `docs/technical-debt-roadmap.md`.
- Clean up profile/account menu legal links: remove the separate Terms of Service, Privacy Policy, and AI Disclaimer links from the main profile dropdown, keep legal links in the showcase/library footer, and optionally replace them with a single lower-priority "Legal & Privacy" entry under Settings/About/Help if in-app access is still needed. Ensure Admin remains admin-only.
- Run pre-launch security audit covering input sanitization, auth flows, exposed secrets, personal emails, repo references, and deployment settings.
- Use the session end prompt to update `SESSION_HANDOVER.md`, `TASK_BOARD.md`, and `TESTING.md` after each coding session.

## Later

- Unified Supabase type safety using generated `Database` types.
- State management consolidation, likely with Zustand.
- Structure tree performance improvements for large projects.
- AI trial cost model calibration against real provider usage.
- Local AI usage logging integrity improvements.
- Advanced offline / pending sync beyond current `localStorage` fallback.
- Stronger destructive action guards for high-impact deletes.
- Writing UX polish: focus, paper transitions, font sizing, and themes.
- Backup and asset handling improvements for `.storyline` files, including file-size warnings for backups with base64-embedded assets.
- Add clearer free trial indicators and onboarding copy for new users.
- Add AI explanation page covering BYOK, Ollama/local AI, optional app-managed AI usage, and using the app without AI.
- Add feature list / benefits page covering autosave, recovery, snapshots, backup, local/cloud options, AI workflow help, and privacy choices.
- Decide launch trial/cloud pricing model before public launch, including trial length, cloud access limits, and showcase/onboarding copy.
- Explore non-annoying support prompts for free local users, such as donate, review, share, or upgrade nudges.
- Capture final showcase screenshots after app name, branding, and key UI polish are settled.
- Update verification/welcome email branding after final app name is chosen.
- Create browser icons/favicons after final branding decision.
- Perform full app naming consistency pass after final app name is chosen.
- Create YouTube/tutorial content for Ollama, Gemini API, OpenAI API, and general onboarding.
- Consider offline sync options such as Google Drive.
- Consider paying a designer/Fiverr freelancer for branding, assets, and landing/showcase polish.
- Consider adding a GitHub Project board after the Markdown workflow proves useful.
- Consider adding an `AGENTS.md` or `CONTRIBUTING.md` if agents need stricter operating rules.

## Done

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
