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

### Pre-launch audit blockers - added 2026-05-11

These came from the app audit and should stay in `Now` because they can affect data safety, user trust, security/resource abuse, auth clarity, import/export correctness, or AI cost clarity.

- Fix scene title-only autosave risk.
- Fix Local -> Cloud migration orphan-project risk.
- Escape user-controlled fields in HTML/EPUB exports.
- Fix password reset duplicate submit and remove email/status console logs.
- Decide/protect `/api/import` if it should not be publicly callable.


### 0. OpenRouter BYOK — apply migration + browser validation required

Two steps remain before OpenRouter is launch-ready:

**Step A — ~~Apply DB migration~~** — Done 2026-05-09 via `supabase db push`.

**Step B — Browser acceptance checklist** (full list in `TESTING.md`):

1. ✅ Apply migration. Confirm Settings shows the OpenRouter model selector dropdown.
2. ✅ Confirm default is "Llama 3.3 70B (Free)" — not GPT-4o mini. *(Note: default changed to Llama 3.3 70B after Llama 3.1 8B was retired — see session 2 handover.)*
3. ✅ Save a valid OpenRouter key → confirm "Connected" success.
4. ✅ Enter an invalid key → confirm friendly error, no crash.
5. ✅ Send a basic AI Partner message → confirm streaming response with correct OPENROUTER badge.
6. Run Analyze Scene → confirm structured JSON result, no hang. *(Not retested in session 2.)*
7. Run Import AI Detect → confirm headings detected (free model JSON fix now in place). *(Not retested.)*
8. ✅ Change model to GPT-4o mini → confirm paid model works; free model may rate-limit (expected).
9. Confirm no misleading `$0.00` pricing anywhere. *(Copy pass — task #1 — still pending.)*
10. ✅ Confirm usage logged with `provider = 'openrouter'` and the correct model. *(Verified via clean terminal after constraint fix.)*
11. Switch back to Gemini or OpenAI → confirm switch works. *(Not retested in session 2.)*
12. Confirm Ollama and trial mode unaffected. *(Not retested in session 2.)*

---

### 1. OpenRouter copy pass — AI pricing, setup, onboarding, and showcase copy

OpenRouter support changes how AI-provider copy should be worded. Existing copy may assume only OpenAI, Gemini, Ollama, or app-managed trial AI, and some cost-warning copy may imply exact dollar estimates even when OpenRouter pricing is unknown, variable, or free-model-limited.

Goal:

- Audit and update all user-facing AI copy so the app clearly supports OpenRouter without misleading users about cost, credits, free models, quotas, or setup.

Required scope:

1. Audit all AI cost/context warning copy.
   - AI Partner warnings
   - Analyze Scene warnings
   - Import AI detection warnings
   - Large book import warnings
   - Large-context confirmation modals
   - Extreme-context safeguards
   - Any labels that mention estimated cost, credits, tokens, provider usage, or `$0.00`

2. Update warning language so it works for:
   - known-priced OpenAI/Gemini models
   - unknown or variable OpenRouter model pricing
   - OpenRouter free models
   - Ollama/local models
   - app-managed trial AI

3. Preserve known-cost estimates where they are reliable.
   - If exact pricing exists, continue showing approximate estimated cost.
   - If pricing is unknown or OpenRouter-based, do not show misleading `$0.00`.
   - Use wording like: `OpenRouter pricing depends on the model you select. Large requests may use more OpenRouter credits or hit model limits.`
   - For free OpenRouter models, use wording like: `This model may be free to use, but large requests can still hit rate limits or free-model quotas.`

4. Audit and update all AI setup/provider copy.
   - Settings AI configuration
   - First-run AI setup
   - AI setup guide
   - Any provider comparison cards/tables
   - Empty states or disabled-AI prompts
   - Missing-key / invalid-key / billing / provider-unavailable messages

5. Audit and update all onboarding/showcase/marketing copy that mentions AI.
   - Showcase page
   - Landing/public pages
   - Onboarding screens
   - Setup configuration text
   - Any feature descriptions that explain supported AI providers
   - Any copy that says or implies only OpenAI/Gemini/Ollama are supported

6. Keep the feature positioning simple.
   - OpenRouter should be described as an optional BYOK provider.
   - Do not imply OpenRouter is free in general.
   - Do not imply every OpenRouter model works without billing.
   - Do not imply Storyline pays for OpenRouter usage.
   - Make clear that OpenRouter usage is billed/limited by OpenRouter and the selected model.

7. Do not change billing logic, provider routing, or warning thresholds in this task unless a copy bug exposes a blocker.
   - This is a copy/UX clarity pass first.
   - Any logic issue found should be reported before implementation.

Acceptance checks:

1. Searching the codebase for AI provider names should find no outdated provider list that excludes OpenRouter where OpenRouter should be included.
2. Searching for `$0.00`, `estimated cost`, `credits`, `free`, `provider`, `OpenAI`, `Gemini`, `Ollama`, and `OpenRouter` should reveal no misleading AI copy.
3. Gemini/OpenAI known-cost estimates still display when available.
4. OpenRouter unknown/free model copy does not show misleading zero-cost certainty.
5. OpenRouter is represented consistently in Settings, onboarding, setup guide, and showcase/marketing copy.
6. Manual browser review confirms the copy reads naturally and does not overcrowd the UI.

Suggested output after completion:

- Files changed
- Before/after copy summary
- Confirmation that no outdated AI-provider copy remains in the searched areas
- Confirmation that pricing copy is accurate for OpenRouter paid, unknown, and free models
- Tests/searches run

---

### 2. Phase 6 Story Scope selector - browser validation required

Phase 6 code is implemented and statically verified. Browser validation is still needed before signing off the corrected Story Scope behavior.

Retest:

1. Smart mode: confirm AI Partner shows `Story Scope` plus read-only `Smart Context`.
2. Manual mode: confirm AI Partner shows `Story Scope` plus separate interactive `Story Elements`.
3. Entire Project: confirm the selector shows the first-10 scene state and the existing inline notice still says the first 10 scenes are loaded.
4. Entire Project: click `Use more context` and confirm the existing Default / Expanded / Full Project Manuscript modal still offers 10 / 50 / all scenes.
5. Chapter/act/episode selection: select a scope with more than 10 descendant scenes and confirm a friendly inline warning appears.
6. Full-screen AI: confirm the same Story Scope UI appears and updates the same selected writing scope.
7. Scene Analysis: confirm behavior is unchanged.

---


### 3. Smart Context Phase 5 - browser validation required

Phase 5 code is implemented and statically verified. Browser validation is still needed before signing off Smart Context safeguards.

Retest:

1. Smart mode: confirm AI Partner shows the read-only Smart Context summary with no interactive `Scene Context` selector and no manual-looking entity count strip such as `Characters 2 | Ideas 1 | Locations 2`.
2. Smart mode with large eligible entity context: confirm the Smart Context size warning appears.
3. Manual mode: confirm the interactive `Scene Context` selector still appears and selected/deselected linked items affect AI context.
4. Scene Analysis: run in Smart and Manual modes and confirm behavior is unchanged.
5. Smart mode: ask AI Partner whether it received full scene/chapter/manuscript text outside the current scene; it should not claim all scenes, chapters, or full manuscript text.

Seeded warning fixtures for later browser testing:

- Medium warning project: `[Smart Context Warning Test] Medium 2026-05-08T04-33-12`
  - Project ID: `5cad62c8-eb36-4cd9-a263-9f3d02c343a1`
  - Open: `/project/5cad62c8-eb36-4cd9-a263-9f3d02c343a1/story`
  - Expected: Smart Context summary should show the medium note because eligible entity context is about `12,012` estimated tokens.
- High warning project: `[Smart Context Warning Test] High 2026-05-08T04-33-12`
  - Project ID: `e896c90e-2a47-4a15-92a4-08f440516fde`
  - Open: `/project/e896c90e-2a47-4a15-92a4-08f440516fde/story`
  - Expected: Smart Context summary should show the high warning because eligible entity context is about `31,051` estimated tokens.

Cross-reference: `TESTING.md` has the same fixture details under `Smart Context Phase 5 safeguards and clarity`.

---

### 4. Smart Context entity include/exclude control - browser retest required

Phase 4/4.5 browser validation passed on 2026-05-08.

Follow-up UI polish was added because the entity-level Include/Exclude control existed but was not visually obvious enough in browser testing.

Retest:

1. Open a character detail page and confirm `Include in Smart Context` is clearly visible and obviously interactive.
2. Toggle it off and confirm status changes to `Excluded from Smart Context`.
3. Refresh and confirm the setting persists.
4. Toggle it back on and confirm status changes to `Included in Smart Context`.
5. Spot-check the same control on idea, location, and object detail pages.

---

### 5. Check and fix export issues, starting with PDF

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
