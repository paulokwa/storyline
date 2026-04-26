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

# Tests To Do

## Core Project Flow

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Create a new project | Not tested | - | - | Confirm full project scaffolding works. |
| Open an existing project | Not tested | - | - | Confirm project loads without missing data. |
| Rename project metadata | Not tested | - | - | Confirm title/metadata saves and persists. |

## Structure / Planning
| Autosave/persistence after refresh | Not tested | - | - | Confirm content remains after reload/device switch. |
| Editor save failure handling | Not tested | - | - | Confirm user gets clear feedback on failure. |
| Read aloud/view mode on tablet portrait | Not tested | - | - | Confirm layout is not cut off on real tablet in portrait mode. |

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

## AI Features

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| AI partner mode selector dropdown | Passed | User | 2026-04-26 | User confirmed the horizontal mode button issue is resolved. |
| AI story-context selection roll-up | Passed | User | 2026-04-26 | User confirmed act/scene selection behavior is now working again after tree and AI-ready bar fixes. |
| AI partner UI cleanup | Passed | User | 2026-04-26 | User confirmed Archive Context removal, redundant Mode pill removal, and desktop spacing cleanup are resolved. |
| Screenplay AI insert from non-chat modes | Needs retest | - | - | Logic was updated to try structured screenplay insertion beyond `Write as Script Scene`; verify in browser. |
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

## UI / Device / Accessibility

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Tablet portrait layout | Not tested | - | - | Confirm important views do not cut off. |
| Mobile/narrow screen layout | Not tested | - | - | Confirm core flows remain usable. |
| Desktop layout | Not tested | - | - | Confirm normal working layout. |
| Font/readability audit | Not tested | - | - | Confirm font choices, sizing, and contrast. |

## Reliability / Technical Debt

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Atomic project scaffolding failure scenario | Not tested | - | - | Confirm no zombie projects after partial failure. |
| Centralized AI rate limiting | Not tested | - | - | Confirm limits work across serverless instances. |
| Retry/backoff for save/init flows | Not tested | - | - | Confirm intermittent failures recover cleanly. |
| AI trial reconciliation checks | Not tested | - | - | Confirm ledger/account/event data stays consistent. |
| Structure tree performance with large project | Not tested | - | - | Confirm acceptable performance with many nodes. |

---

# Recent Successful Test Confirmations

Newest confirmations go at the top.

| 2026-04-26 | AI agent | Structure Tree UX | Passed | Implemented dynamic neighbor highlighting and high-contrast grab handles. |
| 2026-04-26 | AI agent | Story Editor Stability | Passed | Restored StoryTab.tsx and added "Your story awaits" for container nodes. |
| 2026-04-26 | User | AI partner UI cleanup | Passed | User confirmed Archive Context removal and the AI Partner spacing/header cleanup are resolved. |
| 2026-04-26 | User | AI story-context selection roll-up | Passed | User confirmed the deselect/regroup selection issue is fixed. |
| 2026-04-26 | User | AI partner mode selector dropdown | Passed | User confirmed the issue is resolved. |
| - | - | - | - | - |
