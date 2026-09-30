# Security model

> This repository is a **demo platform** shipped with synthetic data. Treat it
> as a reference implementation, harden it before any real deployment, and see
> [Data safety](#data-safety) for the non-negotiables.

## Authentication

- Passwords hashed with **bcryptjs** (10 rounds), verified in constant-ish time
  (`utils/password.ts`).
- Sessions are **stateless JWTs** (`jsonwebtoken`, HS256) with a 7-day
  expiry (`JWT_EXPIRES_IN`). Payload: `{ id, username, role, displayName }`.
- The server reads the token from `Authorization: Bearer …` only — no cookies,
  so there is no CSRF surface on the API. The web client stores it in
  `localStorage` (`pkc.token`) and clears it on any `401`
  (`authStore.clear()` + `pkc:unauthorized` event).
- `JWT_SECRET` defaults to an obviously insecure dev value and the API logs a
  loud warning on boot; production deployments **must** set it.

## Authorization (RBAC)

`requireAuth` (JWT) → route-level `canWrite` / `isAdmin` helpers, ranked by
`ROLE_RANK` (`viewer 0 < contributor 1 < admin 2`):

| Action | viewer | contributor | admin |
| --- | :-: | :-: | :-: |
| Read everything, export, search | ✓ | ✓ | ✓ |
| Create/update IOCs, hunts, articles, tools, resources, reports | | ✓ | ✓ |
| Create a submission | ✓ | ✓ | ✓ |
| Delete content, bulk delete, approve/reject submissions, manage accounts | | | ✓ |

Denials return `403 { error.code: "forbidden" }`.

## Transport & headers

- **helmet** with `x-powered-by` disabled, CORS restricted to
  `CORS_ORIGIN` (default: the local Vite origins), JSON body limit 12 MB.
- In production put TLS in front (reverse proxy) and serve the SPA over the
  same origin as the API to keep the origin story simple.

## Input handling

- Every request body/query is parsed through **Zod** schemas (`schemas.ts`)
  before touching SQL; all SQL is prepared statements; ordering/column names
  are allow-listed (never interpolated from user input).
- IOC values are format-validated (`isValidIocValue`) so malformed indicators
  never enter the database.
- The markdown renderer on the client sanitizes by construction: links are
  limited to `http(s)`/`mailto`, and content is rendered as React nodes — no
  `dangerouslySetInnerHTML`.
- Export endpoints set `Content-Disposition` and never reflect unsanitized
  values into headers.

## Audit trail

Every meaningful mutation writes an `activity` row
(`actor`, `action` like `ioc.create` / `submission.approve`, `subjectType`,
`subjectId`, `detail`). The dashboard feed and `/api/activity` expose it to
authenticated users.

## Data safety

The seed dataset is deliberately fake:

- IPs from **RFC 5737 / RFC 3849** documentation ranges — `192.0.2.0/24`,
  `198.51.100.0/24`, `203.0.113.0/24` (plus `2001:db8::/32` IPv6).
- Domains under `example.com` / `example.org` (RFC 2606).
- Fabricated MD5/SHA-1/SHA-256 values (not derived from real files).
- Fictional malware families and report clients.

**Do not blocklist these values in production** — they exist to exercise the
UI. Never commit real IOCs, customer data, API keys or production JWT secrets.

## Running responsibly

- Keep `NODE_ENV=production`, a strong `JWT_SECRET`, and a tight `CORS_ORIGIN`.
- Back up `data/killchain.db` (see `docs/deployment.md`) — SQLite files are
  single-file but not transactional across hosts; use a volume or nightly copy.
- Report vulnerabilities via the repository's private advisory channel rather
  than a public issue.
