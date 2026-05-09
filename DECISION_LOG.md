# Decision Log

This file records meaningful project decisions and why they were made.

Keep entries concise. Do not rewrite old decisions unless explicitly instructed.

---

## 2026-05-08 - Add OpenRouter as a BYOK-only AI provider option

Decision:
Add OpenRouter as a supported BYOK AI provider alongside OpenAI, Gemini, and Ollama. OpenRouter is BYOK-only — it will never be used for app-managed trial credits. Default model is fixed at `openai/gpt-4o-mini` for V1 (no dynamic model marketplace).

Reason:
OpenRouter gives users access to dozens of models through a single API key and a unified billing account, without Storyline needing per-model cost tracking. BYOK-only keeps the billing model simple and avoids underwriting unknown model costs.

Impact:
- `CloudAiProvider` and `SupportedAiProvider` now include `'openrouter'`.
- All usage logging, rate limiting, context warnings, cost safeguards, and streaming safeguards apply to OpenRouter exactly as they do to other providers.
- OpenRouter uses chat completions API (`/v1/chat/completions`) — entirely separate code paths from the OpenAI Responses API (`/v1/responses`). The two are not interchangeable.
- No DB migration required; `ai_provider` is TEXT.
- V1 pricing display shows "pricing depends on model selected" copy — no dollar estimates.
- Future model selection feature would require a `openrouter_model` preference column.

Status:
Approved.

---

## 2026-05-07 - Replace global proxy middleware with route-level auth guards for Netlify compatibility

Decision:
Remove the root `proxy.ts` middleware and keep auth enforcement in normal Next.js route rendering, while using `next build --webpack` for production builds.

Reason:
Netlify Next.js Runtime v5.15.10 generated an internal Edge Function for Next.js 16 proxy/node middleware and failed during Edge Functions bundling. The app already protected authenticated application routes through `app/(app)/layout.tsx`, so moving the remaining proxy responsibilities to route-level checks avoided the incompatible Edge bundle without weakening the main app guard.

Impact:
- `app/(app)/layout.tsx` remains the primary guard for authenticated app routes.
- `/feedback` is protected by its own route layout.
- `/login` redirects signed-in users server-side; `/signup` redirects signed-in users client-side.
- Netlify production build preflight now passes locally.
- Production build uses webpack until Netlify/Next Turbopack compatibility is confirmed.

Status:
Approved.

---

## 2026-05-07 - Run Netlify build checks before deployment-affecting pushes

Decision:
When an agent is asked to commit and push changes that could affect production build or deploy, it should run a Netlify build check first when available, preferably `netlify build --context production`.

Reason:
`npm run build` can pass while Netlify-specific plugin, environment, function, or edge-function bundling fails. Running the Netlify build check before pushing reduces avoidable server-side build failures across devices and sessions.

Impact:
- Agents should use existing Netlify CLI/MCP access when available.
- If Netlify build access is missing, agents should try to configure or link the existing Netlify site before skipping the check.
- If the Netlify build check fails, agents should not push deployment-affecting changes unless the user explicitly approves pushing despite the known failure.

Status:
Approved.

---

## 2026-04-28 - Unified export schema with CommentMark support

Decision:
Include `CommentMark` in the centralized `exportExtensions` in `normalize.ts` and ensure all export formats use this unified schema.

Reason:
Exporting projects containing editor comments was causing a `RangeError` in formats using `generateHTML` (EPUB, HTML, PDF) because the `comment` mark was missing from the provided schema.

Impact:
- Fixed `RangeError` during manuscript export for projects with comments.
- Streamlined export logic by ensuring `toEpub.ts` and `toHtml.ts` use the same extension set.

Status:
Approved.

---

## 2026-04-27 - Reuse the Help Center for cloud sync guidance instead of a separate explainer page

Decision:
Expose cloud-sync guidance through the existing Help Center and make that Help Center reachable from the library and main app nav, instead of building a disconnected standalone explainer page.

Reason:
Users need cloud-sync guidance before opening a project, but duplicating help into a one-off page would fragment navigation and copy. Reusing the Help Center keeps answers searchable, consistent, and easier to maintain.

Impact:
- The library can send users to `/help?q=cloud sync`.
- The same help system now serves both project-scoped and library-scoped entry points.
- Cloud sync guidance is written in user-facing language and no longer depends on the user discovering the project settings modal first.

Status:
Approved.

---

## 2026-04-27 - Centralize AI throttling via existing usage-event infrastructure first

Decision:
Implement the first pass of centralized AI route rate limiting by reusing `ai_usage_events` and the existing admin Supabase client, instead of adding new Redis/Upstash infrastructure immediately.

Reason:
The repository already records AI usage centrally. Reusing that path allows a minimal, low-risk improvement that works across instances without introducing new secrets, dependencies, or schema changes.

Impact:
- `/api/ai`, `/api/ai/analyze-scene`, and `/api/import/ai-detect` now throttle against shared database-backed request history.
- Blocked requests are recorded centrally with `rate_limited` metadata.
- The solution is improved but not fully atomic; a stricter infra-backed limiter can still replace it later if needed.

Status:
Approved.

---

## 2026-04-26 - Screenplay visuals stay as scene references, not manuscript images

Decision:
Support screenplay visuals through existing scene-level asset attachments (`scene_assets` linked to `project_assets`) and keep inline `storyImage` insertion disabled for screenplay text.

Reason:
Screenplay manuscript text should remain clean and industry-style. Existing scene attachments already provide the required planning/reference model without schema changes.

Impact:
- Screenplay UI uses `Visual References` for short buttons/tooltips and `Scene Visual References` for panel headers.
- Book/prose inline illustration behavior remains unchanged.
- Scene visual references are not included in export or AI context yet.

Status:
Approved.

---

## 2026-04-26 - Missing AI settings default to AI off

Decision:
Treat missing AI settings as `ai_enabled: false` across user-facing runtime shaping, preference saves, and admin reporting.

Reason:
Users who have not enabled AI should not see AI-specific editor nudges or be reported as AI-enabled by default.

Impact:
- Editor AI empty-state nudges are hidden when AI is off.
- Scene analysis now opens the AI sidebar with analyzer-specific access guidance when AI access is unavailable.
- Admin reporting no longer labels missing settings as AI-enabled.

Status:
Approved.

---

## 2026-04-26 - Structure panel UX and empty state improvements

Decision:
Adopted dynamic deletion prompts, neighbor highlighting, and welcoming empty states for container nodes.

Reason:
Hardcoded "scene" references during deletion of acts/episodes were confusing. Drag-and-drop lacked visual feedback for target boundaries. Clicking an Act resulted in an error state instead of a guidance state.

Impact:
- Deletion prompts are now type-aware.
- Drag-and-drop has "Neighbor Highlighting" with an indigo glow.
- Acts/Episodes now show "Your story awaits... Select a scene to begin writing".
- Grab handles are high-contrast dark pills during drag.

Status:
Approved.

---

## 2026-04-26 - Keep detailed technical debt roadmap in docs and summarize it in root continuity files

Decision:
Do not move or delete `docs/technical-debt-roadmap.md`. Keep it as the detailed technical debt source, while summarizing its priorities in `MASTER_BRIEF.md` and actionable tasks in `TASK_BOARD.md`.

Reason:
The technical debt roadmap contains useful implementation detail. The root continuity files should help agents orient quickly without becoming bloated or duplicating every detail.

Impact:
Agents should check `docs/technical-debt-roadmap.md` before implementing any reliability or technical debt work, but can use the root files for quick prioritization and session continuity.

Status:
Approved.

---

## 2026-04-26 - Separate explicit AI story-context selection from derived tree checkbox state

Decision:
Keep the user's explicit story-context selection separate from the structure tree's derived visual checkbox state.

Reason:
Auto-selecting parent acts when a child scene was chosen made the AI-ready bar misleading and caused full-act context to be sent to AI when the user only intended to select one scene.

Impact:
- Tree checkboxes can still visually roll up to a parent when all children are selected.
- AI-ready chips and AI Partner context now reflect the explicit selection model, not just the visual tree state.
- Explicit selection normalizes back to the parent act when all child scenes are covered, and breaks back into scenes when one is deselected.

Status:
Approved.

---

## 2026-04-26 - Add lightweight agent continuity system

Decision:
Use Markdown files in the repository root to keep project context consistent across machines and AI coding agents.

Files added:
- `MASTER_BRIEF.md`
- `DECISION_LOG.md`
- `SESSION_HANDOVER.md`
- `TASK_BOARD.md`

Reason:
The project is worked on across multiple machines and multiple AI agents. A simple repo-based memory system reduces context loss, repeated explanations, and agent drift.

Impact:
All future AI coding sessions should begin by reading the four continuity files. At the end of each session, agents should update the handover and task board.

Status:
Approved.

---

## 2026-04-26 - Prefer Markdown continuity before GitHub Project automation

Decision:
Start with simple Markdown files before adding GitHub Projects, GraphQL automation, or advanced task syncing.

Reason:
Markdown is visible to all agents, easy to edit, easy to review in Git history, and unlikely to break.

Impact:
GitHub Projects may be considered later, but it is not required for the current workflow.

Status:
Approved.

---

## 2026-04-27 - Refactor 'Working on another device?' guidance into a persistent notification

Decision:
Move the 'Working on another device?' guidance from an inline library banner to a persistent system notification event (\local_transfer_guidance\).

Reason:
The inline banner was temporary and could be easily missed or dismissed. A persistent notification ensures users can access the guidance at any time from their notification history. It also provides a cleaner library UI and a full-page reading experience for the detailed instructions.

Impact:
- New notification type \local_transfer_guidance\ added to database and frontend.
- \ImportBackupButton\ auto-creates the notification if it doesn't exist for the current user.
- The notification detail view renders the \LocalTransferGuidance\ component and provides an 'Import Backup' action that returns the user to the library and triggers the file picker.

Status:
Approved.

---

## 2026-04-27 - Local Project File Workflow (Save/Save As/Open)

Decision:
Implemented a manual "Save / Save As / Open" workflow for local-only projects using the File System Access API, while maintaining the existing background autosave to IndexedDB.

Reason:
Local writers expect a traditional desktop-like file management experience. Background autosave to IndexedDB prevents data loss, but manual disk saving allows users to treat `.storyline` files as their primary portable project units.

Impact:
- Library: "Import Backup" renamed to "Open Project File".
- Project: "Save Project" and "Save As..." actions added to local project menus.
- "Export Project" renamed to "Export Manuscript..." to avoid confusion with native file saving.
- `Ctrl+S` / `Cmd+S` keyboard shortcuts trigger native disk saving.
- Disk-link status (linked filename and last save timestamp) is displayed in the project navigation dropdown.
- Non-supporting browsers (Safari/Firefox) use a seamless download fallback for disk operations.

Status:
Approved.

---

## 2026-04-27 - Implement width-based touch detection override for tablet card UX

Decision:
Force \isTouch\ behavior in \ProjectGrid.tsx\ for screen widths below 1280px, regardless of the browser's reported hover capability.

Reason:
Large tablets like the iPad Pro (1024px-1366px) often report supporting hover (especially in desktop mode or with a trackpad connected), which caused action buttons to hide. On these devices, users typically expect buttons to be visible to avoid accidental project entry, and the previous logic was hiding them on \lg\ viewports.

Impact:
- \ProjectCard\ action icons (Edit, Palette, Trash) are now visible by default on iPad Pro and other large tablets.
- A resize listener ensures the state stays accurate during orientation changes.
- The delete confirmation dialog hides the project type icon while active to prevent visual overlap on narrow cards.

Status:
Approved.

---

## 2026-04-27 - Standardize library card content alignment

Decision:
Implemented fixed-height containers for project card titles (h-[68px]) and descriptions (h-[48px]), and switched the footer divider to use \mt-auto\.\n

Reason:
Inconsistent title lengths and varying metadata/description presence caused the 'top' of the card content and the 'bottom' horizontal line to appear at different heights across cards in the same grid. Using fixed-height containers ensures that the text always starts at the same vertical position and the horizontal line remains perfectly aligned across all cards, creating a much cleaner 'lived-in' aesthetic.\n

Impact:
- Titles are constrained to 2 lines with a stable vertical starting point.
- Descriptions are constrained to 2 lines.
- The horizontal divider is now anchored to the bottom of the content area across all cards.
- Added a \pt-24\ safety margin on cover cards to prevent overlap with top-positioned icons.

Status:
Approved.

---

## 2026-04-27 - Unify library header primary actions

Decision:
Refactored the Library header to group 'Start New Project' and 'Import Backup' into a unified horizontal row on desktop and synchronized their dimensions/breakpoints.\n

Reason:
The previous layout had mismatched breakpoints and varying widths for the primary and secondary actions, leading to a 'jagged' or 'messy' appearance on mid-sized viewports. By standardizing on \lg:w-auto\ for both buttons and matching their horizontal padding (\px-10\ on desktop), the UI now feels more intentional and balanced. Refined the 'Import Backup' button to a premium secondary style (border-2 with backdrop-blur) to complement the primary filled button.\n

Impact:
- Symmetrical action buttons on desktop.
- Consistent horizontal grouping of 'Filter' vs 'Action' rows.
- Improved visual hierarchy between primary and secondary buttons.

Status:
Approved.

---

## 2026-04-27 - Permanent visibility for project action buttons on desktop

Decision:
Made project action buttons (Edit, Palette, Trash) permanently visible on desktop for all cards, removing the previous 'hover-only' behavior for cards without cover art.\n

Reason:
User requested consistent visibility across all cards on desktop. Previously, cards without cover art relied on a hover state (\group-hover:opacity-100\) which felt inconsistent compared to cards with cover art (where icons were always visible). Standardizing this improves discoverability and creates a more stable UI.\n

Impact:
- Action buttons are always visible on desktop viewports.
- Improved UI consistency between 'Cover' and 'Non-Cover' cards.\n

Status:
Approved.
