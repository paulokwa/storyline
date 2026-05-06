# Session Handover

This file records the current project state at the end of each AI coding session.

Agents should update this file before ending a session.

---
## 2026-05-06 - Future roadmap note for feedback review status

### Current branch

`main`

### What was completed

- Added a clear future-roadmap note to `docs/future-roadmap.md` explaining why the admin dashboard currently says review status is not available yet.
- Documented that the current `feedback_responses` schema does not include a `status` column, so the dashboard can read responses but cannot yet mark them as `new`, `reviewed`, `planned`, or `dismissed`.
- Recorded the recommendation to keep this as future work unless survey volume grows enough to justify a lightweight admin triage workflow.
- Listed the preferred minimal follow-up scope for a later implementation:
  - add a `status` column
  - keep status editing admin-only
  - add simple dashboard filters
  - avoid expanding it into a full support desk or public roadmap system

### Files changed

- `docs/future-roadmap.md`
- `SESSION_HANDOVER.md`

### Current status

The future roadmap now clearly explains that response review status is deferred product workflow, not a launch blocker.

### Next recommended step

Keep using the current admin feedback reader as-is. Revisit status tracking only if response volume makes manual triage difficult.

### Risks or warnings

- This is documentation only. No schema or admin-dashboard behavior changed in this step.

---
## 2026-05-06 - Admin dashboard quick links and clearer feedback-status copy

### Current branch

`main`

### What was completed

- Clarified the feedback-reader copy in the admin dashboard.
- Replaced the vague badge text `Status tracking not in schema yet` with `Review status not available yet`.
- Expanded the explanatory helper copy so it states plainly that the current `feedback_responses` table has no `status` column, which is why the dashboard cannot yet mark responses as `new`, `reviewed`, `planned`, or `dismissed`.
- Added a new `Developer Test Routes` card to the existing admin dashboard with direct links for:
  - `/admin/survey-preview`
  - `/welcome?preview=1`
  - `/dev/showcase`
- Kept the implementation inside the existing admin dashboard instead of creating another tools page, so the owner can jump to common preview routes without copying and pasting URLs.

### Files changed

- `app/(app)/admin/page.tsx`
- `TESTING.md`
- `SESSION_HANDOVER.md`

### Current status

The admin dashboard now explains the missing feedback-status capability in plain language and includes direct launch buttons for the most useful test/preview routes.

### Next recommended step

1. Open `/admin`.
2. Confirm the `Developer Test Routes` card is visible near the top.
3. Click each route button and confirm it opens the expected page.
4. Confirm the feedback section wording now clearly explains that review status is unavailable because the current table has no `status` column.

### Risks or warnings

- `/welcome?preview=1` only bypasses the normal onboarding redirect in development, matching the existing preview behavior.
- Repo-wide `npx tsc --noEmit --pretty false` is still expected to hit the same unrelated `impeccable/*` Astro/Vite fixture errors.

---
## 2026-05-06 - Admin-only survey preview route

### Current branch

`main`

### What was completed

- Added an admin-only survey preview route at `app/(app)/admin/survey-preview/page.tsx`.
- Reused the existing admin email gate instead of exposing any public or general-user survey test path.
- Added `previewMode` support to `components/survey/LaunchSurveyModal.tsx`.
- In preview mode, the modal reuses the real survey flow but does **not** write `storyline_survey_v1` to local storage on dismiss or success, so testing does not consume the normal one-time survey behavior in the library.
- Added `components/survey/SurveyPreviewPage.tsx` as a small client wrapper that:
  - opens the real survey modal on load
  - lets the owner close and reopen it repeatedly
  - includes a one-click helper to clear the local survey flag manually while testing
- Documented the route in `docs/developers.md`.
- Added a manual browser test row for the new preview route in `TESTING.md`.

### Files changed

- `components/survey/LaunchSurveyModal.tsx`
- `components/survey/SurveyPreviewPage.tsx`
- `app/(app)/admin/survey-preview/page.tsx`
- `docs/developers.md`
- `TESTING.md`
- `SESSION_HANDOVER.md`

### Current status

Admins now have a repeatable survey test path at `/admin/survey-preview` that should not interfere with the normal survey popup lifecycle for regular users.

Preview-mode behavior is intentionally scoped:
- the normal library nudge logic is unchanged
- the normal help-triggered survey flow is unchanged
- successful preview submissions still post real rows to `feedback_responses`
- preview close/success does not set the normal local storage completion/dismissal flag

### Next recommended step

1. Open `/admin/survey-preview` as an approved admin.
2. Close and reopen the modal to confirm preview mode is repeatable.
3. Confirm `localStorage.storyline_survey_v1` is not changed by preview-mode dismiss or success.
4. Submit a preview response after the Supabase migration is applied and confirm it appears in `feedback_responses`.

### Risks or warnings

- Preview mode avoids the normal local storage writes, but successful test submissions still create real survey rows in the database by design.
- Repo-wide `npx tsc --noEmit --pretty false` is still expected to hit the same pre-existing unrelated `impeccable/*` Astro/Vite fixture errors.

---
## 2026-05-06 - Admin dashboard feedback reader

### Current branch

`main`

### What was completed

- Extended the existing admin dashboard at `app/(app)/admin/page.tsx` instead of creating a separate admin area.
- Re-inspected the current admin access pattern, survey route, launch survey modal, and the `feedback_responses` migration before implementation.
- Added a new `feedback` payload to `getAdminDashboardData()` in `lib/admin-dashboard.ts`.
- The admin dashboard now fetches survey responses from `feedback_responses`, orders them newest-first, counts total responses, and maps `user_id` values back to auth emails when available.
- Added a new `Feedback & Survey Responses` section to the existing admin page showing:
  - total response count
  - recent responses table
  - use-case and satisfaction answers
  - free-text message
  - page path, project count, app version, and user agent
  - simple query-param filters for search, use-case, and satisfaction
- Added safe missing-table handling. If `feedback_responses` is not available yet, the admin page keeps rendering and shows an admin-only warning instructing the owner to apply `supabase/migrations/20260504_feedback_responses.sql`.
- Did not touch the full feedback page EmailJS flow.
- Did not wire survey popup responses to email.
- Did not add public routes or expose survey data outside the existing admin gate.

### Files changed

- `app/(app)/admin/page.tsx`
- `lib/admin-dashboard.ts`
- `TESTING.md`
- `SESSION_HANDOVER.md`

### Current status

The existing admin dashboard now includes a simple feedback reader for launch survey responses.

Important schema note:
- Generated Supabase types still do **not** include `feedback_responses`.
- This implementation uses the same temporary `any`-cast pattern already used in `app/api/survey/route.ts`.
- After the migration is applied in Supabase, regenerate Supabase types so the temporary cast can be removed.

Important schema limitation:
- The current migration does **not** include `status`, `project_type`, `writing_mode`, or `ai_state`.
- Because those fields do not exist in the actual schema inspected here, the admin dashboard does not invent them and does not implement status editing.

I still could not confirm from this session whether `supabase/migrations/20260504_feedback_responses.sql` has been applied in the linked Supabase project, because this environment still has no live DB access (no Supabase CLI, no Supabase MCP connector, no loaded server credentials).

### Next recommended step

1. Confirm the linked Supabase project has the `feedback_responses` table. If not, open the Supabase dashboard SQL editor and run `supabase/migrations/20260504_feedback_responses.sql`.
2. Sign in as an approved admin and open `/admin` to verify the new feedback section renders.
3. Validate both admin outcomes:
   - with the table present and sample rows
   - with the table missing / migration unapplied
4. If product-owner workflow needs reviewed/planned/dismissed tracking later, add that in a separate migration plus admin-only update path rather than inferring a fake status now.

### Risks or warnings

- Repo-wide `npx tsc --noEmit --pretty false` is still blocked by pre-existing unrelated `impeccable/*` fixture and missing Astro/Vite dependency errors; no new errors from `app/(app)/admin/page.tsx` or `lib/admin-dashboard.ts` appeared in the TypeScript output.
- The admin feedback table currently loads the newest 50 responses plus a separate total count, which is intentional for a lightweight owner inbox.

---
## 2026-05-06 - Launch Survey failure handling fix

### Current branch

`main`

### What was completed

- Investigated the launch survey popup flow after confirming it is intended to save to Supabase `feedback_responses`, not send email.
- Re-inspected `app/api/survey/route.ts` and `components/survey/LaunchSurveyModal.tsx`.
- Fixed `LaunchSurveyModal.tsx` so the modal now checks `response.ok` before treating the submission as successful.
- The survey now:
  - sets `storyline_survey_v1` to `'completed'` only after a successful `/api/survey` response
  - shows the existing success toast only after a successful `/api/survey` response
  - shows `Survey could not be saved. Please try again.` if the API returns an error or the request fails
  - stays open on failure so the user is not silently dismissed out of an unsaved survey
- Left the separate full feedback page EmailJS/mailto flow untouched.
- Updated `TESTING.md` manual validation notes for both the success path and the failure/missing-table path.

### Files changed

- `components/survey/LaunchSurveyModal.tsx`
- `TESTING.md`
- `SESSION_HANDOVER.md`

### Current status

The misleading success behavior is fixed in the popup survey UI. Static code inspection confirms the modal no longer marks the survey completed on non-OK responses.

I could not confirm whether `supabase/migrations/20260504_feedback_responses.sql` has been applied in the linked Supabase project from this session because there is no live DB access here (no Supabase CLI, no MCP Supabase connector, and no loaded server credentials in the shell).

### Next recommended step

1. Confirm the migration is applied in the linked Supabase project. Manual step if not: open the Supabase dashboard SQL editor for the linked project and run the SQL from `supabase/migrations/20260504_feedback_responses.sql`.
2. Browser-test the success path: submit the survey with `feedback_responses` present, confirm the success toast appears, confirm `storyline_survey_v1` becomes `'completed'`, and confirm the row appears in Supabase.
3. Browser-test the failure path: simulate a missing table or other `/api/survey` failure, confirm the error toast appears, confirm `storyline_survey_v1` is not set to `'completed'`, and confirm the modal does not pretend the survey was saved.

### Risks or warnings

- The route still uses the intentional `any` cast against `feedback_responses` until Supabase types are regenerated after the migration is applied.
- Live migration status for the linked Supabase project remains unverified from this environment.

---
## 2026-05-06 - Entity Tab Polish: A11y, Dark Mode, Copy, Visual Pass

### Current branch

`main`

### What was completed

A four-part polish pass across the Characters, Locations, Objects, and Ideas planning tabs.

**Part 1 — Accessibility fixes**
- Added `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space to select, Escape on rename input) to Draggable list items in Locations, Objects, and Ideas (Characters already had these).
- Added `aria-label="Cancel deletion"` and `aria-label="Confirm delete [entity]"` to the inline delete-confirm Yes/No buttons across all four tabs.
- Wrapped Locations, Objects, and Ideas (plus Characters) non-empty returns in `TooltipProvider`. IdeasTab and CharactersTab were previously missing the wrapper import and JSX element.

**Part 2 — Midnight/dark mode**
- Added ~130 lines of `[data-theme='midnight']` CSS rules to `app/globals.css` targeting CSS class names on the tab shell, sidebar, mobile bar, primary panel, and secondary panel elements.
- New class names added to JSX to enable targeting: `characters-tab-primary-panel`, `locations-tab-primary-panel`, `ideas-tab-primary-panel` (the white content cards that had no prior class names).
- Existing class names already present: `characters-tab-shell`, `characters-tab-detail`, `characters-tab-sidebar`, `characters-tab-mobilebar`, `characters-tab-secondary-panel`; equivalent names on other tabs; `objects-tab-description-card`, `objects-tab-significance-card`.

**Part 3 — Copy cleanup**
- Sidebar section headers: "Book Characters" → "Characters", "Dramatis Personae" → "Cast List", "World Locations" → "Locations", "Items & Artefacts" → "Objects", "Idea Archive" → "Ideas".
- Row sub-labels: standardized to "Character" / "Location" / "Object" / "Idea" across all tabs.
- Save state text: standardized to "Saving…" / "Saved" / "All changes saved" across all tabs.
- Fixed "Ref Reference" → "Ref" in LocationsTab reference field label.
- Fixed "The Armoury is Silent" → "No Objects Yet" as the Objects empty-state headline.

**Part 4 — Visual polish**
- Section header contrast: `text-stone-300` → `text-stone-500` and icon `text-stone-200` → `text-stone-400` across all section headers in all four tabs; also removed `/60` opacity from Characters helper text paragraphs (`text-stone-400/60` → `text-stone-400`).
- Removed `text-justify` from Ideas editor (`editorClassName="italic text-justify"` → `editorClassName="italic"`).
- Add button icon colors unified to `text-[#546354]/60` across all tabs (was `text-emerald-400/60` in Locations, `text-blue-400/60` in Objects, `text-amber-500/40` in Ideas).
- Rename action button hover unified to Sanctuary Green (`hover:border-[#546354]/20 hover:bg-[#546354]/5 hover:text-[#546354]`) across Locations, Objects, and Ideas (Characters was already correct).
- Objects significance panel: added `bg-[#fcfbf9]/60` to `objects-tab-significance-card` to match the secondary panel style used in all other tabs.

### Files changed

- `components/project/characters/CharactersTab.tsx`
- `components/project/locations/LocationsTab.tsx`
- `components/project/objects/ObjectsTab.tsx`
- `components/project/ideas/IdeasTab.tsx`
- `app/globals.css`

### Current status

All changes complete. No TypeScript type changes were made (class names and aria attributes only). No business logic, database, routing, or save logic was touched.

### Next recommended step

Browser smoke test across both Sanctuary and Midnight themes:

1. Keyboard: Tab to a list item in each tab, confirm focus ring visible; press Enter to select; press Space to select. Press Escape in a rename input to cancel.
2. Accessibility: Trigger a delete flow and confirm the Yes/No buttons are reachable by keyboard and have sensible aria-labels (check with screen reader or DevTools accessibility tree).
3. Dark mode (Midnight): Switch theme and verify all four tabs show dark backgrounds, correct sidebar, no white/cream card flashes.
4. Copy: Confirm sidebar headers, row labels, save state text, and empty state copy match the updated strings.
5. Visual: Confirm section headers are legible, add button icons are green/neutral across tabs, rename hover is green in all tabs, Objects significance panel has the faint warm background.

### Risks or warnings

- Midnight CSS rules use `!important` to override hard-coded hex values in JSX; these are scoped to `[data-theme='midnight']` so they will not affect Sanctuary or any other theme.
- If new entity tabs are added in future, they will need equivalent midnight CSS rules added to `globals.css`.

---
## 2026-05-06 - Signup verification callback privacy fix

### Current branch

`main`

### What was completed

- Investigated a privacy-sensitive auth report: opening a signup verification email while another user was already signed in could fall back into the existing browser session, making it look like the verification link opened someone else's account.
- Confirmed there was no matching entry in `TROUBLESHOOTING.md`, then traced the issue to the generic callback flow in `app/api/auth/callback/route.ts`, which only attempted `exchangeCodeForSession(code)` and otherwise sent the user into a generic invalid-token path.
- Updated `app/api/auth/signup/route.ts` so signup emails now redirect to `api/auth/callback?intent=signup&next=/library`, allowing the callback route to distinguish signup verification from other auth flows.
- Updated `app/api/auth/callback/route.ts` to:
  - sanitize the `next` destination
  - detect signup callbacks via `intent=signup`
  - clear a stale invalid-refresh-token local session if present
  - clear an already-active local session when a signup callback fails, so the browser does not simply fall back into another user's existing account
  - redirect signup verification failures to the login page with explicit verification status instead of a generic invalid-token response
- Updated `app/(auth)/login/page.tsx` to read `verification` query params and show a clear banner for reused/expired signup verification links.
- Added a reusable troubleshooting entry and test-tracker rows for this auth callback issue.

### Files changed

- `app/api/auth/signup/route.ts`
- `app/api/auth/callback/route.ts`
- `app/(auth)/login/page.tsx`
- `TROUBLESHOOTING.md`
- `TESTING.md`

### Current status

Implementation is complete and type-safe. Static verification passed with `npx tsc --noEmit --pretty false`.

### Next recommended step

Manual browser verification for the exact auth edge cases:

1. Sign in as User B.
2. Open User A's fresh signup verification email in the same browser and confirm the app does not remain in User B's account.
3. Click the same User A verification link a second time and confirm the login page shows the reused-link guidance.
4. Confirm a normal fresh signup verification still lands in the correct signed-in account and opens the library.

### Risks or warnings

- This fix is intentionally scoped to signup verification callbacks. Password-reset behavior is unchanged and still uses the existing `/reset-password` flow.
- The reused-link message is based on the callback failure path for signup verification links. Supabase's auth-code failure response does not distinguish every expired-vs-already-used case perfectly, so the UI copy intentionally says "already used or has expired" while still telling the user to sign in if they already verified.

---
## 2026-05-06 - Welcome Onboarding Redesign (2-Step Flow)

### Current branch

`main`

### What was completed

Redesigned the Welcome onboarding page (`/welcome`) from a single dense screen into a calm 2-step click-through flow.

**File changed:** `components/app/StorageFirstOnboarding.tsx` only.

**Step 1 — Welcome:** Spacious screen with a warm heading ("Welcome to Storyline, [name]."), two short body paragraphs orienting the user, and a single Continue button. No storage cards visible at this step.

**Step 2 — Choose storage:** Existing storage choice UI retained and polished. Title changed to "Choose how new projects should start." Body copy updated to plain language (no backend terms). Cards updated: "Start Private" copy simplified to "Keep new projects on this device by default." "Start with Cloud & Collaboration" copy updated to "Create new projects online from the start, ready for cloud access and collaboration." Sticky bar helper updated to "You can change this later from Project Settings."

**Back navigation:** Step 2 has a Back button that returns to Step 1 via local `step` state — no page navigation or routing change.

**Accessibility:** Added `aria-pressed` to storage option card buttons. Added a `Check` icon (filled circle) as a non-colour-only selected indicator; `aria-hidden="true"` on the icon since `aria-pressed` conveys the selected state. Added `focus-visible:ring` on storage cards with theme-appropriate ring colour.

**Removed:** `ShieldCheck` import and helper panel (its content is absorbed into card helpers and the sticky bar). All user-facing "Supabase" references removed (none remained in prior version either).

**Unchanged:** `handleContinue`, `/api/onboarding/complete`, API payload (`preferredStorageMode`), the two storage options, routing, auth, database logic.

**TypeScript:** `npx tsc --noEmit` — zero errors.

### Files changed

- `components/app/StorageFirstOnboarding.tsx`

### Current status

Complete and type-safe. The planning report was approved by the user before implementation began.

### Next recommended step

Browser smoke test at `/welcome?preview=1`:

1. Confirm Step 1 shows welcome heading + two paragraphs + Continue button only (no cards).
2. Click Continue — Step 2 fades in with storage cards.
3. Confirm "Start Private" is pre-selected with a filled checkmark badge.
4. Switch to "Start with Cloud & Collaboration" — checkmark and sticky bar label update.
5. Tab through cards, confirm focus ring visible.
6. Click Back — returns to Step 1.
7. Click Continue to Library — POST fires to `/api/onboarding/complete` and redirects to `/library`.
8. Repeat in Midnight mode.

### Risks or warnings

None. No business logic, routing, API, or database changes were made.

---
## 2026-05-06 - IndexedDB Local Project Privacy Fix (User Scoping)

### Current branch

`main`

### What was completed

**Privacy investigation:** A user reported seeing different library states while logged into the same email on both localhost:3000 and the production site. Investigation via Supabase MCP confirmed two separate accounts existed (different emails, same Supabase project), and that all visible projects carried the `LOCAL ONLY` badge. Root cause was a browser Same-Origin Policy boundary: `localhost:3000` and the production domain maintain completely separate IndexedDB stores. Projects created on one origin are invisible on the other regardless of which account is logged in.

**Privacy bug confirmed and fixed:** During investigation a second problem was found. `listLocalProjects()` in `lib/persistence/local-projects.ts` called `getAllLocalRecords()` with no `user_id` filter. Local projects in IndexedDB are scoped to the browser origin — not to any user account. This meant that on a shared device or shared browser profile, any signed-in user could see and open every local project created by any other user on the same origin. The `user_id` field was written into each project record at creation time but was never read back as a filter.

**Changes made:**

- **`lib/persistence/local-db.ts`** — Bumped `DB_VERSION` from 3 to 4. Refactored `onupgradeneeded` to be version-aware using `event.oldVersion` guards. Version 4 upgrade adds a `user_id` index to the `projects` object store, covering both fresh installs and existing v3 databases migrating to v4 (index added via the versionchange transaction). Added `getLocalRecordsByUserId()` for future use against the new index.

- **`lib/persistence/local-projects.ts`** — `listLocalProjects(currentUserId: string)` now requires a user ID and post-filters results to `p.user_id === currentUserId`. Projects with a non-matching or null `user_id` are excluded silently (not exposed to any account).

- **`components/library/ProjectGrid.tsx`** — Passes `currentUserId` (already a prop) into `listLocalProjects()`.

- **`lib/backup/import-local-backup.ts`** — `getLibraryImportOptions(backup, currentUserId)` now requires and threads through the user ID.

- **`components/library/OpenProjectButton.tsx`** — Passes `currentUserId` (already a prop) into `getLibraryImportOptions()`.

- **`components/project/local/LocalProjectShell.tsx`** — Added a `'forbidden'` status state. After fetching a local project by ID, if `localProject.user_id !== currentUserId` the shell sets `status = 'forbidden'` and renders a neutral "Project not found" screen — blocking direct URL access to another user's local project. `currentUserId` added to the `useEffect` dependency array.

**TypeScript:** `npx tsc --noEmit` passes with zero errors (stale `.next` artifacts cleared first).

### Files changed

- `lib/persistence/local-db.ts`
- `lib/persistence/local-projects.ts`
- `components/library/ProjectGrid.tsx`
- `lib/backup/import-local-backup.ts`
- `components/library/OpenProjectButton.tsx`
- `components/project/local/LocalProjectShell.tsx`

### Current status

Fix is complete and type-safe. Local projects are now scoped to the authenticated user both at list level and at direct URL access level.

**Legacy / orphaned projects:** Any project whose stored `user_id` does not match the current user is silently excluded from the list. This affects projects that pre-date this fix where the stored `user_id` is null or belongs to a different (possibly deleted and recreated) account. These records remain in IndexedDB untouched. A future recovery flow has been documented in `docs/technical-debt-roadmap.md` — see "Orphaned Local Project Recovery."

### Next recommended step

Manual validation on localhost:
1. User A creates a local project, logs out.
2. User B logs in on the same browser — library must show zero of User A's projects.
3. User B navigates directly to User A's project URL — must see "Project not found."
4. User A logs back in — must see their project as before.
5. Cloud projects must remain unaffected throughout.

### Risks or warnings

- The `user_id` index in the DB requires a version upgrade. The first time the app opens after this deploy, IndexedDB will run `onupgradeneeded` (v3→v4). For users with existing local projects this is transparent — the index is added to the existing data, no records are rewritten.
- The orphaned-project exclusion is silent. If any real user has a project that was created under a previous account (e.g. test account deleted and re-registered with same email, resulting in a new Supabase UUID), they will see an empty library for those projects. The recovery path is tracked in technical debt. No user-facing guidance is shown yet.

---
## 2026-05-05 - Midnight Theme Readability Pass: Feedback, AI Partner, Manuscript View, Scene Gallery, Notifications

### Current branch

`main`

### What was completed

- **Feedback page dropdown midnight fix (`app/feedback/page.tsx`):** FeedbackSelect now uses `useTheme` and explicit high-contrast colors (`bg-[#1e293b]/95` midnight / `bg-white/95` light) with `backdrop-blur-sm`, matching the ShareModal pattern. Dropdown is no longer transparent/themed-invisible in midnight mode.

- **AI Partner SanctuarySelect midnight fix (`components/ui/sanctuary-select.tsx`):** Added `useTheme`/`isMidnight` to the shared SanctuarySelect component. Trigger uses `bg-slate-800/90`, content uses `bg-slate-800`, items use `bg-slate-700` selected / `text-slate-300` default. Fixes all AI partner dropdowns (mode selector, save-category picker) at once.

- **AiHelperPanel midnight fixes (`components/project/story/AiHelperPanel.tsx`):** Mode selector `triggerClassName`, context buttons (desktop + mobile), context section backgrounds, summary chips, selected node chips, and context manager open/closed sections all updated with `isMidnight` conditional dark colors.

- **SaveAiResponseModal midnight fix (`components/project/ai/SaveAiResponseModal.tsx`):** Added `useTheme`/`isMidnight`. Dialog content, labels, inputs, prose metadata section, cancel button, and SanctuarySelect triggerClassName all updated with dark colors.

- **Manuscript View panel midnight fix (`components/project/story/SceneEditor.tsx`):** Both desktop and mobile manuscript view panels updated — panel shell, header, section cards, toggle groups, option buttons (selected/unselected), close button, and info banner all use `isMidnight` dark colors.

- **Scene Assets Panel midnight fix (`components/project/story/SceneAssetsPanel.tsx`):** Added `useTheme`/`isMidnight`. Panel shell, header, empty state, asset thumbnails, add button, tip boxes, and the full selector overlay all use dark colors.

- **Full screen notification page midnight fix:**
  - `components/project/local/LocalTransferGuidance.tsx` — Added `useTheme`/`isMidnight`. Section bg, dismiss button, icon, heading, description, and action buttons all use dark colors.
  - `components/notifications/NotificationDetailClient.tsx` — Improved card bg (`bg-[#1a2234]`), icon bg (`bg-slate-800/60`), body bg (`bg-slate-800/50`) for better midnight readability.
  - `app/(app)/layout.tsx` — Changed `bg-slate-50` to `bg-background` to eliminate the white/gray page area around notification detail and all other app pages in midnight mode.

- **Created `docs/developers.md`** with developer test routes table (`/welcome?preview=1`, `/dev/showcase`).

### Files changed

- `app/feedback/page.tsx`
- `components/ui/sanctuary-select.tsx`
- `components/project/story/AiHelperPanel.tsx`
- `components/project/ai/SaveAiResponseModal.tsx`
- `components/project/story/SceneEditor.tsx`
- `components/project/story/SceneAssetsPanel.tsx`
- `components/project/local/LocalTransferGuidance.tsx`
- `components/notifications/NotificationDetailClient.tsx`
- `app/(app)/layout.tsx`
- `docs/developers.md` — NEW

### Current status

All changes complete. Build compiled successfully (pre-existing `astro:content` error only in `./impeccable/site/content.config.ts` — unrelated).

### Next recommended step

Manual browser validation for each fixed area in both Sanctuary and Midnight themes:
1. Feedback page select dropdowns in midnight — confirm readable text on dark background
2. AI Partner mode selector dropdown in midnight — confirm dark dropdown, not white
3. Manuscript View panel (desktop + mobile) in midnight — confirm dark theme throughout
4. Scene Gallery/Assets panel in midnight — confirm no white elements
5. Notification detail page — confirm no white/gray page background around the card
6. Save AI Response modal — confirm dark inputs and labels

### Risks or warnings

- All midnight fixes use conditional `cn()` with `isMidnight` — light theme is untouched.
- The `(app)/layout.tsx` change from `bg-slate-50` to `bg-background` affects ALL app pages, not just the notification page. Verify no unexpected visual regression in sanctuary mode for library, settings, stats, and other pages.

---
## 2026-05-04 - In-App Launch Survey

### Current branch

`main`

### What was completed

- **Supabase migration written:** `supabase/migrations/20260504_feedback_responses.sql` — creates `feedback_responses` table with RLS allowing authenticated insert and self-select. **Manual step required: Kwame must apply this migration in the Supabase dashboard before survey submissions will work.**

- **API route:** `app/api/survey/route.ts` — POST handler, validates auth, sanitises all inputs, auto-captures `user_agent`. Table name cast to `any` until generated types are regenerated post-migration.

- **LaunchSurveyModal (`components/survey/LaunchSurveyModal.tsx`):** 3-step modal (use case → satisfaction → free-text). Step 3 has Skip and Send. On submit/skip: posts to `/api/survey`, sets `localStorage` key `storyline_survey_v1` to `'completed'`, shows success toast. Dismiss X sets key to `'dismissed'`. Dynamically imported where used.

- **FeedbackNudge (`components/survey/FeedbackNudge.tsx`):** Dismissible banner at bottom of library. Reads `localStorage` on mount — only renders if key is absent and `projectCount >= 1`. "Share thoughts" button opens the modal; X sets `'dismissed'`.

- **Library wired:** `app/(app)/library/page.tsx` imports `FeedbackNudge` and passes `projects.length` as `projectCount`.

- **HelpTab wired:** `components/project/help/HelpTab.tsx` Quick Links sidebar now includes a permanent `Share feedback` button that opens `LaunchSurveyModal`. Works in both `project` and `global` modes.

- **TypeScript:** Clean (`npx tsc --noEmit --pretty false` exit 0).

### Files changed

- `supabase/migrations/20260504_feedback_responses.sql` — NEW
- `app/api/survey/route.ts` — NEW
- `components/survey/LaunchSurveyModal.tsx` — NEW
- `components/survey/FeedbackNudge.tsx` — NEW
- `app/(app)/library/page.tsx` — added `FeedbackNudge` import and render
- `components/project/help/HelpTab.tsx` — added survey modal + Share Feedback button

### Current status

All code complete. TypeScript clean. **Migration not yet applied to Supabase — required before survey data is saved.**

### Next recommended step

1. **Apply migration:** In the Supabase dashboard, run the SQL in `supabase/migrations/20260504_feedback_responses.sql`.
2. **Browser validation:**
   - Library nudge: sign in with ≥1 project → confirm banner appears → dismiss → confirm gone → reload → confirm absent.
   - Survey flow: click "Share thoughts" or "Share feedback" in Help → complete all 3 steps → confirm success toast → check `feedback_responses` table in Supabase.
3. After migration, regenerate Supabase types (`npx supabase gen types typescript --linked`) so the `any` cast in `route.ts` can be removed.

### Risks or warnings

- The `any` cast in `app/api/survey/route.ts` is intentional and safe — it will be removed after types are regenerated post-migration.
- Survey nudge uses only `localStorage` for deduplication (no server-side check). If a user clears storage, they will see the nudge again. This is acceptable for a launch survey.
- All prior changes from this session (auth fix, AI Partner rename, Scene Analysis polish, AI FEEDBACK bucket fix, delete sync) are documented in the entry above.

---
## 2026-05-04 - Auth Fix, AI Partner Rename, Scene Analysis UX Polish, and Delete Sync

### Current branch

`main`

### What was completed

- **AuthApiError stale-token fix (`lib/supabase/auth.ts`):** `getVerifiedUser()` previously only silenced `AuthSessionMissingError`. Added detection of `AuthApiError` with messages `'Invalid Refresh Token'` / `'Refresh Token Not Found'`. When matched: calls `supabase.auth.signOut({ scope: 'local' })` to clear the stale cookie silently and returns `null`. Eliminates noisy console errors on showcase page load for users with expired sessions. Entry added to `TROUBLESHOOTING.md`.

- **First AI Partner use notice standalone (`AiHelperPanel.tsx`):** The first-use notice was rendering inside the AI Context Preview panel. Removed `setPreviewOpen(true)` from the first-use trigger; notice now renders independently at the same absolute position regardless of whether the preview panel is open.

- **"Add to AI Partner" rename (`SceneAnalysisPanel.tsx`):** All instances of "Add to Assistant" and "Added to Assistant" renamed to "Add to AI Partner" / "Added to AI Partner" for consistency. Applies to analysis section items and suggestions.

- **AI FEEDBACK bucket fix (`lib/persistence/project-content.ts`):** The `projectAiFeedback` query was filtering by `.eq('type', 'analysis_feedback')` but saves use `type: 'analysis'` (the only valid DB enum value). Changed query to `.eq('action', 'analysis_feedback')` — the correct discriminator. Items from Scene Analysis now land in the AI FEEDBACK bucket, not IDEAS.

- **AI Memory integration confirmed for Scene Analysis items:** `loadSavedResponses()` uses `getAiResponses()` with no type/action filter, so analysis items already appear in AI Memory. No code change needed.

- **Delete sync (`SavedResponsesTab.tsx`):** `deleteResponse()` now calls `router.refresh()` (from `next/navigation`) after soft-delete so the AI Partner context panel re-fetches on next navigation. Added `useRouter` import.

- **Toast copy updated:** Scene Analysis "Add to AI Partner" success toast now reads "Saved to AI Partner & AI Memory" with a description pointing users to both locations.

- **Tooltip rename (`StoryTab.tsx`):** `aria-label` and `TooltipContent` for the Scene Analysis icon changed from `'Analyze this scene'` to `'Scene Analysis'` for both book and screenplay project types.

- **AI Partner empty-state copy:** Updated the hint text to `'Use "Add to AI Partner" in the Scene Analysis tool.'` to match the new button label.

### Files changed

- `lib/supabase/auth.ts` — stale-token silent cleanup
- `components/project/story/AiHelperPanel.tsx` — first-use notice standalone, empty-state copy
- `components/project/story/SceneAnalysisPanel.tsx` — "Add to AI Partner" rename, toast copy
- `lib/persistence/project-content.ts` — query filter `.eq('action', 'analysis_feedback')`
- `components/project/SavedResponsesTab.tsx` — `router.refresh()` after delete
- `components/project/story/StoryTab.tsx` — tooltip label "Scene Analysis"
- `TROUBLESHOOTING.md` — new entry for AuthApiError invalid refresh token

### Current status

All changes complete. TypeScript clean. Manual browser validation still needed (see Testing Tracker).

### Next recommended step

Manual browser smoke-test of:
1. Scene Analysis → "Add to AI Partner" → item appears in AI FEEDBACK bucket (not IDEAS)
2. Delete from AI Memory → AI Partner context updates on next navigation
3. First-use notice appears standalone (not inside AI Context Preview)
4. Showcase page loads without console AuthApiError for users with stale cookies

---
## 2026-05-04 - Midnight Theme Readability Fixes + Scene Analysis "Add to Assistant" Bug Fix

### Current branch

`main`

### What was completed

- **Feedback panel midnight readability (CommentsPanel):** Added scoped `[data-theme='midnight'] .comments-panel` CSS rules to `app/globals.css`. Targets: referenced-text block (`bg-slate-100/50`), inline/AI/scene type badges (amber/violet/blue), active filter button states (indigo/emerald/amber), resolved thread border, and the hardcoded `border-[#d8ddcf]` thread separator. Text and badge contrast now readable in midnight mode without restructuring the component.

- **AI Memory tab midnight fix (SavedResponsesTab):** The detail-view div had its own `bg-[#fbf9f5]` class that overrode the parent dark gradient. The existing `[class*="bg-\\[\\#fbf9f5\\]"]` descendant rule in globals.css was silently broken — CSS string `\\[` resolves to a literal backslash, which never matches the HTML class `bg-[#fbf9f5]`. Fixed by: (1) adding `ai-memory-detail` class to the detail-view div in `components/project/SavedResponsesTab.tsx`, (2) adding a direct `[data-theme='midnight'] .ai-memory-detail` rule in `globals.css`. Detail view now shows the dark gradient in midnight mode when items are present.

- **Scene Analysis panel midnight fix (SceneAnalysisPanel):** Panel was not inheriting midnight at all. Fixed by: (1) adding `scene-analysis-panel` class to the panel wrapper, (2) adding `analysis-section` and `analysis-section-{key}` (tension/pacing/dialogue/summary/suggestions) semantic classes to each card. Added direct CSS rules in `globals.css` for each named class instead of using `[class*="bg-amber-50"]` substring matching — which is unreliable for Tailwind opacity-modified classes (e.g. `bg-amber-50/60`). User confirmed fixed.

- **"Add to Assistant" error in SceneAnalysisPanel fixed:** `handleAddToAssistant` (and `handleSave`) were calling Supabase directly via `(supabase as any).from('ai_responses').insert(...)`. For local projects this sends a `local_xxx` project ID to the cloud DB, causing an FK/RLS violation. The `PostgrestError` has non-enumerable properties that serialize as `{}` when logged. Fixed by: replacing both direct Supabase calls with `saveAiResponse()` from `lib/persistence/ai-feedback.ts`, which routes local project IDs to IndexedDB and cloud IDs to Supabase. Also changed `type: 'analysis_feedback'` to `type: 'analysis'` (valid enum value). Removed the now-unused `createClient` import and `const supabase` line.

- **CSS escaping root cause documented:** Discovered that `[class*="bg-\\[\\#...\\]"]` patterns in globals.css are broken by CSS string escape semantics. The safe pattern going forward is to add a semantic class name to the element and target it directly — no substring matching on arbitrary-value Tailwind classes.

- **TypeScript:** Clean compile (`npx tsc --noEmit --pretty false` exit 0) after all changes.

### Files changed

- `app/globals.css` — Added midnight CSS blocks for `.comments-panel`, `.ai-memory-detail`, `.scene-analysis-panel`, and `.analysis-section-{key}` classes.
- `components/project/SavedResponsesTab.tsx` — Added `ai-memory-detail` class to detail-view div.
- `components/project/story/SceneAnalysisPanel.tsx` — Added semantic classes to panel and section cards; replaced direct Supabase inserts in `handleSave` and `handleAddToAssistant` with `saveAiResponse()`; removed `createClient` import.

### Current status

All changes complete. TypeScript clean. Awaiting manual browser validation for the midnight theme fixes and the "Add to Assistant" flow on both local and cloud projects.

### Next recommended step

1. Open a local project in midnight mode → run Scene Analysis → click "Add to Assistant" on a section. Confirm it succeeds (toast: "Added to Assistant") and the item appears in AI Memory.
2. Open a cloud project in midnight mode → repeat the same. Confirm it also succeeds.
3. Visually confirm the Feedback panel, AI Memory detail view, and Scene Analysis panel all look correct in midnight mode.

### Risks or warnings

- `type: 'analysis'` is now used for both "Save to Archive" and "Add to Assistant" entries from SceneAnalysisPanel. They are distinguishable by the `action` field (`analyze_scene` vs `analysis_feedback`). If a check constraint is ever added for `action` values, `analysis_feedback` may need to be reviewed.
- The CSS escaping pattern `[class*="bg-\\[\\#...\\]"]` appears in other places in `globals.css` for other components. Those rules may also be silently broken. Future agents should audit and migrate to semantic class names on a case-by-case basis.

---
## 2026-05-04 - Showcase Page PM Audit and Feature Expansion

### Current branch

`main`

### What was completed

- **Showcase PM audit:** Full review of `components/marketing/Showcase.tsx` against the actual shipped feature set. Identified that ~70% of real features (offline/local-first, auto-save, snapshots, export range, dual writing modes) had no presence on the page.
- **"Built different, by design" section added:** New 2×2 tile grid positioned between the feature pills and the main feature showcases. Four tiles: *Your work, your device* (CloudOff — local-only mode, offline writing, no server required), *Never lose a word* (History — auto-save, scene snapshots, full `.storyline` backup/restore), *Books and Screenplays* (Film — dual mode, correct structure and export for each), *AI on your terms* (Sparkles — BYOK Gemini/OpenAI or free local Ollama, no forced subscription).
- **Export formats section added:** New section after the Worldbuilding showcase. Left column: heading + description. Right column: 3×2 pill grid for PDF, DOCX, EPUB, HTML, Markdown, Plain Text.
- **"Beta" reduced to one mention:** Nav badge kept (small, subtle). All other occurrences rebranded: hero pill `"Free during beta"` → `"Free Early Access"`, nav link `"The Beta"` → `"Early Access"` (anchor `#access`), section `"Storyline is in Beta"` → `"Get in early"`, body copy rewritten to confident tone, CTA `"Join the Beta — It's Free"` → `"Get Early Access — It's Free"`, footer `"Storyline is Free During Beta"` → `"Free Early Access"`.
- **Removed unused imports** (`MessageSquare`, `BarChart3`). Added new icons (`CloudOff`, `History`, `Film`, `FileDown`).
- **ESLint:** Clean — 0 errors, 0 warnings.

### Current status

All changes committed. Showcase page is substantially more representative of the product's feature set. The "Beta" overexposure has been resolved without removing the nav badge signal.

### Next recommended step

- Manual visual check of the showcase at `/dev/showcase`:
  1. Confirm "Built different, by design" 2×2 grid renders correctly on desktop and mobile
  2. Confirm export format pills render in 3×2 grid
  3. Confirm the Early Access section reads correctly (no "Beta" wording visible except nav badge)
  4. Confirm no broken layout between the new sections and the existing feature showcases
- Capture updated showcase screenshots once satisfied with the layout (`/showcase/` folder in `public/`)

### Risks or warnings

- Screenshots in `public/showcase/` do not yet show the offline/local-mode UI. The new differentiator tiles reference features without matching screenshots. Low risk for now — the tiles are copy-only, not screenshot-backed.
- The "Add feature list / benefits page" task from TASK_BOARD.md Later has been addressed by this update. The full root-and-branch feature audit (per `docs/technical-debt-roadmap.md`) is still deferred — this showcase update was based on known shipped features, not a formal audit.

---
## 2026-05-03 - Trial Percentage Display, Backup Size Warning, AI Help Center Articles

### Current branch

`main`

### What was completed

- **Trial percentage conversion (front-end only):** Added `formatTrialRemainingPct(remainingMicros, grantedMicros): number` helper to `lib/ai/trial.ts`. Updated 3 display locations to show percentages instead of dollar values: `SettingsView.tsx` (Settings page progress bar and used/limit row), `AiFullCanvas.tsx` (bottom status bar "Trial Left"), and `AiHelperPanel.tsx` (quiet header nudge below 50%). Dollar values are no longer shown to users; backend billing math is unchanged.
- **Quiet trial nudge in AiHelperPanel:** When `billing_mode === 'app_managed_trial'` and remaining percentage is < 50%, a small uppercase "Trial: X% left" label appears in the non-fullCanvas panel header. Uses amber text when below `LOW_BALANCE_MICROS` threshold (`isLowTrialBalance`), muted slate otherwise.
- **Backup file-size warning:** Connected the pre-existing `estimateBackupSizeBytes` return value (was always discarded by all callers). 3 call sites updated: `BackupBanner.tsx` and two backup callers in `ProjectShell.tsx`. Shows a `toast.warning` when the backup exceeds 20 MB. Zero changes to backup logic or schema.
- **4 AI Help Center articles added to `lib/help.ts`:** `ai-setup` (how to configure AI), `ai-byok` (OpenAI/Gemini BYOK), `ai-ollama` (local Ollama setup), `ai-no-ai` (using Storyline without AI). All follow existing `HelpTopic` schema with keywords and sample questions. No new routes or components required.
- **Pre-Task Check protocol added to TASK_BOARD.md:** 4-step mandatory check for AI agents before starting any task, with decision table. Prevents re-doing already-completed work.
- **Technical debt roadmap expanded:** Advanced offline sync (Tier 2 plan) and destructive action guards both audited and documented; backup size warning marked Done.
- **TASK_BOARD.md cleanup:** Removed completed tasks from Later; added Done entries for all work above.
- **TypeScript:** Clean compile (`npx tsc --noEmit` exit 0) after all changes.

### Current status

All code changes committed. Help Center articles, trial display, and backup warning are live. Session end protocol complete.

### Next recommended step

- Run a manual browser regression pass for the new features:
  1. Open Settings with a sponsored-trial account — confirm percentage display, no dollar amounts
  2. Open AI Helper Panel below 50% trial — confirm quiet nudge appears
  3. Trigger a backup on an image-heavy local project — confirm size warning toast appears
  4. Search "api key", "ollama", "no ai", "setup" in Help Center — confirm 4 new articles surface

### Risks or warnings

- The `LOW_BALANCE_MICROS` threshold for amber nudge color is 250,000 micros. This is ~12.5% of the default 2,000,000 micro budget — could seem low if the budget changes. Adjust `isLowTrialBalance` if needed.
- Dollar values removed from all user-facing surfaces. Internal admin/logging paths are unchanged and still use micros.

---
## 2026-05-03 - Feedback Panel: Comment Highlight Polish

### Current branch

`main`

### What was completed

- **Audit only (no code changes):** Full read-only audit of the Feedback panel comment filtering and inline TipTap highlight system — filter chips, comment cards, inline highlights, comment ownership, collaborator comments, AI feedback, and hidden/new states.
- **Active inline highlight wiring:** Replaced the dead active-comment scroll effect in `SceneEditor.tsx` with a DOM-query approach that actually applies and removes the `.comment-highlight.active` CSS class (which existed in `globals.css` but was never applied). Handles multi-span comments (where a TipTap mark spans multiple text nodes). Scrolls the editor to the highlighted span only when `jumpToComment()` is called (`scrollTrigger` increments), not on bare comment selection.
- **Show Highlights toggle:** Added `showHighlights`/`setShowHighlights` to `CommentsContext` (provider + type). Added a `Highlighter` icon toggle button in the `CommentsPanel` header. Added `data-highlights-hidden` attribute toggling in `SceneEditor.tsx` on the outermost `editorShellRef` div. Added CSS under `[data-highlights-hidden]` in `globals.css` that suppresses all inline highlight visuals (background, border, shadow) with `!important` while leaving text and stored TipTap marks completely untouched.
- **Technical debt additions:** Added two new items to `docs/technical-debt-roadmap.md` under "Lower Priority / Future Enhancements": AI filter consistency (`ai-feedback` type not matched by AI chip) and active-highlight-after-resolve edge case (ProseMirror status sync may drop the `.active` class when a comment is resolved while active).
- **TypeScript:** Compile passed with zero new errors (`@emailjs/browser` pre-existing error unrelated to this session).

### Current status

Comment highlight polish is implemented and committed. The `Show Highlights` toggle button and active highlight ring are functional. No TipTap schema changes, no DB migrations, no changes to filter chip logic or comment creation/permissions.

### Next recommended step

- Run a manual browser regression pass for comment highlight polish:
  1. Open a scene with existing inline comments
  2. Click a comment card in Feedback panel → confirm the inline span gets a visible amber ring/bold treatment
  3. Click "Jump to position" → confirm the editor scrolls to the highlighted span
  4. Click the Highlighter button in Feedback header → confirm all inline highlight backgrounds/borders disappear, text remains readable
  5. Toggle Highlighter back on → highlights reappear
  6. Resolve a comment that is currently active → confirm resolved styling appears (ring may briefly reset, which is the known edge case documented in technical-debt-roadmap.md #7)
  7. Confirm filter chips (All, Mine, Collaborators, AI, New, Hidden) still work as before
  8. Confirm AI Helper and Scene Analysis panel behavior unchanged

### Risks or warnings

- **Known edge case (documented, not fixed):** When a comment is resolved while it is the active comment, the ProseMirror status-sync transaction re-renders the span, dropping the manually-applied `.active` class. The resolved styling appears correctly; only the active ring is lost until the next interaction. See `docs/technical-debt-roadmap.md` item #7.
- **Deferred feature:** Making inline highlights follow the existing filter chips (All, Mine, Collaborators, etc.) requires lifting `authorFilter` from CommentsPanel local state into CommentsContext. This was explicitly deferred by the user — do NOT implement until asked.
- **AI filter consistency:** The AI chip matches `anchor_data.type === 'ai-analysis'` only, not `'ai-feedback'`. Items from the AI Helper panel do not appear under the AI chip. Documented in technical-debt-roadmap.md item #6 — do NOT fix without explicit instruction.

---
## 2026-05-03 - Screenplay Tab focus-escape fix

### Current branch

`main`

### What was completed

- Fixed the screenplay `Tab` / `Shift + Tab` focus-escape issue in `lib/tiptap/screenplay-keyboard.ts`.
- The root cause was that a fresh screenplay block can still be a plain `paragraph`, and the screenplay Tab-cycle maps only handled the custom screenplay node types.
- When the current block was `paragraph`, the shortcut returned `false`, so the browser fell back to native focus traversal and moved into the Story right-rail buttons.
- Updated the screenplay cycle maps so:
  - `Tab` treats `paragraph` like the baseline Action state and converts it to `screenplayCharacter`
  - `Shift + Tab` treats `paragraph` like the baseline Action reverse path and converts it to `screenplayTransition`
- Verified the change with `npx tsc --noEmit --pretty false`.

### Current status

Screenplay Tab cycling should now stay inside the editor even when the current block is still a plain paragraph rather than a custom screenplay node.

### Next recommended step

- Run a browser/manual regression pass for screenplay:
  - fresh empty screenplay scene `Tab`
  - fresh empty screenplay scene `Shift + Tab`
  - repeated forward/backward cycling across Action, Character, Parenthetical, Dialogue, Transition, and Scene Heading
  - confirm right-rail buttons no longer receive focus from Tab while the editor is active

### Risks or warnings

- This is a narrow keyboard mapping fix only. It assumes a plain `paragraph` in screenplay mode should behave like the baseline Action state for Tab cycling.

---
## 2026-05-03 - Screenplay Enter hardBreak crash fix

### Current branch

`main`

### What was completed

- Fixed the screenplay runtime crash in `lib/tiptap/screenplay-keyboard.ts` where pressing `Enter` could throw `RangeError: Invalid content for node type hardBreak`.
- Replaced the single chained `splitBlock().setNode(nextType)` flow with a two-step command sequence:
  - `editor.commands.splitBlock()`
  - `editor.commands.setNode(nextType)`
- Added a troubleshooting entry to `TROUBLESHOOTING.md` documenting the symptom, cause, and safe fix.
- Verified the change with `npx tsc --noEmit --pretty false`.

### Current status

The predictive screenplay `Enter` shortcut should no longer crash when the current block contains an inline hard break. Screenplay node definitions and other keyboard behaviors were left unchanged.

### Next recommended step

- Run a browser/manual regression pass for screenplay:
  - `Enter` after normal single-line content
  - `Enter` after content containing an inline line break
  - `Enter` in Scene Heading, Action, Character, Parenthetical, Dialogue, and Transition
  - `Tab`, `Shift + Tab`, and `Backspace` regression

### Risks or warnings

- This is a narrow keyboard-transaction fix only. Browser validation is still needed for the exact line-break reproduction path.

---
## 2026-05-02 - Editor prose link support Block 4 Safe Pass 1

### Current branch

`main`

### What was completed

- Added explicit prose-only link support in `components/project/story/SceneEditor.tsx`.
- Stopped relying on implicit StarterKit defaults by configuring TipTap link behavior intentionally:
  - `autolink` disabled
  - `linkOnPaste` disabled
  - only `http` / `https` links allowed
  - normal editable clicks do not navigate away
  - read-only/viewer clicks can open safely in a new tab
- Added a prose-only link button to both the prose BubbleMenu and the floating mobile/tablet formatting toolbar.
- Added a small contained link dialog for:
  - adding a link to selected prose text
  - editing an existing link
  - removing an existing link
- Normalized bare domains like `example.com` to `https://example.com` and rejected dangerous protocols like `javascript:` and `data:`.
- Kept screenplay protected by:
  - no link UI in screenplay
  - no screenplay node or keyboard changes
  - no autolink/paste link productization path in screenplay
- Added prose link styling in `app/globals.css` for Sanctuary and Midnight.
- Verified the change with `npx tsc --noEmit --pretty false`.
- Ran `npm run lint` and a focused `npx eslint components/project/story/SceneEditor.tsx`; both still fail on the repo's pre-existing lint backlog, including existing `no-explicit-any`, hook-dependency, and unescaped-entity issues already present in `SceneEditor.tsx` and elsewhere.

### Current status

Storyline now has explicit prose-only link authoring UI with a defined editable/read-only click policy, while leaving horizontal rules, toolbar regrouping, and export parity for later passes.

### Next recommended step

- Run a browser/manual regression pass for:
  - add/edit/remove prose links
  - bare-domain normalization
  - dangerous-protocol rejection
  - editable click behavior not navigating away
  - read-only/viewer link opening
  - local/cloud persistence
  - screenplay remaining free of link UI and behavior regressions
- If Block 4 continues after that, keep the next pass focused on visible horizontal rules only. Do not broaden into toolbar redesign or export parity yet.

### Risks or warnings

- Screenplay content can still load existing link marks safely because the shared TipTap schema still knows about links, but this pass intentionally does not expose screenplay link UI.
- Export parity for links is still incomplete outside existing HTML/EPUB rendering paths and should remain a Block 5 concern.

---
## 2026-05-02 - Current-scene find typing-bounce stabilization

### Current branch

`main`

### What was completed

- Tightened the current-scene find behavior in `components/project/story/SceneEditor.tsx` so typing into the search field no longer auto-reveals matches on every keystroke.
- Split find behavior into two phases:
  - query updates recalculate match count and highlighting only
  - explicit navigation (`Enter`, `Next`, `Previous`) triggers scroll reveal of the active match
- This prevents the search flow from treating each partially typed query as an immediate viewport target.
- Verified the change with `npx tsc --noEmit --pretty false`.

### Current status

Current-scene find should now remain stable while the user types. Highlighting and counts still update live, but snapping should only happen when the user explicitly navigates results.

### Next recommended step

- Re-test the exact prior regression:
  - open current-scene find
  - type a multi-letter word like `fingers`
  - confirm the input keeps visual stability while typing
  - then use `Enter`, `Next`, and `Previous` to confirm snapping still works intentionally

### Risks or warnings

- This is a narrow behavior change only. If additional UX issues remain, they are likely in the explicit navigation path rather than live query updates.

---
## 2026-05-02 - Current-scene find focus-steal / formatting-toolbar regression fix

### Current branch

`main`

### What was completed

- Fixed the follow-up regression where typing into current-scene find would highlight the first match by creating a normal editor selection, which:
  - popped the formatting toolbar over the document
  - stole focus from the find input after the first typed character
- Updated `components/project/story/SceneEditor.tsx` so current-scene find now:
  - reveals the active match by scrolling to the active decoration instead of creating a normal editor text selection
  - keeps focus in the find input while typing
  - suppresses the floating formatting toolbar while the find panel is open
- Preserved ordinary manual text selection behavior outside the find flow, so normal highlighting can still raise the formatting toolbar.
- Verified the change with `npx tsc --noEmit --pretty false`.
- Ran `npm run lint`; it still fails on the repo's broad pre-existing lint backlog, including unrelated `no-explicit-any`, `react/no-unescaped-entities`, and older script/app issues outside this task.

### Current status

Current-scene find should now behave like a search tool instead of a formatting selection flow. Typing in the find box should keep focus in the box, and the formatting toolbar should stay out of the way until the user intentionally selects text normally.

### Next recommended step

- Manually verify:
  - `Ctrl/Cmd + F` opens current-scene find
  - typing multiple characters keeps focus in the search field
  - the formatting toolbar does not appear from find-only navigation
  - normal manual text selection still opens the formatting toolbar outside the find flow

### Risks or warnings

- This fix intentionally avoids using a normal editor selection during find navigation. Active-result clarity now depends on the active decoration and scroll reveal rather than the browser's selection paint.

---
## 2026-05-02 - Current-scene find polish follow-up

### Current branch

`main`

### What was completed

- Followed up on the current-scene find work in `components/project/story/SceneEditor.tsx` after manual testing found unreliable next/previous snapping.
- Fixed active-result snapping by:
  - creating a real editor text selection for the active match
  - focusing the editor even when the find input previously held focus
  - revealing the match inside the nearest scene scroll region only when it is outside a comfortable visible band
- Added lightweight current-scene match highlighting with a contained ProseMirror decoration plugin registered only inside `SceneEditor.tsx`.
- Styled passive and active find matches in `app/globals.css`, including Midnight-specific colors.
- Kept highlight cleanup automatic by clearing the decoration state when:
  - the find UI closes
  - the query is cleared
  - the scene changes
- Preserved current-scene-only, case-insensitive, plain-text behavior and left screenplay node/keyboard files untouched.
- Verified the change with `npx tsc --noEmit --pretty false`.
- Ran `npm run lint`; it still fails on the repo's broad pre-existing lint backlog, including unrelated `no-explicit-any`, `react/no-unescaped-entities`, and older script/app issues outside this task.

### Current status

Current-scene find now both navigates and visually marks matches. Next/previous should visibly move to the active result, and all matches stay subtly highlighted with a clearer active state until find is closed or reset.

### Next recommended step

- Run a browser/manual regression pass for:
  - prose multi-match next/previous snapping
  - all-match highlight visibility and active-match clarity
  - no-results state
  - close/reset clearing highlight decorations
  - scene-switch reset
  - Focus Mode and Typewriter Mode regression
  - screenplay matching across Scene Heading, Action, Character, Parenthetical, Dialogue, and Transition
  - viewer/read-only safety
  - local and cloud parity
- Do not broaden the next pass into replace, project-wide search, structure search, title jump search, links, horizontal rules, or export parity.

### Risks or warnings

- Highlighting is decoration-based and editor-local, which keeps scope contained, but it still needs browser validation across prose/screenplay and both themes.
- `npm run lint` remains noisy and failing due pre-existing repo-wide debt; this pass did not attempt lint cleanup.

---
## 2026-05-02 - Editor current-scene find Block 3B Safe Pass 2

### Current branch

`main`

### What was completed

- Added a compact current-scene find UI in `components/project/story/SceneEditor.tsx`.
- Added a visible `Find` control in the editor utility row and kept it available in Focus Mode.
- Added scoped `Ctrl/Cmd + F` support when keyboard focus is already inside the editor shell, so the browser find shortcut is not hijacked globally.
- Implemented case-insensitive plain-text current-scene matching only.
- Added:
  - search input
  - match status (`1 of N` / `No matches`)
  - previous / next navigation
  - close button
- Reset find state cleanly on scene switch and kept it session-local with no persistence.
- Kept screenplay handling plain-text only by searching TipTap document text directly, without AI-oriented screenplay labels or any screenplay node/keyboard changes.
- Deliberately deferred match highlighting for this pass to keep the implementation ProseMirror-safe and avoid widening scope into decoration/plugin work.
- Verified the change with `npx tsc --noEmit --pretty false`.
- Ran `npm run lint`; it still fails on the repo's broad pre-existing lint backlog, including unrelated `no-explicit-any`, `react/no-unescaped-entities`, and older script/app issues outside this task.

### Current status

Storyline now has a minimal find-in-current-scene feature for the active editor only. Users can open it from the editor chrome or with `Ctrl/Cmd + F` while working inside the editor, then cycle matches inside the current scene without any project-wide search behavior.

### Next recommended step

- Run a browser/manual regression pass for:
  - prose find open/close
  - case-insensitive prose matching
  - next/previous cycling and no-results state
  - scene-switch reset
  - Focus Mode and Typewriter Mode regression
  - screenplay matching across Scene Heading, Action, Character, Parenthetical, Dialogue, and Transition
  - read-only/viewer mode remaining non-editable
  - local and cloud parity
- If Block 3B continues later, the next safe follow-up is optional match highlighting inside the current scene only. Do not jump to replace, project-wide search, structure search, links, horizontal rules, or export parity from this pass.

### Risks or warnings

- Matching is simple plain-text matching within text nodes. It is case-insensitive and scene-local, but this pass does not attempt cross-node phrase matching or decorative highlight rendering.
- `npm run lint` remains noisy and failing due pre-existing repo-wide debt; this pass did not attempt lint cleanup.

---
## 2026-05-02 - Editor writing-surface word count Block 3B Safe Pass 1

### Current branch

`main`

### What was completed

- Added a shared plain-text word-count helper in `lib/story/word-count.ts`.
- Updated `lib/project-stats.ts` to reuse the shared helper so stats-page counts stay aligned with the editor count behavior.
- Updated `components/project/story/SceneEditor.tsx` to show a compact writing-surface word count:
  - current active scene word count
  - selected-word count only when text is selected
- Wired the count to editor create, content update, selection update, and scene-switch hydration so it updates while typing, deleting, pasting, and changing selection.
- Kept the UI read-only and compact in the existing editor status area, with the same count still visible in Focus Mode beside `Exit Focus`.
- Verified the change with `npx tsc --noEmit --pretty false`.
- Ran `npm run lint`; it still fails on the repo's broad pre-existing lint backlog, including unrelated `no-explicit-any`, `react/no-unescaped-entities`, and script warnings/errors outside this task.

### Current status

Storyline now has a lightweight writing-surface word count for prose and screenplay without adding find/search, replace, links, export changes, or screenplay behavior changes. The selected-word count appears only when there is an active text selection.

### Next recommended step

- Run a browser/manual regression pass for:
  - prose word count while typing, deleting, and pasting
  - prose multi-paragraph selected-word count
  - empty prose scenes showing `0 words`
  - screenplay counts across Scene Heading, Action, Character, Parenthetical, Dialogue, and Transition blocks
  - empty screenplay blocks not inflating the count
  - screenplay cross-block selected-word counts
  - Focus Mode and Typewriter Mode regression
  - read-only/viewer mode remaining non-editable
  - existing full stats page still looking correct
- If Block 3B continues later, keep the next pass focused on find/search only. Do not broaden into replace, project-wide search infrastructure, or export parity from this word-count pass.

### Risks or warnings

- `npm run lint` remains noisy and failing due pre-existing repo-wide debt; this pass did not attempt a lint cleanup.
- The editor count uses plain text from TipTap, by design. It does not use AI-oriented screenplay labels or backup/export estimation logic.

---
## 2026-05-02 - Header local/cloud status badge

### Current branch

`main`

### What was completed

- Added a visible compact project-status badge in the `ProjectShell` header beside the project title.
- Kept the storage indicator in the project identity area instead of hiding it behind avatar hover.
- Added three states with tooltip copy:
  - `Cloud`
  - `Local`
  - `Local backup`
- Kept migrated-local-backup banner behavior separate, so the banner still appears on open and can still be dismissed only for the current page/session while the header badge remains visible.
- Verified the change with `npx tsc --noEmit --pretty false`.

### Current status

Project storage state is now visible at a glance in the header/navbar across project views. Migrated local backups keep a slightly more cautionary badge treatment without changing migration logic or banner behavior.

### Next recommended step

- Run a browser/manual regression pass for:
  - cloud project header badge copy and placement
  - local-only project header badge copy and placement
  - migrated local backup header badge visibility before and after dismissing the banner
  - narrow/mobile header wrapping behavior

### Risks or warnings

- Browser validation is still needed for header spacing on narrow layouts and Midnight theme appearance.

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
