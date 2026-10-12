# Deployment

FinLLM is a **modular monolith**: one API process, one static web front (nginx in production), one PostgreSQL database. Choose a path by environment.

## Comparison

| Mode | Best for | Compose / command |
| ---- | -------- | ----------------- |
| **Dev (API + Vite)** | Day-to-day development | `docker compose up postgres -d` + `pnpm dev` |
| **Dev (all in Docker)** | Quick demo without Node on host | Root `docker compose up --build` |
| **Production (Traefik)** | HTTPS, single public host, external `proxy` network | [traefik-example](../deploy/traefik-example/) |

---

## Local development (recommended)

1. Copy [`.env.example`](../.env.example) → `.env`.
2. Start Postgres: `docker compose up postgres -d`.
3. `pnpm install && pnpm db:migrate && pnpm dev`.

- API: `http://localhost:3001` (`/health`, `/ready`)
- Web: `http://localhost:5173` (`VITE_API_URL` points at API)

MCP runs on the **developer machine** (stdio), not inside the API container. Set `MCP_API_URL=http://localhost:3001` and `FINLLM_MCP_TOKEN` — see [mcp-setup.md](mcp-setup.md).

---

## Docker Compose (root)

File: [`docker-compose.yml`](../docker-compose.yml)

Services: `postgres`, `api`, `web`. Suitable for local or small LAN deployments without Traefik.

```bash
docker compose up --build -d
```

Defaults use dev-only `SESSION_SECRET` in the compose file — **change secrets** before any exposed deployment.

After first boot, open the web URL and complete **instance setup** (first user). In production `NODE_ENV=production`, also set `SETUP_BOOTSTRAP_SECRET` and pass `X-Setup-Bootstrap` on the first `POST /api/v1/setup/initialize` only.

---

## Production with Traefik

For a single hostname (e.g. `finllm.example.com`) with TLS terminated by Traefik:

1. Copy [`deploy/traefik-example/`](../deploy/traefik-example/) to a directory on your server (or use the committed example in place).
2. Copy `.env.example` → `.env` and generate strong `POSTGRES_PASSWORD`, `SESSION_SECRET`, `SETUP_BOOTSTRAP_SECRET`.
3. Ensure an external Docker network exists (e.g. `proxy`) and Traefik is attached to it.
4. Build and start:

```bash
docker compose -f deploy/traefik-example/docker-compose.yml --env-file deploy/traefik-example/.env up --build -d
docker compose -f deploy/traefik-example/docker-compose.yml --env-file deploy/traefik-example/.env --profile tools run --rm migrate
```

Routing:

- **Web** — `Host(finllm.example.com)` → nginx (SPA + CSP headers in [`infra/nginx-spa.conf`](../infra/nginx-spa.conf)).
- **API** — Same host, paths `/api`, `/health`, `/ready` (higher router priority).

`VITE_API_URL` is built **empty** so the browser uses same-origin `/api` (avoids cross-site cookies).

### Production checklist

| Setting | Notes |
| ------- | ----- |
| `NODE_ENV=production` | API enforces `SETUP_BOOTSTRAP_SECRET` |
| `SESSION_SECRET` | ≥ 32 random chars |
| `SETUP_BOOTSTRAP_SECRET` | Required; one-time bootstrap header |
| `ALLOW_PUBLIC_SETUP_STATUS=false` | Default in example — do not probe setup anonymously |
| `CORS_ORIGIN` / `FINLLM_PUBLIC_URL` | Must match public URL |
| `MCP_TOKEN_DEFAULT_TTL_DAYS` | Rotate/revoke via API |
| TLS | Via Traefik / Cloudflare — not bundled in-repo |
| Backups | [`scripts/backup-db.sh`](../scripts/backup-db.sh) against `DATABASE_URL` |

---

## Personal / gitignored layouts

Some operators keep a host-specific stack under `deploy/local-server/` (gitignored). That layout mirrors **traefik-example**; prefer committing changes to `deploy/traefik-example/` and copying to your private path. See [deploy/README.md](../deploy/README.md).

---

## Render and other PaaS

The API binds `0.0.0.0` and reads `API_PORT` / `PORT` patterns compatible with common hosts. You still need managed Postgres, env secrets, and a static or container build for the web app. No first-party Render blueprint is shipped in 0.1.0 — treat root Compose + Traefik example as the reference topology.
