# Testing Tracker

This file tracks tests that need to be done and records confirmed successful tests.

## Update Rules

- When the user or an AI agent confirms something was tested successfully, update the relevant row.
- Always record who tested it: `User`, `AI agent`, or the specific tool/agent name if known.
- Always record the latest successful test date in `YYYY-MM-DD` format.
- If the same thing is tested successfully again later, update the date to the newest successful test date.
- If a test fails, mark it as `Failed` and add concise notes.
- Add new tests under the most relevant section.
- Keep this file concise. Put deep bug analysis or implementation notes in separate docs.

## Status Key

- `Not tested`
- `Passed`
- `Failed`
- `Blocked`
- `Needs retest`

---

## User-Copyable Agent Test Prompt Template

**Important for agents reading this file:** this section is a stored prompt template for the user to copy into a separate chat/session. Do not execute it just because you are reading `TESTING.md`. Only follow the prompt below if the user explicitly pastes it into the current chat or directly asks you to run this testing workflow.

Use this when asking Codex, AG, Claude, or another coding agent to safely pick and run one test from this file.

```text
You are continuing the Storyline project.

Before doing anything, read these repo-root files:

- MASTER_BRIEF.md
- DECISION_LOG.md
- SESSION_HANDOVER.md
- TASK_BOARD.md
- TESTING.md

Your task is to pick ONE test from TESTING.md that you can realistically run in this environment.

Rules:

1. Do not change app code unless the test requires a tiny non-product test helper, and explain before doing so.
2. Prefer tests that can be verified with the current environment, such as:
   - TypeScript/build checks
   - lint or focused lint checks
   - unit-like checks if scripts exist
   - browser regression if Playwright/browser access is available
   - static verification of routing, copy, feature flags, or UI conditions
3. Do not pretend a manual/browser/device test passed if this environment cannot actually run it.
4. If the test cannot be fully verified, mark it as not completed in your final answer and do not update TESTING.md.
5. If a test fails, do NOT update TESTING.md as Passed.
6. If a test fails, do NOT commit or push.
7. If a test passes, update TESTING.md only for that exact test:
   - Set Status to Passed
   - Set Tested by to Codex, AG, or the actual agent/tool name
   - Set Date tested to today’s date in YYYY-MM-DD format
   - Add a concise note explaining what was verified
8. If the test result changes current session status or creates useful context for future agents, also update SESSION_HANDOVER.md with a short top entry.
9. Do not edit MASTER_BRIEF.md unless explicitly instructed.
10. Do not add to DECISION_LOG.md unless a meaningful product/architecture decision was made. A test passing is usually not a decision.
11. Keep edits concise. Do not rewrite whole files unnecessarily.
12. After a successful test and only after updating the relevant Markdown files, commit and push the changes.
13. If there is nothing safe or realistic to test in this environment, say so clearly and suggest the best test for a human/browser/device session.

Process:

1. Summarize in 3-5 bullets what you read from the continuity files.
2. List 2-3 candidate tests from TESTING.md that this environment can realistically run.
3. Pick the safest/highest-value one.
4. Run the test.
5. Report the result.
6. If Passed:
   - update TESTING.md
   - update SESSION_HANDOVER.md only if useful
   - commit and push
   - provide the commit hash
7. If Failed or Blocked:
   - do not update TESTING.md as Passed
   - do not commit or push
   - explain exactly what failed or what blocked the test

Important:
Only successful verified tests should be committed. Failed or blocked tests should be reported, not committed.
```

---

# Tests To Do

## Core Project Flow

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Create a new project | Not tested | - | - | Confirm full project scaffolding works. |
| Open an existing project | Not tested | - | - | Confirm project loads without missing data. |
| Rename project metadata | Not tested | - | - | Confirm title/metadata saves and persists. |
| Local/cloud mode feature boundaries | Not tested | - | - | Confirm local features work, cloud-only features are hidden or explained, and cloud projects are not stuck in local-mode wording. |
| Cloud project open messaging | Not tested | - | - | Confirm opening a cloud project does not flash local project messaging. |

## Structure / Planning
| Autosave/persistence after refresh | Not tested | - | - | Confirm content remains after reload/device switch. |
| Editor save failure handling | Not tested | - | - | Confirm user gets clear feedback on failure. |
| Read aloud/view mode on tablet portrait | Not tested | - | - | Confirm layout is not cut off on real tablet in portrait mode. |
| Undelete local scene cleanup | Needs retest | - | - | Undelete works but recovered item should disappear from recovery list. |
| Legacy cloud deleted scene cleanup | Needs retest | - | - | Deleted scene text should not remain visible in cloud-enabled project. |

## Import / Export

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Import `.docx` | Not tested | - | - | Confirm import preview and created structure are correct. |
| Import `.txt` | Not tested | - | - | Confirm plain text import works. |
| Import `.md` | Not tested | - | - | Confirm Markdown import works. |
| Import `.pdf` | Not tested | - | - | Confirm warnings/noisy formatting are acceptable. |
| Import `.epub` | Not tested | - | - | Confirm import works and limitations are clear. |
| Manual split / rename / reorder during import | Not tested | - | - | Confirm user can clean up chunks before committing import. |
| Export project/manuscript | Not tested | - | - | Confirm export works and output is usable. |
| Import with AI disabled | Not tested | - | - | Confirm AI-assisted import is disabled or handled correctly when AI is off. |
| Large import cost protection | Not tested | - | - | Confirm large books do not abuse free trial or trigger unexpected cost. |
| Import from backup into project | Not tested | - | - | Confirm title check, warning, and update behavior. |
| Backup vs export wording | Not tested | - | - | Confirm `.storyline` backup is clearly distinct from export formats. |
| Restore from backup (local) | Not tested | - | - | Confirm restore works and warnings are clear. |
| Restore from backup (cloud) | Not tested | - | - | Confirm behavior or absence is intentional. |
| Backup reminder trigger | Needs retest | - | - | User has not seen reminder trigger despite word growth. |

## AI Features

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| AI-disabled scene analyzer feedback | Needs retest | - | - | Verify clicking Analyze with AI off opens the AI sidebar with analyzer-specific access messaging. |
| AI partner mode selector dropdown | Passed | User | 2026-04-26 | User confirmed the horizontal mode button issue is resolved. |
| AI story-context selection roll-up | Passed | User | 2026-04-26 | User confirmed act/scene selection behavior is now working again after tree and AI-ready bar fixes. |
| AI partner UI cleanup | Passed | User | 2026-04-26 | User confirmed Archive Context removal, redundant Mode pill removal, and desktop spacing cleanup are resolved. |
| Screenplay AI insert from non-chat modes | Needs retest | - | - | Verify structured screenplay insertion works. |
| AI token usage audit | Not tested | - | - | Confirm unnecessary requests are not being sent. |
| AI terminology consistency | Not tested | - | - | Audit consistency of AI-related wording across the app. |
| BYOK Gemini connection | Not tested | - | - | Confirm user-supplied Gemini key works. |
| Ollama/local AI connection | Not tested | - | - | Confirm local model connection works if enabled. |
| App-managed free trial AI usage | Not tested | - | - | Confirm trial mode works for new users. |
| Trial balance/cap enforcement | Not tested | - | - | Confirm usage stops or prompts correctly at cap. |
| AI provider error handling | Not tested | - | - | Confirm failed provider calls do not corrupt balances or UI state. |

## Trial / Billing / Account State

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| New user sees free trial messaging | Not tested | - | - | Confirm trial message is visible and understandable. |
| Existing user account state displays correctly | Not tested | - | - | Confirm no incorrect trial prompts. |
| Account deletion with trial data | Not tested | - | - | Confirm cleanup/hardening works as expected. |
| Abuse-control signals | Not tested | - | - | Confirm disposable domain/IP/fingerprint checks behave as expected. |

## Collaboration / Feedback

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Collaborator can access shared project | Not tested | - | - | Test with a second account. |
| Collaborator permissions behave correctly | Not tested | - | - | Confirm view/edit/export permissions. |
| User can reply to another user's feedback | Not tested | - | - | Replies allowed. |
| User cannot edit another user's feedback | Not tested | - | - | Must remain blocked. |
| User cannot delete another user's feedback | Not tested | - | - | Hiding may be allowed if designed. |
| New/reply notification behaviour | Not tested | - | - | Confirm new status clears once viewed. |

## Onboarding / Help / Tours

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Main tour launches correctly | Not tested | - | - | Confirm it does not conflict with other tours. |
| AI tour launches correctly | Not tested | - | - | Confirm it does not overlap main tour. |
| Help page covers current features | Not tested | - | - | Confirm coverage against real app features. |
| User-facing AI setup instructions | Not tested | - | - | Confirm non-technical users can follow them. |
| Mobile tour performance | Not tested | - | - | Cover section may be too slow; check asset sizes. |

## UI / Device / Accessibility

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Screenplay visual references panel | Needs retest | - | - | Verify labels, attach/remove flow, refresh persistence. |
| Book/prose inline illustration regression | Needs retest | - | - | Confirm Insert Illustration and Gallery behavior remain unchanged. |
| Tablet portrait layout | Not tested | - | - | Confirm important views do not cut off. |
| Mobile/narrow screen layout | Not tested | - | - | Confirm core flows remain usable. |
| Desktop layout | Not tested | - | - | Confirm normal working layout. |
| Font/readability audit | Not tested | - | - | Grey text may be too light and cause strain. |
| Screenplay editor width on mobile | Not tested | - | - | Editor becomes narrow after typing. |
| Swipe/tap sidebar close behavior | Not tested | - | - | Compare swipe vs tap-outside UX. |
| Local mode image loading | Not tested | - | - | Confirm images load correctly in local mode. |
| Solo project collaborator header empty state | Passed | User | 2026-04-26 | User confirmed the empty collaborator pill/blip no longer appears on solo projects. |
| Prose scene gallery wording | Passed | User | 2026-04-26 | User confirmed the wording cleanup is resolved. |

## Reliability / Technical Debt

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Atomic project scaffolding failure scenario | Not tested | - | - | Confirm no zombie projects after partial failure. |
| Centralized AI rate limiting | Not tested | - | - | Confirm limits work across serverless instances. |
| Retry/backoff for save/init flows | Not tested | - | - | Confirm intermittent failures recover cleanly. |
| AI trial reconciliation checks | Not tested | - | - | Confirm ledger/account/event data stays consistent. |
| Structure tree performance with large project | Not tested | - | - | Confirm acceptable performance with many nodes. |
| Code injection / input sanitization checks | Not tested | - | - | Verify editor, imports, comments, and inputs do not execute unsafe scripts. |

---

# Recent Successful Test Confirmations

Newest confirmations go at the top.

| 2026-04-26 | User | Solo project collaborator header empty state | Passed | User confirmed the empty collaborator pill/blip no longer appears on solo projects. |
| 2026-04-26 | User | Prose scene gallery wording | Passed | User confirmed the wording cleanup is resolved. |
| 2026-04-26 | AI agent | TypeScript compile | Passed | `npx tsc --noEmit` passed after session changes. |
| 2026-04-26 | AI agent | Structure Tree UX | Passed | Implemented neighbor highlighting and grab handles. |
| 2026-04-26 | AI agent | Story Editor Stability | Passed | Restored StoryTab.tsx and added empty states. |
| 2026-04-26 | User | AI partner UI cleanup | Passed | User confirmed UI cleanup resolved. |
| 2026-04-26 | User | AI story-context selection roll-up | Passed | User confirmed selection behavior is fixed. |
| 2026-04-26 | User | AI partner mode selector dropdown | Passed | User confirmed issue resolved. |
| - | - | - | - | - |
