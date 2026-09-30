# API reference

Base URL: `/api` · Content type: `application/json` · Auth: `Authorization: Bearer <token>`

Two endpoints are public: `GET /api/health` and everything under `/api/auth`.
All other routes require a valid JWT; write routes additionally enforce roles
(`contributor+` for create/update, `admin` for delete/approve).

## Conventions

- **Error envelope** — `{ "error": { "message": string, "code": string, "details"?: unknown } }`
- **Pagination** — list routes accept `page` (≥1) and `pageSize` (≤200, default 25)
  and return `{ items, total, page, pageSize, totalPages, facets? }`.
- **Sorting** — `sort` + `order=asc|desc` (sort keys are allow-listed per route).
- **Dates** — ISO 8601 strings in/out; queries accept `YYYY-MM-DD`.
- **IDs** — prefixed: `ioc_…`, `hnt_…`, `art_…`, `tool_…`, `res_…`, `rpt_…`,
  `sub_…`, `usr_…`, `act_…`.

## Auth

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/login` | `{ username, password }` → `{ token, user }` (JWT, 7 d) |
| GET | `/auth/me` | Current user from bearer token |
| GET | `/auth/accounts` | Demo directory: `{ username, role }` list (no secrets) |

Roles: `viewer < contributor < admin` (`ROLE_RANK` in `utils/jwt.ts`).

## IOCs

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/iocs` | viewer | Filters: `q, type, category, severity, confidence, family, tag, source`; `sort` ∈ value, malware_family, severity, confidence, first_seen, last_seen, type, category, created_at; returns facet counts |
| GET | `/iocs/:id` | viewer | `{ ioc, related }` |
| POST | `/iocs` | contributor+ | `{ type, value, … }` — type ∈ `ip, domain, url, hash` |
| PUT | `/iocs/:id` | contributor+ | Partial update |
| DELETE | `/iocs/:id` | admin | |
| POST | `/iocs/bulk/delete` | admin | `{ ids: string[] }` → `{ deleted }` |
| POST | `/iocs/import` | contributor+ | `{ format: "csv"\|"json", data: string }` → `{ imported, skipped[], invalid[] }`, ≤5000 rows |
| GET | `/iocs/export?format=csv\|json\|stix` | viewer | Respects list filters; CSV/JSON/STIX 2.1 bundle |

Indicator values are format-guarded (`utils/ioc.ts`): IPv4/IPv6, RFC-ish
domains, `http(s)://` URLs, and 32/40/64/128-char hex hashes.

## Hunts

`GET /hunts` (filters `q, difficulty, status, tag`, sort), `GET /hunts/:id`,
`POST /hunts` (contributor+), `PUT /hunts/:id` (contributor+),
`DELETE /hunts/:id` (admin).

## Research (articles)

`GET /articles` (`q, category, tag`), `GET /articles/:idOrSlug` →
`{ article, related }`, `POST /articles` (contributor+),
`PUT /articles/:id` (contributor+), `DELETE /articles/:id` (admin).

## Tools & resources

`GET /tools` (`q, category`, `sort=stars|name|updated`), `GET /tools/:id`,
create/update (contributor+), delete (admin) — same shape for `/resources`
with `category` facets.

## Reports

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/reports` | viewer | Status tabs via `status`; includes aggregate `stats` |
| GET | `/reports/:id` | viewer | Full report incl. findings |
| GET | `/reports/:id/markdown?download=1` | viewer | Rendered markdown export |
| POST | `/reports` | contributor+ | Metadata + findings |
| PUT | `/reports/:id` | contributor+ | |
| DELETE | `/reports/:id` | admin | |

Findings carry `title, severity, cvss, description, impact, remediation,
references[]`; CVSS score → severity is derived server-side.

## Community submissions

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/submissions` | viewer | `status, kind, mine=true` + facets |
| GET | `/submissions/:id` | viewer | |
| POST | `/submissions` | any authed | `{ kind, title, body, payload }` |
| POST | `/submissions/:id/approve` | admin | `{ note? }` |
| POST | `/submissions/:id/reject` | admin | `{ note? }` |

## Dashboard, search, activity

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/dashboard/stats` | Totals, 12-month IOC trend, severity mix, families, tags, `recentActivity` |
| GET | `/dashboard/activity` | Paged activity feed |
| GET | `/search?q=` | Grouped hits: `iocs, hunts, articles, tools, resources, reports, submissions` |
| GET | `/search/tags` | Tag vocabulary with counts |
| GET | `/activity` | Paged audit log, filterable by `actor`/`action` |

## Health

```json
GET /api/health
{ "status": "ok", "service": "project-killchain-hub-api",
  "version": "1.0.0", "time": "2026-09-30T12:01:28.020Z" }
```

## Example

```bash
TOKEN=$(curl -s localhost:4000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | jq -r .token)

curl -s "localhost:4000/api/iocs?severity=critical&pageSize=5" \
  -H "authorization: Bearer $TOKEN" | jq '.items[].value'
```
