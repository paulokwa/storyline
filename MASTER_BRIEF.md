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

1. Read `MASTER_BRIEF.md`, `DECISION_LOG.md`, `SESSION_HANDOVER.md`, and `TASK_BOARD.md` before starting work.
2. Treat this file as the source of truth for broad project workflow and agent behaviour.
3. Use `TASK_BOARD.md` for active tasks and technical debt priorities.
4. Use `DECISION_LOG.md` for decisions and reasons.
5. Use `SESSION_HANDOVER.md` for current session status and next-step context.
6. Do not change locked decisions unless explicitly instructed with: `revise the plan`.
7. Prefer consistency over clever redesign.
8. If a requested change conflicts with this brief, stop and explain the conflict before editing.
9. Keep changes focused on the requested task.
10. Do not silently rewrite architecture, auth, billing, database policies, AI provider logic, or deployment settings.
11. At the end of each session, update `SESSION_HANDOVER.md` and `TASK_BOARD.md`.
12. If a meaningful decision was made, append it to `DECISION_LOG.md`.

## Locked Decisions

- Use lightweight Markdown files in the repo root as the agent continuity system.
- Keep project memory simple and readable before adding GitHub Project automation.
- Use concise session start and session end prompts to force agents to load and update context.
- Markdown files are preferred because they are visible to all agents and portable across machines.

## Agent Session Start Prompt

Paste this at the start of a new AI coding session:

```md
You are continuing an existing project.

Before doing anything:
1. Read these files in the repo:
   - MASTER_BRIEF.md
   - DECISION_LOG.md
   - SESSION_HANDOVER.md
   - TASK_BOARD.md

Rules:
- Treat MASTER_BRIEF.md as the source of truth.
- Do NOT change existing decisions unless explicitly told: "revise the plan".
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

3. If any decisions were made:
   - Append them to DECISION_LOG.md with date and reason

Rules:
- Keep updates concise
- Do NOT rewrite existing content unnecessarily
- Preserve structure and formatting

Output the updated sections clearly.
```

## Things Not To Change Without Permission

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
