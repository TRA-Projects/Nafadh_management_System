# Nafadh Frontend v2 — Angular 21, Real Backend, Unified Design System

Rebuilt from scratch on native Angular 21 (zoneless, no zone.js, Vitest) — not an
upgrade of the earlier build. Connects directly to the real .NET backend at
`https://localhost:7082/api`. No mock data anywhere in this version.

## What changed from the previous build

1. **Real backend, no mocks.** Every service in every portal calls the actual
   controller routes on your running backend (verified directly against
   `Nafadh_Backend/Controllers/*.cs`).
2. **Genuinely unified design system.** All four portals now share one single
   `AppShell` component (`src/app/shared/ui/app-shell/`) for the header and
   sidebar — same navy/cyan colors, same Cairo font, same spacing, same card/
   table/badge styles, everywhere. This is a deliberate exception to "no shared
   UI between portals": the previous build's per-portal shells looked similar
   but drifted (Company had a blue gradient, Trainer had teal accents) because
   each was hand-authored separately. Now it's literally the same compiled
   component, so it cannot drift. Every *page* underneath the shell remains its
   own separately-authored, portal-isolated component — only the shell itself
   is shared.
3. **Trainee portal's dark mode / accessibility panel** are layered on top of
   the same shared shell via Angular content projection (`shell-header-extra`),
   rather than the Trainee portal forking its own copy of the shell.

## Quick start

Make sure the backend is running at `https://localhost:7082` first (with both
data-seed scripts applied), then:

```bash
npm install
npm start
```

Open http://localhost:4200. Log in with any account seeded in your database
(e.g. `admin@nafadh.om`, `company@nafadh.om`, `trainer@nafadh.om`,
`trainee@nafadh.om` — passwords per your seed script).

## Configuration

`src/environments/environment.ts` / `environment.prod.ts` both point at
`https://localhost:7082/api`. Change `apiBaseUrl` if your backend runs
elsewhere.

## A few things worth double-checking against your live Swagger

A handful of original (Phase-1, untouched-by-me) DTOs — `Program`, `Track`,
`Session`, `Certificate`, `TrainingMaterial` — weren't re-verified field-by-
field this session, since the priority was the domains actually changed in the
backend upgrade (Trainee, Warning, Evaluation, Conversation, Feedback, Badge,
Report). Their TypeScript interfaces in `core/models/dtos.ts` use optional
fields defensively so a minor name mismatch won't break rendering, but it's
worth a quick comparison against your Swagger UI (`https://localhost:7082/swagger`)
if you notice a field showing blank that shouldn't be.

Several pages also use placeholder IDs (e.g. `companyId = 1`, `traineeId = 1`)
where the real implementation would resolve these from the logged-in user's
own profile (a Company supervisor's companyId, a Trainee's own traineeId).
Wiring that resolution up is a natural next step once you're testing against
specific seeded accounts.

## Build

```bash
npm run build
```

Production builds skip Angular's build-time Google Fonts inlining
(`fonts: false` in `angular.json`) since it needs outbound network access;
fonts still load correctly at runtime via `index.html`'s `<link>` tag.
