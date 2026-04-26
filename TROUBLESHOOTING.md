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
