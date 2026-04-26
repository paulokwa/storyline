# MASTER BRIEF

## Purpose

This file is the stable source of truth for this project. It exists to keep ChatGPT, Codex, Google Antigravity, Claude, and any other coding agents aligned across machines and chat sessions.

Agents must read this file before planning or changing the project.

## Project

Name: Storyline

Description: Creative AI Assistant

Current repository: `paulokwa/storyline`

Default branch: `main`

## Core Workflow Rules

1. Read `MASTER_BRIEF.md`, `AGENTS.md`, `TROUBLESHOOTING.md`, `DECISION_LOG.md`, `SESSION_HANDOVER.md`, `TASK_BOARD.md`, and `TESTING.md` before starting work.
2. Treat this file as the source of truth for broad project workflow and agent behaviour.
3. Treat `AGENTS.md` as the repo-level execution guide for coding-agent behaviour, diagnostics, implementation, testing, and reporting.
4. Treat `TROUBLESHOOTING.md` as the playbook for known issues, safe fixes, and debugging patterns.
5. Use `TASK_BOARD.md` for active tasks and technical debt priorities.
6. Use `DECISION_LOG.md` for decisions and reasons.
7. Use `SESSION_HANDOVER.md` for current session status and next-step context.
8. Use `TESTING.md` for tests that need doing and confirmed test results.
9. Do not change locked decisions unless explicitly instructed with: `revise the plan`.
10. Prefer consistency over clever redesign.
11. If a requested change conflicts with this brief, stop and explain the conflict before editing.
12. Keep changes focused on the requested task.
13. Do not silently rewrite architecture, auth, billing, database policies, AI provider logic, or deployment settings.
14. At the end of each session, update `SESSION_HANDOVER.md`, `TASK_BOARD.md`, and `TESTING.md` if relevant.
15. If a meaningful decision was made, append it to `DECISION_LOG.md`.
16. If the user confirms that something is fixed, completed, working, resolved, verified, tested, or otherwise done, update the relevant non-Master Brief files to reflect that status. Usually this means moving items in `TASK_BOARD.md`, adding a concise note to `SESSION_HANDOVER.md`, updating `TESTING.md` when testing is involved, and adding to `DECISION_LOG.md` only if a meaningful decision was made.
17. After completing session-end updates, commit and push the changes to GitHub unless the user explicitly says not to, there are no changes to commit, or the agent/tool does not have Git/GitHub write access. If unable to commit or push, say so clearly and provide the exact files that still need committing.
18. Do not edit `MASTER_BRIEF.md` unless the user explicitly asks for the Master Brief itself to be changed.

## Supporting Reference Docs

- `docs/technical-debt-roadmap.md` is a deeper reference file for reliability and technical debt issues. It explains why certain items matter and gives implementation guidance. It is not the active task list; use `TASK_BOARD.md` for active priorities and `TESTING.md` for verification.
- `AGENTS.md` is the execution companion to this Master Brief. The Master Brief controls planning, decisions, and continuity. `AGENTS.md` controls how coding agents should inspect, diagnose, implement, test, and report work inside the repository.
- `TROUBLESHOOTING.md` is the centralized playbook for known issues and proven fixes. Use it before attempting new debugging strategies.

## Locked Decisions

- Use lightweight Markdown files in the repo root as the agent continuity system.
- Keep project memory simple and readable before adding GitHub Project automation.
- Use concise session start and session end prompts to force agents to load and update context.
- Markdown files are preferred because they are visible to all agents and portable across machines.
- Session-end continuity updates should be committed and pushed to GitHub when possible.
- `MASTER_BRIEF.md` is controlled by the user and should only be edited when explicitly directed.
- `AGENTS.md` is the repo-level execution guide for coding agents and should be kept aligned with, but separate from, the Master Brief.
- `TROUBLESHOOTING.md` is the canonical location for debugging patterns and should be updated instead of duplicating fixes elsewhere.

## Agent Session Start Prompt

Paste this at the start of a new AI coding session:

```md
You are continuing an existing project.

Before doing anything:
1. Read these files in the repo:
   - MASTER_BRIEF.md
   - AGENTS.md
   - TROUBLESHOOTING.md
   - DECISION_LOG.md
   - SESSION_HANDOVER.md
   - TASK_BOARD.md
   - TESTING.md

Rules:
- Treat MASTER_BRIEF.md as the source of truth for planning, decisions, and continuity.
- Treat AGENTS.md as the execution guide for repo diagnostics, implementation, testing, and reporting.
- Treat TROUBLESHOOTING.md as the source of known issues and safe fixes.
- Do NOT change existing decisions unless explicitly told: "revise the plan".
- Do NOT edit MASTER_BRIEF.md unless explicitly directed.
- Prefer consistency over optimization.
- If something is unclear, ask before acting.
- If you did not read the files, say so explicitly.

Your task:
- Summarize current state in 5 bullet points
- Confirm next recommended step
- Wait for my instruction before making changes
```

## Agent Session End Prompt

Paste this at the end of an AI coding session:

```md
Before ending this session:

1. Update SESSION_HANDOVER.md with:
   - What was completed
   - Current status
   - Next recommended step
   - Any risks or warnings

2. Update TASK_BOARD.md:
   - Move completed tasks to Done
   - Adjust Now / Next if needed

3. Update TESTING.md if anything was tested, verified, confirmed working, or now needs testing.

4. If any decisions were made:
   - Append them to DECISION_LOG.md with date and reason

5. Commit and push all session changes to GitHub, unless I explicitly said not to or there are no changes to commit.

Rules:
- Keep updates concise
- Do NOT rewrite existing content unnecessarily
- Preserve structure and formatting
- Do NOT edit MASTER_BRIEF.md unless explicitly directed
- If you cannot commit or push, say so clearly and list the files that still need committing

Output the updated sections clearly, then include the commit hash if a commit was created.
```

## Things Not To Change Without Permission

- `MASTER_BRIEF.md`
- Database schema or migrations
- Supabase RLS policies
- Auth flow
- Billing/trial/credit logic
- AI provider strategy
- Deployment configuration
- Major UI architecture
- Existing locked product decisions

## Current Phase

Project continuity system is active.

## Open Questions

- Which future project areas should be documented as locked decisions?
- Should GitHub Projects be added later after the Markdown workflow proves useful?
