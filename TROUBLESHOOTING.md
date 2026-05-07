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

In `app/(app)/project/[id]/layout.tsx`, check the `Next-Router-Prefetch: 1` header and skip `touch_project` for prefetch requests:

```typescript
import { headers } from 'next/headers'
// ...inside ProjectLayoutLoader:
const requestHeaders = await headers()
const isPrefetch = requestHeaders.get('Next-Router-Prefetch') === '1'
if (!isPrefetch) {
    void supabase.rpc('touch_project', { p_id: id }).then(({ error }) => {
        if (error) console.error('Failed to update last_accessed_at:', error)
    })
}
```

This preserves prefetch performance (loading skeletons still preload) while ensuring `last_accessed_at` only updates on real user navigation.

### Notes

- The `LocalProjectShell` equivalent (`touchLocalProject`) runs inside a `useEffect` — client-side only — so it was never affected by this issue.
- If the header approach ever becomes unreliable (e.g. Next.js renames it), the fallback fix is `prefetch={false}` on the `<Link>` in `ProjectGrid.tsx:675`.

