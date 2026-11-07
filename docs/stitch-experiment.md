# Storyline: isolated Stitch experiment

## Status and boundary

- Authorized by Kwame on 2026-11-07: follow the repository review recommendations and trial a strong candidate on a test branch.
- Working branch: `experiment/stitch-storyline`.
- Starting point: `bdb0844000a800c8cc13d63c81bebe6ddef5b1bc` on `main`.
- First candidate: the notifications hub already specified in `TASK_BOARD.md` (Next, item 4).
- Stitch generation is **blocked**: the connected service's read-only project listing returned HTTP 404 / `UNAVAILABLE`. No Stitch project, generated screen, insight, solution or automated product loop has been created.
- This is preparation for an experiment, not evidence of admission to the fuller early-access pilot advertised by email.

The user's test-branch instruction takes precedence over the normal session-end production deployment step. Do not merge into `main`, enable auto-merge, invoke a production deploy hook, run migrations, or write production data for this experiment. Do not edit `MASTER_BRIEF.md`.

## Why this candidate

The app already creates notifications and supports detail pages. The missing central list is a bounded user flow with clear acceptance criteria. It can reuse the current authenticated layout, notification table, icons and owner-scoped policies, while leaving the writing editor and local project storage alone.

### Evidence from the starting commit

| Existing implementation | Evidence and implication |
| --- | --- |
| Bell menu | `components/notifications/NotificationBell.tsx` fetches the latest 20 notifications and displays at most 8. There is no link to a full history page. |
| Detail route | `app/(app)/notifications/[id]/page.tsx` already fetches by notification ID **and** authenticated user ID. Reuse it. |
| Read state | `NotificationDetailClient.tsx` marks the opened item read. The bell currently also marks items read before navigation. Reconcile this so merely opening the hub does not mark unopened items read. |
| Feedback navigation | Bell clicks for feedback in the current project bypass detail and navigate straight to the editor. The new hub flow must preserve the eventual `nodeId`, `commentId` and feedback destination parameters. |
| Ownership | The original notification migration enables owner-only SELECT, UPDATE and DELETE policies. Do not modify these policies or introduce a browser INSERT path. Current remote policy state has not been queried. |
| Missing list | There is no `app/(app)/notifications/page.tsx` at the starting commit. Detail functionality is partial implementation of the task, not a reason to recreate everything. |
| Product style | `PRODUCT.md` and `DESIGN.md` define a calm writing workspace, Sanctuary and Midnight themes, and optional AI. Preserve these. |

## Stitch design brief

Use this prompt once the Stitch connection is working. Supply the relevant existing component source and product/design documents as context; do not upload secrets, `.env` files, private manuscripts, local backups, or test-account credentials.

```text
Continue the existing Storyline writing app. Prototype a notifications hub;
do not redesign the entire app or regenerate existing screens.

Objective: A writer can review notification history, read one item in context,
then deliberately open its related project or feedback, without losing their place.

Style: Writer's Sanctuary. Warm canvas #fbf9f5, paper #f5f4ef,
ink #31332f, soft borders #e8e3da, muted green #546354.
Newsreader headings, Manrope controls. Preserve an alternate Midnight theme.
Readable text, comfortable mobile tap targets, restrained iconography.
No AI dashboard, growth charts, purple gradients, gamification or decorative imagery.

Design desktop and narrow mobile states for:
1. Notifications heading, clear back-to-library navigation, All/Unread filters.
2. Newest-first history with icon, title, short preview, visible date/time,
   and a text/symbol unread indicator that does not depend on color alone.
3. Opening a row enters the existing notification detail flow; a separate
   action on that detail screen opens the related project/feedback.
4. A clearly labelled per-item delete action, separated from the row link.
5. Loading, empty history, empty unread filter, load-error/retry,
   deletion-in-progress and deletion-failure states.
6. A load-more flow for histories beyond one page.

Use fictional sample notifications only. Produce a prototype and explain
proposed changes before code integration. Do not add notification types,
analytics, database tables, auth changes, billing, or production deployment.
```

## Implementation contract

1. Confirm the tool is reading this branch. Public repository pairing does not itself prove branch selection. If branch selection is unavailable, use an explicit archive of this branch without a GitHub write integration; have the coding agent apply reviewed output to this branch only.
2. Preserve `requireVerifiedUser` and owner-scoped queries. No schema, RLS, auth, billing, AI-provider or editor changes.
3. Add the list route and a focused list component. Reuse existing detail and destination helpers, preserving local-transfer guidance and project-feedback deep links.
4. Provide newest-first paginated history, All/Unread filtering, loading/error/retry and empty states. Do not mistake the bell's latest-20 query for the complete history or unread count.
5. Route notification cards to the hub as requested by the task board. Do not mark a notification read until its detail is opened. Keep bell counts and realtime updates functioning.
6. Use the existing hard-delete policy for a single notification, explicitly scoped to the signed-in user. If deletion fails, restore the item and show a readable error. Affects the notification only, never its project/comment. Omit optional clear-all from the first experiment.
7. Give each notification a visible date/time; relative time can supplement it. Detail pages must also show a date/time. Opening a detail page from the hub must offer a dependable route back to the hub.
8. Preserve Sanctuary and Midnight, keyboard navigation, visible focus, and a scrollable list inside the app's overflow-constrained shell.
9. Update handover/task/testing records with exact results. Keep unverified checks unverified.
10. Deliver a draft PR to `main` for review. No automatic merge or production deployment.

## Acceptance and measurement

Do not install analytics or collect manuscript text. The first experiment is a scripted usability check; real usage metrics belong to a later, separately configured pilot.

| Check | Success condition |
| --- | --- |
| Find older activity | An item older than the bell's latest 20 can be reached through history pagination. |
| Understand before navigating | Bell/card → hub → detail → related resource; merely viewing the list does not mark all items read. |
| Read state | Opening detail marks that item read; unread filter and bell reflect changes. Mark-all-read remains correct. |
| Feedback destination | Related-resource action retains project, scene/node, comment and feedback context. |
| Delete | Deletion removes only the selected notification. Failed deletion restores it and explains the failure. |
| Ownership | Account A cannot read, mark or delete Account B's notification. Test only with dedicated non-production fixtures/accounts. |
| History states | Empty, loading, error/retry, unread-only and multiple-page histories behave correctly. |
| Presentation | Desktop and mobile widths, both themes, keyboard-only navigation and timestamps are readable. |
| Reliability | TypeScript, focused lint and Next build pass. Run a local Netlify build if configured; do not deploy. |

Record whether a tester can complete the review-detail-destination task unassisted, navigation errors/backtracking, and any confusing copy. These are proposed evaluation criteria, not measured results.

## Other completion recommendations

- The May 25 handover records a webpack build failure. Reproduce and diagnose before app changes; distinguish missing environment/network prerequisites from a source-code failure.
- The export task board entry is stale relative to the May 21 completion handover. Treat exports as previously completed pending regression checks; do not rewrite exporters merely because the old Now entry remains.
- Keep read-aloud sync, backup/save confidence, cover optimization and AI settings as separate tasks. Do not expand this first experiment into all of them.
- Naming, launch pricing and branding choices remain with Kwame. Do not invent them.

## Resume gate

Before claiming the Stitch trial has run: restore access, generate and inspect the prototype, then integrate and verify the bounded change on this branch. Authenticated browser testing also requires the machine-local setup in `docs/dev-test-account.md`; it was absent in this checkout during preparation. Never request passwords in chat.
