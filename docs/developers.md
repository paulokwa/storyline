# Developer Notes

Developer-only routes, preview modes, and other reference information for contributors.

## Developer Test Routes

| Route | Purpose | Source |
|-------|---------|--------|
| `/welcome?preview=1` | Preview the onboarding flow. Requires `NODE_ENV=development`. | `app/(app)/welcome/page.tsx` |
| `/dev/showcase` | Preview the marketing landing page. | `app/dev/showcase/page.tsx` |
| `/admin/survey-preview` | Admin-only preview route for the in-app launch survey. Does not mark the normal survey as dismissed/completed in local storage. | `app/(app)/admin/survey-preview/page.tsx` |
