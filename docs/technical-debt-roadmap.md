# Technical Debt & Reliability Roadmap

This document tracks identified architectural risks, technical debt, and reliability improvements that were deferred during initial development. It serves as a guide for future agents or engineers to harden the application.

## High Priority Later

### 1. Atomic Project Scaffolding (RPC)
*   **Why it matters**: Currently, project creation involves multiple sequential `INSERT` calls (Project -> Episode -> Act -> Scene). If any step fails (network drop, server timeout), it leaves "zombie" projects with missing structural components.
*   **Risk if ignored**: Data corruption and a broken onboarding experience for new users.
*   **Suggested Implementation**: Move the scaffolding logic into a single PostgreSQL Stored Procedure (RPC) in Supabase. This ensures the entire project structure is created in a single database transaction.
*   **Priority**: High

### 2. Centralized Rate Limiting
*   **Why it matters**: The AI routes currently use an in-memory `Map` for rate limiting. In a serverless environment (Next.js/Vercel), this registry is reset on every "cold start" and is not shared across distributed instances.
*   **Risk if ignored**: API exploitation and excessive Gemini API costs.
*   **Suggested Implementation**: Replace the in-memory Map with a centralized store like Upstash Redis or use Supabase Edge Functions with a dedicated rate-limiting middleware.
*   **Priority**: High

### 3. Robust Retry & Initialisation Patterns
*   **Why it matters**: The editor save and project initialization flows rely on standard `async/await` without sophisticated retry logic.
*   **Risk if ignored**: Intermittent network failures can lead to "Save Failed" states that require manual user intervention.
*   **Suggested Implementation**: Implement an exponential backoff retry strategy for core Supabase operations, especially for the `SceneEditor` save flow.
*   **Priority**: High

### 4. AI Trial Reconciliation & RPC Failure Handling
*   **Why it matters**: The free-trial AI system is server-authoritative, but several routes still assume `finalize_ai_trial_usage`, `fail_ai_trial_usage`, and trial-grant RPCs succeed once called.
*   **Risk if ignored**: Balance drift, silent trial-grant failures, or usage-event rows that do not reconcile cleanly with account balances after provider errors or partial failures.
*   **Suggested Implementation**: Add explicit error handling and alerting around all trial RPC calls, add an admin-visible reconciliation check between `ai_trial_accounts`, `ai_usage_events`, and `ai_trial_ledger`, and add tests for duplicate submit / retry / provider failure scenarios.
*   **Priority**: High

### 5. AI Abuse Controls Hardening
*   **Why it matters**: Current trial abuse protections rely on normalized email checks, a static disposable-domain list, forwarded IP headers, and a browser fingerprint. These are useful signals but remain easy to evade.
*   **Risk if ignored**: Trial farming, noisy false negatives, and avoidable sponsored AI spend during wider rollout.
*   **Suggested Implementation**: Add stronger signup friction for suspicious traffic, move rate limiting to centralized infrastructure, expand or externalize disposable-domain intelligence, and treat fingerprint/IP signals as heuristics rather than strong identity.
*   **Priority**: High

## Medium Priority Later

### 1. Unified Type Safety (Supabase Generics)
*   **Why it matters**: There is widespread use of `(supabase as any)` and `any` types in data-heavy components.
*   **Risk if ignored**: Silent runtime errors and regression risks during database schema changes.
*   **Suggested Implementation**: Wire the generated `Database` types from `lib/supabase/types.ts` into every `createClient` call and component prop definition.
*   **Priority**: Medium

### 2. State Management Consolidation (Zustand)
*   **Why it matters**: Component state (active scene, writing mode, sidebar status) is currently managed via prop-drilling from `StoryTab` down to nested children.
*   **Risk if ignored**: Maintainability becomes "painful" as the app grows; excessive re-renders.
*   **Suggested Implementation**: Move shared UI and Project state into a centralized Zustand store (e.g., `useProjectStore`).
*   **Priority**: Medium

### 3. Structure Tree Performance
*   **Why it matters**: The `StructureTree` re-renders frequently and uses nested mapping for large trees.
*   **Risk if ignored**: Significant UI lag in projects with hundreds of scenes or chapters.
*   **Suggested Implementation**: Implement `React.memo` for tree nodes and verify performance via React Profiler. Consider a virtualized list if the tree exceeds 500+ nodes.
*   **Priority**: Medium

### 4. AI Trial Cost Model Calibration
*   **Why it matters**: The sponsored AI budget currently uses character-based token estimation and fixed reserve profiles rather than exact provider billing data.
*   **Risk if ignored**: The internal `$2` cap stays approximate. It is protected against obvious overspend in app balance terms, but it may still undercount real provider cost for some request shapes.
*   **Suggested Implementation**: Compare estimated cost against real provider usage during limited testing, tighten endpoint reserve profiles, and bias reserves toward conservative underspend for app-managed trial mode.
*   **Priority**: Medium

### 5. Local AI Usage Logging Integrity
*   **Why it matters**: The Ollama logging endpoint is useful for admin analytics, but it currently trusts authenticated client posts for local usage event reporting.
*   **Risk if ignored**: Admin reporting for local AI can become noisy or misleading, especially if clients post malformed or duplicated usage events.
*   **Suggested Implementation**: Validate active mode before accepting local usage logs, deduplicate more aggressively, and clearly separate analytics-grade data from billing-grade data in admin views.
*   **Priority**: Medium

## Lower Priority / Future Enhancements

### 1. Advanced Offline / Pending Sync
*   **Description**: Beyond the current `localStorage` fallback, implement a robust "Pending Sync" queue that automatically uploads changes when the connection returns.
*   **Implementation**: Service Worker or a background polling sync manager.
*   **Priority**: Low

### 2. Destructive Action Guards
*   **Description**: Add "Type 'DELETE' to confirm" modals for high-impact actions like deleting an entire Episode or Part.
*   **Priority**: Low

### 3. Writing UX Polish
*   **Description**: Implement subtle animations for cursor focus, smoother "paper" transitions, and customizable font-size/theme settings (Sepia/Dark).
*   **Priority**: Low
