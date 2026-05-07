# Task Board

This file is for active and upcoming work that an AI coding agent can actually implement in the repository.

If a task mainly requires Kwame to make a decision, record a video, choose branding, decide pricing, or do other non-coding launch work, it belongs in `docs/human-launch-checklist.md` instead.

If a task is a future product idea and not ready to build yet, it belongs in `docs/future-roadmap.md`.

If a task is engineering hardening, reliability, security, performance, architecture, or data-integrity work, it belongs in `docs/technical-debt-roadmap.md` until it becomes active.

Completed work should be summarized in `SESSION_HANDOVER.md`, `TESTING.md`, commit history, and PR/issue history. Do not let this board become a giant archive of everything that ever happened.

---

## Required Reading Before Starting

Before touching code, read:

1. `MASTER_BRIEF.md`
2. `AGENTS.md`
3. `TROUBLESHOOTING.md`
4. `DECISION_LOG.md`
5. `SESSION_HANDOVER.md`
6. `TASK_BOARD.md`
7. `TESTING.md`

Also read the relevant roadmap file when the task points there:

- `docs/technical-debt-roadmap.md` for engineering debt and hardening
- `docs/future-roadmap.md` for future product ideas
- `docs/human-launch-checklist.md` for human launch decisions and launch chores

---

## Pre-Task Check — Required Before Starting Any Task

Every AI agent must run this check before beginning any task from `Now`, `Next`, or `Later`.

The goal is to prevent re-doing work that was already completed or partially completed in a previous session.

### Step 1 — Check continuity files

For the task you are about to start, look for evidence in:

- `SESSION_HANDOVER.md` under recent `What was completed` sections
- `TESTING.md` for `Passed`, `Needs retest`, `Failed`, or dated entries
- `DECISION_LOG.md` for locked decisions that affect the task
- `MASTER_BRIEF.md` and `AGENTS.md` for workflow rules
- Recent git history, especially `git log --oneline -20`
- Relevant source files that may already contain partial implementation

### Step 2 — Decide before editing

| What you found | What to do |
|---|---|
| No evidence of prior work | Proceed with the task normally. |
| Partial implementation found | Stop and audit. Summarize what exists and ask Kwame whether to complete, revert, or leave it. |
| Full implementation found but test status is `Needs retest` | Do not re-implement. Report that browser/manual validation is the remaining step. |
| Full implementation found and test status is `Passed` | Task is done. Do not reopen it. |
| Ambiguous evidence | Stop and audit first. Give a confidence level before recommending next action. |

### Step 3 — Report before coding

Before writing code, state:

- Which task you are starting
- What you found in the continuity files
- Whether you are proceeding or stopping for audit
- If proceeding, your plan in 3-5 practical steps

---

## Now


### 1. Continue Smart Context / Manual Context implementation

Phase 1 is complete: database migration and TypeScript support were added for `ai_context_mode` and `exclude_from_ai`.

Next phase:

- Thread `ai_context_mode` through AI runtime settings.
- Update `/api/ai/preferences` to save and return the context mode.
- Add the AI settings UI control for Smart Context vs Manual Context.

Do not touch `app/api/ai/analyze-scene/route.ts`. Scene Analysis must remain scene-text-only.

---

### 2. Check and fix export issues, starting with PDF

Audit and fix export problems, starting with PDF output and then verifying other export formats.

Pay special attention to screenplay-mode export errors and format parity across:

- PDF
- DOCX
- EPUB
- HTML
- Markdown
- Plain text

Before changing export code, check `TESTING.md`, `SESSION_HANDOVER.md`, and `docs/technical-debt-roadmap.md` for known export-related issues.

---

## Next



## Later


### 1. Expand the in-app notification system for high-value user events

Product task to revisit the current notification bell/center and decide whether to add more helpful, low-noise notification triggers.

ChatGPT planning reference:
https://chatgpt.com/g/g-p-69c7f39a24148191910ed755d079daab-creative-ai-app/c/69fbe2d9-5a64-83ea-a69a-5cb7461f9b45

Current product direction:

- Keep the bell as an important-event inbox, not a general activity feed.
- Avoid noisy notifications for routine autosave, normal scene edits, ordinary AI completions, generic reminders, or motivational nudges unless they become explicit opt-in features later.
- Prioritize notifications that protect the user's work, clarify collaboration, or guide important setup/recovery moments.

Current status after the 2026-05-07 Phase 3–6 audit:

- Migration history was repaired for `local_transfer_guidance`.
- `project_shared` dedupe groundwork was added in SQL.
- Linked Supabase validation is now complete for `local_transfer_guidance` migration history, live `project_shared` dedupe behavior, and the typed `create_notification` client RPC path.
- Phase 2 collaborator reply notifications are now implemented for thread authors and prior participants, with per-recipient reply event keys and linked-Supabase validation complete.
- Phase 3 Local → Cloud migration notifications are now implemented: `cloud_migration_completed` and `cloud_migration_failed` added to the enum (SQL migration `20260507190000`), applied to linked Supabase, TypeScript types updated, `lib/notifications.ts` updated with icons/routing/labels, and `ProjectSettingsModal.tsx` updated to fire bell notifications on success and non-trivial failure.
- Phase 4 import/export audit complete — **no bell notifications warranted**. All import flows are synchronous and blocking (errors shown inline). All export flows run inside a blocking modal (user cannot navigate away; download triggers immediately on success; toast shows on failure while modal stays open). No background pipeline exists. Adding notifications here would be noise without benefit.
- Broader trigger expansion is still deferred pending manual browser validation and later scoped passes.

Candidate areas to scope later:

1. Foundation fixes
   - Add/verify a proper SQL migration for `local_transfer_guidance` to avoid schema drift.
   - Add event-key dedupe for `project_shared` so re-adding someone does not create noisy duplicate share notifications.
   - Review the existing read-state behavior and decide whether comment viewing should clear related notifications or whether only bell/detail views should do so.

2. Collaboration improvements
   - Continue refining `collaborator_feedback` now that reply notifications exist for thread authors and prior participants.
   - Defer @mentions unless/until the app supports explicit mention UX.

3. Local/cloud safety notifications
   - ✅ Cloud migration completed/failed — DONE (Phase 3).
   - Local backup recommended before risky migration or transfer flows — deferred (existing modal is sufficient).

4. Import/export notifications
   - ✅ Audited (Phase 4) — **no bell notifications warranted**. All flows are synchronous and user-attended; errors are inline or in-modal toast.
   - Revisit only if a background export queue or async import pipeline is added in the future.

5. AI setup and credit guidance
   - ✅ Audited (Phase 5) — **no bell notifications warranted**. All AI errors surface synchronously at point of use. `AiHelperPanel.tsx` already has rich inline error handling with Settings links for all named error codes. `analyzeScene()` shows a generic toast (weaker UX but adequate; the fix is better toast differentiation, not bell notifications). No background AI pipeline exists.
   - Note: `analyzeScene()` in `ProjectContext.tsx` does not differentiate `NO_API_KEY` / `TRIAL_EXHAUSTED` from generic errors — a future UX improvement (not a notification task) would add specific messages with a Settings link for these codes.
   - Revisit only if a background/deferred AI pipeline is added in the future.

6. Storage/quota warnings
   - ✅ Audited (Phase 6) — **no bell notifications warranted at this time.** The primary upload path (`AssetManager.tsx`) surfaces quota errors synchronously at point of use with a descriptive toast — user is always on-page. Critical blocker: no storage management UI exists. Settings page does not fetch or display `storage_used_bytes`. The assets page shows the asset grid but no quota bar. Without a storage quota bar, any bell notification has no useful destination to route users to.
   - **Prerequisite**: ✅ Storage quota bar added to `AssetManager.tsx` (2026-05-07). The assets page now shows usage and is a meaningful notification destination.
   - **Technical debt gap**: `/api/migration/upload-asset` bypasses `check_storage_quota`. Users near quota who migrate image-heavy local projects can silently exceed quota. Logged in `docs/technical-debt-roadmap.md`.
   - Revisit after the quota bar UI is added.

Before implementation of remaining candidates:

- Run a fresh audit of migrations, generated Supabase types, notification RPCs/triggers, notification UI, and comment/collaboration flows.
- Convert the chosen scope into phased instructions for Codex, Antigravity, Claude, or OpenCode Go.
- Keep this as a product-design task first; do not let an agent implement every candidate trigger in one pass.

---

## Not Here Anymore

The following types of items were intentionally moved out of this file:

- Human decisions and launch chores -> `docs/human-launch-checklist.md`
- Future product ideas -> `docs/future-roadmap.md`
- Engineering debt details -> `docs/technical-debt-roadmap.md`
- Durable locked decisions -> `DECISION_LOG.md`
- Long completed-work history -> `SESSION_HANDOVER.md`, `TESTING.md`, commit history, and GitHub issues/PRs

This keeps `TASK_BOARD.md` usable as a real working board instead of a warehouse with fluorescent lights and forgotten boxes.
