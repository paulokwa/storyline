# Session Handover

This file records the current project state at the end of each AI coding session.

Agents should update this file before ending a session.

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
