# FinLLM — instructions for coding agents

This file is for **agents that edit this repository** (Cursor, Claude Code, Codex, OpenCode, etc.).  
**End users** who talk to their **personal ledger** through a chat harness should use [`harness/`](harness/README.md) instead.

## Product boundary

- **FinLLM** is the system of record: PostgreSQL ledger, REST API, web UI, MCP server (`apps/mcp`).
- **LLMs are clients**, not accountants. All balances, FX, and double-entry rules live in `@finllm/domain` and `@finllm/money`.
- Never use floating-point for money in application code; use bigint minor units.
- **Mission / philosophy** for humans: [README.md](README.md). **Architecture depth**: [docs/architecture.md](docs/architecture.md).

## Monorepo map

| Path | Package |
| ---- | ------- |
| `apps/api` | Fastify API, auth, imports, confirm tokens |
| `apps/web` | React dashboard |
| `apps/mcp` | MCP stdio → API |
| `packages/db` | Drizzle schema + `drizzle/` migrations |
| `packages/domain` | Ledger validation |
| `packages/money` | Parsing, FX helpers |
| `harness/` | End-user skills, agents, prompts (canonical) |
| `deploy/traefik-example/` | Committed production Compose reference |
| `docs/` | [Doc index](docs/README.md) |

## Commands (from repo root)

```bash
pnpm install
pnpm db:generate   # after schema changes
pnpm db:migrate
pnpm dev           # api + web
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Postgres: `docker compose up postgres -d` with `DATABASE_URL` from `.env.example`.

## Change discipline

- Financial behavior changes need tests in `packages/domain` or `packages/money`.
- MCP tools must call the API; do not bypass confirm flow for mutations.
- Update `docs/FEATURE_STATUS.md` when shipping user-visible behavior.
- Harness: `harness/skills/` (canonical), `harness/agents/`, `registry.json`; sync via `./scripts/sync-harness-skills.sh` → `.cursor/skills/`. See `harness/EVOLUTION.md`.
- Deployment docs: `docs/deployment.md`; do not commit `deploy/local-server/` (gitignored).

## Security

- No secrets in git. Tokens are created via `POST /api/v1/mcp/tokens`.
- Scopes: `ledger.read`, `ledger.write` (writes require preview + confirm on the API).

See [SECURITY.md](SECURITY.md) and [docs/architecture.md](docs/architecture.md).
