# Storyline

Storyline is a writing and story-planning web app for novelists, screenwriters, and long-form creative projects. It combines structured story planning, a focused editor, project knowledge management, local-first project options, and optional AI assistance.

## Status

Storyline is in active development and is being prepared for broader testing. Some features, workflows, and documentation may still change as the product matures.

## Features

- Project library for managing writing projects
- Structure tree for acts, chapters, scenes, and nested story sections
- Prose and screenplay writing modes
- Rich text editor powered by Tiptap
- Characters, ideas, locations, objects, and project assets
- Scene-linked context for keeping AI assistance grounded
- Optional AI Partner support
- Local project saving and `.storyline` backup/import workflows
- Cloud project support with Supabase
- Collaboration, comments, and presence features
- Export support for common writing and document formats

## Tech Stack

- Next.js
- React
- TypeScript
- Supabase
- Tiptap
- Zustand
- Tailwind CSS
- Netlify

## Local Development

### Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Then fill in the required values in `.env.local`.

> Do not commit `.env.local`. It is already included in `.gitignore`.

### Install Dependencies

```bash
npm install
```

### Run the Development Server

```bash
npm run dev
```

Open the local app at:

```txt
http://localhost:3000
```

## Project Documentation

Internal planning and development notes live in:

- `TASK_BOARD.md` — active and completed work tracking
- `SESSION_HANDOVER.md` — continuity notes between AI coding sessions
- `TESTING.md` — manual and automated testing notes
- `DECISION_LOG.md` — durable project decisions
- `docs/technical-debt-roadmap.md` — engineering debt and hardening work
- `docs/future-roadmap.md` — future product ideas
- `docs/human-launch-checklist.md` — non-code launch tasks
- `docs/troubleshooting/TROUBLESHOOTING.md` — known issues and fixes

## Notes

This repository is public, but Storyline is still an evolving project. Some documentation is intended for development continuity rather than end-user documentation.
