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

