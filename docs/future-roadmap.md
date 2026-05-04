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

## Help system feature audit and rewrite

This is a future user-facing product improvement, not current technical debt.

### Why it matters

The Help Center can easily drift behind the app because Storyline has many features: local/cloud projects, AI setup modes, collaboration, comments, backup/open/save workflows, screenplay mode, prose mode, exports, assets, visual references, settings, and hidden keyboard behavior.

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
