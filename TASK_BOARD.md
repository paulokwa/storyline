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

### 1. OpenRouter copy pass — AI pricing, setup, onboarding, and showcase copy

**Urgent warning fixes — DONE (2026-05-11):** Magic Detect cost copy, AI safeguard dialogs, and Settings free-tier model copy were reworded for OpenRouter, trial, BYOK, and Ollama. See commits `204ef13`, `823c238`.

**Remaining scope:** Broader provider-copy audit across setup, onboarding, showcase, and legal/help-adjacent UI. Check for outdated provider lists, misleading $0.00 estimates, and missing OpenRouter references in:
- Settings AI configuration and first-run setup
- Showcase and landing pages
- Onboarding screens
- Empty states, disabled-AI prompts, and error messages

**Browser/manual review** is tracked in `TESTING.md`. Do not reopen already-fixed warning copy.

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


---

## Done / Archived

### 1. Notification system expansion (all 6 phases) — COMPLETE

All six phases of the notification expansion project were audited and implemented in 2026-05-07 sessions. See `SESSION_HANDOVER.md` entries from 2026-05-07 for full details.

**What was delivered:**
- Foundation: `local_transfer_guidance` migration history repaired, `project_shared` dedupe with event-key backfill, typed `create_notification` RPC path
- Phase 2: Collaborator reply notifications (thread author + prior participants, deduped)
- Phase 3: Cloud migration completed/failed bell notifications with stage-keyed dedupe
- Phase 4: Import/export audit — no bell notifications warranted (all flows synchronous)
- Phase 5: AI setup/credit audit — no bell notifications warranted (all errors surface inline)
- Phase 6: Storage/quota audit — no bell notifications warranted; quota bar added to AssetManager as prerequisite

**Technical follow-ups** (moved to `docs/technical-debt-roadmap.md`):
- `analyzeScene()` error differentiation for `NO_API_KEY` / `TRIAL_EXHAUSTED`
- Batch-aware migration quota pre-flight (known limitation in item 5)

**Product decisions still open** (moved to `docs/human-launch-checklist.md`):
- Comment-panel read-state behavior (whether opening comments panel should clear notification `read_at`)

---

## Not Here Anymore

The following types of items were intentionally moved out of this file:

- Human decisions and launch chores -> `docs/human-launch-checklist.md`
- Future product ideas -> `docs/future-roadmap.md`
- Engineering debt details -> `docs/technical-debt-roadmap.md`
- Durable locked decisions -> `DECISION_LOG.md`
- Long completed-work history -> `SESSION_HANDOVER.md`, `TESTING.md`, commit history, and GitHub issues/PRs

This keeps `TASK_BOARD.md` usable as a real working board instead of a warehouse with fluorescent lights and forgotten boxes.

---

## Audit Notes

**Date:** 2026-05-11
**Files checked:** TASK_BOARD.md, SESSION_HANDOVER.md, TESTING.md, MASTER_BRIEF.md, docs/technical-debt-roadmap.md, docs/human-launch-checklist.md, docs/future-roadmap.md, git log (50 recent commits)
**Method:** Each item in Now / Later was cross-referenced against SESSION_HANDOVER.md entries, TESTING.md status columns, git commit history, and direct notes within TASK_BOARD.md itself. Items where the task board or session handover explicitly stated completion or audit closure were moved to Done / Archived. Residual technical concerns were moved to `docs/technical-debt-roadmap.md`; product decisions were moved to `docs/human-launch-checklist.md`. Still-active items kept in place with scope clarified and wording shortened.
**Git commits used as evidence:** `f13373c`, `db57549`, `204ef13`, `823c238`, `61ce536`, `569f9cb`, `84b063e`, `eb494f2`, `6865dc9`, `0af2beb`, and 40+ others from 2026-05-07 through 2026-05-11.
**Unclear items requiring Kwame's decision:** None. All items could be classified from continuity evidence.
