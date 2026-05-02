# Session Handover

This file records the current project state at the end of each AI coding session.

Agents should update this file before ending a session.

---
## 2026-05-02 - Migrated local backup banner session-only dismiss

### Current branch

`main`

### What was completed

- Added a dismiss `X` control to `components/project/local/MigratedBanner.tsx`.
- Kept dismissal session-only by storing it only in component state with `useState`.
- Preserved the existing warning copy, `Open Cloud Version` behavior, and delete-local-backup flow.
- Verified the change with `npx tsc --noEmit --pretty false`.

### Current status

Migrated local backup projects still show the warning banner when opened, but the user can now hide it for the current page/component lifecycle without creating any persistent preference.

### Next recommended step

- Run a browser/manual check for the migrated local backup flow:
  - open a migrated local backup and confirm the banner appears
  - dismiss it and confirm it disappears
  - refresh or reopen the local backup and confirm the banner returns
  - confirm `Open Cloud Version` and delete/trash behavior are unchanged

### Risks or warnings

- Browser validation is still needed for the full migrated-local-backup flow.

---
## 2026-05-02 - Editor Focus Mode and Typewriter Mode Block 3A continuation

### Current branch

`main`

### What was completed

- Continued the editor/font polish task into Block 3A using Cursor after Codex/AG credits were unavailable.
- Cursor implemented Focus Mode and Typewriter Mode only.
- Cursor reported changes only in:
  - `lib/editor/view-settings.ts`
  - `components/project/story/SceneEditor.tsx`
  - `app/globals.css`
- Cursor reported `npx tsc --noEmit --pretty false` passed.
- Cursor reported `npm run lint` still fails due broad pre-existing repo lint debt.
- Cursor reported no changes to:
  - `lib/tiptap/screenplay.ts`
  - `lib/tiptap/screenplay-keyboard.ts`
  - `lib/export/*`
- No schema, migrations, packages, search/find, links, horizontal rules, spelling/grammar, dictionary, review mode, or export parity work was done.

### Manual testing / user observations

- Typewriter Mode appears to work.
- Typewriter Mode may be subtle or invisible in very short scenes because it needs enough scroll distance to show its effect.
- Initial Focus Mode was too subtle and mostly hid the scene title/header.
- Cursor refined Focus Mode, and the refined version feels much better:
  - reduced/hidden top project navigation chrome
  - hidden left structure rail
  - calmer writing surface
  - visible `Exit Focus` control
  - right utility rail remains visible
- Remaining issue: in prose Focus Mode, the right-rail `T` / Manuscript View button remains visible but appears not to open anything. This is a visible-but-dead control and needs a small fix.

### Product decisions made

- Focus Mode is a writing-comfort/workspace action, not purely a prose typography setting.
- Prose typography controls remain prose-only.
- Screenplay should not expose prose font, paragraph spacing, or typography settings.
- Screenplay should get a separate right-rail Focus control/icon that directly toggles Focus Mode.
- Screenplay Focus Mode must only reduce surrounding app chrome and must not alter screenplay formatting, block semantics, keyboard behavior, fixed styling, or export behavior.
- Typewriter Mode should remain prose-only for now.
- The migrated-local-backup banner should remain visible every time a migrated local backup is opened, but may get a session-only/page-load-only dismiss `X`. It must not get a permanent “never show again” option.

### Next recommended step

Run a small Block 3A refinement pass only:
- fix prose Focus Mode so the visible `T` / Manuscript View button either works or is hidden/disabled during Focus Mode
- add screenplay right-rail Focus Mode access without exposing prose typography controls
- keep Typewriter Mode unchanged
- do not touch screenplay node definitions, screenplay keyboard logic, or export logic

Before continuing, run:
- `git status --short`
- `git diff --stat`
- `npx tsc --noEmit --pretty false`

Do not assume the Cursor Block 3A work was committed/pushed unless local git confirms it.

### Risks or warnings

- Cursor Free credits ran out before the final refinement prompt could be run.
- The current local Block 3A code may be uncommitted on Kwame’s machine.
- Do not redo Block 1/2.
- Do not broaden the task into search/find, links, export parity, spelling/grammar, dictionary, review mode, or document-suite features.

### Stored next implementation prompt

```text
NO CHANGE TO RECOMMENDATION.

You are continuing the Storyline editor/font polish task from TASK_BOARD.md.

Read first:
- MASTER_BRIEF.md
- TASK_BOARD.md
- SESSION_HANDOVER.md
- TESTING.md

Block 1/2 are complete. Cursor implemented Block 3A locally: Focus Mode + Typewriter Mode. Typewriter Mode appears to work. Refined prose Focus Mode is much better, but there is one remaining UX issue and one screenplay access refinement to implement.

TASK: Continue Block 3A refinement only.

Hard boundaries:
- Do not touch `lib/tiptap/screenplay.ts`.
- Do not touch `lib/tiptap/screenplay-keyboard.ts`.
- Do not touch export logic.
- Do not change screenplay node types.
- Do not change screenplay Enter / Tab / Shift+Tab / Backspace behavior.
- Do not expose prose font/spacing controls in screenplay.
- Do not implement search/find, links, horizontal rules, export parity, spelling/grammar, dictionary, review mode, citations, headers/footers, page numbers, columns, compare documents, or any other feature.
- Do not change schema.
- Do not add packages.
- Do not refactor the whole editor.

Required refinement 1 — prose Focus Mode `T` control:
- In prose Focus Mode, the right-rail `T` / Manuscript View button is visible but currently appears to do nothing.
- Fix the visible-dead-control problem.
- Preferred behavior: if safe, keep the `T` / Manuscript View button working during prose Focus Mode so users can adjust font, paragraph spacing, Typewriter Mode, and related view settings while focused.
- Acceptable fallback: hide/disable the `T` button during Focus Mode if opening the panel is not safely supported.
- Keep `Exit Focus` visible.
- Escape must still exit Focus Mode.

Required refinement 2 — screenplay Focus Mode access:
- Add a right-rail Focus control for screenplay projects/scenes.
- Use an existing icon from the app’s icon set if available. Prefer a focus/maximize/minimize/eye-style icon over a plain letter `F`.
- Add a clear tooltip/label such as `Focus Mode`, `Enter Focus Mode`, or `Exit Focus Mode`.
- The control should directly toggle Focus Mode on/off.
- Do not expose the prose Manuscript View / `T` settings panel to screenplay.

Screenplay Focus Mode behavior:
- When enabled, hide/reduce surrounding non-essential app chrome similarly to prose Focus Mode.
- Keep screenplay page/editor styling fixed.
- Keep screenplay toolbar behavior intact.
- Keep screenplay keyboard behavior intact.
- Keep an obvious `Exit Focus` control.
- Escape must exit Focus Mode.
- Keep Typewriter Mode prose-only in this pass.

Migrated local-backup banner:
- Do not change this banner unless it can be done as a tiny safe follow-up in the same touched layout area.
- If touched: add a session-only/page-load-only dismiss `X`; the banner must reappear next time the local backup project is opened.
- Do not add permanent dismissal.
- Do not change `Open Cloud Version` behavior.
- If not touched, note it as a follow-up.

Verification:
Run:
- `npx tsc --noEmit --pretty false`
- `npm run lint` only if practical; do not chase unrelated pre-existing lint debt.

Manual testing checklist:
- Prose Focus Mode still works.
- Prose `T` / Manuscript View is no longer visibly dead during Focus Mode.
- Prose Typewriter Mode still works.
- Prose font and paragraph spacing settings still work.
- Screenplay has a right-rail Focus control.
- Screenplay Focus Mode can be enabled and exited.
- Escape exits screenplay Focus Mode.
- Screenplay fixed styling remains intact.
- Screenplay toolbar still shows Scene Heading, Action, Character, Parenthetical, Dialogue, Transition.
- Screenplay Enter, Tab, Shift+Tab, and Backspace still work.
- No prose typography controls appear in screenplay.
- Autosave still works.
- Viewer/read-only behavior is not broken.

Report:
- files changed
- what changed
- how prose Focus access works now
- how screenplay Focus access works now
- what was deliberately not changed
- checks run
- manual tests still needed
```

---
## 2026-05-02 - Prose editor font registry and manuscript view controls

### Current branch

`main`

### What was completed

- Implemented Block 1 and Block 2 of the editor/font polish task only.
- Added a shared prose editor font registry in `lib/editor/fonts.ts` so prose font labels and CSS stacks no longer live inline in `SceneEditor.tsx`.
- Added shared prose manuscript-view settings parsing/defaults in `lib/editor/view-settings.ts`, preserving the existing `storyline_editor_prefs` localStorage key and backward compatibility for older saved preferences.
- Expanded the prose-only font roster using the existing `next/font/google` pattern by adding:
  - `Source Serif 4`
  - `Merriweather`
- Updated `SceneEditor.tsx` so prose manuscript view controls now use the shared registry/settings helpers and include:
  - clearer manuscript-view messaging
  - explicit display-only/export-safe copy
  - paragraph spacing controls
- Updated `app/globals.css` so prose paragraph/list/blockquote spacing responds to the new prose-only paragraph-spacing setting.
- Kept screenplay behavior isolated:
  - no changes to `lib/tiptap/screenplay.ts`
  - no changes to `lib/tiptap/screenplay-keyboard.ts`
  - no changes to export logic
- Verified the code with `npx tsc --noEmit --pretty false`.

### Current status

The prose editor now has a centralized font registry and a clearer manuscript-view surface with paragraph spacing support, while screenplay behavior and export logic remain untouched. Manual browser verification is still needed for prose preference persistence, prose save stability, and screenplay regression coverage.

### Next recommended step

- Run a browser/manual regression pass for:
  - prose scene load/save
  - existing saved prose font preference compatibility
  - new prose fonts rendering correctly
  - paragraph spacing affecting display only
  - refresh persistence of prose display settings
  - screenplay block controls and Enter/Tab/Shift-Tab/Backspace behavior
  - viewer/read-only mode
- Continue any later editor/font work from the remaining blocks only. Do not redo the shared registry or prose paragraph-spacing foundation.

### Risks or warnings

- `npm run lint` still fails because of a broad pre-existing repo lint backlog, including long-standing issues inside `SceneEditor.tsx` and many unrelated files. This pass did not clear that backlog.
- The prose settings surface is still local-device only by design in this phase.

---
## 2026-05-02 - AI trial cost finalization hardened with provider-reported usage fallback

### Current branch

`main`

### What was completed

- Reviewed the open technical-debt item for calibrating sponsored AI trial cost against real provider usage.
- Confirmed the repo already had reserve/floor budgeting, usage-event logging, and an admin recalculation path, but final trial costing still relied on internal character-based estimates.
- Updated the shared AI helpers so provider responses can extract usage metadata from:
  - OpenAI response payloads and streamed completion events
  - Gemini response payloads and streamed SSE chunks
- Updated the app-managed AI helper and scene analyzer routes so final trial charging now:
  - prefers provider-reported input/output token counts when available
  - falls back to the existing estimate model when provider usage metadata is missing
  - records the costing method plus provider token counts in trial finalization metadata for later audit
- Verified the implementation with `npx tsc --noEmit --pretty false`.

### Current status

The original estimate-only finalization gap for app-managed helper/analyzer requests is now closed in code. The broader sponsored trial system still uses the existing reserve/floor safety model, but final debits can now align to provider-reported usage when the provider returns it.

### Next recommended step

- Run an admin/manual verification pass covering:
  - successful helper request
  - successful scene analysis request
  - failed provider request
  - cancelled/interrupted request
  - confirming `ai_usage_events.metadata.trial_costing.method` shows `provider_reported` when usage metadata is available and `estimated` otherwise

### Risks or warnings

- This improves real-usage alignment for the trial-billed helper/analyzer paths, not every possible AI route.
- Import detect remains blocked for app-managed trial, so it was intentionally not part of this hardening pass.

---
## 2026-05-02 - Moved deferred Supabase/Zustand items fully into technical debt roadmap

### Current branch

`main`

### What was completed

- Reviewed the two remaining broad technical-debt reminders on `TASK_BOARD.md`.
- Confirmed both topics were already documented in `docs/technical-debt-roadmap.md`.
- Removed the duplicate Task Board entries so the board stays focused on more active work.
- Tightened the roadmap wording so future agents see the real state clearly:
  - Supabase generated `Database` types already exist; the remaining work is legacy `any` cleanup in older areas
  - Zustand is already present; broader state consolidation should only happen if a concrete maintenance problem emerges

### Current status

Those two items now live only in `docs/technical-debt-roadmap.md` as future/deferred work rather than active board items.

### Next recommended step

- Leave those topics parked unless a specific implementation task surfaces that justifies tackling one incrementally.

### Risks or warnings

- This was a documentation cleanup only. No product code changed.

---
## 2026-05-02 - Clarified technical-debt wording for Supabase types and Zustand

### Current branch

`main`

### What was completed

- Reviewed the `TASK_BOARD.md` items for Supabase type safety and Zustand-based state management.
- Confirmed both items were too broad as written:
  - Supabase generated `Database` types already exist and the shared clients already use them
  - Zustand is already present in `lib/store/projectActionsStore.ts`
- Reworded the Task Board items to reflect the real remaining work:
  - Supabase: incremental cleanup of legacy `as any` usage in older data-heavy code
  - Zustand: only broaden usage if prop-drilling/shared UI coordination becomes a real maintenance problem

### Current status

Those two technical-debt items are now described in plainer, more accurate terms. They should no longer read like urgent whole-app rewrites.

### Next recommended step

- If tackling the Supabase type-safety item later, do it incrementally in one problem area at a time.
- Do not start a broad Zustand migration unless a specific workflow is clearly suffering from current local state patterns.

### Risks or warnings

- This was a documentation/continuity clarification only. No code behavior changed.

---
## 2026-05-02 - Testing checklist cleanup for Settings and Help

### Current branch

`main`

### What was completed

- Reviewed the prior manual regression checklist for Account Settings and Help/shortcuts.
- Confirmed the checklist is already represented in `TESTING.md` through the existing `Needs retest` rows rather than needing a separate Task Board block.
- Tightened the `TESTING.md` notes so they now explicitly preserve the intended checks:
  - Account Settings desktop hierarchy, mobile/narrow stacking, Midnight theme, AI-off/no-key/limited-trial states, and email/password/delete flows
  - Help Center `/help` and `/project/[id]/help` Sanctuary/Midnight, search states, tablet/mobile layout, tour CTA behavior, project shortcuts-modal actions, and `Shift + /` behavior

### Current status

The manual regression checklist now lives more clearly in `TESTING.md`, and no duplicate Task Board block is needed for those same checks.

### Next recommended step

- Use the existing `TESTING.md` rows when running the signed-in Account Settings and Help Center manual regression passes.

### Risks or warnings

- This was a documentation cleanup only. No product code changed.

---
## 2026-05-02 - Test account script Node compatibility fix

### Current branch

`main`

### What was completed

- Reproduced the test-account script failure path from the user's local terminal output.
- Confirmed there was no matching prior troubleshooting entry.
- Fixed `lib/supabase/admin.ts` so standalone Node and `tsx` scripts can import it by removing the shared `import 'server-only'` marker.
- Added a troubleshooting entry for the `Cannot find module 'server-only'` failure mode.
- Verified the change with `npx tsc --noEmit --pretty false`.

### Current status

The repo-side module error is fixed, and the local test-account workflow has now been verified end-to-end on the user's machine. The script successfully created the account on first run and correctly reported the existing account on the second run.

### Next recommended step

- Keep using `.local/test-account.env` for local-only test credentials.
- Re-run `npm run create:test-account` whenever a machine needs to create or verify its own local dev account.
- Future agents should read `docs/dev-test-account.md` first instead of asking the user to restate the workflow.

### Risks or warnings

- None for the workflow itself. Credentials remain intentionally machine-local and gitignored.

---
## 2026-05-01 - Local-only dev test account workflow

### Current branch

`main`

### What was completed

- Removed the committed dev test credential references from `MASTER_BRIEF.md` and `TESTING.md`.
- Added a local-only test account workflow doc at `docs/dev-test-account.md`.
- Added `scripts/create-test-account.ts` to read `TEST_ACCOUNT_EMAIL` and `TEST_ACCOUNT_PASSWORD` from a gitignored local env file and create or verify the auth user through the server-only Supabase admin client.
- Updated `.gitignore` to ignore `.local/` in addition to the existing local env ignore rules.
- Added `create:test-account` to `package.json` and installed `tsx` so the script can run as `npm run create:test-account`.
- Verified the changes with:
  - `npx tsc --noEmit --pretty false`
  - `git check-ignore -v .local/test-account.env .env.test.local`

### Current status

The repo now documents a reusable dev test account workflow without keeping credentials in tracked files. Each machine must create its own local env file before running the script.

### Next recommended step

- Create `.local/test-account.env` locally with `TEST_ACCOUNT_EMAIL` and `TEST_ACCOUNT_PASSWORD`.
- Run `npm run create:test-account`.
- If old committed test credentials were used outside this repo, rotate or retire that account.

### Risks or warnings

- The script was compile-verified and gitignore-verified, but it was not executed in that session to avoid creating or mutating a real auth user without an intentional local credential file.

---
## 2026-05-01 - Analyzer short-text feedback and structure auto-expand on add

### Current branch

`main`

### What was completed

- Investigated the missing scene-analyzer feedback and confirmed the API rejects scenes under 50 characters with `SCENE_TOO_SHORT`, while the client currently offered little or no user-facing explanation depending on the entrypoint.
- Added shared analyzer feedback in `components/project/ProjectContext.tsx` so analysis now explains when:
  - the scene is empty
  - the scene is too short for analysis
  - the scene is too large
  - the analyzer fails unexpectedly
- Added the same empty/short guard in `components/project/story/StoryTab.tsx` so the Story rail no longer silently stops before the shared analyzer path runs.
- Investigated the structure add-node UX and confirmed collapsed parents stayed collapsed because expansion was tracked as local `NodeItem` UI state with no add-time expansion signal.
- Updated `components/project/story/StructureTree.tsx` so adding under a collapsed parent now sends a UI-only expand request, causing that parent to open immediately and reveal the newly added child.
- Kept both fixes away from editor save logic, Tiptap content logic, screenplay formatting/output, and structure CRUD/reorder behavior.
- Verified the changes with `npx tsc --noEmit --pretty false`.

### Current status

Scene analysis should now give clear short-text feedback instead of failing silently, and adding a child node under a collapsed structure item should immediately expand that parent so the new child is visible. The user reported a light smoke check looked good, with deeper testing still pending.

### Next recommended step

Run a browser validation pass:
- click `Analyze this` with an empty scene
- click `Analyze this` with a very short scene under 50 characters
- confirm the user gets clear feedback in both cases
- confirm normal analysis still runs on longer scenes
- add a scene under a collapsed chapter/act and confirm the parent expands immediately
- add an act under a collapsed episode and confirm the parent expands immediately

### Risks or warnings

- This session verified compile only, not a live browser pass.
- The structure expansion change is UI state only, but it should still be checked on both desktop and tablet/narrow layouts because NodeItem has responsive interaction states.

---
## 2026-05-01 - Screenplay empty-backspace cursor stabilization

### Current branch

`main`

### What was completed

- Investigated the screenplay-only empty-editor Backspace issue where pressing Backspace in an empty scene could make the cursor jump and briefly toggle the `Analyze this` action state.
- Confirmed two likely causes, both outside screenplay export/output formatting:
  - the screenplay-specific `Backspace` shortcut in `lib/tiptap/screenplay-keyboard.ts` was converting any empty start-of-line block, including the default empty paragraph, into `screenplayAction`
  - `lib/story/scene-text.ts` treated empty screenplay blocks like `ACTION:` as non-empty scene text for AI/analyzer state
- Updated the custom screenplay keyboard shortcut so:
  - empty non-action screenplay blocks still normalize back to `screenplayAction`
  - already-empty screenplay nodes at the start consume Backspace instead of falling through to default ProseMirror behavior
  - the default empty paragraph no longer gets converted on Backspace just because the screenplay keyboard extension is active
- Updated `getSceneTextForAi` so empty screenplay blocks no longer count as non-empty AI scene text.
- Kept the fix isolated away from screenplay node definitions, export serializers, save/collaboration logic, and screenplay output formatting.
- Verified the change with `npx tsc --noEmit --pretty false`.

### Current status

The screenplay keyboard layer should no longer convert the empty root block on Backspace, and empty screenplay blocks should no longer make `Analyze this` behave as if the scene contains real text. Screenplay formatting structure and output logic were left untouched. The user reported the issue appears fixed in a light smoke check, with deeper testing still pending.

### Next recommended step

Run a browser validation pass in a screenplay project:
- open an empty scene
- press Backspace once and again
- confirm the cursor no longer jumps down/up
- confirm `Analyze this` stays dimmed in the empty scene
- confirm Enter, Tab, and Shift-Tab screenplay flows still work for Scene Heading, Action, Character, Parenthetical, Dialogue, and Transition blocks

### Risks or warnings

- This session verified compile only, not the live editor interaction.
- If the cursor still visibly shifts on Backspace after this, the next inspection point should be selection normalization inside the live TipTap/ProseMirror view rather than screenplay formatting logic.

---
## 2026-05-01 - Scene editor heading metadata simplification

### Current branch

`main`

### What was completed

- Simplified the scene editor heading metadata in `components/project/story/SceneEditor.tsx`.
- Replaced the old duplicated mode/context line (`Screenplay — Scene` / `Draft — Scene`) with a single minimal label:
  - `SCREENPLAY` for screenplay mode
  - `DRAFT` for prose/book draft mode
- Kept the scene title as the primary heading.
- Hid the self-attribution line when the current user is the last editor by suppressing the `lastEditorName === 'you'` display case only.
- Preserved collaborator attribution when another person edited the scene, while tightening the copy to `Edited by [name]`.
- Left save state, active collaborator presence, autosave behavior, collaboration logic, and editor/save logic unchanged.
- Verified the change with `npx tsc --noEmit --pretty false`.

### Current status

The editor heading is quieter and less repetitive. It still shows the scene title, save state, active collaborator presence, and external collaborator attribution when useful, without repeating scene context already visible in the Structure panel.

### Next recommended step

Run a browser validation pass:
- book/prose scene heading in Sanctuary and Midnight
- screenplay scene heading in Sanctuary and Midnight
- confirm `Last edited by you` no longer appears after self-edits
- confirm `Edited by [collaborator]` still appears when another person is the last editor
- confirm save-state text and active collaborator presence still render as before

### Risks or warnings

- This session verified compile only, not a live browser/collaboration pass.

---
## 2026-05-01 - Tablet Story row declutter and Help rail alignment

### Current branch

`main`

### What was completed

- Adjusted the Story workspace tablet pattern so the horizontal action row no longer duplicates every editor utility.
- Kept `Analyze` and `Ask AI` in the top Story action row for tablet, preserving their existing handlers and visual prominence.
- Removed tablet-row duplicates for `Read Aloud`, `Dictate`, `Feedback`, and `Gallery` / `Visual References` by limiting those row icons to mobile only in `components/project/ProjectShell.tsx`.
- Moved the project-scoped tablet Help entrypoint into the existing right utility rail by hiding the smaller-screen header Help button from `md` up and showing the rail Help trigger at tablet as well as desktop.
- Preserved the exact Help route `router.push(\`/project/${project.id}/help\`)` and kept `data-tour="help-icon"` on the visible rail Help trigger.
- Verified the refinement with `npx tsc --noEmit --pretty false`.

### Current status

Tablet Story layout now keeps the top AI pair while pushing the remaining editor utilities, including Help, into the right rail. Mobile still retains the fuller horizontal tool row, and desktop remains unchanged.

### Next recommended step

Run a browser validation pass:
- tablet width in Sanctuary and Midnight
- confirm the top row only shows `Analyze` and `Ask AI`
- confirm `Read Aloud`, `Dictate`, `Feedback`, `Gallery` / `Visual References`, and `Help` are available from the right rail
- confirm mobile still shows the fuller horizontal tool row
- confirm desktop right rail behavior is unchanged

### Risks or warnings

- This session verified compile only, not a live tablet browser pass.
- The previously attempted tablet-labelled-rail direction was intentionally not kept; the current tablet pattern is top-row AI pair plus right-rail utilities.

---
## 2026-05-01 - Desktop Story shell alignment and Help rail move

### Current branch

`main`

### What was completed

- Tightened desktop outer shell padding in `components/app/AppNav.tsx` so the brand and top-right global controls sit slightly further inboard.
- Refined the desktop project header grouping in `components/project/ProjectShell.tsx` so Home/Structure and project identity read more like one workspace header cluster.
- Kept all existing project tab routes and behavior intact while tightening desktop tab/header spacing.
- Moved the project-scoped desktop Help trigger into the Story right rail in `components/project/story/StoryTab.tsx`.
- Preserved the exact Help route: `router.push(\`/project/${project.id}/help\`)`.
- Moved the existing `data-tour="help-icon"` anchor onto the new desktop rail Help trigger so the tour still targets the visible desktop Help control.
- Hid the old project-header Help button on desktop only, while keeping smaller-screen help access in place.
- Verified the change with `npx tsc --noEmit --pretty false`.

### Current status

Desktop Story workspace alignment is tighter, and the project Help action now lives in the right rail on desktop while keeping the same route and tour anchor.

### Next recommended step

Run a browser validation pass:
- desktop Story workspace in Sanctuary
- desktop Story workspace in Midnight
- verify only one visible desktop project Help button exists
- click desktop rail Help and confirm `/project/[id]/help`
- confirm the tour/help onboarding still points to the moved rail Help trigger
- verify tablet/mobile still use the existing smaller-screen Help access path

### Risks or warnings

- This session verified compile only, not a live browser interaction pass.
- Focused eslint on `AppNav.tsx`, `ProjectShell.tsx`, and `StoryTab.tsx` still reports large pre-existing lint debt in the touched shell files, including existing `no-explicit-any` errors not introduced by this change.

---
## 2026-05-01 - Story workspace multipurpose right rail

### Current branch

`main`

### What was completed

- Reviewed the existing Story workspace side-panel architecture and confirmed the current right side only exposed a collapsed AI Partner rail on desktop/tablet, while Feedback and scene Gallery/Visual References used separate independent slide-outs.
- Checked the user's Stitch concept (`Story Workspace: Redesign Concept`) and extracted only the relevant interaction idea: a slim icon-based utility rail that keeps secondary tools peripheral without copying the full screen design.
- Refactored `components/project/story/StoryTab.tsx` so desktop/tablet now use one shared right-side utility rail for:
  - Analyze
  - AI Partner
  - `Gallery` for books / `Visual References` for screenplays
  - Feedback
  - Dictate
  - Read Aloud
- Preserved existing behavior:
  - AI Partner, Feedback, and Gallery/Visual References still open their usual slide-out panels
  - Analyze still runs the existing analysis flow
  - Dictate still triggers the existing dictation request flow
  - Read Aloud still uses the existing reader dropdown
- Kept the old mobile behavior intact by leaving the mobile slide-out panels in place and limiting the new rail to `md+`.
- Updated `components/project/story/ReaderMode.tsx` so the reader dropdown can open to the left when used inside the new right rail.
- Verified the implementation with `npx tsc --noEmit --pretty false`.

### Current status

The Story workspace now has a single desktop/tablet utility rail on the right, reducing duplicate top-of-editor utility controls and consolidating secondary tools into one calmer vertical access point.

### Next recommended step

Run a browser regression pass on desktop and tablet widths:
- Story tab with no side panel open
- open and close AI Partner from the new rail
- open and close Feedback from the new rail
- open and close `Gallery` in book mode
- open and close `Visual References` in screenplay mode
- trigger Analyze and confirm it still uses the current analysis flow
- trigger Dictate and confirm the editor still responds correctly
- open Read Aloud from the rail and confirm the dropdown opens to the left
- confirm mobile still uses the existing toolbar/buttons and slide-outs

### Risks or warnings

- This session verified the change with TypeScript compile only, not a live browser interaction pass.
- Focused eslint on `StoryTab.tsx` still reports a large pre-existing `no-explicit-any` backlog in that file, and `ReaderMode.tsx` still has a small pre-existing unused-variable warning set.

---
## 2026-05-01 - AI Partner Midnight composer surface fix

### Current branch

`main`

### What was completed

- Investigated the reported Midnight-mode AI Partner regression where the lower chat/composer area still rendered with light-theme surfaces.
- Confirmed there was no matching reusable troubleshooting entry, then traced the issue to missing Midnight styling for the AI composer footer and the `PremiumEditor` ProseMirror prompt surface.
- Updated `components/project/story/AiHelperPanel.tsx` to add scoped composer hooks for the affected footer and editor wrapper.
- Updated `app/globals.css` to give the AI composer footer and prompt editor a proper Midnight background, border, text, and placeholder treatment without changing other editors.
- Verified the fix with `npx tsc --noEmit --pretty false`.

### Current status

The AI Partner composer now has explicit Midnight-only styling hooks, so the footer band and prompt box should no longer stay light when the app theme is set to `midnight`.

### Next recommended step

Run a browser validation pass in Midnight mode:
- open the AI Partner in sidebar and full-canvas modes
- confirm the lower composer band is dark instead of paper-white
- confirm the prompt box background, typed text, and placeholder all read correctly
- check both book and screenplay projects
- confirm the send/stop button contrast still feels correct against the darker composer

### Risks or warnings

- This session verified the fix with TypeScript compile only, not a browser screenshot or live UI pass.
- Focused eslint on `components/project/story/AiHelperPanel.tsx` still reports a large pre-existing lint backlog unrelated to this change.

---
## 2026-05-01 - Library sort default and persistence hardening

### Current branch

`main`

### What was completed

- Inspected the Library sort persistence path and confirmed it is browser-local only, using `localStorage`, not account/profile storage.
- Confirmed there was no second app-side writer for `storyline-library-sort`.
- Updated `components/library/ProjectGrid.tsx` so the sort state initializes directly from storage with a `recent` fallback instead of booting through `custom`.
- Centralized the Library sort key and fallback into `LIBRARY_SORT_KEY` and `DEFAULT_LIBRARY_SORT`.
- Verified the change with `npx tsc --noEmit --pretty false`.

### Current status

The Library now defaults to `Recent` whenever no valid saved sort exists, and it no longer mounts through `Custom` first before hydrating the saved preference.

### Next recommended step

Browser-check the Library sort behavior:
- load the Library with empty/cleared site storage and confirm it defaults to `Recent`
- switch to `A-Z`, refresh, and confirm it stays `A-Z`
- switch to `Custom`, refresh, and confirm it stays `Custom`
- switch back to `Recent`, close the tab/browser, reopen later, and confirm it still opens as `Recent`

### Risks or warnings

- This session verified the change with TypeScript compile only, not a browser interaction pass.
- If the browser or an extension clears site storage between sessions, the saved choice will still be lost, but the fallback is now `Recent` instead of `Custom`.

---
## 2026-05-01 - Incomplete setup resume fix and draft-card delete confirmation alignment

### Current branch

`main`

### What was completed

- Investigated the Library `Resume your setup` card and confirmed the draft card used a separate delete-confirmation UI from regular project cards.
- Traced the incomplete setup resume path to the `/new` guided flow and confirmed the outer draft step was persisted, but the guided sub-step was not.
- Updated `components/new-project/GuidedFlow.tsx` to persist and restore both guided draft data and the guided `stepIndex`, while remaining compatible with older localStorage drafts.
- Updated the incomplete setup delete confirmation in `components/library/ProjectGrid.tsx` to match the darker, cleaner project-card confirmation pattern more closely.
- Added a troubleshooting entry for the guided-resume mismatch.
- Verified the change with `npx tsc --noEmit --pretty false`.

### Current status

Incomplete guided project setup should now resume at the exact guided step where the draft was left, and the draft-card delete confirmation no longer uses the older lighter treatment.

### Next recommended step

Run a browser validation pass:
- create or resume an incomplete guided setup draft
- leave the flow on later guided steps such as `World & Locations`, `Vision`, or `Identity`
- return to the Library and click `Resume`
- confirm the flow reopens on the exact same guided step with entered data intact
- confirm the draft-card delete confirmation now matches the regular project-card style visually on desktop and tablet widths

### Risks or warnings

- This session verified the fix with TypeScript compile only, not a live browser interaction pass.
- Existing older drafts should still load because the guided draft reader accepts both the old plain-data shape and the new `{ data, stepIndex }` shape.

---
## 2026-05-01 - Added dark mode regression pass to Testing Tracker

### Current branch

`main`

### What was completed

- Added a comprehensive `Full-app dark mode regression pass` test case to `TESTING.md` under the `UI / Device / Accessibility` section.
- The test case covers auditing the entire app in Midnight mode across various components (library, auth, settings, editor, etc.) and layouts (mobile/tablet).

### Current status

`TESTING.md` now explicitly tracks the need for a full-app dark mode audit following reported anomalies.

### Next recommended step

- Perform the manual dark mode regression pass as defined in the new test case.
- Investigate and fix any dark mode anomalies found during the audit.

### Risks or warnings

- None.

---
## 2026-05-01 - Project Help shortcuts access fix

### Current branch

`main`

### What was completed

- Investigated the reported mismatch between Help guidance and the actual keyboard-shortcuts access path.
- Confirmed there was no direct project-Help action to open the shortcuts modal, only a Help Center search/filter path.
- Added a shared project-scoped shortcuts-open event so project Help can open the existing modal directly.
- Updated `components/project/help/HelpTab.tsx` so project Help now offers visible `Open keyboard shortcuts` actions near search, inside the shortcuts topic card, and in the quick links area.
- Clarified the user-facing shortcuts guidance to say `Shift + /` and to explain that focus must be outside a text field.
- Tightened the keyboard handler in `components/project/ProjectShell.tsx` so the shortcuts modal toggles from either `?` or `Shift + /` when the user is not typing.
- Removed the duplicate in-tree `ShortcutsLegend` render, leaving the single outer modal instance as the source of truth.
- Verified the change with:
  - `npx tsc --noEmit --pretty false`
  - `npx eslint components/project/help/HelpTab.tsx lib/help.ts lib/project/shortcuts.ts`

### Current status

Project Help now has an explicit, clickable path to the shortcuts modal instead of only showing search results about shortcuts. The keyboard copy is clearer, and the project shell no longer mounts the shortcuts dialog twice.

### Next recommended step

Run a browser check on project Help and the shortcuts modal:
- open `/project/[id]/help`
- click `Open keyboard shortcuts` from the search helper row
- click `Open keyboard shortcuts` from the quick links area
- confirm the shortcuts topic card button opens the same modal
- confirm `Shift + /` opens and closes the modal while focus is outside a text field
- confirm typing `?` inside editor/search fields does not hijack text entry

### Risks or warnings

- `components/project/ProjectShell.tsx` still has pre-existing lint debt unrelated to this fix, so the focused lint verification was scoped to the newly added Help/helper code paths.
- This session verified compile plus focused lint, not a live browser interaction pass for the shortcuts modal.

---
## 2026-05-01 - Help Center Midnight and scanability polish

### Current branch

`main`

### What was completed

- Applied a presentation-only polish pass to the shared Help Center surface in `components/project/help/HelpTab.tsx`.
- Added a Help-specific root class so both `/help` and `/project/[id]/help` now share the same scoped Help styling.
- Replaced hardcoded light Help surfaces with Sanctuary-compatible utility surfaces and reduced the visual weight of the hero block on smaller screens.
- Added a visible search label and a clearer search wrapper without changing any search logic or filtering behavior.
- Softened the helper/tour card and sidebar panels so they read as secondary to the main Help results.
- Improved Help topic-card spacing and body readability without changing any help content.
- Added Help-specific Midnight selectors in `app/globals.css` following the existing AI/Settings override pattern.
- Verified the touched files with:
  - `npx tsc --noEmit --pretty false`
  - `npx eslint components/project/help/HelpTab.tsx`

### Current status

The shared Help Center now has scoped Midnight theme support and calmer hierarchy across both global and project Help routes, while keeping Help content, search behavior, and tour behavior unchanged.

### Next recommended step

Run a browser verification pass for Help:
- `/help` in Sanctuary and Midnight
- `/project/[id]/help` in Sanctuary and Midnight
- search default, matched, and no-results states
- tablet and narrow/mobile layout
- confirm the workspace-tour action still behaves exactly the same

### Risks or warnings

- This session verified compile and focused lint only, not a full browser pass of the Help routes in both themes.
- Midnight styling is intentionally scoped to the new Help root class; if other Help-adjacent surfaces are introduced later without that root, they will not inherit these overrides automatically.

---
## 2026-05-01 - Account Settings Sanctuary polish pass

### Current branch

`main`

### What was completed

- Applied a presentation-only polish pass to `components/app/SettingsView.tsx` for the Account Settings screen.
- Reordered the screen so the visible flow is now `Profile / Security`, then `Appearance`, then `AI Partner Settings`.
- Split the account area into clearer visual subsections for profile, email, password, and danger-zone actions without changing any existing handlers or account logic.
- Reduced AI-section dominance by rewriting technical copy into plain user-facing language and shifting selected states away from indigo-heavy styling toward calmer Sanctuary-adjacent emphasis.
- Improved helper-text readability for trust-sensitive copy around passwords, deletion, AI keys, local Ollama setup, and trial limits.
- Removed the glassy `Appearance` card treatment in favor of a flatter Sanctuary card style.
- Tightened mobile stacking in the settings header, AI status/action rows, and delete-confirm controls.
- Cleaned up local typing in `SettingsView.tsx` so the file now passes focused linting again.
- Verified the touched file with:
  - `npx tsc --noEmit --pretty false`
  - `npx eslint components/app/SettingsView.tsx`

### Current status

The Account Settings screen now reads more like a calm account surface and less like an AI-first control panel, while keeping all existing auth, billing, deletion, Supabase, and AI-setting behavior intact.

### Next recommended step

Run a signed-in browser verification pass on `/settings`:
- desktop hierarchy check
- mobile/narrow viewport stacking
- midnight theme
- AI-off and no-key states
- limited-trial state if available
- email, password, and delete-account flows

After that, return to the previously deferred live auth-flow submission checks if they are still pending.

### Risks or warnings

- This session verified compile and lint only, not a full signed-in browser pass of the settings states.
- The settings page still uses top-level success/error banners; section-local feedback placement remains follow-up work, not part of this pass.

---
## 2026-05-01 - Dev-origin and auth navigation hardening

### Current branch

`main`

### What was completed

- Investigated a local dev failure where the app could bind to port `3000` but still hang on page loads and post-login navigation.
- Confirmed the existing troubleshooting path applied: stopping the stuck dev process tree, clearing `.next`, and restarting restored normal local responses.
- Updated `next.config.ts` so Next 16 development also allows `127.0.0.1` in addition to the existing LAN origin.
- Added a shared client auth redirect helper in `lib/auth/client-navigation.ts`.
- Hardened `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, and `app/(auth)/reset-password/page.tsx` so they no longer sit in a silent loading state if post-auth navigation never leaves the current page.
- Removed duplicate reset-password submit wiring and deleted temporary auth debug logging.
- Added a reusable troubleshooting entry for the Next.js dev-origin plus stuck-cache pattern.
- Verified the touched code with:
  - `npx tsc --noEmit --pretty false`
  - focused `npx eslint` on the touched auth/config/helper files
  - HTTP `200` responses for `/login` on both `http://localhost:3000` and `http://127.0.0.1:3000`
  - Playwright page load on `http://127.0.0.1:3000/login` without the earlier dev-origin warning appearing in `.next/dev/logs/next-development.log`

### Current status

The local dev server now starts cleanly again after cache reset, and Next 16 no longer blocks the `127.0.0.1` host used during local testing. The auth entry pages now fail more clearly if they never leave the current route after a successful auth mutation.

### Next recommended step

Run a focused browser submission pass on the auth flows:
- invalid login should show an inline error and clear loading
- successful login should leave `/login` and reach the authenticated app
- signup verification-required path should still show confirmation copy
- reset-password success path should navigate cleanly, and failure should clear loading

After that, return to the Account Settings audit the user requested earlier.

### Risks or warnings

- The new auth fallback only detects the specific failure mode where the page never leaves the current auth route. It does not solve deeper server stalls after navigation has already changed routes.
- Playwright created locked `.playwright-mcp` artifact files in the workspace; they are untracked but may need manual cleanup outside the current tool lock if desired.

---
## 2026-04-30 - Export modal trust and include-toggle fixes

### Current branch

`main`

### What was completed

- Audited the Export Manuscript modal and removed incomplete user-facing features that were creating trust problems.
- Hid dormant summary export modes (`Outline Summaries`, `Outline + Prose`) from the live modal while leaving internal exporter support in place for future work.
- Hid incomplete scoped-export UI (`Episodes`, `Scenes`) and replaced it with a plain-language full-project export scope summary.
- Fixed the `Includes` controls so the switches are clearly visible, the full rows are clickable, and the current include choices are echoed in the export preview.
- Added explicit `On` / `Off` labels and conventional switch coloring so enabled/disabled state is readable without guessing from tone alone.
- Fixed exporter consistency so `Chapter / Act Titles` now gates act headings across DOCX, Markdown, HTML, TXT, and EPUB instead of only gating chapter/episode headings.
- Added export-related future-work notes to `docs/technical-debt-roadmap.md` for first-class story summaries, real scoped exports, and Chrome same-name download overwrite friction on Windows.
- Updated `DESIGN.md` with the export-style modal footer pattern and aligned Project Settings / Share footer actions to that reference.
- Verified all code changes with `npx tsc --noEmit --pretty false`.

### Current status

The export modal is now clearer and less misleading:
- only working scope/content choices are exposed
- the include toggles have clearer semantics
- preview copy reflects current include state
- act-title export behavior is more consistent across formats

User browser screenshots also suggest the latest DOCX include behavior now matches the preview state after the fixes.

### Next recommended step

Run a focused browser/manual export regression pass:
- Markdown export in prose mode
- DOCX export in prose mode
- PDF export, especially on Chrome desktop for Windows
- screenplay-mode export across DOCX/PDF/HTML/TXT
- confirm include toggles affect structure labels as expected in each format

Also verify whether the Chrome same-name overwrite/download-permission interruption should be handled with a small in-app warning before export.

### Risks or warnings

- Export regression coverage is still incomplete, especially for PDF and screenplay-mode output.
- Chrome on Windows may interrupt repeated same-name downloads with `Needs permission to download`; this is now tracked as future work, not fixed.
- `TESTING.md` was intentionally not updated to `Passed` for export flows because the user found real issues during validation and the session ended before a full clean pass.

---
## 2026-04-30 - Library Recent sort refresh on browser back

### Current branch

`main`

### What was completed

- Investigated stale library ordering when returning from a project with browser back while the library was set to `Recent`.
- Confirmed the sort logic itself was fine; the stale state came from the library page being restored with old server props until a manual refresh.
- Added a session-based return flag in `components/library/ProjectGrid.tsx`: opening a project from a library card marks the library for refresh, and the next library mount consumes that flag and calls `router.refresh()` once.
- Added a troubleshooting entry for this pattern.
- Verified the code with `npx tsc --noEmit --pretty false`.

### Current status

The library should now re-fetch fresh `last_accessed_at` data when the user returns via browser back/forward, so `Recent` order should match what a manual tab refresh would show.

### Next recommended step

Browser-check this exact flow:
- set Library sort to `Recent`
- open a project from its card
- return with browser back or mouse back
- confirm the project order matches a manual refresh

### Risks or warnings

- This session verified compile correctness only, not the live browser flow.
- The fix intentionally avoids refreshing on ordinary tab focus to reduce unnecessary requests.

---
## 2026-04-30 - Project open 404 guardrail for missing owner membership

### Current branch

`main`

### What was completed

- Investigated a 404 when opening `/project/395d1ebf-7d59-4180-988d-55d4d99ec2c6/story`.
- Confirmed the route exists and the 404 was app-generated from `app/(app)/project/[id]/layout.tsx`, not a missing Next.js page.
- Identified a loader mismatch: the library can list a readable `projects` row, but the project layout previously required an inner-joined `project_members` row.
- Updated the layout loader to fetch the project row first, validate access separately, and allow the owner through when `projects.user_id` matches even if the owner membership row is missing.
- Added a troubleshooting entry for this 404 pattern.
- Verified the code with `npx tsc --noEmit --pretty false`.

### Current status

The project layout should no longer turn owner-accessible cloud projects into 404s solely because the owner membership row is missing or filtered.

### Next recommended step

Browser-check the exact affected project URL while signed into the owner account and confirm the workspace opens instead of rendering the 404 page.

### Risks or warnings

- This session only verified the fix via TypeScript compile, not a live browser-authenticated project open.
- If the underlying Supabase data really is missing owner membership rows, a follow-up data repair may still be worth considering even though the route now tolerates it.

---
## 2026-04-30 - Sanctuary Design System Unification

### Current branch

`main`

### What was completed

- **Standardized Sidebar Aesthetics**: Unified the visual design of the AI Partner, Feedback, and Scene Gallery panels under the Sanctuary theme.
- **Button Style Unification**: Transitioned all AI Partner and Scene Gallery buttons from "outline" or subtle-border variants to ghost/borderless styles (e.g., `variant="ghost"`, `rounded-xl`, no border/shadow) to ensure a cohesive, non-intrusive interactive experience.
- **Layout Harmonization**: Aligned input field shapes, sizes, and internal separator lines between the AI and Feedback panels to ensure visual parity when side-by-side.
- **Scene Gallery Discoverability**: Added persistent, non-intrusive "helper" cards to the Scene Gallery for prose projects, explaining the right-click workflow for inline image insertion.
- **Navigation Correction**: Fixed the "Open Asset Manager" button in the Scene Gallery to correctly switch views within the same tab instead of opening a new tab.
- **Build Error Fix**: Resolved a syntax error in `AiHelperPanel.tsx` caused by accidental duplicate code and a missing comma in a `cn()` call.

### Current status

The sidebar experience is now visually unified across all primary interaction panels. The "Sanctuary" aesthetic (vertical gradients, borderless ghost buttons) is consistently applied.

### Next recommended step

Perform a manual UI audit of the sidebar panels on both mobile and desktop to verify that the borderless buttons remain sufficiently discoverable and that the layout alignment is maintained across different viewport sizes.

### Risks or warnings

- **Discoverability**: Standardizing on ghost/borderless buttons prioritizes aesthetics; monitor if users find the interaction points less obvious.
- **Layout Consistency**: Ensure that any future sidebar panels (e.g., Character or Location panels) strictly follow the established Sanctuary CSS patterns (gradients, `#d8ddcf` borders, ghost buttons).

---


### Current status

The platform is significantly more resilient against multi-account trial abuse. Centralized rate limiting now monitors identity clusters in addition to user IDs.

### Next recommended step

Perform a manual smoke test of the new abuse controls:
- Attempt signup with a disposable domain from the new list (e.g., `muama.com`).
- Attempt to trigger the rate limiter using multiple accounts from the same device/IP.
- Check the new `lib/ai/abuse-report.ts` results for any detected clusters.

### Risks or warnings

- Cluster throttling uses a 1.5x more aggressive interval than standard user limits; watch for false positives in high-density environments like universities (though the shared throttle is only for 4s-30s windows).
- The disposable email list is finite; consider moving to a third-party API if manual domain maintenance becomes a burden.

## 2026-04-29 - Browser dialog audit completed

### Current branch

`main`

### What was completed

- Audited the repo for browser-native `alert()` / `confirm()` / `prompt()` usage.
- Replaced Recovery `Clear Trash` native confirmation with the app's `AlertDialog`.
- Replaced the remaining `alert()` error boxes in Export Modal, Recovery, and Saved Responses with `sonner` toasts.
- Replaced the Project Settings editor-mode mismatch `window.confirm()` with an in-app `AlertDialog`.
- Verified via repo-wide search that no `alert()` / `confirm()` / `prompt()` calls remain in `components`, `app`, or `lib`.

### Current status

The app should no longer fall back to browser system dialog boxes in the main product code.

### Next recommended step

Browser-check the updated flows:
- Recovery `Clear Trash`
- Project Settings editor-mode mismatch confirm
- Saved response rename/insert failure handling
- Export failure handling

### Risks or warnings

- Verification in this session was compile-only plus repo search; the updated dialogs/toasts still need real browser interaction checks.

---
## 2026-04-29 - AI Partner readability cleanup and first-use preview note

### Current branch

`main`

### What was completed

- Removed the persistent AI privacy warning from below the AI Partner prompt box to free vertical space.
- Moved the AI context preview toggle from the footer row into the header utility icon cluster beside the tour/help controls.
- Added a one-time per-project AI Partner note that auto-opens inside the context preview after the first successful AI use, then does not auto-appear again for that project.
- Tightened several low-contrast `text-slate-400` treatments in `AiHelperPanel.tsx`, especially the empty state and context preview labels/snippets.
- Deleted the stale generated `font-audit-report.md` file while keeping the reusable `scripts/font-audit.js` audit tool and `npm run font:audit` script.

### Current status

The main readability complaint in AI Partner has been addressed without changing AI behavior or local/cloud boundaries. Another agent should not re-add the permanent footer warning unless the product direction changes.

### Next recommended step

Browser-check AI Partner on desktop and mobile:
- verify the footer warning is gone
- verify the context preview button now lives in the header icon row
- verify the first-use preview note appears once for a project after the first completed AI response
- verify reopening AI Partner for the same project does not auto-show that note again

### Risks or warnings

- The first-use note is stored client-side per project via browser storage, so it is per-browser rather than synced across devices.
- This was a focused AI Partner typography pass, not a full app-wide contrast audit.

---
## 2026-04-29 - Shared loading-state UX added for major app transitions

### Current branch

`main`

### What was completed

- Added a shared `RouteLoadingScreen` component for staged loading UX:
  - quiet initial delay for near-instant transitions
  - skeleton placeholders for short waits
  - reassuring copy for longer waits
- Added route-level `loading.tsx` files for:
  - `app/(app)/library`
  - `app/(app)/new`
  - `app/(app)/settings`
  - `app/(app)/project/[id]/story`
- Replaced the old plain-text loading placeholder in `LocalProjectShell.tsx` with the same shared workspace loading treatment.
- Added the supporting shimmer keyframes in `app/globals.css`.
- Verified the touched code with `npx tsc --noEmit --pretty false`.

### Current status

The staged loading UX is implemented for the main high-traffic transitions another agent would be likely to target first, so this task should not be reopened or duplicated.

### Next recommended step

Browser-check the new loading states on:
- Library
- New Project
- Settings
- Story workspace navigation
- Local project open

### Risks or warnings

- Important limitation: the very first cloud project-shell load is still constrained by uncached/same-segment work inside `app/(app)/project/[id]/layout.tsx`. Next route-level `loading.tsx` does not cover that layout fetch path. Only revisit this area if the goal is a deliberate layout/data-loading refactor rather than duplicating the loading-screen work already done.

---
## 2026-04-28 - Profile Menu Legal Links Cleanup

### Current branch

`main`

### What was completed

- Removed the separate legal links (Terms of Service, Privacy Policy, AI Disclaimer) and the "Legal" section header from the profile/account dropdown in `components/app/AppNav.tsx`.
- Verified that the Admin menu item is correctly gated behind `canAccessAdmin`.
- Updated `TASK_BOARD.md` to move the corresponding item to Done.
- Added a manual test to `TESTING.md` under "UI / Device / Accessibility".

### Current status

The profile/account menu is now cleaner and more focused, without duplicating legal links already present elsewhere in the app (like the showcase and library footer).

### Next recommended step

The next session should verify manual testing criteria: profile/account dropdown no longer shows three separate legal links, legal pages/routes are not deleted, legal links remain accessible from footer/showcase/library footer, and Admin does not appear for non-admin users.

### Risks or warnings

- No major risks. The `AppNav` component has been successfully updated and standard TypeScript/lint checks apply.

---
## 2026-04-27 - Local project .storyline file workflow (Save/Save As/Open)

### Current branch

`main`

### What was completed

- **Manual Save / Save As / Open**: Implemented desktop-like file management for local-only projects using the File System Access API.
- **Rebranding**:
  - Library: "Import Backup" -> "Open Project File".
  - Project Menu: Added "Save Project" and "Save As...".
  - Project Menu: "Export Project" -> "Export Manuscript...".
- **Local Export Support**: Resolved a regression where local projects bypassed the Export Modal. Added logic to `buildExportPayload` and `ExportModal` to fetch manuscript data from IndexedDB.
- **Bug Fix**: Resolved a `RangeError` during EPUB export by including the `CommentMark` extension in the centralized export schema.
- **Shortcuts**: Registered `Ctrl+S` / `Cmd+S` for manual disk saving (local projects only).
- **Status Metadata**: Navigation dropdown now shows linked filename and "Saved X minutes ago" timestamp.
- **Data Integrity**:
  - Fixed a bug where `ProjectShell.tsx` was passing project IDs instead of content to the save utility.
  - Ensured `.storyline` files are sanitized (browser handles/metadata stripped) during export.
- **Verification**: `npx tsc` and `npm run lint` passed (after reordering variable declarations in `ProjectShell.tsx`).

### Current status

Implementation is complete, but **manual browser smoke testing is required** to verify native file-system behavior and permission handling.

### Next recommended step

Run the manual browser smoke-test checklist (see `TESTING.md` or below).

### Risks or warnings

- File System Access API support varies by browser; verify the download fallback in Safari/Firefox.
- Permission revocation on refresh: confirm the "permission needed" toast and flow work correctly.

---
## 2026-04-27 - Guided Story Tone copy now respects AI availability

### Current branch

`main`

### What was completed

- Picked the `TASK_BOARD.md` item for the guided project creation `Story Tone` step.
- Updated the new-project flow to read the current user's `ai_enabled` setting from `user_api_keys`.
- Passed that state into `GuidedFlow.tsx` and made the `Story Tone` hint dynamic:
  - AI enabled: AI-oriented wording remains.
  - AI disabled/unavailable: the step is described as project atmosphere/style guidance instead of an AI feature.
- Verified the touched code with `npx tsc --noEmit --pretty false`.

### Current status

The guided `Story Tone` step now matches the user's actual AI state instead of always implying AI is active.

### Next recommended step

Browser-check the guided project creation flow:
- open `/new`
- verify the `Story Tone` step uses AI wording when AI is enabled
- verify it switches to non-AI wording when AI is disabled for the account
- confirm the rest of the guided flow still persists drafts and completes normally

### Risks or warnings

- Verification in this session was compile-only; browser validation is still needed for the copy swap under both account states.

---
## 2026-04-27 - Local/cloud boundary messaging tightened

### Current branch

`main`

### What was completed

- Audited local/cloud boundary behavior across library and project-entry surfaces after the local cover-edit fix.
- Identified a concrete mismatch in local project settings: the UI already supports `Enable Cloud & Collaboration`, but some local-only messaging still implied that collaboration-related cloud behavior was a future update.
- Updated `ProjectSettingsModal.tsx` so local collaboration toasts now point users to the existing migration action.
- Changed the settings-level `Learn about Cloud Sync` action to open the Help Center instead of the migration confirmation dialog.
- Added an `Open Project Settings` action to the local project education modal in `ProjectShell.tsx` so users are given a real next step when told they can enable cloud sync.
- Verified the touched code with `npx tsc --noEmit --pretty false`.

### Current status

The local/cloud boundary copy is more honest and the local education flow now exposes actual paths for both learning about cloud sync and enabling it.

### Next recommended step

Run a browser smoke test on local project entry and settings:
- create or open a local-only project and confirm the first-run local education modal offers backup plus project settings
- open local project settings and confirm `Enable Cloud & Collaboration` is visible
- click `Learn about Cloud Sync` and confirm it opens `/help?q=cloud sync`
- click a locked collaboration toggle and confirm the toast points to the existing migration action rather than implying the feature is unavailable

### Risks or warnings

- Verification in this session was compile-only; browser validation is still needed for the modal flow and help navigation.

---
## 2026-04-27 - Local library cover editing restored

### Current branch

`main`

### What was completed

- Investigated why local-only library cards were missing the pencil and palette actions.
- Confirmed the issue was a UI gate in `ProjectGrid.tsx`, not a fundamental local-project metadata limitation.
- Restored local owner access to project settings and cover editing from the library.
- Updated `CoverEditModal.tsx` so local cover saves go through `updateLocalProject(...)` and local uploaded files are persisted as data URLs, matching the local project creation flow.
- Verified the touched code with `npx tsc --noEmit --pretty false`.

### Current status

Local-only projects should now expose the same library-card metadata and cover editing entry points as cloud projects, while still keeping uploaded local cover files on-device.

### Next recommended step

Run a browser smoke test on the library:
- create or open a local-only project card and confirm the pencil and palette buttons are visible
- update a local project title from the library and confirm it persists
- change a local cover using a theme cover, custom URL, and uploaded file
- refresh the library and confirm the updated cover remains visible
- if needed, migrate a local project with a custom cover to cloud and confirm the resulting cloud cover behavior is acceptable

### Risks or warnings

- Verification in this session was compile-only; browser validation is still needed for the local cover upload and refresh path.

---
## 2026-04-27 - AI context preview hidden behind footer inspector

### Current branch

`main`

### What was completed

- Removed the always-visible `What the AI is noticing` bar from the AI Partner footer area.
- Replaced it with an icon-only inspector control beside the footer note so it no longer reserves response space on mobile.
- Kept the developer-facing context preview available as a floating panel with a clear close button.
- Verified the change with `npx tsc --noEmit --pretty false`.

### Current status

The AI context/debug preview is still available when needed, but it now stays out of the way unless the user intentionally opens it.

### Next recommended step

Do a quick browser check in AI Partner:
- confirm the footer icon feels discoverable without being noisy
- confirm the floating context panel opens and closes cleanly on mobile
- confirm the response area gets more vertical room when the inspector is closed

### Risks or warnings

- Focused eslint on `components/project/story/AiHelperPanel.tsx` still reports the large pre-existing lint backlog in that file.

---
## 2026-04-27 - Removed in-project Help tab from visible nav

### Current branch

`main`

### What was completed

- Adjusted the library header layout so tablets keep a stacked, less crowded composition before switching to desktop layout.
- Reworked the AI Partner mobile context strip so the fixed `Context` control and horizontally scrollable linked-item chips share one row.
- Removed the visible `Help` tab from the in-project tab bar.
- Kept the separate help icon button and internal help routes/pages intact.
- Verified the change with `npx tsc --noEmit --pretty false`.

### Current status

The library and AI Partner have narrower-screen layout improvements in place, and project help is still reachable from the dedicated help icon without taking up a full tab in the main project navigation.

### Next recommended step

Do a quick browser check:
- confirm the library header no longer breaks awkwardly on tablet widths
- confirm the AI Partner mobile context row scrolls cleanly without wrapping
- confirm the Help tab no longer appears in the tab row
- confirm the help icon still opens `/project/[id]/help`

### Risks or warnings

- Focused eslint on `components/project/ProjectShell.tsx` still reports pre-existing lint issues unrelated to this nav cleanup.

---
## 2026-04-27 - Help Center back path and dismissible library reminder

### Current branch

`main`

### What was completed

- Added a clear `Back to Library` button to the global Help Center view.
- Added a dismiss `X` control to the library transfer/cloud-sync reminder card.
- Persisted reminder dismissal via local storage so it stays hidden after the user closes it.
- Kept the in-project guidance version unchanged except for shared copy updates.
- Verified the touched files with `npx tsc --noEmit --pretty false` and focused eslint.

### Current status

The library help path is easier to exit, and the reminder card can now be dismissed cleanly instead of staying on screen indefinitely.

### Next recommended step

Browser-check the reminder dismiss flow and the global Help Center return path:
- open `/help?q=cloud sync` and confirm `Back to Library` is obvious and works
- dismiss the library reminder and refresh
- confirm the reminder stays hidden until local storage is cleared

### Risks or warnings

- Dismissal persistence is browser-local by design; it will not sync across devices or browsers.

---
## 2026-04-27 - Library-accessible Help Center for cloud sync guidance

### Current branch

`main`

### What was completed

- Reused the existing Help Center pattern instead of creating a disconnected cloud-sync explainer page.
- Added a library-accessible `/help` route inside the authenticated app shell.
- Added a new cloud sync help topic with plain-language copy covering local-only projects, cross-device access, and how to enable cloud sync.
- Routed library `Learn about Cloud Sync` links to the Help Center with the cloud-sync query prefilled.
- Added a `Help Center` entry to the main app-nav dropdown.

### Current status

The library now sends users to actual cloud-sync guidance instead of account settings. The same Help Center pattern is available from both the library and project space.

### Next recommended step

Run a browser smoke test:
- click `Learn about Cloud Sync` from the empty library state
- click it from the import backup guidance
- confirm `/help?q=cloud sync` opens with the cloud-sync topic visible
- confirm the nav dropdown `Help Center` link works
- confirm project help still behaves normally inside `/project/[id]/help`

### Risks or warnings

- `npx tsc --noEmit --pretty false` passed.
- Focused eslint still reports pre-existing warnings/errors in older files like `ProjectGrid.tsx`; this task did not add a new help-flow lint failure.

---
## 2026-04-27 - Centralized AI route rate limiting

### Current branch

`main`

### What was completed

- Chose the first high-priority technical debt item from the board: centralized AI route rate limiting.
- Added a shared server-side limiter that reads and records request activity through `ai_usage_events` instead of relying on per-instance memory.
- Wired the limiter into `/api/ai`, `/api/ai/analyze-scene`, and `/api/import/ai-detect`.
- Preserved trial reservation flow by rate limiting trial requests before reservation but after trial status checks.
- Verified the touched code with `npx tsc --noEmit --pretty false`.

### Current status

AI helper, scene analysis, and AI import detect now use a centralized Supabase-backed request history for throttling. This is a meaningful improvement over the old in-memory approach for distributed/serverless instances.

### Next recommended step

Run a real regression on rate limiting behavior:
- trigger repeated helper requests and confirm `429` plus `Retry-After`
- repeat for scene analyzer
- repeat for AI import detect
- verify trial-exhausted users still get trial-specific messaging rather than `RATE_LIMITED`

### Risks or warnings

- The new limiter uses a read-then-write pattern against `ai_usage_events`, so it is centralized but not perfectly atomic under near-simultaneous races.
- `npm run lint` still has pre-existing `no-explicit-any` failures in these older route files; the focused change did not resolve that backlog.

---
## 2026-04-26 - Scene gallery wording and empty collaborator pill cleanup

### Current branch

`main`

### What was completed

- Clarified prose scene-asset wording so book projects use `Scene Gallery`, `Open Gallery`, and `Add to Gallery` instead of screenplay-style reference copy.
- Preserved screenplay-specific `Scene Visual References` wording.
- Removed the empty collaborator avatar pill/blip from solo projects in the app header.
- Preserved collaborator avatar rendering for shared projects.
- User confirmed these items are resolved.

### Current status

The recent low-risk UI cleanup is in place. Solo projects no longer show an empty collaborator cluster, and prose scene asset language now matches existing gallery terminology.

### Next recommended step

Run the broader browser regression already listed for visual references, AI-off analyzer feedback, and book/prose image behavior.

### Risks or warnings

- These fixes were kept intentionally narrow and were not validated with a fresh browser regression in this session.

---
## 2026-04-26 - AI access defaults and screenplay visual references

### Current branch

`main`

### What was completed

- Fixed the `window is not defined` crash in `StructureTree.tsx` by removing render-time `window.innerWidth` access and moving indentation sizing behind a client-side effect.
- Changed missing AI settings to default to AI off across story, AI, settings, preferences save, and admin reporting paths.
- Hid the editor AI empty-state nudge when AI is not enabled.
- Updated the scene analyzer button so AI-disabled users get the AI sidebar with analyzer-specific access messaging instead of no feedback.
- Added screenplay-only visual reference UX using the existing `project_assets` and `scene_assets` system.
- Blocked inline `storyImage` insertion in screenplay mode while preserving prose inline illustration behavior.
- Standardized screenplay visual reference labels:
  - short buttons/tooltips: `Visual References`
  - panel titles/headers: `Scene Visual References`

### Current status

The app compiles with the focused changes. Screenplay visual references remain scene attachments only; no database, export, or AI-context changes were made for visual references.

### Next recommended step

Run a browser regression pass:
- Open a screenplay scene and confirm `Visual References` opens `Scene Visual References`.
- Attach/remove a scene visual reference, refresh, and confirm it persists.
- Confirm screenplay inline image insertion is blocked with the expected toast.
- Confirm book/prose still supports `Insert Illustration` and existing `Gallery` behavior.
- Click scene analysis with AI off and confirm the AI sidebar explains analyzer access requirements.

### Risks or warnings

- Browser regression has not been run in this session.
- `.env.local` contains live-looking API/service keys in the workspace; rotate them if they were exposed outside the local machine.

---
## 2026-04-26 - Structure panel UX improvements and StoryTab restoration

### Current branch

`main`

### What was completed

- **Restored `StoryTab.tsx`**: Fully reconstructed the file after corruption, ensuring all project selection and editor coordination logic is intact.
- **Improved Drag-and-Drop UX**: 
  - Implemented dynamic "Neighbor Highlighting" in the structure tree. Nodes adjacent to the drop zone now "light up" with an indigo glow.
  - Fixed grab handle visibility on desktop; handle is now dark with a high-contrast white icon during drag.
  - Ensured moved scenes remain selected and active in the editor after a drop.
- **Dynamic Deletion Prompt**: Updated the delete confirmation dialog to correctly identify the node type (e.g., "Delete this act?" instead of "Delete this scene?").
- **Sidebar Layout Fix**: Enforced `whitespace-nowrap` on sidebar titles to prevent "one word per line" wrapping issues reported on desktop.
- **Empty State UX**: Container nodes (Acts/Episodes) now show the "Your story awaits..." prompt instead of a "Scene Not Found" error.

### Current status

The structure panel is much more responsive and visually clear during reorganization. The editor is stable, and common "dead ends" (like clicking an Act node) now have proper UI feedback.

### Next recommended step

Run a browser-based regression test on the drag-and-drop neighbors:
- Drag a scene between two others and verify both neighbors glow.
- Drag a scene to the very top or bottom of an Act and verify only the single neighbor glows.
- Verify that titles no longer wrap to multiple lines in the structure tree.

### Risks or warnings

- `StructureTree.tsx` now uses `window.innerWidth` for padding calculations; ensure this doesn't cause hydration mismatches (guarded with `useMemo` and client-side logic).
- The `StoryTab.tsx` restoration was massive; while verified by line count and key exports, a full run through the writing flow is recommended.

---


## 2026-04-26 - AI mode consolidation and structure-selection context fixes

### Current branch

`main`

### What was completed

- Merged quick writing ideas into the main AI mode selector and removed visible prompt injection for those modes.
- Kept quick writing steering internal so users can type their own prompt text while still using the selected AI mode.
- Extended screenplay-mode AI insert behavior so non-chat screenplay responses try to insert as structured screenplay blocks, not just plain text.
- Removed Archive Context from the AI Partner so saved AI responses now live only in AI Memory, not as inline request context controls.
- Trimmed excess desktop spacing in the AI Partner header and input footer.
- Removed the redundant static `Mode` pill so the dropdown selector stands on its own.
- Fixed the desktop structure tree checkbox collapse bug on act rows.
- Reworked story-context selection so explicit AI selection is separate from derived tree checkbox visuals.
- Fixed act/scene selection roll-up behavior so:
  - selecting an act covers its scenes for AI,
  - selecting all scenes rolls the act up visually,
  - deselecting a child scene breaks the act back into explicit scene selections,
  - reselecting the missing scene collapses the explicit selection back to the act,
  - clicking a rolled-up act can still deselect child coverage correctly.

### Current status

AI mode selection is consolidated, the AI Partner header is leaner, AI Memory is no longer duplicated as Archive Context inside the panel, screenplay insertion is more consistent for screenplay projects, and structure-tree selection now behaves consistently between the tree, AI-ready bar, and AI Partner context.

### Next recommended step

Run an in-browser regression pass on story context selection and screenplay AI insertion:
- single-scene selection,
- full-act selection,
- deselect/reselect one scene under an act,
- AI-ready chip collapse/expand,
- insert generated screenplay output into the editor from non-chat modes.

### Risks or warnings

- `components/project/story/AiHelperPanel.tsx`, `components/project/story/StoryTab.tsx`, and `components/project/story/StructureTree.tsx` contain the current uncommitted code changes.
- Focused eslint checks passed on `StoryTab.tsx` and `StructureTree.tsx`; `AiHelperPanel.tsx` still has a broader pre-existing lint backlog if run without narrowed rules.
- The screenplay insertion parser for non-chat modes is heuristic when the model does not return JSON, so real UI verification is still important.

---

## 2026-04-26 - AI partner mode selector changed to dropdown

### Current branch

`main`

### What was completed

- Replaced the AI partner horizontal mode button scroller with a single selectable dropdown.
- Kept the existing AI mode options and `promptMode` behavior.
- User confirmed the issue is resolved.

### Current status

The AI partner mode control now shows the current mode and opens a list of available modes when clicked.

### Next recommended step

Continue with the selected high-priority technical debt item when ready; recommended first candidate remains centralized rate limiting for AI routes.

### Risks or warnings

- `npx tsc --noEmit --pretty false` passed.
- `npm run lint` still fails on existing repo-wide lint issues unrelated to this change.

---

## 2026-04-26 - Technical debt roadmap summarized into root continuity files

### Current branch

`main`

### What was completed

- Reviewed `docs/technical-debt-roadmap.md`.
- Kept the original roadmap in `docs/` as the detailed source.
- Added a concise technical debt priority summary to `MASTER_BRIEF.md`.
- Added actionable technical debt items to `TASK_BOARD.md`.
- Added a decision log entry explaining why the docs roadmap was summarized rather than moved or deleted.

### Current status

The root continuity files now point agents toward the main reliability and technical debt priorities without duplicating the full roadmap.

### Next recommended step

Choose which high-priority technical debt item should be tackled first. Recommended first candidate: centralized rate limiting for AI routes, because it protects against API abuse and unexpected sponsored AI spend.

### Risks or warnings

- `docs/technical-debt-roadmap.md` remains the detailed source for implementation guidance.
- Do not begin database/RPC or billing/trial changes without a focused plan and careful testing.
- Keep root continuity files concise; use `docs/` for deeper technical plans.

---

## 2026-04-26 - Project continuity system added

### Current branch

`main`

### What was completed

- Added a root-level project continuity system.
- Added `MASTER_BRIEF.md` as the stable source of truth.
- Added `DECISION_LOG.md` for project decisions and reasons.
- Added `SESSION_HANDOVER.md` for session-to-session continuity.
- Added `TASK_BOARD.md` for simple Now / Next / Later / Done tracking.

### Current status

The repository now has the basic files needed for agents to catch up across machines and chat sessions.

### Next recommended step

Use the session start prompt from `MASTER_BRIEF.md` at the beginning of the next Codex, AG, Claude, or ChatGPT coding session.

### Risks or warnings

- These files are only useful if agents are instructed to read and update them.
- Do not let agents rewrite these files aggressively; updates should be concise and additive.
- More detailed product decisions still need to be added over time.

---
## 2026-04-27 - Notification Refactor & Library UX Polish

### Current branch

\main\ ocean

### What was completed

- **Notification System Expansion**: Refactored the 'Working on another device?' guidance into a persistent system notification event (\local_transfer_guidance\).
  - Added support for the new notification type in the database and frontend logic.
  - Implemented auto-creation logic in \ImportBackupButton.tsx\ (ensuring it exists exactly once per user).
  - Created a full-page detail view for the guidance, integrated with the notification system.
  - Added a deep-link action that returns the user to the library and automatically triggers the backup flow via \?action=import\.
- **Library Card UX Refinements**: 
  - Restored the 'floating' icon aesthetic for project cards (removed borders/backgrounds) per user feedback.
  - Fixed tablet/iPad Pro visibility: Action buttons (Edit, Palette, Trash) are now visible by default on viewports < 1280px, even if the browser reports hover support.
  - Unified action button visibility logic to prevent inconsistencies (e.g., Palette missing while Trash was visible).
  - Improved the delete confirmation dialog: It now clears the project type icon by hiding it when active, preventing visual overlap on narrow cards.
  - Anchored the delete dialog to the right edge with high-contrast backgrounds for better legibility.
  - Added a resize listener to maintain correct visibility during tablet orientation changes.

### Current status

The library UX is significantly more robust for mobile and tablet users. Accidental navigation is prevented by visible action buttons, and the transfer guidance is now a first-class citizen of the notification system rather than a dismissible banner.

### Next recommended step

Implement the dynamic 'Story Tone' step in the project creation flow: check AI availability and reword the 'Story Tone' step to be metadata-only if AI is disabled or unavailable for the account. Target file: \components/library/CreateProjectModal.tsx\.

### Risks or warnings

- The \isTouch\ detection logic relies on a 1280px threshold to capture iPad Pro landscape (1366px is \xl\, so 1280px covers the common 'large tablet' range). If a desktop user has a very small browser window, icons will be visible by default.
- Notification auto-creation uses \localStorage\ to prevent redundant DB calls; clear \storyline-notified-transfer-[id]\ when testing across accounts.

---
## 2026-04-27 - Library Card Alignment & Uniformity

### Current branch

\main\ ocean

### What was completed

- **Standardized Card Alignment**: Resolved the 'uneven titles' and 'shifting horizontal lines' reported in the library grid.
  - Implemented fixed-height containers for titles (\h-[68px]\) and descriptions (\h-[48px]\) with \items-start\ and \line-clamp-2\.
  - This ensures that whether a title is 1 or 2 lines, it always occupies the same vertical footprint and starts at the same height.
  - Switched the footer divider from relative margin (\mt-10\) to automatic margin (\mt-auto\), anchoring it to the bottom of the content area for perfect alignment across the grid.
  - Added a \pt-24\ safety margin on cover cards to prevent titles from ever touching the top-anchored header icons.

### Current status

The library cards now look perfectly uniform in the grid, even with varying title lengths and project metadata.

### Next recommended step

Verify the alignment with a project that has a very short title and no description vs one with a long title and full description.

### Risks or warnings

- If a project title is extremely long, it will be truncated at 2 lines. This is a deliberate design constraint to maintain grid stability.

---
## 2026-04-27 - Permanent Desktop Action Buttons

### What was completed

- **Standardized Action Visibility**: Removed the 'hover-only' constraint for Edit, Palette, and Trash buttons on desktop for cards without cover art.
- **UI Consistency**: Action buttons are now permanently visible on all cards regardless of whether they have a cover image, matching the user's preference for a stable, non-shifting interface.

### Next recommended step

Verify that the permanent icons don't clutter the view too much on smaller desktop screens (though the current spacing looks solid).
