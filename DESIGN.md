---
name: Storyline
description: A calm writing workspace for books and screenplays, built around the Sanctuary theme.
colors:
  background: "#fbf9f5"
  foreground: "#31332f"
  card: "#ffffff"
  primary: "#546354"
  primary-dim: "#485748"
  secondary-surface: "#f5f4ef"
  border-soft: "#e8e3da"
  muted-text: "#6f716c"
  accent-surface: "#eef4ed"
  destructive: "#bc1c1c"
  midnight-background: "#111827"
  midnight-surface: "#121826"
  midnight-primary: "#aac0ad"
typography:
  display:
    fontFamily: "Newsreader, Lora, serif"
    fontSize: "clamp(2rem, 4vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "Manrope, Inter, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Manrope, Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  input-default:
    backgroundColor: "{colors.secondary-surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  dialog-surface:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "24px"
---

<!--
IMPECCABLE / AI DESIGN GUARDRAIL PROMPT

When using Impeccable, AG, Codex, or any AI design assistant on this project:

Preserve the existing Sanctuary theme. Do not redesign the app.

Storyline already has an intentional visual direction inspired by the Sanctuary theme: calm, literary, warm, rounded, writer-focused, privacy-conscious, and emotionally safe.

Use Impeccable as a critic and polish assistant, not as a full redesign engine.

Default workflow:
1. Audit first.
2. Do not edit files until the user approves the audit.
3. Recommend small, reversible improvements.
4. Preserve existing product logic and app structure.
5. Improve clarity, spacing, accessibility, mobile layout, copy, and visual hierarchy.
6. Do not introduce a new design system unless explicitly requested.

Allowed improvements:
- clearer hierarchy
- better helper text contrast
- less corporate or internal wording
- better mobile layouts
- calmer empty states
- improved form spacing
- improved button hierarchy
- accessibility fixes
- reduced clutter
- fewer repeated explanations

Avoid:
- full redesigns
- generic SaaS styling
- purple gradients
- neon/glassmorphism effects
- random new fonts
- cards inside cards
- decorative low-contrast helper text
- excessive animation
- changing app logic during visual polish
- changing Supabase, RLS, auth, API routes, AI provider logic, export/import, local/cloud persistence, or collaboration rules

Before editing, output:
1. what screen or component is being reviewed
2. what problems were found
3. what small changes are recommended
4. which files may be touched
5. what will not be changed

Only after approval should changes be applied.
-->

# Design System: Storyline

## Overview

**Creative North Star: "The Writer's Sanctuary"**

Storyline uses a warm, paper-adjacent interface that supports long-form creative work without turning the workspace into a performance stage. The Sanctuary theme should feel settled, human, and attentive. Its job is to lower the emotional temperature around writing, storage, and revision.

This is a product UI, not a brand campaign. The visual system exists to help writers think, draft, revise, recover, and share work with confidence. The interface should feel crafted rather than flashy, with warmth coming from material cues, careful spacing, and restrained color use instead of decorative effects.

Storyline explicitly rejects generic AI-product styling, glossy startup theater, and futuristic visual clichés. It should never look like a copilot dashboard, a crypto terminal, or a trend-chasing SaaS template.

**Key Characteristics:**

- Warm light surfaces instead of sterile white
- Serif moments for literary tone, sans-serif for working clarity
- Soft edges and rounded dialogs that feel settled, not toy-like
- Clear state communication around local, cloud, backup, recovery, and collaboration
- AI kept visually subordinate to the writing experience

## Colors

The Sanctuary palette is restrained: warm neutrals, one muted green primary, and careful use of red for destructive states.

### Primary

- **Sanctuary Green** (`#546354`): The primary action color. Use for confirm actions, selected accents, trusted navigation highlights, and calm emphasis.
- **Deep Sanctuary Green** (`#485748`): Used to deepen gradients, hover states, and give primary actions slightly more weight without introducing a second loud accent.

### Secondary

- **Warm Paper** (`#f5f4ef`): The default soft surface behind forms, grouped settings, and low-emphasis containers.
- **Mist Accent** (`#eef4ed`): Reserved for subtle positive or contextual emphasis, especially when a green-tinted surface helps orient the user.

### Tertiary

- **Signal Red** (`#bc1c1c`): Destructive and irreversible actions only. It must remain rare so it retains authority.

### Neutral

- **Sanctuary Canvas** (`#fbf9f5`): The main app background. Slightly warm, never harsh white.
- **Page White** (`#ffffff`): Used for raised cards, inputs, and higher-contrast surfaces that need separation from the canvas.
- **Ink** (`#31332f`): Primary text color.
- **Soft Border** (`#e8e3da`): Borders and dividers. Present but quiet.
- **Muted Ink** (`#6f716c`): Secondary text. Never use it for essential instructions that need first-pass readability.
- **Midnight Background** (`#111827`) and **Midnight Surface** (`#121826`): Alternate dark workspace surfaces. Midnight is a supported alternate theme, not the product's visual default.

**The Warm Surface Rule.** Default surfaces are warm, not stark. Avoid pure black and pure white. Even neutral surfaces should feel lightly tinted and lived-in.

**The One Calm Accent Rule.** Green carries trust, direction, and completion. Do not introduce a second saturated accent just to make a screen feel exciting.

### Color and Contrast Principles

- Body text and primary controls must pass a practical long-reading standard, not merely a decorative one.
- Tiny helper text must not rely on pale gray for hierarchy.
- Color should reinforce meaning, never carry meaning alone.
- Danger uses red sparingly and only for real risk.
- AI-related surfaces may borrow from existing secondary palettes, but AI must not create its own loud neon sub-brand.

## Typography

**Display Font:** Newsreader with Lora fallback  
**Body Font:** Manrope with Inter fallback  
**Label/Accessibility Support:** Atkinson Hyperlegible is available for accessibility-oriented contexts when needed

**Character:** Typography should balance literary warmth with product clarity. Serif is used to signal the craft of writing. Sans-serif is used to keep controls, forms, settings, and navigation crisp and dependable.

### Hierarchy

- **Display** (`700`, `clamp(2rem, 4vw, 3rem)`, `1.1`): Reserved for major headings, project moments, onboarding titles, and modal headers where a sense of authorship matters.
- **Headline** (`700`, `1.5rem to 2rem`, `1.2`): Used for section titles and major panels.
- **Title** (`600`, `1rem to 1.125rem`, `1.35`): Used for card titles, grouped settings, and action areas.
- **Body** (`400`, `16px`, `1.6`): Default reading and instructional copy. Long-form explanatory text should remain comfortably readable.
- **Label** (`700`, `12px`, `1.4`, `0.08em`): Used for compact labels, overlines, and UI markers. Uppercase labels are allowed only when they improve scannability, not by default.

**The Working Readability Rule.** If a user needs a sentence in order to trust a setting, save a file, understand storage, or avoid a mistake, it must be readable at a glance. Do not hide essential meaning in tiny italic text.

### Typography Principles

- Serif should mark meaning, not decorate everything.
- Sans-serif should carry the majority of interface work.
- Avoid excessive uppercase microcopy.
- Maintain clear weight contrast between label, body, and title levels.
- Writing surfaces should privilege comfort over compression.

## Elevation

Storyline uses tonal layering and soft shadows, not high-drama depth. Surfaces are separated just enough to create order. Shadows should feel ambient and quiet, never glossy or theatrical.

### Shadow Vocabulary

- **Ambient Lift** (`0 12px 40px rgba(49, 51, 47, 0.04)`): Used for sanctuary cards and major containers.
- **Action Lift** (`0 4px 14px rgba(84, 99, 84, 0.15)`): Used for primary actions to give them confidence without making them look inflated.
- **Action Hover** (`0 6px 20px rgba(84, 99, 84, 0.25)`): Hover state only. Mild increase in lift, never a dramatic jump.

**The Flat-Until-Necessary Rule.** Resting surfaces should remain calm. Elevation appears to clarify grouping or interaction, not to make the app feel expensive.

## Components

### Modal and Dialog Rules

- Dialogs are major trust surfaces. Use generous rounding, clear top and bottom framing, and a stable internal rhythm.
- Large dialogs should feel like rooms, not popups. They may contain tabs or grouped sections, but those sections must remain visually subordinate to the overall modal.
- Dialog titles should be plain and specific. “Project Settings” is stronger than abstract metaphor.
- High-stakes dialogs must answer three questions quickly: what is happening, what changes, and what remains safe.
- Destructive confirmations should be explicit without sounding punitive or melodramatic.

### Forms and Input Rules

- Inputs should sit on soft, slightly tinted surfaces with clear focus treatment.
- Rounded inputs are part of the Sanctuary system, but they must stay stable and clean, not pill-shaped everywhere.
- Group only related fields together. Do not build walls of nearly identical fields.
- Helper text belongs directly below the control it explains.
- If a field is optional, say so quietly and clearly.
- Storage, privacy, AI, and collaboration explanations must be plain-language, not implementation-language.

### Button Hierarchy

- Primary buttons use Sanctuary Green and carry the main forward action.
- Secondary buttons are quieter, usually outlined or softly surfaced.
- Ghost buttons are for dismissal, secondary navigation, or tertiary actions only.
- Destructive buttons use red and should appear only when the action is genuinely irreversible.
- A single section should have one obvious primary action. If several actions feel equally loud, hierarchy has failed.

### Cards and Containers

- Use cards only when they create meaningful grouping.
- Avoid cards inside cards unless there is a strong structural reason.
- Soft borders and tonal changes are often enough. Do not over-frame every block.
- Containers should support rhythm. Not every section needs identical padding.

### Navigation

- Navigation should feel steady and editorial, not dashboard-like.
- Tabs, sidebars, and utility controls should emphasize wayfinding over novelty.
- The current writing surface must remain more visually important than adjacent feature navigation.

### Mobile and Responsive Rules

- Mobile layouts must stack decisively instead of shrinking desktop groupings until they break.
- Two-column settings grids should collapse early when readability is at risk.
- Tap targets must remain comfortable for writers using tablets and phones.
- Critical copy must not depend on hover or hidden affordances.
- Dialogs must respect viewport height and safe areas without trapping important actions below the fold.

### UX Writing Principles

- Say what a setting does in plain language.
- Prefer “what changes if you do this” over abstract feature labels.
- Remove internal language such as legacy, backend, sync architecture, or implementation detail unless the user truly needs it.
- Calm beats clever. Reassure without marketing.
- When discussing AI, privacy, backups, cloud sync, or deletion, write with precision and restraint.

## Do's and Don'ts

### Do:

- **Do** preserve the warm paper-and-ink atmosphere of Sanctuary.
- **Do** keep the writing surface, structure, and core project actions clearer than AI or peripheral tools.
- **Do** use serif selectively for literary tone and sans-serif for interface clarity.
- **Do** keep local-only and cloud-enabled states easy to distinguish in plain language.
- **Do** make trust-sensitive flows feel explicit, calm, and reversible where possible.
- **Do** use spacing to create rhythm instead of boxing every section.
- **Do** default to one clear primary action per area.

### Don't:

- **Don't** use purple gradients, neon accents, glassmorphism, or sci-fi glow.
- **Don't** drift into generic AI or SaaS visual language.
- **Don't** build cards inside cards inside cards.
- **Don't** rely on tiny low-contrast helper text for important explanation.
- **Don't** make AI the loudest visual idea on the screen.
- **Don't** introduce cold pure white, pure black, or harsh blue-gray dashboard styling as the default tone.
- **Don't** use corporate, legalistic, or creepy wording where a writer-focused sentence would be clearer.
