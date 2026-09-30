# Development guide

## Prerequisites

- Node.js ≥ 22 (npm 10+). Node 20 works everywhere except Linux containers,
  where `better-sqlite3` v13's bundled prebuilt binary segfaults — the Docker
  images and CI therefore pin Node 22.
- Python 3.10+ (only for the optional `scripts/` tooling)
- No external services — SQLite ships with `better-sqlite3`

## Setup

```bash
npm install          # workspace install
npm run seed         # synthetic dataset → data/killchain.db
npm run dev          # api (:4000) + web (:5173)
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Both apps in watch mode (concurrently) |
| `npm run build` | Type-check + compile API, type-check + bundle web |
| `npm start` | Run the compiled API |
| `npm run seed` | Reset/seed the SQLite database (idempotent) |
| `npm test` | API tests + web tests (vitest) |
| `npm run typecheck` | `tsc --noEmit` for both workspaces |
| `npm run lint` / `lint:fix` | ESLint (flat config) across the repo |
| `npm run format` | Prettier write |

Per-workspace: `npm run <task> -w @pkc/api` / `npm run <task> -w @pkc/web`.

## Conventions

**API (CommonJS TypeScript)**

- No `.js` extensions in relative imports.
- Validation first: extend the Zod schema in `schemas.ts`, never trust
  `req.body` ad-hoc.
- Permissions via `canWrite`/`isAdmin` route middleware; log mutations with
  `logActivity(actor, action, subjectType, subjectId, detail?)`.
- Errors: throw `badRequest()/notFound()/conflict()` from `utils/errors.ts` —
  the error middleware renders the `{ error: { message, code } }` envelope.
- IDs: `uid('ioc')` → `ioc_ab12…`.

**Web (ESM React/TS)**

- Colors/spacing come from tokens: `bg-surface`, `text-ink-2`, `border-line`,
  `bg-critical/10 text-critical` — never hard-coded hex, never `dark:` variants.
- New primitives belong in `components/ui/` with a barrel export; pages import
  from `../components/ui`.
- URL is state: filters go through `qs()` + `useSearchParams` so views are
  shareable; hooks like `useQuery(path)` refetch on path change.
- Motion: `PageTransition` wrappers, 150–250 ms, `ease-smooth`,
  `AnimatePresence` for modals/drawers, `layoutId` for tab indicators —
  and nothing that breaks `prefers-reduced-motion`.
- Accessibility: real `<button>`/`<a>` elements, visible focus rings,
  labelled form fields (`<Field label htmlFor>`), Escape closes overlays.

## Adding a feature

**New API resource** (example: `badges`)

1. Table + seed data in `apps/api/src/db/`.
2. Zod schemas in `schemas.ts`.
3. `routes/badges.ts` with list/detail/create/update/delete + gates; mount in
   `app.ts` behind `requireAuth`.
4. Tests in `apps/api/src/app.test.ts` (happy path + permission denial).
5. Types in `apps/web/src/lib/types.ts`.

**New page**

1. Component in `apps/web/src/pages/`, export the page.
2. Route in `src/App.tsx` inside `ShellLayout`.
3. Nav entry in `components/layout/nav.ts` (group, icon, breadcrumb label).
4. Run `npm run typecheck -w @pkc/web`.

## Testing

- API: `vitest` + in-memory HTTP through `createApp()`; fixtures from the seed.
- Web: unit tests colocated as `src/**/*.test.ts` (vitest, node environment).
- Manual smoke: `npm run dev`, then `⌘K`, filters, CRUD modals, exports.
- Scripts: `python scripts/normalize_iocs.py --help` and the round-trip in
  `scripts/README.md`.

## Git workflow

1. Branch from `main` (`feature/…`, `fix/…`).
2. `npm run lint && npm run typecheck && npm run test` must pass (CI runs the
   same).
3. Keep PRs focused; describe UI changes with screenshots when relevant.
4. Never commit `data/*.db`, `.env`, `temp/` or `node_modules/`.
