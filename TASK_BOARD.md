# Task Board

Simple repo-based task tracking for agents and humans.

Keep this lightweight. Move items between sections instead of rewriting the whole file.

---

## Now

- Start future AI coding sessions by reading:
  - `MASTER_BRIEF.md`
  - `DECISION_LOG.md`
  - `SESSION_HANDOVER.md`
  - `TASK_BOARD.md`
- Run browser regression for screenplay visual references, AI-off analyzer feedback, and book/prose image behavior.
- Choose the first high-priority technical debt item to tackle.

## Next

- Atomic project scaffolding via Supabase RPC.
- Centralized rate limiting for AI routes.
- Robust retry and initialization patterns for editor save and project initialization flows.
- AI trial reconciliation and RPC failure handling.
- AI abuse-controls hardening.
- Add important existing product decisions to `MASTER_BRIEF.md` as they become relevant.
- Use the session end prompt to update `SESSION_HANDOVER.md` after each coding session.

## Later

- Unified Supabase type safety using generated `Database` types.
- State management consolidation, likely with Zustand.
- Structure tree performance improvements for large projects.
- AI trial cost model calibration against real provider usage.
- Local AI usage logging integrity improvements.
- Advanced offline / pending sync beyond current `localStorage` fallback.
- AI trial reconciliation and RPC failure handling.
- AI abuse-controls hardening.
- Add important existing product decisions to `MASTER_BRIEF.md` as they become relevant.
- Use the session end prompt to update `SESSION_HANDOVER.md` after each coding session.

## Later

- Unified Supabase type safety using generated `Database` types.
- State management consolidation, likely with Zustand.
- Structure tree performance improvements for large projects.
- AI trial cost model calibration against real provider usage.
- Local AI usage logging integrity improvements.
- Advanced offline / pending sync beyond current `localStorage` fallback.
- Stronger destructive action guards for high-impact deletes.
- Writing UX polish: focus, paper transitions, font sizing, and themes.
- Backup and asset handling improvements for `.storyline` files.
- Consider adding a GitHub Project board after the Markdown workflow proves useful.
- Consider adding an `AGENTS.md` or `CONTRIBUTING.md` if agents need stricter operating rules.

## Done

- Fixed `StructureTree.tsx` server render crash caused by render-time `window` access.
- Made missing AI settings default to AI off across runtime, settings, preferences save, and admin reporting paths.
- Hid AI-specific editor empty-state nudges when AI is disabled.
- Added analyzer-specific AI access feedback when scene analysis is clicked while AI is unavailable.
- Added screenplay-only Visual References UX using existing scene attachments.
- Blocked inline screenplay image insertion while preserving prose inline illustrations.
- Fixed structure tree drag-and-drop neighbor highlighting and grab handle visibility.
- Fixed sidebar title word-wrapping issues on desktop.
- Restored `StoryTab.tsx` after code corruption and added proper empty states for container nodes.
- Made deletion confirmation prompts dynamic based on node type.
- Fixed scene selection persistence after move/reorder.
- Replaced the AI partner horizontal mode buttons with a selectable dropdown.
- Merged quick writing ideas into the main AI mode selector and removed visible prompt injection for those modes.
- Removed Archive Context from the AI Partner while keeping normal AI Memory saving/viewing.
- Tightened redundant AI Partner header and footer spacing on desktop.
- Removed the redundant static Mode pill from the AI Partner header.
- Fixed screenplay AI insertion so non-chat screenplay modes attempt structured screenplay block insertion.
- Fixed structure tree act checkbox collapse on desktop.
- Fixed story-context selection so tree visuals, explicit AI selection, and AI-ready chip roll-up behave consistently.
- Added root-level continuity files.
- Added session start prompt.
- Added session end prompt.
- Added initial decision log entries.
- Summarized `docs/technical-debt-roadmap.md` into the root continuity files.
