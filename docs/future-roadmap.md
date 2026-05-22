# Future Roadmap

This file is for future product ideas, launch-adjacent ideas, user-facing feature concepts, and non-urgent improvements that are not mainly security, performance, reliability, or architecture debt.

Use this file when an idea is real enough to remember, but not ready to become an active AI coding task in `TASK_BOARD.md`.

## What belongs here

- Feature ideas that may be useful later
- Product experience improvements that need more thought before coding
- Community, feedback, roadmap, and public launch ideas
- User-facing workflow ideas that are not urgent
- Future help, onboarding, tutorial, and showcase improvements
- Ideas that need a human decision before an AI agent should implement them

## What does not belong here

- Active AI coding tasks: put those in `TASK_BOARD.md`
- Boring but important engineering debt: put that in `docs/technical-debt-roadmap.md`
- Human-only launch chores: put those in `docs/human-launch-checklist.md`
- Durable locked decisions: put those in `DECISION_LOG.md`
- Test results or manual test checklists: put those in `TESTING.md`

---

## Future authentication and social login

### Apple OAuth / Sign in with Apple

Apple OAuth is partially implemented but intentionally parked for later. Some login/signup code exists and is hidden behind `NEXT_PUBLIC_ENABLE_APPLE_OAUTH`, which defaults OFF. Do not enable the Apple button in production until Apple Developer setup, Supabase Apple provider configuration, and browser testing are complete.

Future setup requires an Apple Developer account, Services ID, Team ID, Key ID, private `.p8` key, Supabase provider configuration, callback/return URL validation, and testing for private relay email behavior.

Google OAuth is already implemented separately and should not be changed as part of this future Apple setup. Facebook/Meta and X/Twitter remain future social-login candidates and should not be bundled into Apple work.

---

## Polish ideas from the 2026-05-11 audit

These are useful user-experience improvements, but they should not outrank launch blockers or reliability work for a lone part-time builder.

- Full dark mode polish pass. Settings and Export modal received targeted midnight coverage on 2026-05-11, but this item stays open for a broader app-wide polish pass.

---

## Local project saving on Firefox, Safari, and mobile

The File System Access API (`showSaveFilePicker`, `createWritable`) is Chromium-only. On Firefox, Safari, and all mobile browsers, `isFileSystemAccessSupported()` returns false and both "Save to file…" and "Save As…" fall back to a standard browser download. This means:

- The linked file handle is never set on these browsers.
- Every save permanently triggers a download rather than silently updating a file.
- "Save Project" and "Save As…" collapse into identical behaviour (both download).
- The "future saves will write there automatically" helper text is technically incorrect on these browsers.

### Possible future improvements

- Detect non-Chromium browsers and adjust the helper text: e.g. "Downloads a backup copy of your project."
- On Firefox/Safari, hide or disable the "Save Project" / "Save As…" distinction entirely and show a single "Download backup" action.
- Evaluate the [Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system) as a cross-browser alternative for persisting a file inside the browser sandbox (not the user's file system).
- Add a browser compatibility note to the in-app Help entry for local project saving.

### Priority

Low. This is a known browser limitation, not a regression. Most writing app users are on Chromium-based desktop browsers. Do not let this block launch or the current save UX work.

---

## Launch feedback, survey, and future community

### Current recommendation

Use three separate feedback lanes:

1. **Private support email / support page**
   - Already exists.
   - Keep it for account problems, login issues, confusing errors, sensitive writing/privacy concerns, billing or AI-credit questions, and direct support.
   - Do not rebuild the support email flow just to support surveys.

2. **In-app launch survey**
   - Needed now for launch learning.
   - This should be treated as an active implementation task in `TASK_BOARD.md` until completed.
   - The survey should be lightweight, structured, and stored in the app/database rather than only arriving as freeform emails.
   - It should help answer: who is using Storyline, why they came, what confused them, what felt promising, and what would make them return.

3. **Public forum / feedback board / community space**
   - Future plan only.
   - Do not build a full custom forum for launch.
   - Revisit only after there are enough recurring users or repeated public feedback patterns to justify it.

### Why surveys should be in-app instead of email-only

Email is good for private support, but weak for product learning because replies are inconsistent, hard to compare, and easy to lose in the inbox.

An in-app survey gives structured answers that can be sorted, counted, and reviewed later. It can also capture useful context such as the page, project mode, AI availability state, and app version without asking the user to explain everything manually.

### Launch survey scope

Keep the first survey short. Avoid long forms and repeated popups.

Recommended first-launch questions:

1. What are you mainly using Storyline for?
   - Writing a novel
   - Writing a screenplay
   - Testing AI writing tools
   - Looking for a NovelCrafter/Scrivener alternative
   - Just exploring
   - Other

2. What feels most promising so far?

3. What feels confusing or unfinished?

4. What feature would make you come back tomorrow?

5. Optional: Can Kwame contact you about this feedback?

A second tiny prompt can appear after first AI use or first meaningful editor session:

- How useful did this feel?
  - Very useful
  - Somewhat useful
  - Confusing
  - Not useful yet
- Optional note: What would improve it?

### Recommended trigger points

Use calm, non-annoying triggers:

- After first project creation
- After first meaningful editor use, e.g. 10-15 minutes or enough saved writing activity
- After first AI use, only if AI is enabled/available
- After 3-5 sessions
- Always allow manual feedback from Help or a feedback entry point

Do not interrupt users repeatedly. Each survey should be dismissible, and dismissal state should be respected for that survey version.

### Storage recommendation

Store survey and feedback responses in Supabase, not only via EmailJS.

Suggested table shape:

```txt
feedback_responses
- id
- user_id nullable
- email nullable
- type
- rating nullable
- message
- page_path
- project_type nullable
- writing_mode nullable
- ai_state nullable
- app_version nullable
- user_agent nullable
- created_at
- status: new / reviewed / planned / dismissed
```

Support email notifications can still be sent for high-priority feedback, but the database should be the source of truth for survey/product feedback.

### Review status workflow later

The current `feedback_responses` table in Storyline does not yet include a `status` column, so the admin dashboard can show responses but cannot mark them as:

- `new`
- `reviewed`
- `planned`
- `dismissed`

This is acceptable for the current launch phase because the immediate need is simple visibility into incoming survey responses, not a full triage system.

Do not treat missing status tracking as a launch blocker. It becomes worth implementing only when feedback volume is high enough that Kwame needs to answer questions like:

- Which responses have I already looked at?
- Which ideas are worth building?
- Which responses can I safely ignore?

When that threshold is reached, the follow-up implementation should be small and deliberate:

1. Add a `status` column to `feedback_responses` with conservative allowed values.
2. Keep status editing admin-only.
3. Add simple filters in the existing admin dashboard.
4. Avoid turning this into a full support desk, CRM, public roadmap, or email workflow.

Recommended future values:

- `new`
- `reviewed`
- `planned`
- `dismissed`

Recommended product rule: the survey database remains the source of truth, while status is only a lightweight internal review aid for the product owner.

### Feedback modal idea

Add a small in-app `Send Feedback` entry from Help or the app footer/navigation.

Recommended fields:

- Feedback type: Bug / Feature idea / Confusing UX / Praise / Other
- Rating or usefulness score, optional
- Message
- Optional contact email / permission to follow up
- Auto-attached context: page path, project type, writing mode, AI state, app version, user agent

### Public forum / feedback board later

Do not build a full public forum for launch. An empty forum can make a young product feel abandoned.

Revisit a public space when one or more of these are true:

- Users repeatedly ask similar support questions
- Users are sharing feature ideas faster than email/in-app feedback can handle
- There are enough recurring users to help each other
- Kwame wants public roadmap voting or transparent feature-request discussion

Possible future options:

- GitHub Discussions if the audience is technical
- Discord if the goal is community energy and quick back-and-forth
- Canny / Featurebase / Nolt-style feature board for voting and roadmap triage
- Discourse / Flarum only if a standalone forum is truly justified

Product principle: launch feedback should reduce uncertainty without creating a maintenance burden. Start with private support plus in-app structured survey collection. Add public community tooling only when usage proves there is something worth gathering around.

---

## Novel structure: Part node type

### What was observed (2026-05-19)

During a session where the AI import wizard was used to detect and import a book, it created a node called "Prologue / Start" at the root level with a scene called "Prologue / S..." nested inside it. Visually this looked correct, but the question arose: is "Prologue / Start" a Chapter or a Part?

The answer is that the AI import wizard mapped it as a `chapter` node — the nearest available type — but semantically it is acting as a **Part**: a top-level structural grouping that contains chapters, not scenes directly.

### The gap

The current novel node hierarchy has only two user-created levels:

```
root_novel
  └── chapter    ← the only top-level grouping type
        └── scene  ← the only leaf type
```

There is no `part` type. Books that use a three-level structure (Parts → Chapters → Scenes) cannot represent that structure properly. Instead:

- The AI import wizard maps Parts to `chapter` nodes (closest available)
- Users who want sub-division inside a chapter can use the sub-chapter feature (a `chapter` node nested inside another `chapter`), but this is a workaround, not a true Part
- A sub-chapter at depth 1 looks like a chapter visually but carries no semantic distinction from a regular chapter

### What a proper Part type would look like

```
root_novel
  └── part         ← new type: "Part 1", "Prologue", "Act One"
        └── chapter  ← existing type, now a child of part
              └── scene  ← unchanged
```

### What would need to change in the code

This is a meaningful change touching multiple layers:

1. **`NodeType`** in `lib/supabase/types.ts` — add `'part'` as a valid type value
2. **`CHILD_TYPE`** in `StructureTree.tsx` — add `part: 'chapter'` mapping
3. **`NODE_ICONS`** and **`NODE_DISPLAY_NAMES`** in `StructureTree.tsx` — add Part icon and label
4. **`project-blueprint.ts`** — update AI import to emit `part` nodes when it detects top-level groupings above chapters
5. **`CHILD_DISPLAY_NAMES`** in `StructureTree.tsx` — update Part entry
6. **Database migration** — the `structure_nodes.type` column likely has a check constraint listing valid types; `'part'` must be added to it
7. **`docs/PROJECT_TYPES.md`** — update the type mapping documentation
8. **`addRootNode`** in `StructureTree.tsx` — decision needed: do novels now add a Part at root level, or still a Chapter? (Probably add an option, or default to Chapter and let user choose.)
9. **The sub-chapter `+` popover** added 2026-05-19 — would need a third option or restructure: Add Scene / Add Chapter / Add Part (if inside a Part)

### Why it is not trivial

- It adds a third level to the novel hierarchy everywhere: editor, AI context, export, import, collaboration
- Export paths (DOCX, Markdown, HTML) would need to be aware of Parts as a structural level
- The AI context system that gathers chapter-level content for AI would need to understand Part boundaries
- The existing sub-chapter workaround (chapter-inside-chapter) creates ambiguity: should existing sub-chapters be migrated to Parts if this type is added?

### Recommendation

Do not implement before launch. The sub-chapter workaround is functional for users who need nesting. Revisit after launch if user feedback consistently identifies the missing Part level as a pain point — particularly from users importing long novels with explicit Part divisions.

When implementing, treat the database migration and AI import update as the highest-risk parts and do those first with branch testing before touching the UI.

---

## First-run Structure guide

Consider a one-time optional guide after import or first project creation:

- Explain Project > Chapter group > Scene (and Episode > Act > Scene for TV scripts)
- Explain that icons identify the real structure type, not the title
- Explain that renamed scenes keep their original type
- Link to the export preview explanation so users understand why counts reflect structure types, not item titles

This should be lightweight and dismissible — not a forced multi-step tour. The existing `?` help affordance in the Structure panel is the v1 solution; this item tracks a more prominent first-run version for later.

Do not implement before launch. Revisit if user research or feedback shows confusion about structure types being a recurring pain point.

---

## Help system feature audit and rewrite

This is a future user-facing product improvement, not current technical debt.

### Why it matters

The Help Center can easily drift behind the app because Storyline has many features: local/cloud projects, AI setup modes, collaboration, comments, backup/open/save/open workflows, screenplay mode, prose mode, exports, assets, visual references, settings, and hidden keyboard behavior.

A quick “make the help page better” prompt is not enough. The safer process is a two-phase audit and rewrite.

### When to do it

Do not start this until the main launch feature set has mostly stabilized. If the app is still changing quickly, the help rewrite will go stale immediately.

### Phase 1: Full feature audit

Goal: extract every user-facing feature from the codebase before rewriting help articles.

The audit should include:

- Visible UI features
- Hidden or non-obvious features
- Settings, toggles, and modes
- Local/cloud/offline behavior
- Import/export/save/open behavior
- AI features and AI-related warnings
- Collaboration and feedback/comment features
- Backup, restore, merge, and recovery features
- Asset/image/reference features
- Screenplay/prose-specific editor behavior
- Keyboard shortcuts
- Error states, fallback behavior, and disabled states
- Empty states and onboarding/help text
- Helper text, tips, labels, and role-based restrictions

Output should group features by area and include related files/components so future agents can verify the source.

### Phase 2: Help system rewrite

Only start this after Phase 1 produces a comprehensive feature inventory.

The final Help Center should cover:

- Getting Started
- Project Basics
- Writing and Editing
- Planning and Structure
- Screenplay Mode
- Prose / Book Mode
- Local Projects and Offline Use
- Cloud Sync and Collaboration
- Feedback and Comments
- Assets and Visual References
- Import, Export, Save, and Backup
- AI Features
- Privacy and Data Choices
- Troubleshooting
- Advanced Features
- Frequently Asked Questions

Each important feature should explain what it does, where to find it, how to use it, when it is useful, limitations/warnings, and related features.

A final coverage table should map every feature from the audit to the help section where it was documented. Do not mark the rewrite complete unless every audited feature is either documented or intentionally omitted with a clear reason.

---

## Showcase, benefits, and marketing pages

### Feature list / benefits page

The feature list / benefits page covering autosave, recovery, snapshots, backup, local/cloud options, AI workflow help, and privacy choices appears to have already been implemented or substantially addressed in earlier work.

If future agents find this item still sitting in `TASK_BOARD.md`, they should verify whether it is already done before re-implementing it. If it is done, move it to Done or remove it from active planning.

### Showcase page refresh

The final showcase page should be updated after a root-and-branch feature audit and after the app name, branding, and key UI polish are settled.

This belongs in `docs/human-launch-checklist.md` as a launch item because Kwame needs to judge the final story, screenshots, branding, and positioning. AI can help write copy or implement the page later, but the human launch decision comes first.

---

## Local, offline, and cross-device future ideas

### Google Drive or similar sync options

Consider offline/cross-device sync options such as Google Drive only as a future product idea.

This is not the same as the technical pending-sync queue described in `docs/technical-debt-roadmap.md`. Google Drive sync would be a product and architecture decision about how users move or sync `.storyline` files across devices.

Questions to answer before coding:

- Is the goal backup, sync, sharing, or all three?
- Would this apply only to local projects, or also cloud projects?
- Would Storyline write directly to Google Drive, or guide users to store `.storyline` files in their own synced folder?
- How would conflicts be handled if two devices edit the same file?
- Would this create privacy/trust concerns for users who chose local-only mode?

Do not start coding this until the desired user story is clear.

### Browser back guard for unsaved import progress

The Import Wizard now warns users before losing unsaved import progress through visible in-app navigation such as Back, Archive/Library, Home/logo, avatar menu actions, refresh, and tab close.

One known limitation remains: browser back/popstate navigation is not fully intercepted. This is acceptable for now because the main visible app exits are guarded, and browser/router-level interception can become brittle in Next.js App Router.

Future idea: consider a more complete unsaved-changes/navigation guard system if users still report accidental import loss through browser back. This should be treated as a UX enhancement, not security/performance debt, unless real usage shows it causing repeated data-loss problems.

---

## Free local user support prompts

Explore non-annoying support prompts for free local users, such as donate, review, share, or upgrade nudges.

This should stay as future product thinking until Kwame decides the monetization and tone. The important thing is to avoid making local/offline users feel punished or manipulated. Any prompt should feel optional, calm, and respectful.

Possible directions:

- A small “Support Storyline” link in settings or help
- Occasional non-blocking reminder after meaningful usage milestones
- A “share with another writer” nudge
- A donation or one-time support option
- Upgrade prompts only where cloud or paid features are clearly relevant

Do not implement this until the launch pricing/trial model is decided.

---

## Future editor, proofing, and writing features

These items are intentionally future-facing. They are not approval to turn Storyline into Microsoft Word or Google Docs. Storyline should remain a focused creative-writing app with strong manuscript comfort, screenplay-aware editing, reliable export, and compatibility with browser/third-party proofing tools.

### Story dictionary / custom dictionary

Fiction projects often contain invented names, places, species, magic terms, technical jargon, and stylized language. Browser spellcheck will flag many of these repeatedly.

Future idea:

- Add a project-level Story Dictionary for approved custom words.
- Allow manual additions from settings and possibly editor context actions.
- Consider Codex integration so character/location/object names and aliases can be treated as known terms.
- Keep this separate from full grammar checking.

### Ignore word for invented names and terms

Writers may need a quick way to stop seeing repeated false positives.

Future idea:

- Provide “Ignore in this project” if/when the app gains its own proofing layer or story dictionary UI.
- Store ignored terms per project unless a later settings design supports global ignored words.
- Do not build this before a clear dictionary/proofing architecture exists.

### Codex-aware spellcheck hints

Storyline already has a Codex-like story knowledge system. In the future, that system could help distinguish genuine typos from valid story terms.

Future idea:

- Treat Codex names and aliases as allowed project terms in a future proofing pass.
- Optionally detect near-matches to Codex entries as possible typos.
- Keep suggestions gentle and optional to avoid noisy editor behavior.

### Readability stats

Some writers like quick feedback on sentence length, reading level, pacing density, or scene complexity.

Future idea:

- Add non-blocking readability stats as a review/analytics feature rather than intrusive inline warnings.
- Consider scene-level and project-level summaries.
- Avoid moralizing or prescriptive scoring. Present stats as optional writing information.

### Suggested edits / review mode

Collaboration may eventually benefit from suggested replacements rather than only comments.

Future idea:

- Revisit only after collaboration and comments are stable.
- Keep it narrow: suggested text replacements with accept/reject, not a full word-processor revision engine.
- Define export behavior before implementation.

### Compare documents

Useful for advanced revision workflows, but expensive and complex relative to current product goals.

Future idea:

- Defer unless users strongly request it.
- Prefer version history or scene snapshots first if revision comparison becomes important.

### Citations

Helpful for academic/nonfiction workflows, but not central to a fiction/screenplay-first app.

Future idea:

- Do not build unless Storyline deliberately expands into nonfiction/research workflows.
- Keep it separate from the core creative editor.

### Headers, footers, page numbers, and columns

These are document layout features, not core creative drafting features.

Future idea:

- Keep out of the editor for now.
- Consider page numbers only inside export templates or manuscript preview, not the live writing surface.
- Avoid columns unless a future export/layout system specifically requires them.

### Full export formatting templates

Writers may eventually want manuscript presets, screenplay formatting presets, or publisher/submission-oriented export styles.

Future idea:

- Design an explicit export formatting model instead of casually wiring live editor display preferences into export.
- Start with a small set of presets, e.g. manuscript draft, compact proofing copy, screenplay standard.
- Make preview and output match closely before exposing many options.

---

## Selected chapter and scene export

### Why it can wait

Most first-time users will export the whole manuscript. That is the normal, obvious path:

> "I finished my project. Give me the file."

Selected export is a power-user feature. The use cases are real:

- "I only want Chapter 4."
- "I want to send just these scenes to a beta reader."
- "I want to export Act 2 only."
- "I want a summary-only outline."

Useful? Yes. Launch-critical? No.

### What is already scaffolded

The type system already defines `ExportScope` (`'entire_project' | 'selected_chapters' | 'selected_scenes'`) and `selectedIds?: string[]` in `ExportOptions`. These exist as type scaffolding only. The modal hardcodes `scope: 'entire_project'` and never populates `selectedIds`. No renderer reads `scope` or `selectedIds` — they are unreachable today.

Do not remove the scaffolding. It is cheap to keep and makes the future implementation easier to wire in.

### What a future implementation would require

1. UI to let the user select chapters or scenes inside the Export Modal — checkboxes or a tree picker.
2. `buildExportPayload` filtering by `selectedIds` instead of returning all active nodes.
3. All renderers already iterate the node list, so filtering at the payload level should be sufficient.
4. Edge cases: what if a selected scene's parent chapter is not selected — does the chapter heading appear? What if no scenes are selected?

### Recommendation

Do not implement before launch. Entire-project export covers the majority use case. Revisit after launch if users consistently report needing selective export — particularly users sending drafts to beta readers or editors chapter-by-chapter.

---

## Magic Detect and AI import

### Current Ollama behaviour

Magic Detect currently requires a cloud AI provider (Gemini, OpenAI, or OpenRouter) and explicitly blocks plain Ollama. This is an architectural constraint, not an anti-local product decision.

Ollama runs as a local server on the user's own device, usually at `http://127.0.0.1:11434`. The Magic Detect API route runs server-side on Netlify. A server in a data centre cannot reach `http://127.0.0.1` on a user's laptop — that address means "this machine, right here." There is no simple config or firewall fix for the current server-side route.

The current UX should keep the Magic Detect button disabled or blocked when the selected provider is Ollama and no permitted cloud route is available. The copy should avoid making it sound as if Storyline's servers are trying to reach into the user's device. Prefer wording like:

> Magic Detect does not support local Ollama yet. Ollama runs on your device, while Magic Detect currently runs through Storyline's cloud AI route.

### Near-term option: explicit cloud fallback for this import

If the user has selected Ollama but has already configured a cloud fallback provider, Magic Detect can offer an explicit consent-based fallback path without making Ollama itself work locally.

Recommended product behaviour:

- Do not silently use fallback.
- Detect whether a cloud fallback provider is configured and usable.
- If yes, expose a modal/card action such as **Use cloud fallback for this import**.
- Clearly state that manuscript text will be sent to the configured cloud fallback provider for Magic Detect.
- Clearly state that Ollama remains the user's default provider afterward.
- Scope the fallback to this Magic Detect run/import only; do not permanently switch the user's provider.
- Keep **Open Account Settings** and **Continue without Magic Detect** as alternatives.

This is the best near-term improvement because it avoids a large architecture change while respecting privacy expectations. It is especially important because Magic Detect may process substantial manuscript text, which is more sensitive than a short chat message.

Suggested modal copy when fallback exists:

> Magic Detect cannot run through local Ollama yet. You can use your configured cloud fallback for this import. Your manuscript text will be sent to that cloud provider for detection. Ollama will remain your default AI provider afterward.

Suggested buttons:

- **Use cloud fallback for this import**
- **Open Account Settings**
- **Continue without Magic Detect**

### Trial credits handling

If a user has free trial AI credits but no cloud fallback is configured, do not silently choose a cloud provider for them unless Storyline already has an explicit, transparent trial-credit provider selection model.

Recommended product behaviour:

- Mention that trial credits may be available.
- Offer a clear path to choose/configure a cloud provider.
- Avoid a one-click "use trial credits" action if the provider choice would be hidden.
- Do not permanently switch the user's provider without consent.

Suggested modal copy when credits exist but fallback does not:

> Magic Detect requires a cloud AI provider. You may have trial credits available, but you need to choose a cloud provider before using them for Magic Detect.

Suggested buttons:

- **Choose cloud provider** / **Open Account Settings**
- **Continue without Magic Detect**

### Future option: browser-to-Ollama Magic Detect

A true local Magic Detect path could eventually have the browser call the user's local Ollama instance directly, similar to how other client-side Ollama AI features work.

High-level idea:

- The import wizard keeps manuscript text client-side.
- The browser sends the Magic Detect prompt/chunks directly to the configured Ollama URL.
- Ollama returns structured JSON containing proposed chapter/scene boundaries.
- The client validates and previews the result before import.
- The server is not involved in the local model request except possibly for auth/session state or saving the final imported structure.

Why this is promising:

- It preserves the local-first trust promise.
- It avoids sending manuscript text to cloud AI.
- Ollama supports structured JSON-style responses, making a chapter-boundary schema plausible.

Main blockers:

- Browser CORS friction. Many users would need to configure `OLLAMA_ORIGINS` to allow requests from the deployed Storyline domain.
- Setup friction is too high for normal writers.
- Local models vary greatly in quality, context window, and JSON reliability.
- Large manuscript chunking/retry/error handling would need careful UI.

Verdict: feasible later, but not recommended as the immediate solution unless Storyline adds a guided local setup flow, a desktop wrapper, or a local companion bridge.

### Future option: local quick detect parser

A non-AI parser could detect obvious headings and separators locally without any AI provider.

Examples it could detect:

- `Chapter 1`, `Chapter One`, `CHAPTER TWELVE`
- `Prologue`, `Epilogue`, `Part II`
- Markdown headings such as `# Chapter 3`
- Scene separators such as `***`, `---`, or custom markers

Product warning:

This should not be branded as full Magic Detect because it cannot solve the hard semantic cases: messy manuscripts without clear headings, time jumps, POV shifts, or subtle scene/chapter boundaries. It overlaps with existing heading/custom-marker split strategies.

If built, call it something like **Local quick detect** or **Detect obvious headings**, not **Magic Detect with Ollama**.

### Future option: desktop wrapper or local companion bridge

The cleanest long-term local-first solution is a desktop wrapper or small local companion process that can reliably talk to Ollama and the web app without browser CORS headaches.

Possible forms:

- Tauri/Electron desktop app wrapper.
- Local companion service that brokers requests between Storyline and Ollama.
- Self-hosted Storyline mode where both the app and Ollama run on the same device/network.

Why this is strong:

- Better local AI reliability.
- Better file-system and backup possibilities.
- Better privacy story for local-first users.

Why it should stay future-only:

- It is a real architecture/product investment.
- It adds install/update/support burden.
- It should not be mixed into launch polish.

### Future option: shared AI client abstraction

A later architecture pass could unify cloud and local AI request handling through a shared provider interface so features do not have to special-case Ollama as often.

Possible goal:

- Shared provider capability checks, e.g. `supportsServerSide`, `supportsClientSide`, `supportsStructuredOutput`, `supportsLargeContext`, `requiresUserConsentForCloudFallback`.
- Feature-level capability gates for Magic Detect, AI Partner, Scene Analysis, summarization, extraction, and future AI tools.
- Cleaner fallback logic that is explicit and auditable.

This is useful future architecture work, but it should not be started just to fix the current Magic Detect modal.

### Current recommendation

Near term:

1. Keep Magic Detect blocked for plain Ollama.
2. Improve modal copy so it explains that local Ollama is not supported yet without sounding invasive.
3. If a cloud fallback exists, offer **Use cloud fallback for this import** with clear consent.
4. If trial credits exist but no fallback/provider is configured, guide the user to Account Settings rather than silently selecting a provider.
5. Keep manual split options visible and easy.

Long term:

1. Revisit browser-to-Ollama Magic Detect only after demand is proven or local setup becomes easier.
2. Consider a local quick-detect parser as a modest non-AI improvement, but do not oversell it.
3. Consider a desktop/local companion path only if Storyline deliberately moves further into local-first power-user territory.
4. Consider a shared AI provider capability layer after launch if AI feature routing becomes messy.

Related context: this came from a 2026-05-18 ChatGPT planning discussion about whether Gemini's suggestions changed the Magic Detect/Ollama recommendation. Chat link for Kwame's reference: https://chatgpt.com/g/g-p-69c7f39a24148191910ed755d079daab-creative-ai-app/c/6a0b434c-3054-83ea-bb7c-939d1841c5b1

---

## Workflow and planning ideas

### GitHub Project board

Consider adding a GitHub Project board later if the Markdown continuity system becomes too limiting.

Keep the current Markdown workflow until there is a real pain point. Markdown remains easier for AI agents, easier to review in Git history, and less likely to create tool friction.

Possible reason to add GitHub Projects later:

- More contributors
- Many parallel tasks
- Need for labels, assignees, milestones, or visual status columns
- Better separation between bugs, features, launch tasks, and technical debt

Do not add this just because it seems more “professional.” Add it only if it reduces confusion.
