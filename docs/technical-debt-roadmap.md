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

### 3. API Key Storage Hardening

**Why it matters:**
Storyline supports user-provided AI provider keys. Those keys are already masked from the client and protected by database access controls, but storage should be hardened before a wider public rollout.

**Risk if ignored:**
If privileged database access or a future server-side bug exposed stored credential rows, user-provided provider keys would have less defense-in-depth than they should.

**Current state:**
A security audit confirmed that user API keys are protected by RLS/masking and are not exposed to the frontend, but they are still stored in the database as standard text values rather than through app-level encryption or a dedicated secrets/vault mechanism.

**Future hardening:**

- Evaluate Supabase Vault, pgsodium, or app-level encryption using server-only key material.
- Keep user-facing API key values write-only/masked in the UI.
- Confirm auth/session payloads never include raw provider keys.
- Add a migration plan that avoids breaking existing saved keys.
- Add tests for create, update, read-for-server-use, masked-read-for-client, and delete flows.

**Priority:** High before broad public rollout with real user-provided provider keys.

---

### 4. Robust Retry and Initialisation Patterns

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

### 5. AI Trial Reconciliation and RPC Failure Handling

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

### 6. ~~Migration Upload Bypasses Storage Quota Check~~ — RESOLVED 2026-05-07

**Fixed in:** `app/api/migration/upload-asset/route.ts`

`/api/migration/upload-asset` now calls `check_storage_quota` (with the authenticated user client) after decoding the base64 payload — at the point where file size is known — and before the admin storage upload. Returns 413 with a human-readable quota error if the upload would exceed quota.

**Known limitation (by design):** During a multi-asset migration, `project_assets` rows are only inserted after all uploads complete (for atomicity). So `storage_used_bytes` during the upload loop reflects pre-migration usage, not the running total of the current batch. The per-asset check still blocks users already at/over quota and prevents any single large file from independently exceeding the remaining space. Full batch-aware pre-flight checking would require summing all asset sizes in `local-to-cloud.ts` before starting uploads — a future improvement if large-batch migrations become common.

---

### 7. AI Abuse Controls Hardening

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

### 5. Admin AI Settings and Trial Entitlement Visibility

**Why it matters:**
The admin dashboard is currently useful for broad AI/trial monitoring, but it does not expose every account-state detail now supported by AI settings. That can make real entitlement bugs harder to spot, especially around OAuth-created accounts, BYOK/Ollama users, fallback provider usage, and OpenRouter configuration.

**Risk if ignored:**
Admin may report incomplete or confusing AI state. A user can have valid AI settings but still be hard to reason about from admin if trial entitlement, current billing mode, context mode, fallback provider, OpenRouter model, and provider key presence are not shown together.

**Current state:**
The Google OAuth free-trial grant path has been fixed in `app/api/auth/callback/route.ts`, with a retest row added to `TESTING.md`. The remaining admin concerns are visibility gaps, not confirmed user-facing crashes.

**Future hardening:**

- Show `ai_context_mode`, fallback provider, OpenRouter model, and per-provider API-key presence in admin without exposing key values.
- Separate "trial entitlement/account health" from "current AI mode/provider" so BYOK/Ollama users with valid trial accounts are not misread.
- Consider an admin view built from all users/profiles with left joins to `user_api_keys` and `ai_trial_accounts`, so missing, disabled, or ungranted trial rows are visible instead of silently absent.
- Label fallback usage clearly when the saved billing mode is local/BYOK but a cloud backup provider handled a request.
- Keep the known OpenRouter usage-event constraint issue documented in troubleshooting and only escalate it if admin usage rows go missing in a real test.

**Priority:** Medium.

---
