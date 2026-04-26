# Decision Log

This file records meaningful project decisions and why they were made.

Keep entries concise. Do not rewrite old decisions unless explicitly instructed.

---

## 2026-04-26 - Add lightweight agent continuity system

Decision:
Use Markdown files in the repository root to keep project context consistent across machines and AI coding agents.

Files added:
- `MASTER_BRIEF.md`
- `DECISION_LOG.md`
- `SESSION_HANDOVER.md`
- `TASK_BOARD.md`

Reason:
The project is worked on across multiple machines and multiple AI agents. A simple repo-based memory system reduces context loss, repeated explanations, and agent drift.

Impact:
All future AI coding sessions should begin by reading the four continuity files. At the end of each session, agents should update the handover and task board.

Status:
Approved.

---

## 2026-04-26 - Prefer Markdown continuity before GitHub Project automation

Decision:
Start with simple Markdown files before adding GitHub Projects, GraphQL automation, or advanced task syncing.

Reason:
Markdown is visible to all agents, easy to edit, easy to review in Git history, and unlikely to break.

Impact:
GitHub Projects may be considered later, but it is not required for the current workflow.

Status:
Approved.
