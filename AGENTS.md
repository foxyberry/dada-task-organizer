# AGENTS.md

## Project

Dada Task Organizer is a React + Vite app with an Express backend. It uses Firebase Auth, Firestore, Firebase Admin SDK, and Gemini.

Repository:

```text
foxyberry/dada-task-organizer
```

Main production-readiness tracker:

```text
https://github.com/foxyberry/dada-task-organizer/issues/2
```

## Local Development

Run the app with one command:

```bash
npm run dev
```

The server serves both the backend API and Vite frontend middleware.

Default URL:

```text
http://localhost:5001
```

Health check:

```bash
curl http://localhost:5001/health
```

## Environment

Use `.env.local` for local secrets and Firebase config. It is gitignored.

Do not commit:

- `.env.local`
- Firebase service account files
- real Firebase config JSON files
- Playwright/debug artifacts

The current local Firebase project is:

```text
ai-task-organizer-3de8d
```

## Required Checks

Run these before committing code changes:

```bash
npm run lint
npm audit --audit-level=low
```

When changing `firestore.rules`, also run the rules test suite (requires JDK 21+ on `PATH` for the Firebase emulator):

```bash
npm run test:rules
```

## Working Rules

- Before implementation work, make sure there is a GitHub issue that represents the task.
- Create a branch from the issue, using a short descriptive name.
- Do not push directly to `main` for future feature/fix work.
- Push code to the task branch and open a PR linked to the issue.
- Run a self-review on the PR before merge.
- Allow up to three self-review fix/review iterations before asking the user how to proceed.
- Merge only after the PR has received LGTM.
- Keep commits small and scoped.
- Do not reintroduce secrets into committed files.
- Preserve the current port default of `5001`.
- Keep `.env.example` generic.
- Be conservative with GitHub issue creation to avoid GitHub rate limits. Reuse an existing issue when it already represents the task; otherwise create exactly one issue for the distinct work track.

Recommended branch for the next task:

```text
codex/move-gemini-api-to-backend
```

## Architecture Notes

- `server.ts` starts Express and Vite middleware.
- `src/firebase.ts` initializes client Firebase from `VITE_FIREBASE_*` variables.
- `src/server/firebaseAdmin.ts` initializes Firebase Admin SDK.
- `src/App.tsx` currently writes categories and tasks directly to Firestore from the client.
- `src/contexts/FamilyContext.tsx` uses backend API routes for family sharing.
- `src/services/geminiService.ts` currently calls Gemini from frontend code.
- One-off Firebase diagnostic scripts live in `scripts/diagnostics/` and should be run from the repository root.

## Planned Layout

Keep web and backend in this repository, but move toward a monorepo-style layout over time:

```text
apps/
  web/
  api/
packages/
  shared/
scripts/
  diagnostics/
```

Do not do a large app/api/shared move casually. Prefer small PRs that keep `npm run dev` working after each step.

## Highest Priority

Start with Issue #2 P0.

1. Move Gemini analysis to the backend.
   - Current risk: `GEMINI_API_KEY` can be exposed in the browser bundle.
   - Add a backend API route for task analysis.
   - Make the frontend call the backend route instead of `@google/genai` directly.
   - Remove the `process.env.GEMINI_API_KEY` client-side define from `vite.config.ts`.

2. Deploy and verify Firestore rules.
   - Rules are in `firestore.rules`.
   - Verify category, task, family group, and invite flows.

3. Confirm production Firebase Admin credentials.

## Known Cleanup Items

- `index.html` still has the title `My Google AI Studio App`.
- Favicon is missing.
- Some UI/server copy still says `Premium`.
- Diagnostic scripts should be moved under a scripts folder or removed.
- Browser-only notifications only work while the app is open.
- Firestore composite indexes may be required for some queries.
- Client and server timestamp formats should be normalized.
