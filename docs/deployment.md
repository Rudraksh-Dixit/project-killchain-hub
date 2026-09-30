# Deployment

## Environment variables

| Variable | Default | Where | Purpose |
| --- | --- | --- | --- |
| `PORT` | `4000` | API | HTTP port |
| `NODE_ENV` | `development` | API | Enables production behavior |
| `JWT_SECRET` | dev default (warns) | API | **Required** in production |
| `JWT_EXPIRES_IN` | `7d` | API | Token lifetime |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:4173` | API | Comma-separated allowed origins |
| `DB_PATH` | `<repo>/data/killchain.db` | API | SQLite location (absolute or cwd-relative) |
| `VITE_API_PROXY` | `http://localhost:4000` | Web dev server | Vite `/api` proxy target |

Copy `.env.example` to `.env` for local overrides (`.env` is git-ignored).

## Local development

```bash
npm install
npm run seed        # creates data/killchain.db with synthetic content
npm run dev         # API :4000 + web :5173 (concurrently)
```

Demo accounts (from the seed): `admin/admin123`,
`contributor/contrib123`, `viewer/viewer123`.

## Production build (bare metal)

```bash
npm run build       # tsc → apps/api/dist, vite → apps/web/dist
npm run seed        # optional: only if data/killchain.db doesn't exist
npm start           # runs apps/api/dist/index.js on :4000
```

Serve `apps/web/dist` as static files from any web server and proxy `/api` to
the API process. nginx example:

```nginx
server {
  listen 443 ssl;
  server_name hub.example.com;

  root /srv/pkc/web;
  try_files $uri /index.html;          # SPA routing

  location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;
  }
}
```

## Docker

Images are built from the repo root:

```bash
docker build -f Dockerfile.api -t pkc-api .
docker build -f Dockerfile.web -t pkc-web .
```

Or the whole stack:

```bash
docker compose up --build
# web  → http://localhost:8081  (nginx, proxies /api)
# api  → internal :4000, SQLite persisted in the pkc-data volume
docker compose run --rm api npm run seed   # only needed if you clear the volume
```

`docker-compose.yml` mounts `pkc-data` at `/app/data` so the database survives
recreates, and passes `JWT_SECRET`/`CORS_ORIGIN` from the environment.

## Operations checklist

- [ ] `JWT_SECRET` set to ≥ 32 random bytes
- [ ] `CORS_ORIGIN` limited to your real origin(s)
- [ ] TLS terminated at the proxy; HTTP→HTTPS redirect
- [ ] SQLite file on persistent storage; nightly `sqlite3 killchain.db ".backup …"`
- [ ] Log rotation for stdout (`docker logs` driver or journald)
- [ ] Health probes: `GET /api/health` (public, JSON)
- [ ] `npm run lint && npm run typecheck && npm run test` in CI before deploy
      (`.github/workflows/ci.yml` already does this)
