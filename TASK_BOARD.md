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

### 1. Add lightweight in-app launch survey and feedback capture

Build the in-app launch survey described in `docs/future-roadmap.md` and GitHub issue #5.

Scope:

- Add a small in-app survey or feedback flow, preferably reachable from Help or a clear `Send Feedback` entry point.
- Keep it short, calm, and dismissible.
- Store product feedback in Supabase instead of relying only on EmailJS/support email.
- Capture safe context automatically where useful, such as page path, project type, writing mode, AI state, app version, and user agent.
- Avoid rebuilding the existing support email/contact flow.
- Avoid public forum/community tooling for now.

Important distinction:

- Support email is for private support issues.
- The in-app survey is for structured product learning at launch.

Reference:

- `docs/future-roadmap.md` -> `Launch feedback, survey, and future community`
- GitHub issue #5: `Add lightweight in-app launch survey and feedback capture`

### 2. Continue typography and contrast audit beyond AI Partner

Continue auditing older low-contrast helper text, metadata, empty states, and secondary labels in less-used screens.

Focus on readability and theme consistency, especially Sanctuary and Midnight.

Do not redesign whole screens unless a focused contrast/readability fix requires it.

### 3. Check and fix export issues, starting with PDF

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

### 1. Manual/browser regression pass for recent editor and feedback polish

This is AI-assisted testing guidance, not product redesign.

Check the latest relevant entries in `SESSION_HANDOVER.md` and `TESTING.md`, then guide Kwame through any manual browser tests that are still marked as needed.

Likely areas:

- Comment highlight polish
- Show Highlights toggle
- Current-scene find
- Prose link support
- Screenplay keyboard behavior
- Export behavior
- Help/Settings visual polish

### 2. Atomic project scaffolding verification

Verify that cloud project creation consistently uses the atomic RPC path and does not leave half-created projects on failure.

Reference:

- `docs/technical-debt-roadmap.md` -> `Atomic Project Scaffolding (RPC)`
- `TESTING.md` -> atomic project scaffolding failure scenario

Only implement fixes if the verification shows a real gap.

---

## Later

These are AI-doable tasks, but they are not active yet. Future agents should only pull them forward when Kwame asks or when they become relevant to a current sprint.

### 1. Advanced offline / pending sync queue

Implement the IndexedDB-backed pending-save queue described in `docs/technical-debt-roadmap.md` if offline/cloud-save reliability becomes important enough to prioritize.

This is different from future Google Drive sync. Google Drive sync is a product idea in `docs/future-roadmap.md`; pending sync is technical reliability work.

### 2. Destructive action guard improvements

Add clearer child-count warnings for deleting structure containers and consider safer entity delete confirmations if accidental deletes become a problem.

Reference:

- `docs/technical-debt-roadmap.md` -> `Destructive Action Guards`

### 3. Feedback Panel AI filter consistency

Decide and implement whether the Feedback panel AI chip should include both `ai-analysis` and `ai-feedback` comment types.

Reference:

- `docs/technical-debt-roadmap.md` -> `Feedback Panel: AI Filter Consistency`

### 4. Portable image export and asset bundling

Improve exported image portability when this becomes a priority.

Reference:

- `docs/technical-debt-roadmap.md` -> `Portable Image Export and Asset Bundling`

### 5. Backup and asset handling improvements

Improve local backup versioning and high-resolution asset serialization after the core launch path is stable.

Reference:

- `docs/technical-debt-roadmap.md` -> `Backup and Asset Handling`

---

## Not Here Anymore

The following types of items were intentionally moved out of this file:

- Human decisions and launch chores -> `docs/human-launch-checklist.md`
- Future product ideas -> `docs/future-roadmap.md`
- Engineering debt details -> `docs/technical-debt-roadmap.md`
- Durable locked decisions -> `DECISION_LOG.md`
- Long completed-work history -> `SESSION_HANDOVER.md`, `TESTING.md`, commit history, and GitHub issues/PRs

This keeps `TASK_BOARD.md` usable as a real working board instead of a warehouse with fluorescent lights and forgotten boxes.
