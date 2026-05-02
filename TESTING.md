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

# Test Account Workflow

Use the local-only development workflow in `docs/dev-test-account.md`.

Credentials must live only in a gitignored local env file such as `.local/test-account.env` and must never be committed.

Future agents: treat this workflow as established. Before asking the user about test-account setup, read `docs/dev-test-account.md` and prefer `npm run create:test-account` to verify or create the machine-local account.

---

# Tests To Do

## Core Project Flow

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Create a new project | Not tested | - | - | Confirm full project scaffolding works. |
| Open an existing project | Not tested | - | - | Confirm project loads without missing data. |
| Resume incomplete guided setup draft | Needs retest | AI agent | 2026-05-01 | `GuidedFlow.tsx` now persists `stepIndex` with `storyline-guided-data-draft`. Browser validation is still needed to confirm the Library `Resume your setup` card restores the exact guided sub-step and entered data. |
| Rename project metadata | Not tested | - | - | Confirm title/metadata saves and persists. |
| Local/cloud mode feature boundaries | Not tested | - | - | Confirm local features work, cloud-only features are hidden or explained, and cloud projects are not stuck in local-mode wording. |
| Cloud project open messaging | Not tested | - | - | Confirm opening a cloud project does not flash local project messaging. |
| Auth navigation fallback after successful mutation | Needs retest | - | - | Login, signup immediate-session, and reset-password now use a guarded redirect helper. Real browser form submission is still needed to confirm the fallback only appears on genuine stalls. |
| Broader pre-launch regression pass | Not tested | - | - | Cover core project flow, import/export, local/cloud behavior, AI availability states, collaboration, tablet/mobile layout, and onboarding tours. |

## Structure / Planning
| Autosave/persistence after refresh | Not tested | - | - | Confirm content remains after reload/device switch. |
| Editor save failure handling | Not tested | - | - | Simulate or provoke a save failure after retries are exhausted and confirm the editor surfaces a visible `Save failed` state. |
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

## .storyline File Workflow (Save/Save As/Open)

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Open Project File (Library) | Not tested | - | - | Verify selecting a `.storyline` file loads it. |
| Open Conflict (Library) | Not tested | - | - | Verify conflict modal (New Copy / Update / Cancel). |
| Save Project (Local) | Not tested | - | - | Verify `Ctrl+S` updates the linked file on disk. |
| Save As (Local) | Not tested | - | - | Verify Menu > Save As triggers a new picker. |
| Permission Handling | Not tested | - | - | Verify permission prompt after refresh. |
| Download Fallback | Not tested | - | - | Verify Safari/Firefox triggers download. |
| Cloud Gating | Not tested | - | - | Verify cloud projects do NOT show Save actions. |
| Export Manuscript Rename | Not tested | - | - | Verify "Export Manuscript..." opens the in-app export modal, not the .storyline Save As/system file dialog. |
| Local Export Manuscript - Markdown | Not tested | - | - | From a local project, open Export Manuscript, choose Markdown, generate export, and confirm output is manuscript content, not a `.storyline` project file. |
| Local Export Manuscript - DOCX | Not tested | - | - | From a local project, open Export Manuscript, choose MS Word/DOCX, generate export, and confirm output is manuscript content. |
| Local Export Manuscript - EPUB/PDF | Not tested | - | - | From a local project, test EPUB and PDF export if implemented, and confirm output is manuscript content. |
| Cloud Export Manuscript Regression | Not tested | - | - | From a cloud project, confirm Export Manuscript still opens the in-app export modal and exports normal manuscript formats. |
| Save As vs Export Separation | Not tested | - | - | Confirm Save As saves a native `.storyline` file, while Export Manuscript opens the format-selection modal before any file save/download. |
| Sanitization Check | Not tested | - | - | Verify sensitive metadata is stripped from file. |

## AI Features

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| AI-disabled scene analyzer feedback | Passed | User | 2026-04-29 | User manually verified clicking Analyze with AI off opens the AI sidebar with analyzer-specific access messaging. |
| AI partner mode selector dropdown | Passed | User | 2026-04-26 | User confirmed the horizontal mode button issue is resolved. |
| AI story-context selection roll-up | Passed | User | 2026-04-26 | User confirmed act/scene selection behavior is now working again after tree and AI-ready bar fixes. |
| AI partner UI cleanup | Passed | User | 2026-04-26 | User confirmed Archive Context removal, redundant Mode pill removal, and desktop spacing cleanup are resolved. |
| Screenplay AI insert from non-chat modes | Needs retest | - | - | Verify structured screenplay insertion works. |
| AI token usage audit | Not tested | - | - | Confirm unnecessary requests are not being sent. |
| AI terminology consistency | Not tested | - | - | Audit consistency of AI-related wording across the app. |
| BYOK Gemini connection | Not tested | - | - | Confirm user-supplied Gemini key works. |
| Ollama/local AI connection | Not tested | - | - | Confirm local model connection works if enabled. |
| Local AI usage logging integrity | Not tested | - | - | Confirm Ollama/local AI requests create accurate `ai_usage_events` rows for completed, failed, and cancelled runs. |
| App-managed free trial AI usage | Not tested | - | - | Confirm trial mode works for new users. |
| Trial balance/cap enforcement | Not tested | - | - | Use the sponsored app-managed AI trial until it reaches the limit, then confirm the user is blocked cleanly, sees the right exhausted/upgrade guidance, and does not keep getting free responses after the cap is reached. |
| AI provider error handling | Not tested | - | - | Trigger or simulate failed AI calls and confirm the user gets a clear error, the app does not hang, and failed requests do not leave trial balance, reserved balance, or UI state in a broken state. |

## Trial / Billing / Account State

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Local dev test account workflow | Passed | User | 2026-05-02 | User verified end-to-end local execution: `npm run create:test-account` created the account from `.local/test-account.env` on first run and then correctly reported the account already exists on second run. |
| New user sees free trial messaging | Not tested | - | - | Confirm trial message is visible and understandable. |
| Existing user account state displays correctly | Not tested | - | - | Confirm no incorrect trial prompts. |
| Account deletion with trial data | Not tested | - | - | Confirm cleanup/hardening works as expected. |
| Abuse-control signals | Needs retest | AI agent | 2026-04-30 | Implemented expanded disposable domain list (40+ domains) and IP/Fingerprint cluster detection in trial grant logic. Manual verification of new domains is required. |

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
| Project Help shortcuts access | Needs retest | AI agent | 2026-05-01 | Added direct `Open keyboard shortcuts` actions in `/project/[id]/help`, clarified `Shift + /` copy, and routed those actions to the existing shortcuts modal. Browser validation is still needed for both the button flow and the keyboard trigger. |
| Help Center Midnight and scanability polish | Needs retest | AI agent | 2026-05-01 | Shared `HelpTab` and scoped `globals.css` Midnight overrides landed. Browser validation is still needed for `/help` and `/project/[id]/help` in Sanctuary/Midnight, search states, tablet/mobile layout, and the tour CTA. |
| User-facing AI setup instructions | Not tested | - | - | Confirm non-technical users can follow them. |
| Mobile tour performance | Not tested | - | - | Cover section may be too slow; check asset sizes. |

## UI / Device / Accessibility

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Full-app dark mode regression pass | Not tested | - | - | User has seen dark mode anomalies. Audit the entire app in dark/Midnight mode, including library, auth, settings, project shell, editor, AI panels, help, import/export, collaboration/feedback, modals, empty states, hover/focus states, and mobile/tablet layouts. |
| Scene analyzer empty/short-text feedback | Needs retest | User | 2026-05-01 | User reported a light smoke check looked good. `ProjectContext.tsx` and `StoryTab.tsx` now surface explicit feedback when scene analysis is triggered on an empty scene or a scene under 50 characters, and handle oversized/unexpected analyzer failures more clearly. Deeper browser validation is still needed across the Story rail and other analyzer entrypoints. |
| Structure add-child auto-expands collapsed parent | Needs retest | User | 2026-05-01 | User reported a light smoke check looked good. `StructureTree.tsx` now sends a UI-only expand request when adding under a collapsed parent so the new child becomes immediately visible. Deeper browser validation is still needed for collapsed chapter/act/episode parents on desktop and tablet. |
| Screenplay empty-scene Backspace stability | Needs retest | User | 2026-05-01 | User reported the issue appears fixed in a light smoke check. `lib/tiptap/screenplay-keyboard.ts` now avoids converting the default empty paragraph on Backspace, still normalizes empty non-action screenplay blocks back to Action, and consumes empty screenplay-node Backspace safely. `lib/story/scene-text.ts` also stops counting empty screenplay blocks as analyzable text. Deeper browser validation is still needed for repeated Backspace in an empty screenplay scene plus Enter/Tab/Shift-Tab screenplay flows. |
| Scene editor heading metadata simplification | Needs retest | AI agent | 2026-05-01 | `SceneEditor.tsx` now shows a single `SCREENPLAY` or `DRAFT` heading label, hides `Last edited by you`, and keeps collaborator attribution only for other editors. Browser validation is still needed in prose/screenplay, Sanctuary/Midnight, and a collaborator-edited case. |
| Desktop Story shell alignment and Help rail move | Needs retest | AI agent | 2026-05-01 | Desktop app-bar/header spacing was tightened and project Help moved into the Story right rail with the same `/project/[id]/help` route and `data-tour` anchor. Browser validation is still needed for desktop Sanctuary/Midnight, single visible desktop Help trigger, and smaller-screen Help preservation. |
| Story workspace multipurpose right rail | Needs retest | AI agent | 2026-05-01 | Desktop still uses the shared right rail for Analyze, AI Partner, Feedback, `Gallery` / `Visual References`, Dictate, Read Aloud, and Help. Tablet now keeps only `Analyze` and `Ask AI` in the horizontal row, with `Read Aloud`, `Dictate`, `Feedback`, `Gallery` / `Visual References`, and Help in the right rail. Browser validation is still needed for rail actions, help placement, screenplay/book label behavior, and mobile regression. |
| AI Partner Midnight composer surface | Needs retest | AI agent | 2026-05-01 | Added scoped Midnight styling for the AI Partner composer footer and `PremiumEditor` prompt surface. Browser validation is still needed for sidebar/full-canvas, prompt placeholder contrast, and send-button contrast. |
| Screenplay visual references panel | Passed | User | 2026-04-29 | User manually verified labels, attach/remove flow, and refresh persistence for screenplay visual references. |
| Library sort persistence and default | Needs retest | AI agent | 2026-05-01 | `ProjectGrid.tsx` now initializes sort from `localStorage` with a `recent` fallback instead of booting through `custom`. Browser validation is still needed for fresh storage, refresh persistence, and reopening later. |
| Book/prose inline illustration regression | Passed | User | 2026-04-29 | User manually verified prose/book Insert Illustration and Gallery behavior remain unchanged. |
| Library cloud sync help flow | Passed | AI agent | 2026-04-27 | Verified library guidance opens `/help` with clear cloud sync instructions and nav Help Center remains reachable. |
| Tablet portrait layout | Not tested | - | - | Confirm important views do not cut off. |
| Mobile/narrow screen layout | Not tested | - | - | Confirm core flows remain usable. |
| Desktop layout | Not tested | - | - | Confirm normal working layout. |
| Account Settings hierarchy and mobile polish | Needs retest | AI agent | 2026-05-01 | Presentation-only `SettingsView` polish landed. Signed-in desktop/mobile/midnight, AI-off/no-key, limited-trial, and danger-zone browser checks are still needed. |
| Font/readability audit | Needs retest | - | - | Focused AI Partner pass landed: footer warning removed, preview note moved to first-use context preview, and low-contrast helper text was darkened. Browser validation is still needed. |
| Screenplay editor width on mobile | Not tested | - | - | Editor becomes narrow after typing. |
| Swipe/tap sidebar close behavior | Not tested | - | - | Compare swipe vs tap-outside UX. |
| Local mode image loading | Not tested | - | - | Confirm images load correctly in local mode. |
| Solo project collaborator header empty state | Passed | User | 2026-04-26 | User confirmed the empty collaborator pill/blip no longer appears on solo projects. |
| Prose scene gallery wording | Passed | User | 2026-04-26 | User confirmed the wording cleanup is resolved. |
| Profile menu legal link cleanup | Not tested | - | - | Profile menu no longer shows separate Terms / Privacy / AI Disclaimer links, legal pages remain accessible elsewhere, Admin remains admin-only. |
| Export metadata copy polish | Passed | AI agent | 2026-04-30 | Verified rename of "Testing Tip" to "Export Tip" in Project Settings and updated technical debt roadmap. |

## Reliability / Technical Debt

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Atomic project scaffolding failure scenario | Not tested | - | - | Confirm no zombie projects after partial failure. |
| Centralized AI rate limiting | Needs retest | AI agent | 2026-04-30 | Upgraded limiter to support IP and Device Fingerprint clustering. Throttling now applies across accounts sharing the same identity signals to prevent multi-accounting bypass. |
| Retry/backoff for save/init flows | Not tested | - | - | Verify transient cloud project creation or cloud scene-save failures recover on retry, and only surface errors after retry attempts are exhausted. |
| Next.js dev-origin and local auth route reachability | Passed | AI agent | 2026-05-01 | Verified `/login` returns `200` on both `localhost` and `127.0.0.1` after `.next` reset and `allowedDevOrigins` update. Playwright also loaded `127.0.0.1` without the previous dev-origin warning appearing in the current Next dev log. |
| AI trial reconciliation checks | Not tested | - | - | After successful runs, failed runs, cancellations, and interrupted trial requests, confirm the trial account balance recovers correctly, stuck reserved usage is reconciled, and admin/user-visible usage data stays consistent. |
| Structure tree performance with large project | Not tested | - | - | Confirm acceptable performance with many nodes. |
| Pre-launch security audit | Not tested | - | - | Review input sanitization, auth flows, exposed secrets, personal emails, repo references, and deployment settings. |
| Code injection / input sanitization checks | Not tested | - | - | Verify editor, imports, comments, and inputs do not execute unsafe scripts. |

---

# Recent Successful Test Confirmations

Newest confirmations go at the top.

| 2026-04-30 | AI agent | TypeScript compile after project-open 404 layout fix | Passed | `npx tsc --noEmit --pretty false` passed after changing the project layout loader to avoid 404s caused by missing owner `project_members` rows. |
| 2026-05-02 | User | Local dev test account workflow end-to-end | Passed | User verified the script used `.local/test-account.env`, created `dev-test@example.com`, and then reported the same account already exists on a second run. |
| 2026-05-02 | AI agent | Test account script compatibility fix compile check | Passed | Removed the shared `server-only` import from `lib/supabase/admin.ts` so standalone Node and `tsx` scripts can import the admin helper, and `npx tsc --noEmit --pretty false` passed. |
| 2026-05-01 | AI agent | Local dev test account workflow verification | Passed | `npx tsc --noEmit --pretty false` passed, `npm run create:test-account` is wired, and `git check-ignore -v` confirms `.local/test-account.env` and `.env.test.local` are ignored. |
| 2026-05-01 | AI agent | Help shortcuts access compile and focused lint | Passed | `npx tsc --noEmit --pretty false` passed after wiring project Help into the shortcuts modal, and focused `npx eslint` passed for `components/project/help/HelpTab.tsx`, `lib/help.ts`, and `lib/project/shortcuts.ts`. |
| 2026-04-30 | AI agent | TypeScript compile after library back-refresh fix | Passed | `npx tsc --noEmit --pretty false` passed after adding a library-return refresh flag so `Recent` order can re-fetch after opening a project card and returning. |
| 2026-05-01 | AI agent | Focused auth hardening compile and lint | Passed | `npx tsc --noEmit --pretty false` and focused `npx eslint` passed after adding guarded auth redirects and the shared client helper. |
| 2026-05-01 | AI agent | Account Settings polish compile and lint | Passed | `npx tsc --noEmit --pretty false` and `npx eslint components/app/SettingsView.tsx` passed after the presentation-only Sanctuary polish pass for Account Settings. |
| 2026-05-01 | AI agent | Help Center polish compile and lint | Passed | `npx tsc --noEmit --pretty false` and `npx eslint components/project/help/HelpTab.tsx` passed after the Help Center Midnight and scanability polish pass. |
| 2026-04-26 | User | Solo project collaborator header empty state | Passed | User confirmed the empty collaborator pill/blip no longer appears on solo projects. |
| 2026-04-26 | User | Prose scene gallery wording | Passed | User confirmed the wording cleanup is resolved. |
| 2026-04-29 | User | AI-disabled scene analyzer feedback | Passed | User manually verified analyzer-specific AI-off feedback in the browser. |
| 2026-04-29 | User | Screenplay visual references panel | Passed | User manually verified labels, attach/remove flow, and refresh persistence. |
| 2026-04-29 | User | Book/prose inline illustration regression | Passed | User manually verified prose/book image insertion and gallery behavior remain correct. |
| 2026-04-27 | AI agent | TypeScript compile after guided Story Tone AI-availability fix | Passed | `npx tsc --noEmit --pretty false` passed after making guided `Story Tone` copy dynamic based on the user's `ai_enabled` setting. |
| 2026-04-27 | AI agent | TypeScript compile after local/cloud boundary messaging fix | Passed | `npx tsc --noEmit --pretty false` passed after correcting local settings cloud-sync guidance and adding a direct Project Settings path from the local education modal. |
| 2026-04-27 | AI agent | TypeScript compile after local library cover-edit fix | Passed | `npx tsc --noEmit --pretty false` passed after restoring local library edit/cover actions and adding local cover persistence in `CoverEditModal`. |
| 2026-04-27 | AI agent | TypeScript compile after AI context preview footer move | Passed | `npx tsc --noEmit --pretty false` passed after moving the AI context inspector behind an icon-only footer control and floating panel. |
| 2026-04-27 | AI agent | TypeScript compile after Help tab removal | Passed | `npx tsc --noEmit --pretty false` passed after removing the visible Help tab from `ProjectShell` while keeping the help icon and route intact. |
| 2026-04-27 | AI agent | TypeScript compile after centralized AI rate limiting | Passed | `npx tsc --noEmit --pretty false` passed after wiring the shared limiter into the three AI endpoints. |
| 2026-04-26 | AI agent | TypeScript compile | Passed | `npx tsc --noEmit` passed after session changes. |
| 2026-04-26 | AI agent | Structure Tree UX | Passed | Implemented neighbor highlighting and grab handles. |
| 2026-04-26 | AI agent | Story Editor Stability | Passed | Restored StoryTab.tsx and added empty states. |
| 2026-04-26 | User | AI partner UI cleanup | Passed | User confirmed UI cleanup resolved. |
| 2026-04-26 | User | AI story-context selection roll-up | Passed | User confirmed selection behavior is fixed. |
| 2026-04-26 | User | AI partner mode selector dropdown | Passed | User confirmed issue resolved. |
| - | - | - | - | - |
| 2026-04-27 | AI agent | Library card UX (iPad Pro visibility & Delete overlap) | Passed | Verified action buttons (Edit, Palette, Trash) stay visible on iPad Pro viewport (1024x1366) and delete dialog hides project icon to prevent overlap. |
| 2026-04-27 | AI agent | Local transfer guidance notification refactor | Passed | Verified guidance moved to persistent notification, auto-creates on first button interact, and action deep-links back to library with auto-trigger. |
| 2026-04-27 | AI agent | Library card alignment (Titles & Footers) | Passed | Verified titles and horizontal lines are perfectly aligned across cards with varying title lengths and descriptions. |
