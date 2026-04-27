# Decision Log

This file records meaningful project decisions and why they were made.

Keep entries concise. Do not rewrite old decisions unless explicitly instructed.

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
