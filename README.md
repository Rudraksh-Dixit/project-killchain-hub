# Project KillChain Hub

An open-source **cybersecurity knowledge & IOC platform** for Red Team and Blue
Team practitioners — indicators, detection hunts, research, tooling, learning
resources and assessment reports behind one fast, keyboard-driven workspace.

> ⚠️ **Synthetic data only.** Every indicator ships from reserved documentation
> ranges (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`), `example.*`
> domains and fabricated hashes. Never blocklist these values.

## Highlights

- **IOC hub** — filterable/sortable table (type, severity, confidence, family,
  tags, facets), detail drawer with related records, inline create/edit,
  bulk delete, CSV import and **CSV / JSON / STIX 2.1 export**
- **Detection hunts** — Sigma/SPL/KQL query library with difficulty facets and
  MITRE-style tagging
- **Research** — long-form markdown articles with syntax-highlighted code and
  related reading
- **Tools & resources** — curated directory with categories, stars and search
- **Reports** — assessment reports with findings CRUD, CVSS stats, live
  preview and markdown download
- **Community queue** — anyone can submit content; admins approve/reject with
  notes (role: `admin` / `contributor` / `viewer`)
- **Ops-grade UX** — dark-first design system (light mode too), `⌘K` command
  palette, global hotkeys, breadcrumbs, toasts, skeleton loading, fully
  URL-addressable filters, reduced-motion support
- **Zero external services** — Express + SQLite behind JWT auth; Vite + React
  up front; stdlib-only Python helpers for feed processing

## Quick start

```bash
npm install
npm run seed      # synthetic dataset → data/killchain.db
npm run dev       # API :4000 · web :5173
```

Open http://localhost:5173 and sign in:

| Role | Username | Password | Can |
| --- | --- | --- | --- |
| admin | `admin` | `admin123` | everything, incl. delete + approvals |
| contributor | `contributor` | `contrib123` | create & update content |
| viewer | `viewer` | `viewer123` | read + submit + export |

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | API + web in watch mode |
| `npm run build` | Type-check & build both apps |
| `npm start` | Run the compiled API |
| `npm run seed` | (Re)seed the database |
| `npm test` | API (46) + web unit tests |
| `npm run typecheck` / `npm run lint` | Static checks |

## Python tooling

Four stdlib-only helpers for indicator feeds — see
[`scripts/README.md`](scripts/README.md):

```bash
python scripts/normalize_iocs.py raw.csv -o clean.csv --strict   # validate + dedupe
python scripts/to_stix.py clean.csv -o bundle.json               # → STIX 2.1
python scripts/stix_to_ioc.py bundle.json -o import.csv          # STIX → import
python scripts/ioc_stats.py clean.csv -o report.md               # Markdown summary
```

## Project layout

```
apps/api     Express + TS + better-sqlite3 + Zod (JWT, RBAC, activity log)
apps/web     React 19 + Vite + Tailwind + Framer Motion + Recharts
data/        SQLite database (generated, git-ignored)
scripts/     Python feed tooling (no third-party deps)
docs/        architecture · api · security · deployment · development
.github/     CI workflow + issue/PR templates
```

## Documentation

- [Architecture](docs/architecture.md) — request flow, data model, UI system
- [API reference](docs/api.md) — every endpoint, params, roles
- [Security model](docs/security.md) — auth, RBAC, headers, data safety
- [Deployment](docs/deployment.md) — env vars, nginx, Docker, checklist
- [Development guide](docs/development.md) — conventions, extension recipes

## Stack

**Frontend** React 19 · Vite · TypeScript · Tailwind CSS · Framer Motion ·
Recharts · Lucide
**Backend** Node 22 · Express · TypeScript · better-sqlite3 · Zod · JWT ·
bcryptjs · helmet
**Quality** ESLint 9 (flat) · Prettier · Vitest · GitHub Actions CI · Docker

## Contributing

PRs welcome — run `npm run lint && npm run typecheck && npm run test` first
(see [docs/development.md](docs/development.md)). Please keep contributions
free of real-world IOC data.

## License

[MIT](LICENSE) © CyDefOps
