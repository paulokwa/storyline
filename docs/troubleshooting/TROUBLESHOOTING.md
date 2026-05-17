# TROUBLESHOOTING

## Purpose

This file is the project playbook for known failures, proven fixes, and safe diagnostic steps.

Use this file when the app fails to start, build, load, save, sync, export, import, authenticate, connect to Supabase, or behave as expected.

The goal is to avoid random command guessing and preserve fixes that have already worked.

---

## How Agents Should Use This File

Before debugging a failure:

1. Read `MASTER_BRIEF.md` and `AGENTS.md` first.
2. Check this file for a matching symptom.
3. Prefer the smallest safe fix that matches the evidence.
4. Do not run broad/destructive cleanup commands unless the targeted fix fails or the user approves.
5. If a new proven fix is discovered, add it here concisely.

---

## General Diagnostic Order

For bugs, broken dev server, build failures, or unexpected runtime behaviour:

1. Reproduce or inspect the failure.
2. Capture the exact error message.
3. Identify the category:
   - Next.js cache/build artifact issue
   - dependency/install issue
   - environment variable issue
   - TypeScript/build issue
   - Supabase/RLS/database issue
   - browser/client runtime issue
   - routing/app structure issue
   - local storage/IndexedDB issue
   - asset/storage issue
   - unknown
4. Inspect the relevant files.
5. Apply the smallest safe fix.
6. Verify the result.
7. Report clearly.

---

## Next.js Dev Server Will Not Load

### Symptoms

- App will not load locally.
- Dev server starts but browser shows an error or stale/broken output.
- Next.js reports strange module/build/cache errors.
- Behaviour changes after recent code changes but the code itself looks valid.

### Likely Cause

Stale or corrupted Next.js build/cache artifacts, especially inside `.next`.

### Safe First Fix

From the project root, remove `.next` only, then restart the dev server.

PowerShell:

```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

Bash/Git Bash/macOS/Linux:

```bash
rm -rf .next
npm run dev
```

### Do Not Do First

Do not start with:

- deleting `node_modules`
- deleting lockfiles
- changing package managers
- reinstalling everything
- editing config files without evidence

Only consider deeper dependency fixes if clearing `.next` fails or the error clearly points to dependencies.

---

## Dependency / Install Issues

### Symptoms

- `npm install` fails.
- Module not found errors appear immediately after dependency changes.
- Build fails because a package version is missing or incompatible.

### Safe Diagnostic Steps

1. Inspect `package.json`.
2. Confirm the lockfile in use.
3. Check whether the missing package is actually listed.
4. Run the project’s normal install command only if needed.

### Caution

Do not delete `node_modules` or lockfiles unless there is clear evidence of dependency corruption or the user approves.

---

## Environment Variable Issues

### Symptoms

- Supabase client fails to initialize.
- AI routes fail unexpectedly.
- Auth or storage works in one environment but not another.
- Local dev differs from Netlify/deployed behaviour.

### Safe Diagnostic Steps

1. Inspect code for required env var names.
2. Confirm whether the failure is local-only or deployed-only.
3. Do not print or expose secret values.
4. Ask the user to verify secret values only when needed.

### Caution

Never commit `.env` files or secrets.

---

## Supabase / RLS Issues

### Symptoms

- Data loads for owner but not collaborator.
- Viewer/editor permissions behave incorrectly.
- Comments, assets, project membership, or migrations fail unexpectedly.

### Safe Diagnostic Steps

1. Inspect relevant queries and RPC calls.
2. Check whether the code uses membership-aware helpers.
3. Preserve owner/editor/viewer permissions.
4. Avoid weakening RLS policies as a shortcut.

### Caution

Database schema, migrations, and RLS policies are protected areas. Do not change them without explicit approval and a clear explanation.

---

## Local-First / Cloud Mode Issues

### Symptoms

- Local project behaves differently from cloud project.
- Migration from local to cloud fails.
- Local content, assets, comments, or IDs behave oddly.

### Safe Diagnostic Steps

1. Identify whether the project is local-only, cloud, migrated, or collaboration-enabled.
2. Check ID mapping and local/cloud boundaries before editing.
3. Preserve local data even if cloud migration fails.

### Caution

Do not assume every project is cloud-backed.

---

## Export / Import Issues

### Symptoms

- Export misses content.
- DOCX/Markdown/Text/HTML output differs from editor content.
- Screenplay formatting breaks in export.
- Imported content appears malformed.

### Safe Diagnostic Steps

1. Check whether content is TipTap JSON or legacy HTML.
2. Confirm normalization paths before changing exporter logic.
3. Preserve `.storyline` backup compatibility.
4. Test with both prose and screenplay content if the change affects shared export logic.

---

## When a New Fix Is Found

Add a short entry using this format:

```md
## Issue: Short Name

### Symptoms

- What the user sees

### Cause

- Confirmed or likely root cause

### Fix

- Smallest safe fix that worked

### Verification

- How it was confirmed working

### Notes

- Risks, warnings, or follow-up
```

## Issue: Pre-launch Audit Blockers - Autosave, Migration Cleanup, Export Escaping, Auth Recovery, Import Auth

### Symptoms

- Scene title-only edits may not persist unless body text also changes.
- Local -> Cloud migration can leave a visible partial cloud project if asset upload fails after the project row is created.
- HTML/EPUB exports can break markup or include injected markup when titles, summaries, or metadata contain HTML/XML characters.
- Forgot-password/reset flows can submit duplicate requests or log reset exceptions in production.
- `/api/import` can be called directly without an authenticated app session.

### Cause

- Autosave scheduling was gated only by body-content dirty state.
- Migration cleanup only covered later database insertions, not the asset-upload phase after project creation.
- HTML/EPUB/XML exporters interpolated user-controlled strings directly.
- Forgot-password had both form submit and button click handlers, and recovery exception logging was not production-gated.
- Import parsing route did not perform its own auth check.

### Fix

- Schedule autosave when either body content is dirty or the scene title differs from the last saved title.
- Wrap asset uploads and later migration inserts in one cleanup path that deletes the new cloud project row and uploaded files on failure.
- Escape user-controlled export strings before writing HTML, XHTML, OPF, and NCX markup.
- Use one submit path plus a single-submit guard for auth recovery forms; gate reset exception logging to development.
- Require an authenticated Supabase user in `/api/import`.

### Verification

- `npx tsc --noEmit --pretty false`
- Focused ESLint for touched non-SceneEditor files
- HTML/EPUB escaping smoke check
- `npm run build`

### Notes

- Browser QA is still recommended for title-only rename persistence, forced migration failure retry behavior, forgot/reset password click behavior, and authenticated import UX.
- `SceneEditor.tsx` has pre-existing lint debt unrelated to the title-only autosave scheduling fix.

## Issue: Import Ordering, AI Import Mapping, Trial Cost Copy, and Tablet Panels

### Symptoms

- EPUB imports can produce chapters out of reading order when zip file paths do not match the book spine.
- Magic Detect can assign the wrong title to later chunks if an earlier AI-detected marker cannot be mapped back to the manuscript.
- Free Trial AI users can see dollar-cost copy in safeguard dialogs.
- OpenRouter free-model copy can sound like guaranteed no-cost usage.
- Local projects tied to another signed-in account can look like missing data.
- Mobile/tablet AI, comments, and scene asset panels can clip on narrow viewports or change behavior at different breakpoints.

### Cause

- EPUB parsing used sorted HTML/XHTML zip paths instead of the OPF spine.
- AI import slicing stored mapped indices separately from their detection objects.
- Shared AI safeguard copy only knew the provider, not the billing mode.
- OpenRouter copy used "free model" language without enough provider-quota context.
- The local-project forbidden state reused a generic "Project not found" message.
- Project shell and story panels used a 768px breakpoint while the editor used a 1024px mobile/tablet threshold, and mobile panels had fixed 320px widths.

### Fix

- Read `META-INF/container.xml`, load the OPF package, and follow `<spine><itemref>` manifest order for EPUB HTML/XHTML files, with sorted HTML fallback when spine data is unavailable.
- Store mapped AI import anchors as `{ index, detection }` pairs so skipped markers do not shift later titles.
- Pass AI billing mode into `AiSafeguardDialogs` and show trial-allowance impact instead of dollar estimates for `app_managed_trial`.
- Reword OpenRouter free-tier copy as provider-limited and quota-dependent.
- Make the local-project forbidden copy state that the draft is still on-device but belongs to another account.
- Align project shell/story panels to the tablet threshold and cap slide-out panel width with responsive viewport-based sizing.

### Verification

- `npx tsc --noEmit --pretty false`
- Focused ESLint on touched files with unrelated existing lint debt disabled where needed
- `npm run build`

### Notes

- Browser QA is still recommended for real EPUB fixtures, Magic Detect with missing markers, Free Trial AI safeguards, OpenRouter settings copy, and 320px/768px/1024px viewport panel behavior.

## Issue: Import UX Copy, Magic Detect Progress, and Midnight Modal/Settings Coverage

### Symptoms

- Import preview labels rough character-based estimates as words.
- Magic Detect overlay shows a static progress bar while status text changes.
- Midnight theme leaves some Settings controls and Export modal header/option accents using light-theme or low-contrast colors.

### Cause

- Import UI used `rawText.length / 5` as a word estimate and displayed it as words.
- Magic Detect overlay hard-coded the progress width.
- Existing midnight overrides did not cover Settings selects/code/accent colors or Export modal arbitrary text colors and amber/white translucent surfaces.

### Fix

- Label extracted manuscript size by character count instead of inferred word count.
- Track staged Magic Detect progress through preparation, request, mapping, and preview-building states.
- Add narrow midnight overrides for Settings controls and Export modal arbitrary colors/surfaces instead of redesigning either component.

### Verification

- Static search should show no `estimated words`, `Math.round(rawText.length / 5)`, or static `width: '60%'` in the import UI.
- Run TypeScript, focused ESLint, and build checks after the UI change.

### Notes

- This is targeted launch polish, not a full dark-mode redesign. Keep the full dark-mode polish pass as future work until the broader UI is stable.

## Issue: Magic Detect feels stalled during long AI import requests

### Symptoms

- During larger Magic Detect imports, the progress overlay can sit on a single message such as `Identifying structural anchors...`.
- Users cannot tell whether the AI organizer is still working or stuck.

### Cause

- The overlay only showed coarse internal stages and did not have elapsed-time waiting feedback while the network request was still pending.

### Fix

- Track elapsed seconds while Magic Detect is running.
- Show a secondary waiting message that changes over time for longer requests.
- Let the progress bar advance slowly to a capped waiting point while the request is still pending, then resume the real mapping/building progress after the response returns.
- Do not change the AI request, import parsing, or Magic Detect result mapping logic.

### Verification

- Run TypeScript and focused ESLint for `components/new-project/ImportWizard.tsx`.
- Browser-test Magic Detect on a larger manuscript and confirm the secondary waiting text changes at longer durations without sending additional requests.

## Issue: Import wizard headings are low contrast in Midnight theme

### Symptoms

- In the New Project import flow, the main import heading, selected file title, split section heading, and inactive split-card titles are nearly invisible in Midnight theme.
- The same flow remains readable in Sanctuary/light theme.

### Cause

- `ImportWizard` used hard-coded light-theme Tailwind classes such as `text-slate-800`, `text-slate-700`, `bg-white`, and `bg-stone-50`.
- Existing Midnight overrides covered the New Project card and guided flow, but did not have a dedicated import-wizard scope.

### Fix

- Add a narrow wrapper class to the import wizard.
- Add `[data-theme='midnight']` overrides scoped to that wrapper for slate text, light surfaces, borders, warning surfaces, and error surfaces.
- Do not change import parsing, project creation, or Sanctuary/light theme behavior.

### Verification

- Check computed contrast for the import title, selected file title, split heading, inactive strategy title, and helper text. Primary text should be at least WCAG AA `4.5:1`; the current scoped Midnight colors measure above `10:1` on the New Project card.
- Run TypeScript, focused ESLint for `components/new-project/ImportWizard.tsx`, and `npm run build`.

## Issue: Magic Detect preview is lost after comparing manual import options

### Symptoms

- After running Magic Detect, clicking another split option such as By Heading or Single Scene replaces the AI-generated preview.
- Returning to Magic Detect asks the user to run the AI organizer again instead of showing the previous AI result.
- The Magic Detect confirmation modal can exceed the visible viewport, making the scrollbar appear outside the usable window on smaller screens.

### Cause

- Manual split previews and Magic Detect previews shared the same `chunks` state.
- Magic Detect also marked the active strategy as `custom`, so the UI had no durable "AI preview" state to restore.
- The confirmation modal used a `90vh` max height inside a padded centered overlay, which can overflow the viewport once overlay padding is included.

### Fix

- Keep the current displayed preview in `chunks`, but store Magic Detect output separately in an `aiChunks` cache until the file is changed or the project is finalized.
- Add an `ai_detect` strategy state so clicking Magic Detect after a successful run restores the saved AI preview without another request.
- Keep manual import logic and AI detection calls unchanged.
- Constrain the confirmation modal with `100dvh`-based max height.
- Keep the rounded outer modal shell `overflow-hidden` and put `overflow-y-auto` on an inner content panel so the scrollbar does not protrude past the rounded corner.

### Verification

- Run Magic Detect once, switch to By Heading or Single Scene, then click Magic Detect again. The preview should return immediately and no new `/api/import/ai-detect` request should be sent.
- Run TypeScript, focused ESLint for `components/new-project/ImportWizard.tsx`, and a production build.

## Issue: Settings save fails because `ai_context_mode` is missing from Supabase schema cache

### Symptoms

- Saving Settings after switching AI Context Mode fails.
- The API returns `Could not find the 'ai_context_mode' column of 'user_api_keys' in the schema cache`.

### Cause

- The application code and generated types expect `user_api_keys.ai_context_mode`, but migration `20260507210000_add_ai_context_mode_and_exclusions.sql` has not been applied to the linked Supabase database yet.
- Until the migration is applied, PostgREST cannot see the column in its schema cache.

### Fix

- Confirm drift with `npx supabase migration list --linked`.
- Apply the pending migration with `npx supabase db push --linked`.
- Verify the migration appears in both Local and Remote columns.
- Verify PostgREST sees the column by selecting `user_id,ai_context_mode` from `user_api_keys` with the service-role Supabase client.

### Verification

- `npx supabase migration list --linked` shows `20260507210000` in both Local and Remote.
- A service-role Supabase client query selecting `user_id,ai_context_mode` from `user_api_keys` succeeds.

### Notes

- Do not work around this by removing `ai_context_mode` from Settings saves; Smart Context / Manual Context persistence depends on the column.
- Docker is required for `npx supabase db dump`; if Docker Desktop is unavailable, use migration history plus a direct Supabase client query for verification.

## Issue: Incomplete guided setup resumes at the wrong step

### Symptoms

- The Library shows `Resume your setup` for an unfinished project draft.
- Opening the draft returns to the guided setup flow, but the user is sent back to the first guided prompt instead of the last completed step.

### Cause

- The `/new` page persisted the outer setup step, but `GuidedFlow.tsx` did not persist its internal `stepIndex`.
- Guided draft data and guided draft position could drift because only the form fields were stored in `storyline-guided-data-draft`.

### Fix

- Persist both the guided draft data and the guided `stepIndex` in `storyline-guided-data-draft`.
- Keep backward compatibility with older saved drafts that only stored the data object.

### Verification

- `npx tsc --noEmit --pretty false`

### Notes

- Browser validation is still needed for a real incomplete guided draft, especially resuming from later steps like `World & Locations`, `Vision`, and `Identity`.

## Issue: Next.js dev server listens but auth pages hang or never finish loading

### Symptoms

- `npm run dev` starts and binds to port `3000`, but local pages stall or time out.
- The login screen may render, but signing in appears to do nothing and the loading label keeps spinning.
- Requests from `127.0.0.1` can trigger Next.js dev-origin warnings even though `localhost` works.

### Cause

- A stale or locked `.next` cache can leave the Next.js 16 dev server in a half-working state where it listens but does not serve requests reliably.
- An overly narrow `allowedDevOrigins` config can also block dev-only assets when the app is opened from `127.0.0.1`.

### Fix

- Stop the stuck dev server process tree completely.
- Remove `.next`.
- Restart `npm run dev`.
- In `next.config.ts`, include `127.0.0.1` in `allowedDevOrigins` while keeping any existing LAN dev host entries.

### Verification

- `http://localhost:3000/login` returns `200` after restart.
- `http://127.0.0.1:3000/login` loads without Next.js dev-origin warnings after the config update.

### Notes

- If `.next` cannot be deleted on Windows, a child `node.exe` process may still be holding cache files open.

## Issue: Screenplay Enter crashes with `Invalid content for node type hardBreak`

### Symptoms

- Pressing `Enter` in screenplay mode can throw a runtime `RangeError`.
- The error points at `lib/tiptap/screenplay-keyboard.ts` inside the predictive `Enter` shortcut.
- The failing message is `Invalid content for node type hardBreak`.

### Cause

- The predictive screenplay `Enter` flow chained `splitBlock().setNode(nextType)` in one transaction.
- When the current screenplay block contained a `hardBreak`, the chained `setNode(...)` could run against an invalid inline selection state after the split.

### Fix

- Split the action into two steps:
  - call `editor.commands.splitBlock()` first
  - then call `editor.commands.setNode(nextType)` in a separate command

### Verification

- `npx tsc --noEmit --pretty false`

### Notes

- Browser validation is still needed for screenplay `Enter` flows after regular text and after inline line breaks.

## Issue: Action icons hidden on iPad Pro / Large Tablets

### Symptoms

- Edit, Palette, and Trash icons on library project cards are invisible on iPad Pro or other large tablets.
- The icons only appear on smaller mobile devices or on desktop hover.

### Cause

- Tablets often report supporting hover (especially in desktop Safari mode), but users interact via touch. The logic was hiding buttons on 'lg' viewports (>= 1024px) assuming a mouse-driven hover environment, which applies to iPad Pro.

### Fix

- Implement a width-based override for touch detection. Treat any device with a viewport width < 1280px as a touch device for the purpose of icon visibility, forcing them to be always visible.
- Use a resize listener to handle orientation changes (e.g., rotating from portrait to landscape).

### Verification

- Verified via browser simulation using iPad Pro dimensions (1024x1366) and confirming icons remain visible without hover.

### Notes

---

## Issue: Cloud Snapshot Restore Fails With Empty Error Object

### Symptoms

- Restoring a project snapshot in Recovery fails for a cloud project.
- The browser console shows `Error restoring snapshot: {}` from `components/project/recovery/RecoveryTab.tsx`.
- The UI only shows a generic restore failure toast.

### Cause

- `restoreProjectSnapshot` reused the original `id` values from snapshot data when re-inserting `scene_locations` and `scene_objects`.
- Those join rows are not soft-deleted during snapshot restore, so reusing the same primary keys can trigger duplicate-key failures.
- The restore path also was not normalizing Supabase/PostgREST errors, which made the console output look like an empty object.

### Fix

- In `lib/supabase/recovery.ts`, regenerate fresh UUIDs for restored `scene_locations` and `scene_objects` rows instead of reusing snapshot IDs.
- Check previously ignored Supabase mutation results during snapshot restore and throw contextual errors.
- Surface the real error message in `RecoveryTab.tsx` instead of a generic fallback.

### Verification

- `npx tsc --noEmit --pretty false`

### Notes

- This is most likely to appear on snapshots that include scene-to-location or scene-to-object links.

- 1280px was chosen to cover the 1366px landscape width of the iPad Pro while still allowing 'hover-to-reveal' on standard desktop monitors (typically 1440px or 1920px).

---

## Issue: Delete confirmation touches project type icon

### Symptoms

- On narrow cards or tablets, the 'Cancel / Delete' dialog in the library overlaps or touches the project type icon on the left.

### Cause

- The dialog was positioned absolutely but the header layout was still trying to accommodate both the icon and the dialog in a shared horizontal space.

### Fix

- Hide the project type icon (opacity-0) whenever 'confirmDelete' is true to clear the space for the dialog.
- Ensure the dialog is anchored to the right edge with a safe background contrast (\g-white/95\ or \g-black/95\).

### Verification

- Confirmed via browser testing that the icon disappears when the delete flow starts, providing a clean UI for the confirmation buttons.

---

## Issue: Local library cards hide edit and cover controls

### Symptoms

- Local-only projects in the library do not show the pencil or palette actions.
- Owners cannot update local project metadata or cover art from the library card.
- Cloud projects still show both actions normally.

### Cause

- `ProjectGrid.tsx` explicitly gated the library card edit actions behind `!isLocalProject`.
- `CoverEditModal.tsx` only persisted cover changes through `supabase.from('projects').update(...)`, so it had no local-only save path.

### Fix

- Allow owners to open project settings and cover editing for local library cards too.
- Persist local cover changes with `updateLocalProject(...)`.
- Reuse the existing deferred local-cover flow: keep uploaded files client-side until save, then convert them to a data URL for local project storage.

### Verification

- `npx tsc --noEmit --pretty false`

### Notes

- Local uploaded covers remain device-local until the user enables cloud sync.
- Browser validation is still needed for the local upload, refresh, and local-to-cloud migration path.

---

## Issue: Local settings mention cloud sync but hide the real next step

### Symptoms

- Local-only project settings say collaboration needs cloud sync, but the toast implies it is a future feature.
- Local education prompts tell users to enable cloud sync without offering a direct path into project settings.
- `Learn about Cloud Sync` inside project settings opens a migration confirmation instead of actual guidance.

### Cause

- Local-mode copy drifted after cloud migration support was added.
- Settings/help affordances were not updated to match the working `Enable Cloud & Collaboration` flow.

### Fix

- Update local-only collaboration toast copy to point users at the existing `Enable Cloud & Collaboration` action.
- Route `Learn about Cloud Sync` from project settings to the Help Center instead of the migration confirm dialog.
- Add an `Open Project Settings` action to the local project education modal.

### Verification

- `npx tsc --noEmit --pretty false`

### Notes

- Browser verification is still needed to confirm the modal-to-settings flow feels clear in practice.

---

## Issue: OpenRouter usage events silently rejected — `ai_usage_events_provider_check` constraint

### Symptoms

- AI Partner and Analyze Scene return responses correctly for OpenRouter BYOK users.
- No rows appear in `ai_usage_events` for `provider = 'openrouter'`.
- Server log shows: `[logUsageEvent] failed: { code: '23514', message: 'new row for relation "ai_usage_events" violates check constraint "ai_usage_events_provider_check"' }`.
- `supabase db push` may report "Remote database is up to date" even if an earlier fix migration did not actually execute.

### Cause

- The `ai_usage_events_provider_check` CHECK constraint was created without `'openrouter'` in the allowed values array. Every OpenRouter usage event insert/upsert was silently rejected by the database.
- The `logUsageEvent()` function in `lib/ai/trial-server.ts` previously discarded the upsert result (`await admin.from(...).upsert(...)`) without capturing `{ error }`, so failures were invisible.

### Fix

1. Capture the upsert error in `logUsageEvent`: `const { error } = await admin.from('ai_usage_events').upsert(...)` and add `if (error) console.error('[logUsageEvent] failed:', error.code, error.message)` so failures are visible.
2. Create migration `supabase/migrations/20260509170000_fix_provider_check_idempotent.sql`:
   ```sql
   ALTER TABLE ai_usage_events DROP CONSTRAINT IF EXISTS ai_usage_events_provider_check;
   ALTER TABLE ai_usage_events ADD CONSTRAINT ai_usage_events_provider_check
       CHECK (provider = ANY (ARRAY['openai'::text, 'gemini'::text, 'ollama'::text, 'openrouter'::text]));
   ```
3. Apply: `npx supabase db push` — confirm output shows the migration being applied (not "up to date").

### Verification

- Send an AI Partner message using an OpenRouter BYOK key.
- Terminal should show no `[logUsageEvent] failed:` output.
- Row appears in `ai_usage_events` with `provider = 'openrouter'` in the Supabase dashboard.

### Notes

- Use `DROP CONSTRAINT IF EXISTS` (not `DROP CONSTRAINT`) to make the migration idempotent — safe to apply even if a previous broken migration was recorded as applied but did not execute.
- A migration recorded in the Supabase history table is NOT proof that the DDL ran. If `db push` says "up to date" but the bug persists, create a new migration with a later timestamp using `IF EXISTS`.
- `logUsageEvent` does not throw on error by design — failures are logged but not surfaced to users.

---

## Issue: "Permission Required" toast when saving a local project

### Symptoms

- User clicks "Save Project" or presses `Ctrl+S`.
- A toast message appears saying "Permission required to write to file" or similar.
- The file is not updated.

### Cause

- The browser (Chrome/Edge) revokes write permission for local file handles on page refresh or after a period of inactivity for security reasons.

### Fix

- Click "Save Project" again. The browser should trigger a native permission prompt (e.g., "Allow this site to save changes?"). Once granted, saving will work for the remainder of the session.

### Notes

- This is a built-in security feature of the File System Access API. We cannot bypass it, but the app is designed to re-trigger the permission picker on next interaction.

---

## Issue: Local project disk link is missing after clearing browser cache

### Symptoms

- A local project that was previously linked to a `.storyline` file on disk no longer shows the filename in the navigation dropdown.
- "Save Project" triggers a "Save As" picker instead of updating the existing file.

### Cause

- Clearing browser site data or IndexedDB deletes the `storyline_file_handle` stored in the local project row.

### Fix

- Use "Save As..." to re-link the project to the existing file, or use "Open Project File" from the Library to reload it from disk (which will re-establish the link).

### Notes

- The project content itself remains safe in IndexedDB (unless the user explicitly deleted it); only the link to the external `.storyline` file is lost.

---

## Issue: Cloud project opens from library but lands on 404

### Symptoms

- A cloud project appears in the library.
- Opening `/project/<id>/story` shows the app's 404 page.
- The route exists, but `app/(app)/project/[id]/layout.tsx` calls `notFound()`.

### Cause

- The project layout loader treated an inner-joined `project_members` row as proof that the project exists and is accessible.
- If the owner could read the `projects` row but their `project_members` row was missing or filtered, the library could still list the project while the layout resolved to 404.

### Fix

- In `app/(app)/project/[id]/layout.tsx`, fetch the project row first.
- Check the current user's membership separately.
- Allow the owner through when `projects.user_id` matches even if the owner membership row is missing, and load the member list in a separate query.

### Verification

- `npx tsc --noEmit --pretty false`

### Notes

- Browser verification is still needed for the affected project ID.
- The loader now logs a warning when an owner opens a project that is missing its owner membership row.

---

## Issue: Opening a local `.storyline` file routes to `/project/<uuid>/story` and lands on 404

### Symptoms

- Opening or updating a local project from `Open Project File` navigates to `/project/<uuid>/story`.
- The route shows the app's 404 page even though the project was imported into IndexedDB.
- The failing project ID is a plain UUID instead of a `local_...` ID.

### Cause

- The route loaders use the `local_` prefix to decide whether a project is local-only or cloud-backed.
- Some older local projects in IndexedDB can still carry legacy plain-UUID project IDs.
- If `restoreLocalBackup(...)` overwrites one of those legacy local projects, it preserves that legacy project ID, so the app navigates into the cloud route and `notFound()`s.

### Fix

- Normalize legacy local project rows in IndexedDB to fresh `local_project_*` IDs before the library/import chooser uses them.
- Rewrite linked local records to the new local project ID so existing local routes, saves, and scene operations keep following the local-only path.

### Verification

- `npx tsc --noEmit --pretty false`

### Notes

- This fix is intentionally scoped to local project IDs. Screenplay behavior and cloud project routing are unchanged.

---

## Issue: Library Recent sort stays stale after browser back

### Symptoms

- The Library is set to `Recent`.
- The user opens a project from the library card, then returns with browser back or mouse back.
- The project cards keep the old `last_accessed_at` order until the tab is manually refreshed.

### Cause

- The library page can return with stale server props after navigating from a library card into a project and then back again.
- `ProjectGrid.tsx` sorts `Recent` client-side from those props, so the order stays stale until `router.refresh()` or a full reload fetches fresh `last_accessed_at` values.

### Fix

- In `components/library/ProjectGrid.tsx`, set a session flag when a library project card opens a project.
- When the library mounts again, consume that flag and call `router.refresh()` once to re-fetch the library payload.

### Verification

- `npx tsc --noEmit --pretty false`

### Notes

- This is intentionally scoped to browser history restore, not generic tab focus, to avoid unnecessary refreshes.
- Browser verification is still needed for the exact open-project then back flow.

---

## Issue: Standalone admin script fails with `Cannot find module 'server-only'`

### Symptoms

- Running a Node or `tsx` script that imports `lib/supabase/admin.ts` fails immediately.
- The terminal shows `Error: Cannot find module 'server-only'`.

### Cause

- `lib/supabase/admin.ts` was shared by both Next server code and standalone scripts, but it imported the Next-only `server-only` package guard.

### Fix

- Remove the `import 'server-only'` marker from the shared admin helper so it can be imported by plain Node scripts.
- Keep the helper server-side by usage: do not import it from client components, and do not expose the service role key to the browser.

### Verification

- `npx tsc --noEmit --pretty false`

### Notes

- If the script then fails on missing env vars, create the local credential file and ensure the server-only Supabase env vars are available locally.

---

## Issue: TypeScript scans local Impeccable tooling checkout

### Symptoms

- `npx tsc --noEmit --pretty false` fails with errors under `impeccable/site`, `impeccable/tests`, or other `impeccable/*` paths.
- Errors mention optional tooling dependencies such as `astro:content`, `astro/loaders`, `styled-components`, `@emotion/react`, `vite`, or `@vitejs/plugin-react`.

### Cause

- The local Impeccable tool checkout lives under the repo root, but it is not Storyline application source.
- A broad TypeScript include such as `**/*.ts`, `**/*.tsx`, and `**/*.mts` can pick up ignored local tooling folders unless they are also listed in `tsconfig.json` `exclude`.

### Fix

- Keep local tooling folders ignored by git.
- Exclude `.agents`, `.claude`, `.netlify`, and `impeccable` from `tsconfig.json`.
- Add matching global ignores in `eslint.config.mjs` so repo lint does not scan local tool/plugin checkouts.

### Verification

- `node .agents/skills/impeccable/scripts/load-context.mjs`
- `npx tsc --noEmit --pretty false`
- `npx eslint impeccable/site/content.config.ts --no-warn-ignored`
- `npx eslint .agents/skills/impeccable/SKILL.md --no-warn-ignored`

### Notes

- This does not install or commit the Impeccable skill itself; `.agents/skills/impeccable/` and `impeccable/` remain local ignored tooling.
- Repo-wide `npm run lint` may still fail on unrelated Storyline lint debt.

---

## Issue: `AuthApiError: Invalid Refresh Token: Refresh Token Not Found` on showcase page load

### Symptoms

- Console shows `AuthApiError: Invalid Refresh Token: Refresh Token Not Found` on first load.
- App still loads the showcase page correctly and does not redirect.
- Error appears in both local dev and production server logs.

### Cause

- A stale auth cookie from a previous session is present in the browser.
- When `getVerifiedUser()` calls `supabase.auth.getUser()` server-side, Supabase tries to auto-refresh using that stale cookie and gets an `AuthApiError`.
- The original code only silenced `AuthSessionMissingError`; `AuthApiError` with an invalid-token message fell through to `console.error()`.

### Fix

- In `lib/supabase/auth.ts`, detect the `AuthApiError` messages `'Invalid Refresh Token'` and `'Refresh Token Not Found'` and treat them as a missing session: call `supabase.auth.signOut({ scope: 'local' })` to clear the stale cookie, then return `null` silently.
- The same pattern already exists for the browser-side client in `lib/supabase/client-auth.ts`.

### Verification

- `npx tsc --noEmit --pretty false`
- Reload the local dev server with a stale auth cookie; the console error should no longer appear.

### Notes

- `signOut({ scope: 'local' })` clears the auth cookie from the response headers without making a server round-trip, so it is safe to call in a server component.

### Extra dev/local-production note

This error can also appear during development when the same browser is used for both the production site and localhost with the same Supabase project/account.

Example scenario:
- User is signed in on the production site.
- User then signs in on `localhost:3000` in the same browser/profile.
- Next.js dev overlay or console shows:
  `AuthApiError: Invalid Refresh Token: Refresh Token Not Found`
- The app may still work normally.

This is usually caused by stale or rotated Supabase refresh tokens between environments, not by a production auth breach or account-mixing issue.

Recommended handling:
- Do not treat this as launch-blocking if it only happens while mixing localhost and production in the same browser/profile.
- Use separate browser profiles/browsers for production and local testing where possible.
- Clear site data for `localhost` or the production domain if the error becomes annoying.
- Escalate only if the error appears in a clean production-only browser flow, blocks login, signs users out unexpectedly, or appears to normal users.

Do not change app auth logic for this note unless a clean production-only reproduction exists.

## Issue: Signup verification link can fall back into another user's active session

### Symptoms

- User A clicks a signup verification email while User B is already signed in on the same browser.
- If the verification code is no longer usable, the app can appear to open User B's account instead of showing a neutral auth result.
- Reusing a signup verification link only shows a generic invalid/expired token path.

### Cause

- The signup callback used a generic `exchangeCodeForSession(code)` redirect with no signup-specific status handling.
- When the code exchange failed, any existing signed-in browser session could remain active, so the browser still looked authenticated as the previously signed-in user.

### Fix

- Mark signup email callbacks with `intent=signup`.
- In `app/api/auth/callback/route.ts`, if a signup callback fails and there was already an active session, clear the local session before redirecting.
- In `app/(app)/library/page.tsx`, treat Supabase auth-link error query params as a fast-path redirect to `/login?verification=already-used` and clear the local session before redirecting.
- In `components/auth/AuthLinkErrorRedirector.tsx`, inspect both `window.location.search` and `window.location.hash` so hash-based Supabase auth-link failures also clear the local session and replace the URL with `/login?verification=already-used`.

### Verification

- `npx tsc --noEmit --pretty false`

---

## Issue: POST /rest/v1/notifications 403 on library page load (incognito / fresh session)

### Symptoms

- Browser console shows `POST https://<project>.supabase.co/rest/v1/notifications 403 (Forbidden)` on library page load.
- Appears in incognito or any session where the user has not previously visited the library (no localStorage key).
- The app continues to work normally; the error is a background notification creation attempt.

### Cause

- `components/library/OpenProjectButton.tsx` tried to create a `local_transfer_guidance` notification by calling `supabase.from('notifications').insert(...)` directly from the browser client.
- The `notifications` table has SELECT, UPDATE, and DELETE RLS policies but **no INSERT policy** — all notification creation is intended to go through the SECURITY DEFINER `create_notification` RPC.

### Fix

- Replace the direct `supabase.from('notifications').insert(...)` call with `supabase.rpc('create_notification', { ... })`.
- Pass `p_event_key: 'local_transfer_guidance:<userId>'` so the function's built-in `ON CONFLICT (event_key) DO NOTHING` handles deduplication — the separate count pre-check is no longer needed.

### Verification

- `npx tsc --noEmit --pretty false` passes.
- Load the library page in an incognito session; confirm no 403 appears in the browser console.
- Confirm a `local_transfer_guidance` notification row is created in the `notifications` table.

### Notes

- `local_transfer_guidance` is in the live DB enum but has no corresponding SQL migration file — was added manually. Flag for a follow-up migration if schema drift matters.
- Do not add an INSERT RLS policy to `notifications` — all notification creation should remain server-controlled via SECURITY DEFINER functions.

### Notes

- Manual browser validation is still required for four flows: fresh signup verification, reusing a consumed signup verification link, opening an invalid/reused signup link while another user is signed in, and confirming password-reset emails still use the clean production callback URL.

---

## Library: Projects Showing False "Last Accessed" Timestamps

### Symptom

Multiple projects in the library show a very recent `last_accessed_at` timestamp (e.g. "just now" or "X minutes ago") even though the user has not opened those projects. The spurious timestamps appear in bursts — several projects touched within milliseconds of each other.

### Cause

Next.js App Router prefetches `<Link>` targets when they enter the viewport. The project card links (`/project/[id]/story`) are prefetched as the library page renders. Each prefetch is a real server-side RSC request that runs `ProjectLayoutLoader`, including the `void supabase.rpc('touch_project', ...)` call. Because the Supabase session cookie is present in every request, `touch_project` updates `last_accessed_at` during prefetch as if the user had opened the project.

### Confirmed by

Querying `projects` and finding groups of 3–4 projects with identical `last_accessed_at` timestamps within 35–400ms of each other — consistent with concurrent prefetch requests, not manual navigation.

### Fix

Move `touch_project` out of the server component and into a dedicated client component. Create `components/project/TouchProject.tsx`:

```tsx
'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function TouchProject({ id }: { id: string }) {
    useEffect(() => {
        const supabase = createClient()
        void supabase.rpc('touch_project', { p_id: id }).then(({ error }) => {
            if (error) console.error('Failed to update last_accessed_at:', error)
        })
    }, [id])
    return null
}
```

Then in `app/(app)/project/[id]/layout.tsx`, replace the server-side RPC call with `<TouchProject id={id} />` inside `ProjectProvider`. `useEffect` is purely client-side and is never invoked during server-side prefetch, regardless of Next.js version or prefetch header changes.

### Why not header-based detection

Next.js 16 uses a new segment cache with two prefetch header variants (`next-router-prefetch` and `next-router-segment-prefetch`). Checking headers is fragile and version-dependent. The client component approach is version-proof: prefetch is always server-side, so `useEffect` simply cannot fire.

### Notes

- The `LocalProjectShell` equivalent (`touchLocalProject`) was already in a `useEffect` — correctly client-side — so it was never affected by this issue.
- Do NOT move this call back to server-side unless a mechanism exists to reliably distinguish prefetch from navigation at the server level.

---

## Netlify build fails bundling Next.js 16 proxy middleware Edge Function

### Symptoms

- `npm run build` passes, but `netlify build --context production` fails in `Edge Functions bundling`.
- Netlify packages `___netlify-edge-handler-node-middleware`.
- Errors can include:
  - `Failed to compile CJS module: .../.netlify/edge-functions/___netlify-edge-handler-node-middleware/server/.next/server/middleware.js`
  - `ChunkLoadError: Failed to load chunk ... [externals]`
  - `Invalid source map ... _module.findSourceMap is not a function`
  - `Cannot read properties of undefined (reading 'crypto')` when running the generated handler with older Deno.

### Cause

With Next.js 16, the root `proxy.ts` output is node middleware, but Netlify Next.js Runtime v5.15.10 still generates an internal Edge Function wrapper for it. The generated Deno/Edge bundling path is incompatible in this project. Turbopack output also produced a chunk path that Netlify could not resolve.

### Fix

- Use webpack for production builds: `"build": "next build --webpack"`.
- Remove the root `proxy.ts` middleware so Next.js no longer emits `Proxy (Middleware)`.
- Preserve auth behavior with route-level guards:
  - Keep `app/(app)/layout.tsx` as the authenticated app guard.
  - Add a protected layout for any protected route outside `(app)` such as `/feedback`.
  - Redirect signed-in users away from auth routes in the route page/component itself.

### Verification

- `npm run build` should pass and the route summary should not include `Proxy (Middleware)`.
- `netlify build --context production` should complete without an `Edge Functions bundling` failure for `___netlify-edge-handler-node-middleware`.
- Focused ESLint should pass for touched route/auth files.

### Notes

- `NEXT_DISABLE_NETLIFY_EDGE=true` did not stop the current v5 runtime from generating the internal proxy Edge Function.
- Do not re-add root `proxy.ts` without rerunning `netlify build --context production`.

---

## Netlify build fails with "Failed publishing static content" on Windows (local CLI)

### Symptoms

- `netlify build --context production` fails in the `@netlify/plugin-nextjs` `onPostBuild` event.
- Error: `Error: Failed publishing static content`.
- The Next.js build itself (`build.command`) completes successfully (TypeScript clean, all routes generated).

### Cause

This is a local Windows artifact publishing limitation in `@netlify/plugin-nextjs` v5.x. When the plugin's `onPostBuild` step tries to publish static assets locally, it fails due to Windows path or environment differences. The actual Netlify CI deploy (triggered via GitHub) runs on Linux and does not have this issue.

### Fix

This error is pre-existing and does not indicate a code defect. Ignore it when the Next.js compilation step itself passes cleanly (TypeScript passes, all routes generated, no compilation errors).

Check: if `build.command completed in N minutes` appears and the route table is printed, the Next.js build is clean regardless of the plugin failure.

### Verification

The real production test is a GitHub push to main triggering a Netlify deploy — not the local `netlify build` run.

### Notes

- Confirmed pre-existing on main before OpenRouter changes (stash-tested 2026-05-08).
- Do not let this error block commits when the Next.js compilation is clean.

---

## Issue: Signup verification emails point to localhost instead of production

### Symptoms

- New users receive an email verification link containing `http://localhost:3000/api/auth/callback?intent=signup&...`.
- Clicking the link in production opens localhost instead of the live app.

### Cause

- `app/api/auth/signup/route.ts` called `getURL()` with no argument.
- `getURL()` without an origin argument falls back to `http://localhost:3000/` when `NEXT_PUBLIC_SITE_URL` is not set.
- Netlify does not automatically set `NEXT_PUBLIC_SITE_URL`, so the fallback fires on production.

### Fix

- Pass the actual request origin: `getURL(new URL(request.url).origin)` in the `emailRedirectTo` option.
- Also set `NEXT_PUBLIC_SITE_URL` in the Netlify dashboard to the production domain (e.g. `https://yourdomain.app`) as a permanent anchor.

### Verification

- `npx tsc --noEmit --pretty false` passes.
- Sign up a new account on production and confirm the verification email link contains the production domain, not localhost.

### Notes

- The forgot-password page already used the correct pattern (`getURL(window.location.origin)`) — only the signup server route was affected.
- The auth callback route had a related but separate bug (see: **Callback route redirects to Netlify deploy-specific URL after email verification**) — it was fixed in the same audit.

---

## Issue: Callback route redirects to Netlify deploy-specific URL after email verification

### Symptoms

- Email verification link contains the correct production URL (`https://your-site.netlify.app/api/auth/callback?code=...`).
- After clicking, the browser is redirected to a deploy-specific Netlify URL (`https://[deploy-id]--your-site.netlify.app/library`) instead of the production URL.

### Cause

- `app/api/auth/callback/route.ts` extracted `origin` directly from `new URL(request.url).origin`.
- On Netlify, `trustHostHeader: false` (set in the generated Lambda `run-config.json`) causes Next.js to ignore the `x-forwarded-host` header. The Lambda's internal `request.url` contains the deploy-specific hostname, not the production hostname.
- All redirects from the callback (`/library` on success, `/login?verification=...` on error) therefore used the deploy-specific URL as the base.

### Fix

- In `app/api/auth/callback/route.ts`, replace `new URL(request.url).origin` with `getURL(new URL(request.url).origin).replace(/\/$/, '')`.
- `getURL()` already contains a guard: if the raw origin is a Netlify hostname that differs from `NEXT_PUBLIC_SITE_URL`, it returns the configured site URL instead.
- This is the same pattern already used in `app/api/auth/signup/route.ts`.

### Verification

- `npx tsc --noEmit --skipLibCheck` passes.
- Sign up with a new email on production, click the verification link, confirm the browser lands on `https://your-site.netlify.app/library` (or `/welcome` for new users who haven't completed onboarding) — no deploy-specific URL, no visible `?code=` in the final URL.

### Notes

- `NEXT_PUBLIC_SITE_URL` must be set correctly in Netlify environment variables for `getURL()` to resolve the correct production URL.
- Also clean up the Supabase Dashboard → Authentication → Redirect URLs allowlist if any entry is a concatenated/corrupted multi-URL blob. The correct minimal set is `http://localhost:3000/**` and `https://your-site.netlify.app/**`.

