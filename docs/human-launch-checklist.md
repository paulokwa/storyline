# Human Launch Checklist

This file is for decisions and launch chores that Kwame needs to handle as the product owner. These are not normal AI coding tasks.

Use this file when something needs human taste, business judgment, launch judgment, branding judgment, or external work outside the codebase.

## What belongs here

- Product decisions Kwame needs to make before an AI agent should code
- Branding and naming choices
- Launch content and tutorial work Kwame plans to do outside vibe coding
- Business/pricing decisions
- Final checks where human taste matters more than code
- Work that AI can help plan or draft, but cannot truly complete alone

## What does not belong here

- Active implementation tasks for AI agents: put those in `TASK_BOARD.md`
- Engineering debt, reliability, performance, security, performance, architecture, or data-integrity work: put those in `docs/technical-debt-roadmap.md`
- Future product ideas that are not launch chores yet: put those in `docs/future-roadmap.md`
- Locked decisions that future agents must not reverse: put those in `DECISION_LOG.md`

---

## Product decisions Kwame needs to make

### Launch trial and cloud pricing model

Decide the public launch model before public launch.

Questions to answer:

- Will the app launch as a free beta, paid beta, freemium, or trial?
- How long should any trial last?
- Which features should be available without payment?
- Should cloud projects be limited during trial?
- How much sponsored AI credit should a new user get, if any?
- Should users bring their own AI key, use local Ollama, use app-managed trial credit, or choose between all three?
- What should the showcase/onboarding copy say so users understand AI costs clearly?

AI agents should not invent this business model. Once Kwame decides, an AI agent can update pricing copy, onboarding copy, settings copy, and any relevant UI.

### Subscription readiness without hidden billing

Before launch, decide whether to add only the minimum account-plan structure needed for future paid plans, without building or hiding a full subscription/billing system.

Current guidance:

- Do not build a full hidden subscription system before launch.
- Do add a lightweight plan/entitlement skeleton so paid plans can be enabled later without a panic rebuild.
- Keep launch focused on free early access, user feedback, and validation before implementing Stripe/Paddle/Lemon Squeezy billing.

Possible account/profile fields to consider:

```ts
plan: "early_access" | "free" | "pro";
early_access_grandfathered: boolean;
plan_started_at: string | null;
plan_source: "early_access" | "manual" | "billing" | null;
```

Product decisions to make before implementation:

- Should all early access users automatically become lifetime Pro if paid plans launch later?
- What exact wording should be used so the promise is generous but not legally reckless? Example: "Free lifetime Pro access for this app/account, as long as the service continues to operate."
- Should the UI be quietly structured so future Pro features can be gated later, even if nothing is gated at launch?
- Which features would likely become Pro later, and which features must remain free/local-first to preserve the app's trust position?
- Should launch pricing be framed as an early-supporter price, for example $3.99 USD/month, with a possible later standard price such as $5.99 USD/month?

AI agents can help design the entitlement fields and future-proof UI logic, but they should not implement live billing or user-facing paywalls until Kwame explicitly decides to start paid-plan work.

### Final app name

Decide the final public app name before final branding, screenshots, icons, email copy, and naming consistency work.

Current working name: Storyline.

Once the name is final, AI can perform a full naming consistency pass across the app, help center, emails, metadata, and marketing pages.

### Mask the Email Name

mwakedev@gmail shouldnt show to the users in the showcase and other areas - .

### AI terminology

Decide whether the app should consistently say `AI`, `Assistant`, `Muse`, `AI Partner`, or another label.

This matters because mixed terms can make the app feel unfinished. It also affects trust: plain `AI` may be clearer, while a branded term may feel warmer but can be confusing if overused.

Once Kwame chooses the terminology, AI can audit the app and update copy consistently.

### AI Partner Story Scope cleanup

After the new AI Partner `Story Scope` selector is browser-tested, decide whether to remove or de-emphasize the old Structure-panel scene checkboxes. They are intentionally still present for now as a safe fallback. Cross-reference: `TASK_BOARD.md` / `TESTING.md` Phase 6 Story Scope validation.


### Branding and design help

Consider whether to pay a designer, Fiverr freelancer, or other outside helper for branding, logo assets, landing/showcase polish, or visual identity.

This is not required, but it may save time if the app gets close to public launch and the remaining work is more about taste than code.

---

## Branding and launch assets

### Final logo and favicon direction

Create browser icons/favicons only after the final app name and visual direction are settled.

AI can generate drafts or implement favicon files later, but Kwame should approve the direction first.

### Verification and welcome email branding

Personalize the verification, invite, password reset, magic link, and welcome emails that users receive.

The current emails may still look generic or Supabase-branded unless the Supabase Auth email templates, sender name, subject lines, reply-to address, and redirect URLs are reviewed and updated.

Do this after the final app name is chosen so the wording, sender identity, support address, and visual branding do not need to be redone.

Checks to complete:

- Replace any Supabase-branded or generic template wording with final app branding.
- Confirm the sender name, reply-to/support email, subjects, and call-to-action buttons feel trustworthy.
- Confirm verification links, password reset links, magic links, and invite links redirect to the correct production app URLs.
- Send test emails to a real account and check desktop/mobile rendering before public launch.

### Supabase auth redirect allowlist decision

After production signup is confirmed working, decide whether to remove `http://localhost:3000/**` from the Supabase Auth redirect allowlist.

Context: a live verification email previously opened `localhost` because the production `NEXT_PUBLIC_SITE_URL` value was missing, so generated auth links fell back to the local dev URL. Keeping localhost in the Supabase allowlist is useful during active local development, but production code must never generate localhost auth links.

Pre-launch checks:

- Confirm Netlify production has `NEXT_PUBLIC_SITE_URL` set to the live app domain.
- Confirm Supabase Site URL is the live app domain.
- Confirm new production verification and password reset emails open the live app, not localhost.
- Keep localhost allowed only if it is still needed for local auth testing.
- If removing localhost, remember that local signup/reset auth testing may stop working until it is temporarily re-added.

### Auth verification edge-case launch check

Before launch, confirm the remaining signup verification edge case is fixed and retested.

Context: manual testing confirmed new signup emails now use the clean production redirect and normal first-time verification works. However, reused/expired signup verification links still landed on `/library?error=Invalid_Or_Expired_Token` instead of the intended friendly login guidance. Keep the detailed record in `TESTING.md` under `Auth / Sessions` before deciding this is launch-ready.

Minimum launch checks:

- Reused/expired signup verification links show clear login guidance, not a confusing library URL with raw auth error text.
- Opening another account's fresh signup verification link while already signed in does not silently land in the wrong account.
- Password reset emails use the clean production URL.
- Supabase email rate limits are avoided during final testing by using only the minimum required email-link checks.

### Full naming consistency pass

Perform a full app naming consistency pass after the final app name is chosen.

This includes:

- App header/nav labels
- Help Center references
- Legal/footer references
- Email wording
- Metadata/title tags
- Showcase/landing copy
- Any old working-name leftovers

AI can do the codebase pass, but Kwame needs to make the name decision first.

### Final showcase screenshots

Capture final showcase screenshots after the app name, branding, and key UI polish are settled.

Screenshots taken too early will go stale quickly. Wait until the core screens and visual polish are close to launch-ready.

---

## Showcase, help, and launch content

### Update feature/showcase page after a root-and-branch audit

The showcase page should be updated after the app has had a proper feature audit.

Why this is a human launch item:

- Kwame needs to decide what the app should emphasize publicly.
- Screenshots and copy should match the final product story.
- AI can write or implement copy, but the positioning should come from Kwame.

Recommended order:

1. Finish major feature and polish work.
2. Run the full feature audit described in `docs/future-roadmap.md`.
3. Decide which features belong in the public showcase.
4. Capture final screenshots.
5. Ask AI to update the showcase/landing page.

### Update privacy/legal documentation for OpenRouter and current AI options

Before public launch, review and update the privacy documentation, AI disclaimer, Terms, and any related legal/help copy so they accurately describe the current AI setup.

This became necessary after adding OpenRouter BYOK support alongside OpenAI, Gemini, Ollama/local AI, and app-managed trial AI.

Human/product-owner decisions to confirm before AI rewrites legal copy:

- How plainly to explain that OpenRouter is a third-party AI routing/provider platform.
- Whether the Privacy Policy should list OpenRouter by name as a third-party processor/service users may choose.
- How to explain that OpenRouter usage is BYOK and controlled by the user's OpenRouter account, credits, billing, model choice, quotas, and provider limits.
- How to explain that free OpenRouter models may still have rate limits, quotas, availability issues, or quality differences.
- Whether the AI disclaimer should mention that prompts and selected project context may be sent to OpenRouter and/or underlying model providers when a user selects OpenRouter.
- Whether local/Ollama language should be contrasted clearly: local AI can stay on the user's machine, while cloud AI providers require sending prompts/context to external services.
- Whether showcase/onboarding wording needs a short privacy summary linking to the full policy.

AI can help draft the updated policy/disclaimer text, but Kwame should review the wording before launch because this affects user trust and legal/privacy posture.

### Rework Help menu/page near launch

The Help Center should be reworked near launch after major feature changes settle.

This should follow the two-phase Help System Feature Audit & Rewrite process in `docs/future-roadmap.md` instead of asking AI to simply “make the help page better.”

Why this is listed here:

- Kwame needs to decide when the app is stable enough for help content to stop constantly going stale.
- AI can execute the audit and rewrite later, but the timing is a human launch decision.

### Tutorial videos and user education

Create tutorial content for users outside normal AI coding work.

Possible videos/guides:

- How to get an OpenAI API key
- How to get a Gemini API key
- How to get an OpenRouter API key and choose a model
- How to connect an AI key to Storyline
- How to use Storyline without AI
- How to use Ollama/local AI with Storyline
- General onboarding/walkthrough
- How local projects, cloud projects, backup, Save/Open, and privacy choices work

AI can help draft scripts, outlines, thumbnail text, and checklists, but Kwame will likely record/publish the actual videos.

---

## Community and public feedback decisions

### Public forum or community board

Do not build a public forum at launch.

Revisit this only after there is enough user activity to justify it. A public forum with no activity can make a young app look abandoned.

Future options are tracked in `docs/future-roadmap.md`:

- GitHub Discussions
- Discord
- Featurebase/Canny/Nolt-style feature voting
- Discourse/Flarum standalone forum

### GitHub Project board decision

Consider a GitHub Project board later only if the Markdown continuity workflow becomes too limiting.

For now, Markdown files are easier for AI agents to read, easier to review in Git history, and less likely to create tool friction.

---

## Manual public beta QA

Complete these human confidence passes before public beta. These are not polish tasks; they are the manual checks most likely to catch trust-breaking launch issues.

- Manual import/export confidence pass.
- Signup/login/verification/password reset QA.
- AI cost warning copy review.
- Mobile/tablet smoke test.

---

## Launch readiness reminders

Before public launch, review:

- Final app name chosen
- Branding direction stable
- Icons/favicons created
- Verification, invite, password reset, magic link, and welcome email branding updated
- Supabase auth redirect allowlist decision made after production email links are confirmed
- Auth verification edge-case launch check completed using `TESTING.md` Auth / Sessions entries
- Trial/cloud pricing model decided
- Subscription readiness/early-access grandfathering decision made before any billing implementation
- AI terminology chosen
- AI Partner Story Scope validated; old Structure-panel scene checkboxes removed or intentionally kept as a fallback
- Privacy/legal documentation updated for OpenRouter and current AI provider options
- Help Center audit/rewrite completed or intentionally deferred
- Showcase page updated with final screenshots
- In-app launch survey implemented
- Support email/contact flow still works
- Key tutorials planned or recorded

This checklist is allowed to be imperfect. It is here so Kwame does not have to remember everything in his head while also vibe coding the app. Brains are not Jira boards, thankfully.
