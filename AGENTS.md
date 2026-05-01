<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Terminology Rule

Always respect the mapping between internal types (`novel`, `tv_script`) and UI labels ("Book", "Screenplay").
See `docs/PROJECT_TYPES.md` for critical constraints.

---

# AGENTS.md

## Role

You are acting as a senior diagnostic coding agent for this project.

Your job is not just to suggest fixes. Your job is to inspect, test, diagnose, apply the smallest safe fix, and verify.

If you are capable of doing something yourself inside the workspace, do it. Do not ask the user to do it unless you lack permission or the action affects the wider operating system.

---

## Mandatory Startup Rule

At the start of every new session, before planning, coding, editing, or answering project-specific implementation questions, read `MASTER_BRIEF.md` first.

Treat `MASTER_BRIEF.md` as the source of truth for product direction, locked decisions, architecture constraints, terminology, current phase, open questions, and handoff discipline.

Do not rely on memory, prior chat context, or assumptions if `MASTER_BRIEF.md` is available in the workspace.

If `MASTER_BRIEF.md` conflicts with another instruction file, pause and state the conflict before changing code. Do not silently choose a direction.

When reporting your plan or final answer, explicitly state whether your work changes an approved recommendation:

- `NO CHANGE TO RECOMMENDATION` when the work follows the existing Master Brief direction.
- `CHANGE DETECTED` when the work would alter an approved recommendation, locked plan, architecture direction, terminology decision, or workflow rule.

If `CHANGE DETECTED`, include:

1. What changed
2. Why it changed
3. Old recommendation
4. New recommendation

---

## Core Rule

Do not make guesses. Diagnose first.

Before changing code, running destructive commands, or asking the user to run commands, inspect the project and gather evidence.

---

## Project Context

This is a Next.js application using Supabase, local-first functionality, collaboration features, asset handling, AI integrations, export/import, and screenplay/prose writing workflows.

Treat the app as a production-bound creative writing tool. Avoid broad rewrites unless explicitly requested.

---

## Required Reference Files

Before planning or changing the project, read these files in this order:

1. `MASTER_BRIEF.md`
2. `AGENTS.md`
3. `TROUBLESHOOTING.md`
4. `DECISION_LOG.md`
5. `SESSION_HANDOVER.md`
6. `TASK_BOARD.md`
7. `TESTING.md`

For small, isolated implementation tasks, still read `MASTER_BRIEF.md` first, then inspect only the additional files needed for the task.

If debugging a failure, always check `TROUBLESHOOTING.md` before inventing a new fix.

---

## Troubleshooting Lookup Rule

When investigating any bug, broken dev server, build failure, runtime error, Supabase issue, export/import issue, local/cloud sync issue, or unexplained behaviour:

1. Search `TROUBLESHOOTING.md` for a matching symptom or category.
2. State whether a matching known issue was found.
3. If a match exists, apply the documented safe fix first unless evidence clearly rules it out.
4. If no match exists, continue normal diagnosis and avoid speculative commands.
5. If a new fix is confirmed, add a concise entry to `TROUBLESHOOTING.md` before ending the session.

Do not skip this lookup just because the likely fix seems obvious.

---

## Permissions Behaviour

If you can:

- read files
- edit files
- search the repo
- run terminal commands
- inspect logs
- run tests
- start the dev server

then do it yourself.

Do not say “you should check…” if you can check it.

Only ask the user to act when:

- the file is outside the workspace
- OS/admin permission is required
- secrets/API keys are needed
- browser login/manual UI verification is required
- a destructive action needs approval

---

## Diagnostic Workflow

For bugs, broken dev server, build failures, or unexpected runtime behaviour:

1. Reproduce or inspect the failure.
2. Capture the exact error message.
3. Check `TROUBLESHOOTING.md` for known matching symptoms or safe fixes.
4. Identify the category:
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
5. Inspect the relevant files.
6. Apply the smallest safe fix.
7. Verify the result.
8. If the fix is new and reusable, update `TROUBLESHOOTING.md`.
9. Report clearly.

---

## Next.js Dev Server Issues

If the app will not load, do not immediately reinstall dependencies.

Check in this order:

1. Confirm the project root contains `package.json`.
2. Inspect available scripts.
3. Check `TROUBLESHOOTING.md` for known Next.js/dev-server symptoms.
4. Check whether another dev server is already running.
5. Run the dev command if allowed.
6. Capture the terminal error.
7. If the error suggests stale/corrupt build state, clear `.next`.
8. Retry the dev server.
9. Only then consider deeper dependency fixes.

Safe cache reset:

```bash
rm -rf .next
```

On Windows PowerShell, use:

```powershell
Remove-Item -Recurse -Force .next
```

Do not delete `node_modules`, lockfiles, or environment files unless clearly justified and approved.

---

## Command Discipline

Prefer one targeted command over many speculative commands.

Bad:
“Try these ten commands.”

Good:
“I found evidence that `.next` is stale. I checked TROUBLESHOOTING.md, cleared `.next`, restarted the dev server, and verified the app loads.”

When commands are needed, run them yourself if available.

---

## File Editing Rules

Before editing:

- identify the relevant file
- explain the intended change briefly
- avoid touching unrelated files

After editing:

- summarize exact files changed
- explain why each change was needed

Do not refactor unrelated code while fixing a bug.

---

## Supabase Rules

Be careful with:

- RLS policies
- migrations
- storage policies
- auth assumptions
- project membership logic
- owner/editor/viewer permissions

Never weaken security for convenience.

If changing Supabase logic:

1. inspect existing policies/functions first
2. preserve membership-aware access
3. prefer minimal migrations
4. note any manual Supabase dashboard steps separately

---

## Local-First / Cloud Rules

Preserve the distinction between:

- local-only projects
- cloud projects
- migrated projects
- collaboration-enabled projects

Do not assume all users are cloud users.

Do not break local mode while fixing cloud/collab features.

---

## AI Feature Rules

Do not expose user API keys to the client.

AI calls should go through the backend route where applicable.

Preserve:

- BYOK behaviour
- Ollama/local model support
- cost/token confirmation safeguards
- privacy warnings

---

## Export / Import Rules

Do not change export/import behaviour casually.

Preserve:

- `.storyline` backup compatibility
- TipTap JSON handling
- HTML normalization
- DOCX/Markdown/Text export paths
- screenplay-specific formatting

---

## Collaboration Rules

Viewers must remain read-only.

Users must not be able to edit or delete other users’ comments.

Users may reply where allowed.

Be careful with:

- project_members
- project_comments
- presence
- realtime subscriptions
- optimistic updates

---

## Testing Expectations

After a change, verify with the most relevant checks available:

```bash
npm run lint
npm run build
npm run dev
```

Only run what is appropriate. Do not waste time running everything if the bug is isolated.

For UI changes, include a manual smoke-test checklist.

---

## Final Response Format

End every task with:

```text
Summary:
- What was wrong:
- Troubleshooting match:
- What I changed:
- Files changed:
- Commands run:
- Verification:
- Remaining risks:
```

---

## Behaviour Standard

Act more like an autonomous debugging agent and less like a chatbot.

Investigate first.
Check known fixes.
Fix second.
Verify third.
Explain last.
