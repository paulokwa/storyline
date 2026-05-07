# Technical Debt & Reliability Roadmap

This file is for the boring-but-important engineering work: reliability, security, performance, architecture, type safety, data integrity, and hardening.

Use this file when the issue is mostly about making Storyline safer, sturdier, faster, more maintainable, or less likely to lose data.

## What belongs here

- Security and abuse-prevention hardening
- Reliability and data-integrity improvements
- Performance problems
- Architecture cleanup
- Type safety and maintainability work
- Persistence, sync, export, storage, and recovery hardening
- Technical implementation notes future agents will need

## What does not belong here

- Future feature ideas that are mainly product/user-facing: put those in `docs/future-roadmap.md`
- Human launch decisions and chores: put those in `docs/human-launch-checklist.md`
- Active AI coding tasks: put those in `TASK_BOARD.md`
- Locked decisions: put those in `DECISION_LOG.md`

---

## High Priority Later

### 1. Atomic Project Scaffolding (RPC)

**Why it matters:**
Project creation originally involved multiple sequential inserts, such as Project -> Episode -> Act -> Scene. If any step fails because of a network drop, timeout, or partial server error, the app can create a zombie project with missing structure.

**Risk if ignored:**
Data corruption, confusing onboarding, and projects that exist but cannot be used properly.

**Current state:**
A later implementation moved cloud project scaffolding into the `create_cloud_project` Supabase RPC. Keep this item as a reliability reference until the RPC path has been fully regression-tested and old code paths are confirmed gone.

**Future hardening:**

- Verify every cloud project creation flow uses the atomic RPC path.
- Confirm failure behavior leaves no half-created projects.
- Keep the follow-up verification in `TESTING.md` under the atomic project scaffolding failure scenario.
- Remove this item only after the test path is proven and no fallback multi-insert path remains.

**Priority:** High until fully verified.

---

### 2. Centralized Rate Limiting

**Why it matters:**
AI routes can become expensive if abused. Earlier rate limiting used local in-memory state, which is unreliable in serverless/distributed environments because each cold start or instance gets its own memory.

**Risk if ignored:**
API exploitation, noisy abuse, and avoidable sponsored AI spend.

**Current state:**
The first pass now uses the shared `ai_usage_events` infrastructure for AI throttling across helper, scene analyzer, and AI import detect routes. This is better than per-instance memory, but it is not necessarily as strict or atomic as a dedicated rate-limit service.

**Future hardening:**

- Consider Upstash Redis, Supabase Edge Function middleware, or another dedicated centralized limiter if usage grows.
- Keep IP/device-fingerprint cluster detection as heuristic evidence, not perfect identity.
- Add clearer admin visibility for rate-limited requests and suspicious clusters.
- Test duplicate submit, rapid retry, multi-account, and provider-error scenarios.

**Priority:** High for public launch / wider rollout.

---

### 3. Robust Retry and Initialisation Patterns

**Why it matters:**
Writing tools must be boringly reliable. Users will forgive a missing fancy feature faster than they will forgive lost writing.

**Risk if ignored:**
Intermittent network failures can lead to confusing `Save failed` states, project creation failures, or users being unsure whether their work is safe.

**Current state:**
A first-pass retry/init hardening was added for cloud project creation and editor saves:

- Cloud project creation retries transient RPC failures.
- Cloud scene autosave and scene-title saves retry transient persistence failures.
- Scene history capture retries in the background and no longer blocks a successful save.
- Editor UI shows `Save failed` if retries are exhausted.

**Future hardening:**

- Audit other Supabase operations that still assume a single successful request.
- Standardize retry behavior and user-facing failure messages.
- Avoid retrying non-retryable errors such as permissions/RLS failures.
- Make failure states clear without panicking the user.

**Priority:** High.

---

### 4. AI Trial Reconciliation and RPC Failure Handling

**Why it matters:**
The free-trial AI system is server-authoritative, but trial-grant, finalization, and failure paths can still drift if RPC calls fail, provider responses are partial, or retries duplicate events.

**Risk if ignored:**
Trial balance drift, silent trial-grant failures, confusing account states, and admin reports that do not reconcile cleanly.

**Current state:**
Trial cost finalization now prefers provider-reported token usage where available and falls back to estimates when provider metadata is missing. The app records whether final costing used provider-reported usage or estimate fallback.

**Future hardening:**

- Add explicit error handling and alerting around trial RPC calls.
- Add admin-visible reconciliation between `ai_trial_accounts`, `ai_usage_events`, and `ai_trial_ledger`.
- Test duplicate submit, retry, cancellation, provider failure, timeout, and partial-response scenarios.
- Make sure trial balances cannot silently go negative or get stuck in an ambiguous state.

**Priority:** High.

---

### 5. Migration Upload Bypasses Storage Quota Check

**Why it matters:**
`/api/migration/upload-asset` uploads project assets to the `project-assets` Supabase Storage bucket using the admin client, which bypasses RLS and quota enforcement entirely. The storage trigger (`project_assets_sync_profile_storage_usage`) updates `storage_used_bytes` after the migration transaction inserts into `project_assets`, but the upload itself is never blocked.

A user with near-quota storage (e.g., 95 MB used of 100 MB quota) who migrates an image-heavy local project will silently exceed their quota. They will only discover this the next time they try to upload a new asset in `AssetManager.tsx` and hit the quota check.

**Risk if ignored:**
Silent quota overruns during migration. Users are surprised by blocked uploads without understanding why. Quota enforcement is inconsistent across upload paths.

**Current state:**
Discovered during the 2026-05-07 Phase 6 storage notification audit. No fix applied yet.

**Fix options:**
1. Add a `check_storage_quota` call at the start of the migration upload route (preferred — consistent enforcement). Return a 413 if the upload would exceed quota.
2. Add a post-migration quota check in `handleMigration()` in `ProjectSettingsModal.tsx` and fire a warning toast or bell notification if storage is now near or over limit.
3. Implement option 1 for enforcement and option 2 for user-visible feedback.

**Note:** Because `/api/migration/upload-asset` uses the admin client for legitimate bypass of storage RLS, the quota check must be done via `supabase.rpc('check_storage_quota', ...)` using the authenticated user client before calling the admin upload — same pattern as `/api/project-assets/upload/route.ts`.

**Priority:** Medium. Local-to-cloud migration is not yet heavily used. The trigger still keeps `storage_used_bytes` accurate. The gap is UX (surprise at next upload), not data loss.

---

### 6. AI Abuse Controls Hardening

**Why it matters:**
Sponsored AI credits are attractive to abuse. Current protections are useful, but signals such as email normalization, disposable-domain lists, forwarded IPs, and browser fingerprints are never perfect.

**Risk if ignored:**
Trial farming, avoidable AI spend, noisy admin reports, and false confidence in weak identity signals.

**Current state:**
The app has a stronger first pass:

- IP and device-fingerprint cluster detection across different accounts.
- Expanded disposable email blocklist.
- Admin abuse-report utilities for suspicious clusters and multi-accounting behavior.

**Future hardening:**

- Add stronger signup friction for suspicious traffic if abuse appears.
- Externalize or regularly update disposable-domain intelligence.
- Treat IP/fingerprint/device signals as heuristics, not proof.
- Tune false-positive handling carefully so normal users are not punished.

**Priority:** High during wider rollout.

---

## Medium Priority Later

### 1. Unified Type Safety (Supabase Generics)

**Why it matters:**
Generated `Database` types already exist, but older data-heavy areas still contain scattered `(supabase as any)` and `any` usage.

**Risk if ignored:**
Silent runtime bugs, schema-change regressions, and code that looks fine until a user hits an edge case.

**Current state:**
Shared Supabase clients already use generated `Database` types. The remaining work is incremental cleanup.

**Future hardening:**

- Reduce `any` usage one problem area at a time.
- Prioritize persistence, recovery, comments, export, assets, and sidebar code.
- Avoid a giant whole-app typing rewrite unless there is a very clear reason.

**Priority:** Medium.

---

### 2. State Management Consolidation

**Why it matters:**
Some shared UI state is still coordinated through local component trees and prop-drilling.

**Risk if ignored:**
Maintainability becomes painful when one workflow needs the same state in many places.

**Current state:**
Zustand is already in use for `projectActionsStore`, so this is not a missing-dependency problem.

**Future hardening:**

- Broaden Zustand only when a concrete shared-state pain point justifies it.
- Do not migrate state into a global store just for architectural neatness.
- Keep local state local unless sharing it reduces real complexity.

**Priority:** Medium.

---

### 3. Structure Tree Performance

**Why it matters:**
Large projects may eventually contain hundreds of scenes, chapters, acts, or episodes. The structure tree can become laggy if every small change causes too much nested rendering.

**Risk if ignored:**
Noticeable UI lag in large projects.

**Future hardening:**

- Profile with React Profiler before optimizing.
- Consider `React.memo` for tree nodes if re-renders are excessive.
- Consider virtualization only if the tree reaches large enough sizes to justify the extra complexity.
- Keep drag/drop behavior carefully tested if optimizing this area.

**Priority:** Medium.

---

### 4. Local AI Usage Logging Integrity

**Why it matters:**
The Ollama logging endpoint helps admin analytics, but local AI events are posted by the client. Client-side event reporting is useful, but should not be treated as billing-grade truth.

**Risk if ignored:**
Admin reports for local AI can become noisy, misleading, duplicated, or malformed.

**Future hardening:**

- Validate active mode before accepting local usage logs.
- Deduplicate more aggressively.
- Clearly separate analytics-grade local AI data from billing-grade app-managed AI data.
- Make admin reporting resilient to malformed or repeated client posts.

**Priority:** Medium.

---

## Lower Priority Technical Improvements

### 1. Advanced Offline / Pending Sync

**Description:**
When a cloud scene save fails due to a network drop, the editor shows `Save failed` and stops retrying after the retry policy is exhausted. If the user keeps writing while disconnected, edits are at risk until another edit triggers autosave again.

**Current behavior audited 2026-05-03:**

- `lib/persistence/scenes.ts -> saveSceneContent()` wraps Supabase saves in `withPersistenceRetry()`.
- Retries use exponential backoff.
- After all retries fail, `SceneEditor.tsx` sets `saveStatus = 'error'`.
- There is no true pending-sync queue for failed cloud saves.
- `localStorage` is only used for UI preferences, not sync fallback.
- IndexedDB is the primary local storage for local-only projects. Cloud projects use Supabase.

**Recommended implementation: Tier 2 IndexedDB-persisted queue**

1. Add a `pending_saves` store to IndexedDB and bump the DB version.
2. Key pending saves by `scene.id` so only the latest pending save matters for each scene.
3. Add `lib/persistence/pending-sync.ts` with helpers such as `enqueuePendingSave`, `dequeuePendingSave`, `getPendingSave`, and `getPendingSavesByProject`.
4. In `SceneEditor.tsx`, enqueue retryable failed cloud saves and show something like `Offline — changes queued` instead of only `Save failed`.
5. Listen for the browser `online` event and let autosave flush the latest dirty editor content.
6. On scene mount, restore a pending save only if it does not conflict with a newer server version.

**What to skip until truly needed:**

- Service Worker / Background Sync API.
- Global ProjectShell-level offline indicator for scenes that are not mounted.
- Multi-scene background queue flush.

**Priority:** Low unless offline writing becomes a marketed feature.

---

### 2. Destructive Action Guards

**Description:**
Strengthen delete confirmations for high-impact actions, especially deleting container structure nodes with child content.

**Current behavior audited 2026-05-03:**

- Library project delete has a two-step inline confirmation and soft-deletes to trash.
- Structure tree container nodes have a two-step inline confirmation panel, but no child-count warning.
- Characters, locations, ideas, and objects can be deleted with lower-friction actions.
- Account deletion has its own confirmation flow.
- Native browser `alert`, `confirm`, and `prompt` calls were replaced elsewhere.

**Recommended improvements:**

1. Add child-count warnings on container node delete, e.g. `This will also trash 3 chapters and 12 scenes.`
2. Add inline confirm for entity deletes if accidental deletion becomes a real problem.
3. Consider `Type DELETE` only for permanent destroy actions, not normal soft-delete flows.

**Priority:** Low. Child-count warning is the highest-value improvement.

---

### 3. Backup and Asset Handling

**Description:**
Refine local-only data management and recovery behavior.

**Current state:**
Native `.storyline` Save / Save As / Open workflow is implemented. Backup size warning above 20 MB is done.

**Future hardening:**

- Support multiple local backups with timestamps/names rather than a single manual file.
- Optimize how binary files and high-resolution attachments are serialized in `.storyline` files.
- Make large backup/export behavior clear before users hit confusing browser limits.

**Priority:** Low.

---

### 4. Portable Image Export and Asset Bundling

**Why it matters:**
Users should eventually be able to export portable documents with images, not only expiring cloud URLs or placeholders.

**Current state:**

- HTML/EPUB/Markdown may reference image URLs.
- Cloud image URLs may be signed and expire.
- Local/blob URLs may not be portable.
- DOCX currently degrades images to placeholders.
- Plain text placeholders are acceptable.

**Future hardening should audit:**

- Local asset storage.
- Cloud/Supabase signed URL expiry.
- Image byte fetching.
- CORS/PDF rendering.
- EPUB image bundling.
- DOCX image embedding.
- Markdown asset-folder export.
- HTML asset-folder or base64 export.
- File-size warnings for large exports.

**Recommended product behavior:**

- `.storyline` backup should preserve assets for restore.
- HTML/EPUB/PDF should eventually preserve visible inline images.
- Markdown can use image links or an asset folder.
- DOCX embedded images are desirable but can come later.
- Plain text should keep placeholders only.

**Priority:** Low.

---

### 5. Browser Download Overwrite Friction for Same-Name Exports

**Why it matters:**
On Chrome desktop for Windows, exporting a file with the same name as a recent prior download can trigger a browser-level `Needs permission to download` interruption, even when new filenames work normally.

**Current state:**
Storyline uses normal browser blob downloads for manuscript exports. Repeated same-name exports may hit browser automatic-download or overwrite protection behavior on localhost, which is confusing during testing.

**Future hardening:**

- Reproduce the same-name overwrite/download-permission issue reliably.
- Decide whether the best fix is browser guidance, filename strategy, or an in-app warning.
- Verify behavior across DOCX, PDF, HTML, EPUB, Markdown, and TXT exports.

**Priority:** Low.

---

### 6. Feedback Panel: AI Filter Consistency

**Issue:**
The Feedback panel AI chip currently matches only `anchor_data.type === 'ai-analysis'`.

Feedback saved from the AI Helper panel uses `anchor_data.type === 'ai-feedback'`.

As a result, AI Helper feedback appears under All/Mine but not under the AI filter chip.

**Why it matters:**
Users may expect the AI filter to show all AI-generated feedback, not only Scene Analysis feedback.

**Recommendation:**
Confirm intended product behavior. If the AI chip should include all AI feedback, update the filter, count, and badge logic to include both `ai-analysis` and `ai-feedback`.

**Priority:** Low-Medium.

---

### 7. Feedback Panel: Active Highlight After Resolving Active Comment

**Issue:**
If a comment is resolved while it is the active comment, ProseMirror may recreate the inline comment span and drop the manually applied `.active` class.

**Current behavior:**

- The comment card remains selected.
- The inline text receives the correct resolved styling.
- The stronger active ring/highlight may disappear until the user clicks or jumps to the comment again.

**Recommendation:**
Only fix if this becomes noticeable in manual testing. A possible fix is to reapply active styling after comment status sync, but avoid broad dependencies that cause the effect to run too often.

**Priority:** Low.

---

### 8. Orphaned Local Project Recovery

**Why it matters:**
The 2026-05-06 IndexedDB privacy fix scoped `listLocalProjects()` to the authenticated user by filtering on `project.user_id === currentUserId`. Projects whose stored `user_id` does not match the current user are silently excluded from the library list, and direct URL access to those projects is blocked at `LocalProjectShell` with a "Project not found" screen.

This is the correct privacy behaviour, but it creates an edge case: a user whose local Supabase account was deleted and then re-created with the same email address receives a new Supabase UUID. Their previously stored local projects still carry the old UUID in IndexedDB. After re-registration, those projects become invisible because the stored `user_id` no longer matches. The user's writing is not lost — it is still in IndexedDB on that device — but there is no UI path to find or recover it.

**How this situation arises in practice:**
- User creates local projects, then deletes their account (e.g. during testing).
- User re-registers with the same email — Supabase assigns a new UUID.
- On login, `listLocalProjects(newUserId)` finds zero matches because all stored projects carry the old UUID.
- The projects are silently inaccessible. The user sees an empty library.

This was directly observed during testing in this project (see `SESSION_HANDOVER.md`, entry 2026-05-06).

**What is in IndexedDB:**
The `projects` object store in the `storyline-local-projects` database (v4+) has a `user_id` index. Records with a non-matching `user_id` are untouched — they are not deleted. A recovery flow can safely query them.

**Recommended implementation when prioritised:**

1. After `listLocalProjects(currentUserId)` returns, run a secondary query for projects whose `user_id` is null or does not match `currentUserId` (use `getAllLocalRecords` and filter). Call this the "orphaned" set.
2. If orphaned projects exist, show a dismissible banner in the library: *"We found [N] project(s) saved on this device under a different account. Would you like to review them?"*
3. Open a modal listing orphaned projects (title, type, last accessed). Let the user claim individual projects (which rewrites `user_id` to the current user) or dismiss/delete them.
4. Claiming must be explicit — never auto-claim silently. Auto-claiming could expose one user's work to another on a legitimately shared device.
5. Implement claiming as a single `updateLocalProject(id, { user_id: currentUserId })` call — no migration complexity.

**Do not implement yet unless users actually report invisible local projects.** The silent exclusion is the correct default. Only build the recovery flow if there is real demand — it adds UI complexity and the shared-device case means auto-claiming is genuinely unsafe.

**Cross-reference:** `SESSION_HANDOVER.md` — entry 2026-05-06. `lib/persistence/local-db.ts` — `DB_VERSION = 4`, `user_id` index on `projects` store. `lib/persistence/local-projects.ts` — `listLocalProjects(currentUserId)`. `components/project/local/LocalProjectShell.tsx` — `'forbidden'` status state.

**Priority:** Low — trigger only if users report invisible local projects after the v4 DB upgrade.

---

## Notes on moved items

The previous `Future Plans — Editor, Fonts, and Proofing` section was moved to `docs/future-roadmap.md` because those items are user-facing feature ideas, not technical debt.

The previous Help System Feature Audit & Rewrite plan was also moved to `docs/future-roadmap.md` because it is a future product/help-content project rather than engineering debt.
