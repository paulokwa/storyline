# Launch Feedback, Survey, and Community Roadmap

This document records the current product direction for collecting feedback around launch without overbuilding a public community system too early.

## Current recommendation

Use three separate feedback lanes:

1. **Private support email / support page**
   - Already exists and should remain the path for account issues, login problems, confusing errors, billing or AI-credit questions, sensitive writing/privacy concerns, and direct support.
   - Do not rebuild this just to support surveys.

2. **In-app launch survey**
   - Needed now for launch learning.
   - Should be lightweight, structured, and stored in the app/database rather than only arriving as freeform emails.
   - Should help answer: who is using Storyline, why they came, what confused them, what felt promising, and what would make them return.

3. **Public forum / feedback board / community space**
   - Future plan only.
   - Do not build a full custom forum for launch.
   - Revisit only after there are enough recurring users or repeated public feedback patterns to justify it.

## Why surveys should be in-app instead of email-only

Email is good for private support, but weak for product learning because replies are inconsistent, hard to compare, and easy to lose in the inbox.

An in-app survey gives structured answers that can be sorted, counted, and reviewed later. It also lets Storyline capture useful context such as the page, project mode, AI availability state, and app version without asking the user to explain everything manually.

## Launch survey scope

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

## Recommended trigger points

Use calm, non-annoying triggers:

- After first project creation
- After first meaningful editor use, e.g. 10-15 minutes or enough saved writing activity
- After first AI use, only if AI is enabled/available
- After 3-5 sessions
- Always allow manual feedback from Help / feedback entry point

Do not interrupt users repeatedly. Each survey should be dismissible, and dismissal state should be respected for that survey version.

## Storage recommendation

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

## Feedback modal idea

Add a small in-app `Send Feedback` entry from Help or the app footer/navigation.

Recommended fields:

- Feedback type: Bug / Feature idea / Confusing UX / Praise / Other
- Rating or usefulness score, optional
- Message
- Optional contact email / permission to follow up
- Auto-attached context: page path, project type, writing mode, AI state, app version, user agent

## Public forum / feedback board later

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

## Product principle

Launch feedback should reduce uncertainty without creating a maintenance burden. Start with private support plus in-app structured survey collection. Add public community tooling only when usage proves there is something worth gathering around.
