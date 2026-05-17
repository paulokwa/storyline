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
| Google OAuth login/signup | Passed | User | 2026-05-11 | User verified Google OAuth on localhost and production. Existing Google account login loaded the correct Storyline account/projects; signup/login flows, cancellation/wrong-account handling, logout/login persistence, email/password regression, and local-first safety checks passed. |
| Apple OAuth — feature flag gates UI | Not tested | - | - | Set `NEXT_PUBLIC_ENABLE_APPLE_OAUTH=true` in `.env.local` and restart the dev server. Confirm "Continue with Apple" button appears on `/login` and `/signup` between the Google button and the "Email" divider. Without the flag the button must not render. Apple Developer + Supabase Apple provider setup required before end-to-end flow can be tested. |
| Apple OAuth — button hidden when flag is OFF | Not tested | - | - | Without `NEXT_PUBLIC_ENABLE_APPLE_OAUTH=true` (absent or any value other than `true`): confirm no Apple button appears on `/login` or `/signup`. Google OAuth and email/password must still work. |
| Apple OAuth — login flow end-to-end | Not tested | - | - | With flag ON and Apple Developer + Supabase provider configured: click "Continue with Apple" on `/login`. Confirm redirect to Apple sign-in → `/api/auth/callback` → `/library`. |
| Apple OAuth — signup flow end-to-end | Not tested | - | - | With flag ON and provider configured: click "Continue with Apple" on `/signup`. Confirm same redirect flow; Supabase creates a new user if the Apple ID has not been seen before. |
| Apple OAuth — private relay email | Not tested | - | - | When the user chooses "Hide My Email" on Apple's consent screen, Supabase stores a private relay address (e.g. `randomhash@privaterelay.appleid.com`). Confirm the app does not crash, the user reaches `/library`, and their profile is created normally. No special app-side handling is required — Supabase treats the relay address as a valid email. |
| Apple OAuth — name only sent on first sign-in | Not tested | - | - | Apple sends the user's name only on the very first OAuth consent. Confirm the display name in Supabase `raw_user_meta_data` is set on first sign-in and unchanged on subsequent sign-ins. |
| Apple OAuth — localhost callback URL | Not tested | - | - | On localhost, `getOAuthCallbackUrl()` returns `http://localhost:3000/api/auth/callback`. Add this URL to Supabase allowed redirect URLs and to the Apple Developer Service ID return URLs before local testing. |
| Provider copy audit — first-run setup (FirstRunAiSetup) | Not tested | - | - | Open the first-run AI setup screen. Confirm: trial card says "Storyline-managed AI access" (not "OpenAI"), BYOK card mentions OpenAI, Gemini, and OpenRouter, CardDescription for BYOK includes all three providers, trial CardDescription says "app-managed AI trial" (not "OpenAI trial"). |
| Provider copy audit — Settings AI section | Not tested | - | - | Open Settings → AI Partner Settings. Confirm Free Trial AI radio description says "app-managed AI trial" with no "OpenAI" reference. |
| Provider copy audit — onboarding help (AiSetupGuide) | Not tested | - | - | Open the AI setup guide. Confirm OpenRouter default model is described as "Llama 3.3 70B via OpenRouter" (not "gpt-4o-mini"). |
| Provider copy audit — legal pages | Not tested | - | - | Visit `/privacy` and `/ai-disclaimer`. Confirm both pages list "Google Gemini, OpenAI, or OpenRouter" (not just "Google Gemini and OpenAI"). |
| Provider copy audit — in-app help BYOK entry | Not tested | - | - | Open the in-app help panel and search for "API key" or "BYOK". Confirm the answer mentions OpenAI, Gemini, and OpenRouter with steps for each. |
| Broader pre-launch regression pass | Not tested | - | - | Cover core project flow, import/export, local/cloud behavior, AI availability states, collaboration, tablet/mobile layout, and onboarding tours. |
| Public beta import/export confidence pass | Not tested | - | - | Manual launch QA moved here from `docs/human-launch-checklist.md`: import common file types, review generated structure, export common manuscript formats, and confirm output is usable. |
| Public beta auth flow QA | Not tested | - | - | Manual launch QA moved here from `docs/human-launch-checklist.md`: signup, login, verification, reused/expired verification link, forgot-password, and reset-password flows. |
| Public beta AI cost warning copy review | Not tested | - | - | Manual launch QA moved here from `docs/human-launch-checklist.md`: review trial, BYOK, OpenRouter, Ollama, large-context, and import Magic Detect warning copy in browser. |
| Public beta mobile/tablet smoke test | Not tested | - | - | Manual launch QA moved here from `docs/human-launch-checklist.md`: check 320px phone, 375px phone, 768px tablet, and 1024px landscape tablet for core app panels and modals. |

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
| Backup large-file warning (image-heavy project) | Needs retest | AI agent | 2026-05-03 | `BackupBanner.tsx` and both backup callers in `ProjectShell.tsx` now show a `toast.warning` when the backup exceeds 20 MB. To test: open a local project, attach several images as visual references, then trigger a backup from the reminder banner and from the project menu. Confirm a yellow toast appears with wording like "Backup is X MB — your project contains embedded images which increase file size. This is normal." |
| Backup no-warning for text-only project | Needs retest | AI agent | 2026-05-03 | Trigger a backup on a text-only local project (no attached images). Confirm no size warning toast appears. Also confirm the backup file still downloads correctly and `recordBackupComplete` still fires (reminder resets). |

## Assets / Storage

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Storage quota bar visible on Assets page (cloud project) | Needs retest | AI agent | 2026-05-07 | `AssetManager.tsx` now fetches `check_storage_quota` on mount and renders a thin bar between the page header and the asset grid. Browser validation: open a cloud project, go to Assets — confirm the bar appears with "Storage" label and "X MB of Y MB" text. |
| Storage quota bar absent for local-only projects | Needs retest | AI agent | 2026-05-07 | Local projects don't have server-side quota. Confirm the bar is completely absent on a local-only project's Assets page. |
| Storage quota bar refreshes after upload | Needs retest | AI agent | 2026-05-07 | Upload an image on a cloud project. After `toast.success('Asset uploaded successfully')`, the quota bar should update to reflect the new usage without a page reload. |
| Storage quota bar refreshes after delete | Needs retest | AI agent | 2026-05-07 | Delete an asset on a cloud project. After `toast.success('Asset deleted')`, the quota bar should update to reflect the freed space. |
| Storage quota bar warning state at 80%+ | Needs retest | AI agent | 2026-05-07 | At 80–90% usage, the bar label should change to "Nearing storage limit" (amber), the bar fill should be amber, and the background strip should be amber-tinted. |
| Storage quota bar critical state at 90%+ | Needs retest | AI agent | 2026-05-07 | At 90%+ usage, the bar label should change to "Storage almost full" (red), bar fill red, background red-tinted. |
| Storage quota bar fails silently if RPC errors | Needs retest | AI agent | 2026-05-07 | If `check_storage_quota` RPC fails (e.g. simulate with network throttle or revoke), the quota bar should simply not appear. Asset upload and delete must still function normally. No error toast or broken state should result from the quota fetch failure. |
| Upload quota error toast still works (regression) | Needs retest | AI agent | 2026-05-07 | Simulate or reach quota limit and attempt an upload. The pre-upload `check_storage_quota` call should still fire and display `toast.error('Storage quota exceeded', { description: '...' })`. This path is unchanged. |
| Storage formatBytes: MB and GB formatting | Needs retest | AI agent | 2026-05-07 | `formatBytes()` should output "X.X MB" for values under 1 GB and "X.X GB" for values at or above 1 GB. Verify with: 0 bytes → "0.0 MB", 1MB → "1.0 MB", 104857600 (100MB) → "100.0 MB", 1073741824 (1GB) → "1.0 GB". |
| Migration upload under quota succeeds | Needs retest | AI agent | 2026-05-07 | Migrate a local project that has image assets when the user is well under their storage quota. Confirm migration completes normally and all assets are accessible on the cloud project. |
| Migration upload over quota is blocked | Needs retest | AI agent | 2026-05-07 | With a user at or near storage quota, attempt to migrate a local project with image assets. Confirm the migration fails with a `toast.error` showing the quota message (e.g. "Failed to upload asset '…': Storage quota exceeded (X MB of Y MB used). Free up space by deleting project assets, then retry the migration."). Confirm no partial project rows are left behind (migration atomicity cleanup should fire). |
| Migration quota error is actionable | Needs retest | AI agent | 2026-05-07 | In the quota-exceeded migration failure above, confirm the error message tells the user what to do (delete assets, retry) rather than showing a generic server error. |
| AssetManager quota bar updates after successful migration | Needs retest | AI agent | 2026-05-07 | After a successful migration that includes image assets, open the new cloud project's Assets page and confirm the quota bar reflects the correct post-migration usage. |

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
| Smart/Manual Context Phase 1 schema and types | Passed | AI agent | 2026-05-07 | Migration/type support added for `ai_context_mode` and `exclude_from_ai`. Linked Supabase migration `20260507210000` was applied and a service-role query confirmed `user_api_keys.ai_context_mode` is visible through PostgREST. |
| Smart Context settings persistence | Passed | User | 2026-05-08 | User confirmed Settings save/reload works after the remote migration was applied. Smart Context / Manual Context selection persists correctly. |
| Manual Context selected linked items included | Passed | User | 2026-05-08 | In Manual Context mode, selected scene-linked entries were supplied to AI Partner. AI listed linked context outside the visible scene text. |
| Manual Context deselected linked item excluded | Passed | User | 2026-05-08 | Mera was deselected and AI Partner did not list Mera as a supplied linked character. |
| Manual Context reselected linked character included | Passed | User | 2026-05-08 | After Mera was reselected, AI Partner listed both JACK RYAN / Jack Ryker and MERA as supplied character context. |
| Smart Context editor manual row hidden | Passed | User | 2026-05-08 | In Smart Context mode, the editor-side manual Scene Context row disappeared as expected. |
| Smart Context AI Partner UI is read-only | Passed | User | 2026-05-08 | After Phase 4.5, Smart Context mode no longer shows the interactive Scene Context selector/dropdown in AI Partner. It shows a compact read-only Smart Context summary. |
| Manual Context AI Partner selector preserved | Passed | User | 2026-05-08 | Manual Context mode still shows the interactive Scene Context selector and preserves the existing manual workflow. |
| Smart/Manual mode switching preserves manual links | Passed | User | 2026-05-08 | Switching between Smart Context and Manual Context did not delete manual scene-linked context items. |
| Scene Analysis remains scene-text-only with context modes | Passed | User | 2026-05-08 | Scene Analysis worked in both modes and remained independent from AI Partner context mode. Implementation reports confirm `app/api/ai/analyze-scene/route.ts` was untouched. |
| AI Partner Story Scope selector | Needs retest | AI agent | 2026-05-08 | Phase 6 added a separate `Story Scope` selector in AI Partner for Smart and Manual modes. Verify Current scene, Entire Project, chapters, acts, episodes, and full-screen AI. |
| AI Partner Entire Project context escalation | Needs retest | AI agent | 2026-05-08 | Entire Project still uses the existing first-10 notice and `Use more context` flow. Verify Default / Expanded / Full Project Manuscript still map to 10 / 50 / all scenes. |
| AI Partner large structure-scope warning | Needs retest | AI agent | 2026-05-08 | Selecting a specific chapter, act, or episode already includes all descendant scenes. Phase 6 adds a friendly inline warning when that selected scope includes more than 10 scenes. |
| Smart Context excludes opted-out items | Blocked | User | 2026-05-08 | Could not fully test because the entity include/exclude switch was not visually obvious/discoverable in the tabs. Retest after UI polish. |
| Entity Smart Context include/exclude control visibility | Needs retest | User | 2026-05-08 | Entity pages show `AI Context / Included in Smart Context`, but the switch/control was not obvious during browser testing. Make it visibly interactive in Characters, Ideas, Locations, and Objects tabs. |
| Smart Context size warning | Needs retest | AI agent | 2026-05-08 | Phase 5 added medium/high/extreme warnings. Browser validation is needed with a large enough Smart Context. Seeded fixtures: medium `/project/5cad62c8-eb36-4cd9-a263-9f3d02c343a1/story` and high `/project/e896c90e-2a47-4a15-92a4-08f440516fde/story`. |
| Smart Context extreme-size confirmation | Needs retest | AI agent | 2026-05-08 | Phase 5 routes extreme Smart Context through the existing safeguard dialog. Browser validation is needed with extreme-sized context. |
| AI Partner context_mode usage metadata | Needs retest | AI agent | 2026-05-08 | Phase 5 added `context_mode` metadata for AI Partner helper requests and local Ollama usage. DB/log validation is still needed. |
| AI-disabled scene analyzer feedback | Passed | User | 2026-04-29 | User manually verified clicking Analyze with AI off opens the AI sidebar with analyzer-specific access messaging. |
| AI partner mode selector dropdown | Passed | User | 2026-04-26 | User confirmed the horizontal mode button issue is resolved. |
| AI story-context selection roll-up | Passed | User | 2026-04-26 | User confirmed act/scene selection behavior is now working again after tree and AI-ready bar fixes. |
| AI partner UI cleanup | Passed | User | 2026-04-26 | User confirmed Archive Context removal, redundant Mode pill removal, and desktop spacing cleanup are resolved. |
| Screenplay AI insert from non-chat modes | Needs retest | - | - | Verify structured screenplay insertion works. |
| AI token usage audit | Not tested | - | - | Confirm unnecessary requests are not being sent. |
| AI terminology consistency | Not tested | - | - | Audit consistency of AI-related wording across the app. |
| OpenRouter BYOK — save valid key | Passed | User | 2026-05-09 | Manual end-to-end testing confirmed a real OpenRouter key was accepted and connected. |
| OpenRouter BYOK — invalid key friendly error | Passed | User | 2026-05-09 | Manual end-to-end testing confirmed fake keys are rejected with friendly handling after validation moved to `/api/v1/auth/key`. |
| OpenRouter BYOK — basic AI Partner streaming | Passed | User | 2026-05-09 | Manual end-to-end testing confirmed AI Partner returned responses through OpenRouter with the OPENROUTER badge. |
| OpenRouter BYOK — Analyze Scene | Needs retest | AI agent | 2026-05-08 | Run Analyze Scene with OpenRouter active. Confirm structured JSON result returned, no hang, usage logged with `provider = 'openrouter'`. |
| OpenRouter BYOK — Import AI Detect | Needs retest | AI agent | 2026-05-08 | Import a document with AI detect active and OpenRouter as provider. Confirm headings detected, no crash, usage logged. JSON parse hardening (2026-05-09) should fix the silent 0-chapter failure. Requires migration applied first. |
| OpenRouter AI Partner large-context warning | Needs retest | AI agent | 2026-05-08 | Send a very large manuscript to AI Partner with OpenRouter. Confirm the large-context warning modal appears and includes "OpenRouter pricing depends on the model you select" copy. |
| OpenRouter Analyze Scene large-context warning | Needs retest | AI agent | 2026-05-08 | Analyze a very long scene with OpenRouter. Confirm the existing safeguard dialog fires. |
| OpenRouter import large-book warning | Needs retest | AI agent | 2026-05-08 | Import a large file (>100KB) with AI detect enabled and OpenRouter active. Confirm the cost-confirmation warning appears with the OpenRouter pricing copy. |
| OpenRouter extreme-context safeguard | Needs retest | AI agent | 2026-05-08 | Trigger extreme context (above the extreme token threshold) with OpenRouter. Confirm the `extreme` safeguard confirmation dialog fires before the request is sent. |
| OpenRouter no misleading $0.00 pricing | Needs retest | AI agent | 2026-05-11 | Code copy pass removed known misleading zero-cost paths in Magic Detect, AI safeguard dialogs, and Settings free-tier copy. Browser review still needed across all AI surfaces. |
| OpenRouter usage logging | Passed | User | 2026-05-09 | Manual terminal verification confirmed completed OpenRouter usage logged with `provider = 'openrouter'` and the correct model after the provider constraint fix. |
| OpenRouter → switch back to Gemini | Needs retest | AI agent | 2026-05-08 | After using OpenRouter, switch to Gemini in Settings. Confirm AI Partner routes through Gemini (check runtime state or usage events). |
| OpenRouter → switch back to OpenAI BYOK | Needs retest | AI agent | 2026-05-08 | After using OpenRouter, switch to OpenAI BYOK in Settings. Confirm routing and streaming use OpenAI Responses API path again. |
| Ollama unaffected after OpenRouter addition | Needs retest | AI agent | 2026-05-08 | With Ollama configured, confirm AI Partner and Analyze Scene still work via Ollama. No regression from the provider type union expansion. |
| Trial mode unaffected after OpenRouter addition | Needs retest | AI agent | 2026-05-08 | With a trial account (no saved key), confirm trial mode still works. Confirm OpenRouter is not offered to trial users (trial always routes to OpenAI). |
| OpenRouter model selector — default is free model | Passed | User | 2026-05-09 | Manual testing confirmed the default changed to Llama 3.3 70B (free) after retired Llama 3.1 8B models were removed. |
| OpenRouter model selector — paid model warning | Passed | User | 2026-05-09 | Manual testing confirmed switching to GPT-4o mini works as the paid model path; free-model rate limiting remains expected provider behavior. |
| OpenRouter model selector — save persists | Needs retest | AI agent | 2026-05-09 | Select a non-default model, save, reload Settings. Confirm the selected model is still shown. |
| OpenRouter model — used consistently across endpoints | Needs retest | AI agent | 2026-05-09 | With a specific model selected, run AI Partner, Analyze Scene, and Import AI Detect. Confirm all three send the same `model` ID in their request (check server logs or network tab). |
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
| Trial percentage display — Settings page | Needs retest | AI agent | 2026-05-03 | `SettingsView.tsx` now shows trial balance as a percentage (e.g. "72%") and "X% used" instead of dollar values. Browser validation needed: open Settings with a sponsored-trial account, confirm no dollar amounts visible, percentage reflects remaining balance, and progress bar still renders. |
| Trial percentage display — AI status bar | Needs retest | AI agent | 2026-05-03 | `AiFullCanvas.tsx` status bar now shows "Trial Left: X%" instead of a dollar amount. Browser validation needed: open the AI full-canvas view on a sponsored-trial account, confirm the percentage label appears in the bottom status bar. |
| Trial nudge in AI Helper Panel | Needs retest | AI agent | 2026-05-03 | `AiHelperPanel.tsx` now shows a quiet "Trial: X% left" nudge in the panel header when below 50% trial remaining. Below 25% (`LOW_BALANCE_MICROS`) it uses amber text; above that it uses muted slate. Browser validation needed: sign in with a trial account below 50%, confirm nudge appears; test above 50%, confirm no nudge. |
| New user sees free trial messaging | Not tested | - | - | Confirm trial message is visible and understandable. |
| Existing user account state displays correctly | Not tested | - | - | Confirm no incorrect trial prompts. |
| Account deletion with trial data | Not tested | - | - | Confirm cleanup/hardening works as expected. |
| Abuse-control signals | Needs retest | AI agent | 2026-04-30 | Implemented expanded disposable domain list (40+ domains) and IP/Fingerprint cluster detection in trial grant logic. Manual verification of new domains is required. |

## Collaboration / Feedback

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Admin user sees Feedback & Survey Responses on `/admin` | Needs retest | AI agent | 2026-05-06 | Admin dashboard now includes a `Feedback & Survey Responses` section backed by `getAdminDashboardData()`. Browser validation needed: sign in as an approved admin and confirm the new section renders without breaking the rest of the dashboard. |
| Non-admin user cannot access `/admin` | Needs retest | AI agent | 2026-05-06 | `/admin` should still redirect non-admin users to `/library`. Browser validation needed after the feedback section was added. |
| Admin feedback section shows newest responses first | Needs retest | AI agent | 2026-05-06 | With `feedback_responses` present and at least one row, confirm the newest responses appear first, total count is shown, and email mapping works when the `user_id` matches an auth user. |
| Admin feedback section survives missing `feedback_responses` table | Needs retest | AI agent | 2026-05-06 | If the migration has not been applied and the table is missing, `/admin` should keep rendering the existing dashboard and show the warning: `Feedback responses table is not available yet. Apply supabase/migrations/20260504_feedback_responses.sql in Supabase.` |
| Admin feedback filters | Needs retest | AI agent | 2026-05-06 | Query-param filters `feedback_search`, `feedback_use_case`, and `feedback_satisfaction` now filter the recent responses list. Browser validation needed to confirm filter application and clear behavior. |
| Admin developer test route buttons | Needs retest | AI agent | 2026-05-06 | `/admin` now includes a `Developer Test Routes` card with direct links for `/admin/survey-preview`, `/welcome?preview=1`, and `/dev/showcase`. Browser validation needed: click each button and confirm it opens the intended route. |
| Existing admin trial/usage dashboard still renders | Needs retest | AI agent | 2026-05-06 | After adding the feedback section, verify the existing trial, usage, segmentation, storage, and manual adjustment sections still render normally for admins. |
| Collaborator can access shared project | Not tested | - | - | Test with a second account. |
| Collaborator permissions behave correctly | Not tested | - | - | Confirm view/edit/export permissions. |
| User can reply to another user's feedback | Not tested | - | - | Replies allowed. |
| User cannot edit another user's feedback | Not tested | - | - | Must remain blocked. |
| User cannot delete another user's feedback | Not tested | - | - | Hiding may be allowed if designed. |
| Collaborator reply notifications | Passed | AI agent | 2026-05-07 | Linked Supabase validation with owner + 2 collaborators passed. Top-level comment by Collaborator A still created exactly 1 owner notification. Owner reply created exactly 1 reply notification for Collaborator A only. Collaborator B reply created reply notifications for Owner + Collaborator A only. Editing the same reply did not create duplicates because the event keys stayed stable per `comment-reply:<threadId>:<replyId>:<recipientUserId>`. |
| New/reply notification behaviour | Needs retest | AI agent | 2026-05-07 | SQL validation now covers top-level owner notifications plus participant-only reply notifications. Manual browser validation is still needed for the in-app bell/detail/comment-panel flow, especially because bell clicks and notification detail views mark notifications read but opening the comments panel via notification routing (`?feedback=1`) or activating a thread in the panel still does not clear `read_at`. |
| Notification foundation migrations on linked Supabase | Passed | AI agent | 2026-05-07 | Verified linked remote migration status with `supabase migration list` plus SQL checks. `20260427213327` and `20260507123000` are now in `supabase_migrations.schema_migrations`; the enum includes `local_transfer_guidance`; the live `notify_project_membership_changes()` function now contains `project-shared:` event-key logic; and `project_shared` rows with non-null `event_key` now exist remotely. |
| Shared-project notification dedupe after remove/re-add | Passed | AI agent | 2026-05-07 | SQL test used dedicated test accounts and a throwaway project. First collaborator insert created 1 `project_shared` notification; remove + re-add kept the total at 1 and reused the canonical `project-shared:<projectId>:<userId>` event key. Test project and related notifications were deleted afterward. |
| Cloud migration completed notification | Needs retest | AI agent | 2026-05-07 | `handleMigration()` in `ProjectSettingsModal.tsx` now fires a `cloud_migration_completed` bell notification after a successful Local → Cloud migration. Event key `cloud-migration-completed:<localId>:<cloudId>:<userId>` prevents duplicates. Browser validation needed: complete a real migration, confirm one notification appears in the bell, click it and confirm it opens the new cloud project. |
| Cloud migration completed notification dedupe | Needs retest | AI agent | 2026-05-07 | If migration is triggered a second time for an already-migrated local project, the `already been migrated` guard throws before any notification is created. Verify no duplicate bell entries exist after attempted re-migration. |
| Cloud migration failed notification | Needs retest | AI agent | 2026-05-07 | On a non-trivial migration failure (asset upload or DB insert error), a `cloud_migration_failed` bell notification is created with stage-keyed event key. User-error failures (not logged in, already migrated, project not found) do NOT create a bell notification. Browser validation requires simulating a server-side failure. |
| Import/export flows — no bell notifications needed | Passed (audit) | AI agent | 2026-05-07 | Audited all import and export flows. All import paths block the user in the active UI until completion; errors appear inline. All export paths run inside the blocking ExportModal; success triggers a browser download; failure shows toast.error while the modal stays open. No background pipeline exists. Verdict: toast-only is correct for all import/export outcomes; no bell notifications were added. |
| Comment highlight active ring | Needs retest | AI agent | 2026-05-03 | `.comment-highlight.active` CSS class now applied via DOM query in `SceneEditor.tsx`. Browser validation needed: click a comment card, confirm inline span shows amber ring; click another, confirm ring moves; deselect, confirm ring clears. |
| Comment highlight jump-to-comment scroll | Needs retest | AI agent | 2026-05-03 | Scroll-to-span fires only on explicit "Jump to position" button (scrollTrigger increment), not on bare card click. Browser validation needed: clicking card should NOT scroll; clicking "Jump to position" should scroll editor to the highlighted span. |
| Show Highlights toggle | Needs retest | AI agent | 2026-05-03 | `data-highlights-hidden` on `editorShellRef` toggles suppression of inline highlight backgrounds/borders via CSS in `globals.css`. Browser validation needed: toggle off → all highlight colors disappear, text readable; toggle on → highlights reappear; TipTap marks and comment data unchanged throughout. |
| Show Highlights state across panel open/close | Needs retest | AI agent | 2026-05-03 | `showHighlights` lives in CommentsContext (never unmounted), so its value should survive closing and reopening the Feedback panel. Browser validation needed: toggle off, close panel, reopen panel, confirm highlights still suppressed. |
| Comment highlight regression (filter chips) | Needs retest | AI agent | 2026-05-03 | Filter chips (All, Mine, Collaborators, AI, New, Hidden) must still work as before. Inline highlights must not follow filter state (deferred feature). Browser validation needed to confirm no regression. |

## Auth / Sessions

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Signup verification link while another user is signed in | Passed | User | 2026-05-06 | User verified the reused/invalid verification-link case while signed in: the session was neutralized and the final URL was the canonical production login guidance URL with no Netlify branch/deploy host and no raw Supabase hash. |
| Reused signup verification link shows explicit guidance | Passed | User | 2026-05-06 | User verified in normal and incognito/private browser that reused/expired signup verification links show the friendly guidance and end on the canonical production login URL with no raw Supabase hash or deploy-permalink host left visible. |
| Password reset email uses clean production redirect URL | Passed | User | 2026-05-06 | User verified the production recovery email link uses the clean production reset-password URL; no localhost, main branch deploy URL, or Netlify deploy permalink was present. |
| Auth email branding and rendering QA | Not tested | - | - | Moved from `docs/human-launch-checklist.md`: send verification, invite, password reset, magic link, and welcome emails to a real account; confirm final branding, sender/reply-to, production redirects, and desktop/mobile rendering. |
| Supabase auth redirect allowlist production config | Not tested | - | - | Moved from `docs/human-launch-checklist.md`: confirm Netlify `NEXT_PUBLIC_SITE_URL`, Supabase Site URL, and production auth email redirects use the live app domain, not localhost. |
| Stale refresh token silenced on showcase load | Passed | User | 2026-05-06 | User tested the live site in incognito and did not reproduce Invalid Refresh Token console noise. A separate notifications 403 appeared and was fixed separately. |
| Notifications transfer-guidance creation does not 403 | Passed | User + AI agent | 2026-05-07 | User already retested live/incognito after switching transfer-guidance notification creation from direct browser insert to the `create_notification` RPC and saw no 403. Follow-up validation confirmed `npx tsc --noEmit --pretty false` still passes and a signed-in Supabase JS client can call typed `rpc('create_notification', ...)` for `local_transfer_guidance`, fetch the created row, and delete it without the previous `as any` cast. |

## Scene Analysis / AI Partner

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| "Add to AI Partner" lands in AI FEEDBACK bucket | Needs retest | AI agent | 2026-05-04 | `lib/persistence/project-content.ts` query now filters by `.eq('action', 'analysis_feedback')`. Browser validation needed: run Scene Analysis → click "Add to AI Partner" → open AI Partner → confirm item is in AI FEEDBACK (not IDEAS). |
| "Add to AI Partner" success toast mentions AI Memory | Needs retest | AI agent | 2026-05-04 | Toast should read "Saved to AI Partner & AI Memory" with description "Use it as context in AI Partner, or find it anytime under AI Memory." Browser validation needed. |
| Deleting from AI Memory syncs AI Partner context | Needs retest | AI agent | 2026-05-04 | `SavedResponsesTab.tsx` calls `router.refresh()` after `softDeleteEntity`. Browser validation needed: add an item via Scene Analysis, open AI Memory, delete it, navigate back to Story tab → confirm item no longer appears in AI FEEDBACK. |
| First AI Partner use notice is standalone | Needs retest | AI agent | 2026-05-04 | `AiHelperPanel.tsx` first-use notice renders independently — no longer inside the AI Context Preview container. Browser validation: on a project with no prior AI use, trigger the first AI call → confirm notice appears cleanly without the full AI Context Preview panel. |

## Survey / Feedback

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Library floating survey nudge appears with 1+ project | Needs retest | AI agent | 2026-05-06 | `FeedbackNudge` now renders as a floating Library-only card instead of an inline bottom banner. Manual check: open Library with at least 1 project and confirm the nudge is visible without scrolling. |
| Library floating survey nudge opens modal | Needs retest | AI agent | 2026-05-06 | Manual check: click `Share thoughts` from the floating nudge and confirm `LaunchSurveyModal` opens. |
| Library floating survey nudge dismiss persists | Needs retest | AI agent | 2026-05-06 | Manual check: dismiss the floating nudge, confirm it hides immediately, refresh, and confirm `localStorage.storyline_survey_v1` remains `'dismissed'` and the nudge stays hidden. |
| Library floating survey nudge completion persists | Needs retest | AI agent | 2026-05-06 | Manual check: complete the survey from the floating nudge, confirm the success path sets `localStorage.storyline_survey_v1` to `'completed'`, refresh, and confirm the nudge stays hidden. |
| Library floating survey nudge mobile placement | Needs retest | AI agent | 2026-05-06 | Manual check: in a narrow/mobile viewport, confirm the floating nudge remains visible near the bottom but does not cover core Library navigation, project actions, or the main create/open actions. |
| Library floating survey nudge hidden with 0 projects | Needs retest | AI agent | 2026-05-06 | Manual check: open the Library with 0 projects and confirm the nudge does not appear, preserving the current project-count trigger rule. |
| Survey modal 3-step flow | Needs retest | AI agent | 2026-05-06 | `LaunchSurveyModal` shows step 1 (use-case 2×2 grid), step 2 (satisfaction 3-button row), step 3 (free-text optional). Clicking Skip on step 3 submits without feedback text; Send submits all data. Browser validation needed: with `feedback_responses` present, complete all 3 steps, confirm success toast appears only after a successful POST, confirm `localStorage` = `'completed'`, and confirm the skip path behaves the same. |
| Survey POST route saves to feedback_responses | Needs retest | AI agent | 2026-05-06 | `app/api/survey/route.ts` POSTs to Supabase `feedback_responses` (migration must be applied first). Manual test 1: with the table present, complete the survey and check `feedback_responses` for the new row with correct `user_id`, `use_case`, `satisfaction`, and auto-captured `user_agent`. Manual test 2: simulate an API failure or missing table and confirm the UI shows `Survey could not be saved. Please try again.`, does not set `storyline_survey_v1` to `'completed'`, and does not pretend the survey was saved. |
| Admin survey preview route | Needs retest | AI agent | 2026-05-06 | `/admin/survey-preview` is an admin-only preview path that opens the real launch survey modal in `previewMode`. Browser validation needed: open the route as an admin, close and reopen the modal, confirm it does not set `storyline_survey_v1` to `'dismissed'` or `'completed'`, then submit successfully and confirm a real `feedback_responses` row is still created. |
| Share Feedback button in Help tab | Needs retest | AI agent | 2026-05-06 | `HelpTab.tsx` sidebar Quick Links includes a permanent `Share feedback` button that opens `LaunchSurveyModal`. Manual check: open Help (project or global), confirm the button is still visible, click it, and confirm the survey modal opens normally after the Library nudge change. |
| Survey nudge absent if already dismissed | Needs retest | AI agent | 2026-05-04 | If `localStorage` `storyline_survey_v1` is `'dismissed'` or `'completed'`, nudge should not render. Browser validation needed: set the localStorage value manually and reload the library page, confirm nudge is absent. |

## Onboarding / Help / Tours

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Main tour launches correctly | Not tested | - | - | Confirm it does not conflict with other tours. |
| AI tour launches correctly | Not tested | - | - | Confirm it does not overlap main tour. |
| Help page covers current features | Not tested | - | - | Confirm coverage against real app features. |
| Project Help shortcuts access | Needs retest | AI agent | 2026-05-01 | Browser validation is still needed to confirm project `Open keyboard shortcuts` actions open the shortcuts modal and `Shift + /` opens the modal only while focus is outside text inputs/editors. |
| Help Center Midnight and scanability polish | Needs retest | AI agent | 2026-05-01 | Browser validation is still needed for `/help` and `/project/[id]/help` in Sanctuary and Midnight, default/matched/no-results search states, tablet and narrow/mobile layout, and confirming the tour CTA behavior remains unchanged. |
| AI Help Center articles searchability | Needs retest | AI agent | 2026-05-03 | 4 new `lib/help.ts` entries added: `ai-setup`, `ai-byok`, `ai-ollama`, `ai-no-ai`. Browser validation needed: open Help Center (sidebar or `/help`), search "api key" → confirm BYOK article surfaces; search "ollama" → confirm Ollama article surfaces; search "no ai" → confirm no-AI article surfaces; search "setup" → confirm ai-setup article surfaces. |
| User-facing AI setup instructions | Not tested | - | - | Confirm non-technical users can follow them. |
| Mobile tour performance | Not tested | - | - | Cover section may be too slow; check asset sizes. |

## UI / Device / Accessibility

| Test | Status | Tested by | Date tested | Notes |
|---|---|---|---|---|
| Full-app dark mode regression pass | Not tested | - | - | User has seen dark mode anomalies. Audit the entire app in dark/Midnight mode, including library, auth, settings, project shell, editor, AI panels, help, import/export, collaboration/feedback, modals, empty states, hover/focus states, and mobile/tablet layouts. |
| Feedback panel midnight readability | Needs retest | AI agent | 2026-05-04 | Added scoped midnight CSS for `.comments-panel` in `globals.css`. Browser validation needed: open Feedback panel in midnight mode, confirm referenced-text block, type badges (inline/AI/scene), active filter buttons, and thread borders are readable and dark-styled. |
| AI Memory tab midnight (items present) | Needs retest | AI agent | 2026-05-04 | Added `ai-memory-detail` class to detail-view div in `SavedResponsesTab.tsx` and a direct midnight rule in `globals.css`. Browser validation needed: open AI Memory tab in midnight mode with at least one saved response, confirm the detail view shows dark gradient (not white/sanctuary background). |
| Scene Analysis panel midnight | Needs retest | AI agent | 2026-05-04 | Added `scene-analysis-panel` and `analysis-section-{key}` semantic classes; midnight CSS rules added in `globals.css`. Browser validation needed: run a scene analysis in midnight mode, confirm panel background is dark and all section cards (tension/pacing/dialogue/summary/suggestions) respect midnight colours. User confirmed fixed mid-session but full regression pass still useful. |
| Scene Analysis "Add to Assistant" — local project | Needs retest | AI agent | 2026-05-04 | `handleAddToAssistant` now uses `saveAiResponse()` which routes local IDs to IndexedDB. Browser validation needed: open a local project, run Scene Analysis, click "Add to Assistant" on any section or suggestion — confirm success toast and item appears in AI Memory. No `Failed to save analyzer feedback` error should appear. |
| Scene Analysis "Add to Assistant" — cloud project | Needs retest | AI agent | 2026-05-04 | Same fix as local; cloud path routes to Supabase via `saveAiResponse()`. Browser validation needed: repeat the above on a cloud project and confirm success. |
| Scene analyzer empty/short-text feedback | Needs retest | User | 2026-05-01 | User reported a light smoke check looked good. `ProjectContext.tsx` and `StoryTab.tsx` now surface explicit feedback when scene analysis is triggered on an empty scene or a scene under 50 characters, and handle oversized/unexpected analyzer failures more clearly. Deeper browser validation is still needed across the Story rail and other analyzer entrypoints. |
| Structure add-child auto-expands collapsed parent | Needs retest | User | 2026-05-01 | User reported a light smoke check looked good. `StructureTree.tsx` now sends a UI-only expand request when adding under a collapsed parent so the new child becomes immediately visible. Deeper browser validation is still needed for collapsed chapter/act/episode parents on desktop and tablet. |
| Screenplay empty-scene Backspace stability | Needs retest | User | 2026-05-01 | User reported the issue appears fixed in a light smoke check. `lib/tiptap/screenplay-keyboard.ts` now avoids converting the default empty paragraph on Backspace, still normalizes empty non-action screenplay blocks back to Action, and consumes empty screenplay-node Backspace safely. `lib/story/scene-text.ts` also stops counting empty screenplay blocks as analyzable text. Deeper browser validation is still needed for repeated Backspace in an empty screenplay scene plus Enter/Tab/Shift-Tab screenplay flows. |
| Screenplay Enter after inline line break | Needs retest | AI agent | 2026-05-03 | `lib/tiptap/screenplay-keyboard.ts` previously chained `splitBlock().setNode(nextType)` and could throw `RangeError: Invalid content for node type hardBreak`. The predictive `Enter` flow now splits first and sets the next screenplay node type in a second command. Browser validation is still needed for Enter after normal text and after content containing an inline line break across Scene Heading, Action, Character, Parenthetical, Dialogue, and Transition. |
| Screenplay Tab cycle stays in editor | Needs retest | AI agent | 2026-05-03 | `lib/tiptap/screenplay-keyboard.ts` now treats a plain `paragraph` in screenplay mode as the baseline Action state for tab cycling, so `Tab` and `Shift + Tab` should no longer fall through to browser focus traversal and jump into the Story right rail. Browser validation is still needed for fresh screenplay scenes plus repeated forward/backward cycling. |
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
| Account Settings hierarchy and mobile polish | Needs retest | AI agent | 2026-05-01 | Manual signed-in regression is still needed for desktop hierarchy, mobile/narrow viewport stacking, Midnight theme, AI-off/no-key/limited-trial states, and existing email/password/delete flows. |
| Font/readability audit | Needs retest | - | - | Focused AI Partner pass landed: footer warning removed, preview note moved to first-use context preview, and low-contrast helper text was darkened. Browser validation is still needed. |
| Prose manuscript view controls and font registry | Needs retest | AI agent | 2026-05-02 | Block 1/2 landed: prose font registry moved into shared editor utilities, `Source Serif 4` and `Merriweather` were added, and `SceneEditor.tsx` now includes prose-only paragraph spacing plus clearer display-only manuscript view controls. Manual browser validation is still needed for prose load/save, existing saved preference compatibility, refresh persistence, and confirming screenplay mode was not regressed. |
| Editor Focus Mode and Typewriter Mode Block 3A | Needs retest | User/Cursor | 2026-05-02 | Cursor implemented Focus Mode and Typewriter Mode. User confirmed Typewriter Mode appears to work and refined prose Focus Mode feels much better. Remaining validation needed: prose Focus `T` / Manuscript View button behavior, screenplay right-rail Focus access, Escape exits Focus, prose autosave, font/paragraph settings regression, screenplay toolbar and Enter/Tab/Shift+Tab/Backspace regression, and viewer/read-only safety. |
| Editor writing-surface word count Block 3B Safe Pass 1 | Needs retest | AI agent | 2026-05-02 | `SceneEditor.tsx` now shows current scene words in the editor status area and selected-word count when text is selected, using the shared plain-text helper in `lib/story/word-count.ts`. Manual browser validation is still needed for prose typing/deleting/paste, multi-paragraph and screenplay-block selections, Focus Mode visibility, read-only/viewer mode, and stats-page consistency. |
| Editor current-scene find Block 3B Safe Pass 2 | Needs retest | AI agent | 2026-05-02 | `SceneEditor.tsx` now has a local current-scene find panel with a visible `Find` control, scoped `Ctrl/Cmd + F`, case-insensitive plain-text matching, reliable active-result snapping, and subtle current-scene match highlighting with a distinct active-match state. The find flow now avoids creating a normal editor text selection and only snaps on explicit navigation (`Enter`, `Next`, `Previous`), so typing in the find box should no longer trigger the formatting toolbar, steal focus, or bounce the viewport on each letter. Manual browser validation is still needed for prose/screenplay matching, no-results state, close/scene-switch highlight cleanup, Focus Mode usability, Typewriter Mode regression, and viewer/read-only safety. |
| Editor prose link support Block 4 Safe Pass 1 | Needs retest | AI agent | 2026-05-02 | `SceneEditor.tsx` now has explicit prose-only link support with a selection-toolbar link button, compact add/edit/remove dialog, `http`/`https`-only validation, bare-domain normalization to `https://`, disabled autolink/link-on-paste, and safe read-only opening without editable-click navigation. Manual browser validation is still needed for add/edit/remove, dangerous-protocol rejection, comment-click coexistence, local/cloud persistence, screenplay non-exposure, and export remaining unchanged in this pass. |
| Migrated local backup banner dismiss | Needs retest | AI agent | 2026-05-02 | `MigratedBanner.tsx` now has a dismiss `X` that hides the warning only in component state for the current page/component lifecycle. Manual validation is still needed for dismiss, refresh/reopen reappearance, `Open Cloud Version`, and delete/trash regression. |
| Project header local/cloud status badge | Needs retest | AI agent | 2026-05-02 | `ProjectShell.tsx` now shows a visible badge beside the project title for `Cloud`, `Local`, and `Local backup`, with tooltip copy and a slightly more cautionary treatment for migrated local backups. Manual validation is still needed for narrow/mobile wrapping, Midnight theme appearance, and ensuring the badge remains visible after dismissing the migrated-backup banner. |
| Prose editor font size picker | Not tested | - | - | Open View Settings in a prose scene. Confirm 3 size options (Small/Medium/Large → 16/18/22px) appear and change editor text size immediately. Confirm selection persists after refresh and is absent in screenplay mode. |
| Scene switch content transition | Not tested | - | - | Click between scenes in the structure tree. Confirm editor content transitions smoothly without a hard content flash or layout jump. The editor shell has `transition-all duration-700` — verify this looks intentional and not broken, especially on slower devices. |
| Writing theme (Sepia / warm reading mode) | Not tested | - | - | Blocked — Sepia/warm editor theme is not yet implemented (`ProseEditorViewSettings` only has Sanctuary/Midnight). Add a test case here once a reading-comfort theme option is added to `lib/editor/view-settings.ts` and `SceneEditor.tsx`. Verify: theme applies to editor surface only (not whole app), persists on refresh, and is prose-only. |
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
| AI trial reconciliation checks | Needs retest | AI agent | 2026-05-02 | Trial finalization now prefers provider-reported token usage for app-managed helper/analyzer requests and falls back to the existing estimate model only when provider usage metadata is unavailable. Manual/admin verification is still needed for successful runs, failed runs, cancellations, interrupted requests, and confirming `ai_usage_events.metadata.trial_costing.method` reflects `provider_reported` vs `estimated` correctly. |
| Structure tree performance with large project | Not tested | - | - | Confirm acceptable performance with many nodes. |
| Pre-launch security audit | Not tested | - | - | Review input sanitization, auth flows, exposed secrets, personal emails, repo references, and deployment settings. |
| Code injection / input sanitization checks | Not tested | - | - | Verify editor, imports, comments, and inputs do not execute unsafe scripts. |

---

| 2026-05-05 | FeedbacSelect dropdowns | Midnight theme | Not tested | Feedback select (Device/Platform/Browser) in midnight mode — dropdown should have dark bg (`#1e293b`), items readable on hover |
| 2026-05-05 | AI Partner SanctuarySelect | Midnight theme | Not tested | Mode selector dropdown, archive category dropdown in midnight — triggers and dropdowns should be dark, not white |
| 2026-05-05 | AiHelperPanel context UI | Midnight theme | Not tested | Context button, summary chips, context manager sections in midnight — no white backgrounds |
| 2026-05-05 | Manuscript View panel | Midnight theme | Not tested | Desktop + mobile manuscript view panel in midnight — all sections dark, text readable |
| 2026-05-05 | Scene Assets Panel | Midnight theme | Not tested | Gallery panel, selector overlay in midnight — no white/cream backgrounds |
| 2026-05-05 | Notification detail page | Midnight theme | Not tested | Card `bg-[#1a2234]`, body `bg-slate-800/50`, page bg `bg-background` — no white/gray area |
| 2026-05-05 | SaveAiResponseModal | Midnight theme | Not tested | Dialog, inputs, labels, metadata section in midnight — dark theme throughout |
| 2026-05-05 | App layout bg-slate-50 → bg-background | Sanctuary regression | Not tested | Library, settings, admin, stats pages — no unexpected visual change in sanctuary mode |
| 2026-05-05 | Build compile | All | Passed - pre-existing astro:content error only | `npx next build` compiled successfully |

---

# Recent Successful Test Confirmations

Newest confirmations go at the top.

| 2026-05-17 | AI agent | Production import route PDF parser isolation | Passed | `npx tsc --noEmit --pretty false`, focused ESLint, local unauthorized `/api/import` JSON smoke test, and `npm run build` passed after moving `pdf-parse` behind the PDF branch and tracing `@napi-rs/canvas` for `/api/import`. Live production EPUB/PDF browser verification is still needed after deploy. |
| 2026-05-11 | User | Google OAuth login/signup browser validation | Passed | User verified Google OAuth on localhost and production, including existing-account login, signup/login entry points, logout/login persistence, email/password regression, and local-first safety checks. |
| 2026-05-11 | AI agent | Import UX and targeted midnight static verification | Passed | `npx tsc --noEmit --pretty false`, focused ESLint for import/auth/import-route files, static search for removed rough-word/static-progress/runtime-require patterns, `git diff --check`, and `npm run build` passed. `netlify build --context production` completed the Next.js build and function bundling, then hit the known local Windows `Failed publishing static content` postbuild limitation documented in `TROUBLESHOOTING.md`. Browser dark-mode/Magic Detect QA remains recommended. |
| 2026-05-11 | AI agent | Audit follow-up static verification | Passed | `npx tsc --noEmit --pretty false`, focused ESLint on touched files, `git diff --check`, `npm run build`, and `netlify build --context production` passed after EPUB spine-order import, Magic Detect mapping, AI cost-copy, local-project forbidden copy, and responsive story panel fixes. Browser/device QA remains recommended. |
| 2026-05-11 | AI agent | Pre-launch audit blocker static verification | Passed | `npx tsc --noEmit --pretty false`, focused ESLint for touched non-SceneEditor files, `npm run build`, and an HTML/EPUB escaping smoke check passed after fixing title-only autosave scheduling, migration cleanup, export escaping, auth recovery submit guards, and `/api/import` auth. SceneEditor still has pre-existing lint debt unrelated to the title-only autosave change. |
| 2026-05-08 | User | Smart Context Phase 4/4.5 browser validation | Passed | Manual Context, Smart Context UI, Smart Context content, mode switching with manual link preservation, and Scene Analysis isolation all passed. Follow-up logged for making entity include/exclude controls more visible. |
| 2026-05-08 | AI agent | Smart Context Phase 5 static verification | Passed | TypeScript passed after adding Smart Context size analysis, warning UI, extreme-context preflight integration, and AI Partner `context_mode` metadata. Focused ESLint passed with existing `no-explicit-any` debt disabled, leaving only pre-existing unused-variable warnings. |
| 2026-05-08 | AI agent | Smart Context Phase 4.5 static verification | Passed | AI Partner Smart mode now renders a read-only Smart Context summary instead of the interactive Scene Context selector; `npx tsc --noEmit --pretty false`, `npm run build`, and `git diff --check` passed. |
| 2026-05-07 | AI agent | Impeccable availability and TypeScript exclusion fix | Passed | Impeccable context loader found Storyline `PRODUCT.md` and `DESIGN.md`; `npx tsc --noEmit --pretty false` and `npm run build` passed after excluding local tooling folders; targeted ESLint ignore checks passed for `impeccable/site/content.config.ts` and `.agents/skills/impeccable/SKILL.md`. |
| 2026-05-07 | AI agent | Smart Context remote schema-cache fix | Passed | `npx supabase migration list --linked` first showed `20260507210000` local-only; `npx supabase db push --linked` applied it; migration list then showed it synced; a service-role Supabase client query selecting `user_id,ai_context_mode` from `user_api_keys` succeeded. |
| 2026-05-07 | AI agent | Smart Context settings persistence static verification | Passed | `npx tsc --noEmit --pretty false` passed; focused ESLint passed for the Phase 2 changed files, with `StoryTab.tsx` checked using the existing `no-explicit-any` backlog disabled; `npm run build` passed. Repo-wide `npm run lint` still fails on unrelated existing lint debt. |
| 2026-05-07 | AI agent | Netlify production build after removing proxy middleware | Passed | `npm run build` passed with `next build --webpack`; focused `npx eslint 'app/(auth)/login/page.tsx' 'app/(auth)/signup/page.tsx' 'app/feedback/layout.tsx'` passed; `netlify build --context production` completed successfully with no Edge Functions bundling step for proxy middleware. Repo-wide `npm run lint` still fails on existing unrelated lint debt. |
| 2026-05-07 | AI agent | Supabase CLI setup verification | Passed | `npm exec supabase -- --version` returned `2.98.2`; `npm ls supabase --depth=0` showed `supabase@2.98.2`; `npx supabase migration list --linked` connected to the linked remote and listed migrations. `npx supabase status` is blocked until Docker Desktop/daemon is running. |
| 2026-05-07 | AI agent | Focused lint after Smart Context / Manual Context Phase 1 | Passed | `npx eslint lib/ai/modes.ts lib/persistence/local-projects.ts lib/persistence/writing-entities.ts lib/supabase/types.ts` passed after adding context-mode and AI-exclusion types/defaults. |
| 2026-05-07 | AI agent | TypeScript compile after collaborator reply notification pass | Passed | `npx tsc --noEmit --pretty false` passed after adding reply-recipient notification SQL, reply-aware notification titles in `lib/notifications.ts`, and exact thread/reply activation support in `CommentsPanel.tsx`. |
| 2026-05-07 | AI agent | Linked Supabase notification foundation validation | Passed | Confirmed remote migration history for `20260427213327` and `20260507123000`, applied the live SQL body for `20260507123000`, verified `notify_project_membership_changes()` now uses the `project-shared:` event key, SQL-tested remove/re-add dedupe on a throwaway project, confirmed cleanup, and verified the typed `create_notification` client RPC path for `local_transfer_guidance`. |
| 2026-05-05 | AI agent | Midnight theme readability pass — feedback, AI partner, manuscript view, scene gallery, notifications | Passed | `npx next build` compiled successfully (pre-existing `astro:content` error only) across all 10 modified files. |
| 2026-05-04 | AI agent | TypeScript compile after midnight theme fixes + Add to Assistant bug fix | Passed | `npx tsc --noEmit --pretty false` exit 0 after: adding midnight CSS for `.comments-panel`, `.ai-memory-detail`, `.scene-analysis-panel`, `.analysis-section-{key}` in `globals.css`; adding `ai-memory-detail` class in `SavedResponsesTab.tsx`; replacing direct Supabase inserts in `SceneAnalysisPanel.tsx` with `saveAiResponse()` and removing unused `createClient`. |
| 2026-05-03 | AI agent | TypeScript compile after Feedback Panel comment highlight polish | Passed | `npx tsc --noEmit` passed after wiring `.comment-highlight.active` DOM-query application, adding `showHighlights`/`setShowHighlights` to `CommentsContext`, adding the Highlighter toggle button to `CommentsPanel`, toggling `data-highlights-hidden` on `editorShellRef` in `SceneEditor.tsx`, and adding suppression CSS in `globals.css`. |
| 2026-05-02 | AI agent | TypeScript compile after project header local/cloud status badge | Passed | `npx tsc --noEmit --pretty false` passed after adding a visible `Cloud` / `Local` / `Local backup` badge beside the project title in `components/project/ProjectShell.tsx`. |
| 2026-05-02 | AI agent | TypeScript compile after current-scene find polish follow-up | Passed | `npx tsc --noEmit --pretty false` passed after tightening current-scene find snapping, adding decoration-based match highlighting in `SceneEditor.tsx`, and styling the highlights in `app/globals.css`. |
| 2026-05-02 | AI agent | TypeScript compile after editor current-scene find Block 3B Safe Pass 2 | Passed | `npx tsc --noEmit --pretty false` passed after adding a local current-scene find panel with scoped `Ctrl/Cmd + F`, match counts, and next/previous navigation to `components/project/story/SceneEditor.tsx`. |
| 2026-05-02 | AI agent | TypeScript compile after editor writing-surface word count Block 3B Safe Pass 1 | Passed | `npx tsc --noEmit --pretty false` passed after adding current-scene and selected-text word counts to `components/project/story/SceneEditor.tsx` and extracting shared counting helpers into `lib/story/word-count.ts`. |
| 2026-05-02 | Cursor | TypeScript compile after editor Focus/Typewriter Block 3A | Passed | `npx tsc --noEmit --pretty false` reportedly passed after Cursor implemented Focus Mode and Typewriter Mode; manual browser regression remains needed. |
| 2026-05-02 | AI agent | TypeScript compile after migrated local backup banner dismiss | Passed | `npx tsc --noEmit --pretty false` passed after adding a session-only dismiss `X` to `components/project/local/MigratedBanner.tsx` without changing cloud-open or delete-backup behavior. |
| 2026-05-02 | AI agent | TypeScript compile after prose editor font registry and manuscript-view controls | Passed | `npx tsc --noEmit --pretty false` passed after centralizing prose editor font definitions, adding `Source Serif 4` and `Merriweather`, and adding prose-only paragraph spacing / manuscript-view settings helpers. |
| 2026-04-30 | AI agent | TypeScript compile after project-open 404 layout fix | Passed | `npx tsc --noEmit --pretty false` passed after changing the project layout loader to avoid 404s caused by missing owner `project_members` rows. |
| 2026-05-02 | AI agent | TypeScript compile after provider-usage trial-cost hardening | Passed | `npx tsc --noEmit --pretty false` passed after updating app-managed AI helper and scene analyzer finalization to prefer provider-reported token usage and record the costing method in trial metadata. |
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
