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
*   **Why it matters**: Generated `Database` types already exist, but there is still scattered `(supabase as any)` and `any` usage in older data-heavy areas.
*   **Risk if ignored**: Silent runtime errors and regression risks during database schema changes.
*   **Current state**: Shared Supabase clients already use the generated `Database` types. The remaining work is incremental cleanup in older persistence, recovery, comments, export, and sidebar code.
*   **Suggested Implementation**: Reduce legacy `any` usage one problem area at a time rather than attempting a whole-app typing rewrite.
*   **Priority**: Medium

### 2. State Management Consolidation (Zustand)
*   **Why it matters**: Some shared UI state is still coordinated through local component trees and prop-drilling.
*   **Risk if ignored**: Maintainability can become painful if a specific workflow starts needing the same state in too many places.
*   **Current state**: Zustand is already in use for `projectActionsStore`, so this is not a missing dependency problem.
*   **Suggested Implementation**: Only broaden Zustand usage when a concrete shared-state pain point justifies it; do not migrate state into a global store just for architectural neatness.
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

### 6. Help System Feature Audit & Rewrite
*   **Why it matters**: The current Help page likely focuses on obvious features and may miss hidden, advanced, or mode-specific functionality (local/cloud, AI, collaboration, backup, screenplay vs prose).
*   **Risk if ignored**: Users cannot discover key features, leading to confusion, underuse of capabilities, and increased support burden.
*   **Suggested Implementation**: Perform a two-phase process:
    *   **Phase 1: Full Feature Audit** — Scan the entire codebase and extract every user-facing feature, including hidden behaviors, edge cases, role-based restrictions, and mode-specific functionality.
    *   **Phase 2: Help System Rewrite** — Convert the full feature inventory into a structured, searchable Help Center covering all features with clear "what it does," "where to find it," and "how to use it" guidance.
*   **Failure Condition**: If Phase 1 does not produce a comprehensive feature inventory, Phase 2 must not proceed.
*   **Constraints**:
    *   Do not begin until core features have stabilized.
    *   Do not allow AI to skip the audit phase.
    *   Require a final coverage check ensuring every feature is documented.
*   **Execution Prompts**:

    **Phase 1 — Full Feature Audit Prompt**

    ```md
    You are performing a FULL FEATURE AUDIT of this codebase.

    GOAL:
    Extract EVERY user-facing feature, including:
    - Visible UI features
    - Hidden or non-obvious features
    - Settings, toggles, and modes
    - Local/cloud/offline behaviours
    - Import/export/save/open behaviours
    - AI features and AI-related warnings
    - Collaboration and feedback/comment features
    - Backup, restore, merge, and recovery features
    - Asset/image/reference features
    - Screenplay/prose-specific editor behaviours
    - Keyboard shortcuts
    - Error states, fallback behaviours, and disabled states
    - Empty states and onboarding/help text
    - Helper text, tips, and labels (e.g., ensure "Testing Tip" placeholders are replaced with "Export Tip" or similar polished copy)
    - Role-based restrictions such as viewer/editor/owner permissions

    DO NOT summarize.
    DO NOT skip anything.
    ASSUME that missing features is a failure.

    PROCESS:
    1. Scan all frontend components, routes, menus, settings screens, editor extensions, dialogs, onboarding flows, and feature-specific utilities.
    2. Identify anything a user can click, trigger, configure, see, import, export, enable, disable, recover, save, open, dismiss, search, or interact with.
    3. Group features by area, such as Library, Project Creation, Editor, Structure Tree, AI, Local/Cloud, Collaboration, Feedback, Assets, Import/Export, Settings, Help, Onboarding, Admin, and Error/Empty States.
    4. Include related files/components for each feature so later agents can verify the source.
    5. Mark confidence level for each feature area.

    OUTPUT FORMAT:

    # Full Feature Inventory

    ## [Feature Area]

    ### [Feature Name]
    - What it does:
    - Where it appears:
    - When it appears:
    - Who can use it:
    - Related files/components:
    - Hidden or non-obvious behaviours:
    - Edge cases:
    - Help page priority: High / Medium / Low
    - Confidence: High / Medium / Low

    ## Missing Confidence Areas
    List anything unclear, ambiguous, or possibly incomplete.

    ## Coverage Risk
    List app areas that may need manual review by Kwame.

    IMPORTANT:
    If you are not confident that all features are captured, say so clearly. Do not pretend the audit is complete if it is not.
    ```

    **Phase 2 — Help System Rewrite Prompt**

    ```md
    Now convert the FULL FEATURE INVENTORY into a COMPLETE HELP SYSTEM.

    GOAL:
    Create a searchable, user-friendly Help Center that explains all user-facing features discovered in Phase 1.

    RULES:
    - Every feature from the Phase 1 inventory must be documented or explicitly listed as intentionally omitted with a reason.
    - Do not only document obvious features.
    - Assume users do not know hidden behaviours, advanced options, local/cloud differences, AI availability states, or role restrictions.
    - Write in clear, non-technical language for normal users.
    - Include "Where to find it" for important features.
    - Include warnings or limitations where relevant, especially around AI, privacy, local/cloud storage, file saving, collaboration, import/export, backups, and destructive actions.
    - Preserve accurate terminology from the app UI.

    SUGGESTED STRUCTURE:

    # Help Center

    ## Getting Started
    ## Project Basics
    ## Writing and Editing
    ## Planning and Structure
    ## Screenplay Mode
    ## Prose / Book Mode
    ## Local Projects and Offline Use
    ## Cloud Sync and Collaboration
    ## Feedback and Comments
    ## Assets and Visual References
    ## Import, Export, Save, and Backup
    ## AI Features
    ## Privacy and Data Choices
    ## Troubleshooting
    ## Advanced Features
    ## Frequently Asked Questions

    FOR EACH FEATURE SECTION, USE THIS PATTERN WHERE PRACTICAL:

    ### [Feature Name]
    - What it does:
    - Where to find it:
    - How to use it:
    - When it is useful:
    - Limitations or warnings:
    - Related features:

    FINAL STEP:
    Add a coverage check.

    # Coverage Check

    Create a table with:
    - Feature from Phase 1
    - Help section where it is documented
    - Status: Documented / Intentionally omitted
    - Notes

    Do not mark this task complete unless every Phase 1 feature appears in the coverage check.
    ```
*   **Priority**: Medium

## Lower Priority / Future Enhancements

### 0. First-class story summaries for outline export
*   **Why it matters**: Storyline currently has dormant export support for `node.summary` and summary-related content modes, but there is no normal user workflow or data model field for exportable scene, chapter, or act summaries.
*   **Current state**: Exporters can output summaries if `node.summary` exists, but `buildExportPayload()` does not currently populate it. The summary-related export modes were hidden from the Export Manuscript modal to avoid misleading users.
*   **Future product decision needed**:
    *   Decide whether summaries should exist at scene level only, or also chapter and act level.
    *   Decide whether summaries are manually authored, AI-generated, or both.
    *   Decide whether AI Scene Analysis summaries should remain separate from exportable story summaries.
    *   Add proper local and cloud persistence if summaries become first-class story data.
    *   Wire `buildExportPayload()` to populate `node.summary`.
    *   Re-enable `Outline Summaries` and `Outline + Prose` only after the feature is real and tested.
*   **Priority**: Low

### 0.1 Scoped exports for episodes, chapters, scenes, and selected structure nodes
*   **Why it matters**: The Export Manuscript modal previously exposed Episodes and Scenes scope options, but they were globally disabled and not connected to real project structure or export filtering.
*   **Current state**: `buildExportPayload()` currently exports all active nodes and does not use `options.scope` or `selectedIds`. The incomplete scope options were hidden from the modal to avoid confusing users.
*   **Future implementation should**:
    *   Define supported export scopes for Book and Screenplay projects.
    *   Decide whether scope options should be Episodes, Acts, Chapters, Scenes, or selected structure nodes depending on project type.
    *   Add UI for choosing specific nodes or scenes to export.
    *   Preserve selected structure order.
    *   Update `buildExportPayload()` to filter nodes based on scope and `selectedIds`.
    *   Ensure parent headings are handled correctly when exporting selected child nodes.
    *   Update Export Preview to reflect selected scope.
    *   Test Markdown, TXT, HTML, DOCX, EPUB, and PDF outputs.
    *   Verify local and cloud projects behave consistently.
    *   Re-enable scoped export UI only after the pipeline is real and tested.
*   **Priority**: Low

### 0.2 Browser download overwrite friction for same-name exports
*   **Why it matters**: On Chrome desktop for Windows, exporting a file with the same name as a recent prior download can trigger a browser-level `Needs permission to download` interruption, even when new filenames work normally.
*   **Current state**: Storyline uses normal browser blob downloads for manuscript exports. Repeated same-name exports may hit Chrome's automatic-download or overwrite protection behavior on `localhost`, which creates confusing failures during testing.
*   **Future implementation should**:
    *   Reproduce the same-name overwrite/download-permission issue reliably on Chrome desktop for Windows.
    *   Determine whether the best fix is browser guidance, filename strategy, or an in-app warning before download.
    *   Consider a small user-facing note explaining that repeated same-name exports may require allowing automatic downloads or choosing a new filename.
    *   Verify behavior across DOCX, PDF, HTML, EPUB, Markdown, and TXT exports.
*   **Priority**: Low

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

### 4. Optional Later Improvements (Backup & Assets)
*   **Description**: Refine the local-only data management and recovery experience.
*   **Status**: Native `.storyline` Save/Save As/Open workflow (Phase 1-3) implemented.
*   **Open Items**:
    *   **Versioning**: Support multiple local backups with timestamps/names rather than a single manual file.
    *   **Better asset handling**: Optimize how binary files and high-res attachments are serialized in the `.storyline` format.
    *   **Backup file size warning**: Warn users when a backup is likely to be very large (especially if assets like images are embedded).
*   **Priority**: Low

