# Project Type Naming – Critical Guidance

## Purpose

This document defines the relationship between **internal project type values** and **user-facing labels** in the Storyline app.

## Core Rule (DO NOT VIOLATE)

Internal project type values must remain:

* `novel`
* `tv_script`

These values are tightly coupled to:

* Database schema constraints
* TypeScript types
* Structure generation logic
* LocalStorage draft persistence
* Export and AI logic

Changing these values will break existing projects and require a full data migration.

## User-Facing Labels

For UX purposes only, the following labels are used:

* `novel` → **Book**
* `tv_script` → **Screenplay**

This mapping exists purely at the presentation layer (see `lib/constants.ts`).

## Implementation Pattern

Always use the `getProjectTypeLabel` helper when displaying project types:

```typescript
import { getProjectTypeLabel } from '@/lib/constants'

const label = getProjectTypeLabel(project.type) // returns 'Book' or 'Screenplay'
```

Never replace internal values directly in logic or storage.

## Writing Mode Behavior

Writing mode is derived automatically based on the project type:

* `novel` → `simple`
* `tv_script` → `screenplay`

Users should not be required to select writing mode during onboarding. This is handled in the `new/page.tsx` flow using `DEFAULT_WRITING_MODE_BY_TYPE`.

## Future Changes (IMPORTANT)

If a rename is ever required (e.g. `novel` → `book` internally), it MUST include:

* Database migration (schema + data)
* Type updates across the codebase
* Backward compatibility handling
* LocalStorage migration
* Full regression testing

Do NOT perform this as a simple refactor.

## Guidance for AI Agents / Contributors

* Do NOT rename internal project types
* Do NOT “clean up” or “align naming” without explicit migration approval
* Do NOT change schema constraints casually
* Treat internal values as **stable system identifiers**, not UI text

If unsure:
→ Keep internal values unchanged
→ Adjust UI labels only

## Summary

Internal types = system logic
UI labels = user experience

These must remain decoupled.
