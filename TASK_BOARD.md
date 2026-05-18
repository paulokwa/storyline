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

### 1. Check and fix export issues, starting with PDF

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

### 1. Magic Detect: Ollama fallback support + client-side path (roadmap)

**Background:**  
Magic Detect currently blocks Ollama users with a hard error at `/api/import/ai-detect`. The UI shows a disabled state via `magicDetectBlockReason='ollama_unsupported'`. Two options were evaluated for fixing this — one is a quick win using existing infrastructure, one is a longer-term architectural improvement.

**Option A — Route through Ollama cloud fallback key (quick win, no new architecture)**  
If a user has Ollama configured with a cloud fallback provider (Gemini, OpenAI, or OpenRouter), the ai-detect route already has everything it needs to resolve that fallback key and proceed. Right now the route returns a hard 400 for `runtime.provider !== 'gemini' | 'openai' | 'openrouter'` without checking the fallback. A single check before that guard — mirroring what the main `/api/ai` route does for Ollama fallback — would make Magic Detect work for any Ollama user who has a fallback key saved.

Implementation sketch:
- In `app/api/import/ai-detect/route.ts`, before the provider-block 400, check `runtime.billingMode === 'ollama' && runtime.aiSettings?.ai_fallback_enabled && runtime.aiSettings?.ai_fallback_provider`.
- Resolve the fallback provider's per-provider key (same pattern as the main AI route).
- Swap `runtime.provider` and `apiKey` to the fallback values and continue normally.
- Update `magicDetectBlockReason` logic in `app/(app)/new/page.tsx` — Ollama users with a fallback configured should get `null` (not blocked).

**Option B — Client-side call directly to user's Ollama instance (longer-term)**  
ImportWizard could POST the structured JSON prompt directly from the browser to the user's `ollama_url`, bypassing the server entirely. No billing/rate-limit wiring needed.  
Blocker: CORS. Ollama doesn't set `Access-Control-Allow-Origin` by default. Users would need `OLLAMA_ORIGINS=https://app-domain.com`. Until Ollama ships CORS-open or a desktop wrapper exists, real-world pickup would be near zero. Revisit when desktop app is on the roadmap.

**Regex/local parser — evaluated and ruled out:**  
A JS heading/keyword parser would only cover what the existing "By Heading" strategy already handles. Magic Detect's value is semantic detection of unmarked POV/time/location shifts — regex can't do that.

**Recommended order:**  
Do Option A first (one route check, very low risk). Put Option B on `docs/future-roadmap.md` pending desktop/wrapper work.

**Acceptance criteria for Option A:**
- Ollama user with Gemini fallback configured can run Magic Detect — it uses their Gemini key transparently.
- Ollama user with no fallback configured still sees the disabled state with a helpful message.
- Trial billing and BYOK usage logging paths are unaffected.
- `magicDetectBlockReason` correctly reflects whether the user is truly blocked (no fallback) vs. able to proceed (fallback available).

---

### 2. Cover art optimization — library performance and upload safety

**Problem:**  
Library/project cover art can take too long to load if uploaded images are large. This may make the library feel slow or broken, especially when users upload high-resolution images directly from phones, AI art tools, or stock image downloads.

**Goal:**  
Automatically optimize cover images at upload time and ensure the library uses lightweight thumbnails instead of full-size originals.

**Scope:**
- Audit current cover upload flow and storage path.
- Add upload-time validation for cover art:
  - supported formats
  - maximum file size
  - graceful error message for unsupported/oversized files
- Add automatic image processing after user upload:
  - resize large images to app-safe cover dimensions
  - compress image to a reasonable quality
  - generate a small library thumbnail
- Ensure the library/project grid uses the optimized thumbnail, not the full-size cover image.
- Add lazy loading, placeholder/skeleton state, and fallback cover styling if the image is missing or slow.
- Decide whether originals should be discarded or stored separately only if needed.
- Ensure this works for both default/generated covers and user-uploaded covers.
- Confirm behaviour for local projects vs cloud projects if cover storage differs.

**Acceptance criteria:**
- Uploading a very large cover image does not make the library slow.
- Library cards load using small optimized images.
- Oversized or unsupported uploads show a friendly warning instead of failing silently.
- Existing covers still display correctly.
- Missing/broken cover URLs fall back to a clean default cover/card state.
- No user project data is lost during cover replacement.
- Add/update tests where practical for upload validation and cover URL selection.

**Priority:** Medium-high before public beta  
**Reason:** First-impression performance issue. A slow library makes the app feel heavier and more “vibe-coded” than it actually is.

---

## Later

### 1. AI settings autosave UX

Replace the single manual `Save AI Settings` action with autosave behavior for actionable AI account settings.

**Goal:**
Changing an AI setting should be the save action. Users should not need to make a choice and then remember to press a separate save button.

**Scope:**
- Remove or retire the bottom `Save AI Settings` button in Account Settings.
- Add a shared patch-based AI preference save helper so each control saves only the changed setting.
- Autosave:
  - Enable / disable AI Partner
  - Free Trial AI / BYOK / Ollama mode
  - Smart Context / Manual Context
  - Cloud provider selection
  - Backup provider selection
  - OpenRouter model selection
- Save text-like settings such as Ollama URL/model on blur or with a short debounce, not on every keystroke.
- Keep API key storage behind the explicit `Test & Save API Key` flow so keys are verified before being stored.
- Add clear inline save states such as `Saving...`, `Saved`, and `Could not save`.

**Risks / guardrails:**
- Do not silently save a typed API key when the user changes an unrelated option.
- Switching to BYOK should still require at least one saved provider key; if none exists, show a clear message instead of pretending the switch completed.
- Avoid race conditions when users click settings quickly; latest choice should win.
- Preserve trial enrollment checks, BYOK validation, Ollama fallback behavior, and per-provider key storage.

**Priority:** Medium
**Reason:** Reduces settings friction and prevents users from assuming a visible choice has applied when it is still waiting on a separate save action.


---

## Done / Archived

### OpenRouter provider-copy audit — COMPLETE (2026-05-11)

All outdated OpenAI-only and missing-OpenRouter references fixed across setup, onboarding, legal pages, and in-app help. Files: `app/ai-disclaimer/page.tsx`, `app/privacy/page.tsx`, `components/app/AiSetupGuide.tsx`, `components/app/FirstRunAiSetup.tsx`, `components/app/SettingsView.tsx`, `lib/help.ts`. Browser/manual review rows added to `TESTING.md`.

---

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
