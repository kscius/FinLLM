# FinLLM

**Self-hosted personal finance and investment ledger** with deterministic accounting services and **LLM access through MCP**. Your database and API are the system of record; language models are **clients**, not accountants.

| | |
| --- | --- |
| **Version** | 0.1.0 (early MVP) |
| **License** | [Apache-2.0](LICENSE) |
| **Status** | [Feature status](docs/FEATURE_STATUS.md) — implemented vs planned |

---

## Mission

FinLLM exists so individuals can **own their financial truth**: one ledger, one history, under their control—without surrendering balances and transactions to a black-box SaaS or to a model’s memory.

## Philosophy

1. **Ledger first** — Balances, FX, double-entry rules, and imports are implemented in `@finllm/domain` and `@finllm/money` (integer minor units, no float money). The UI and MCP only call the API.
2. **LLMs assist, they do not account** — Chat harnesses use MCP tools for reads and **preview + confirm** for writes. Never trust model arithmetic for money.
3. **Untrusted inputs** — Bank CSVs and chat text are not instructions; parsing is deterministic and server-side.
4. **Self-hosted by design** — PostgreSQL, sessions, and tokens stay on your infrastructure. External AI features are **off** by default (`AI_FEATURES_ENABLED=false`).
5. **Evolving harness** — Domain **skills** and **agents** in [`harness/`](harness/README.md) grow with the product; the app ships capabilities, the harness teaches models how to use them safely.

## Who it is for

| Audience | Start here |
| -------- | ---------- |
| **You (personal finance)** | [Quick start](#quick-start) → web UI → optional [chat harness](harness/README.md) |
| **Operators (self-host)** | [Deployment](docs/deployment.md) |
| **Integrators / agents** | [MCP setup](docs/mcp-setup.md), [Architecture](docs/architecture.md) |
| **Contributors / coding agents** | [AGENTS.md](AGENTS.md) |

---

## What you get

```text
                    ┌─────────────────────────────────────┐
                    │  Web dashboard (React, i18n en/es)   │
                    │  overview · movements · import ·     │
                    │  budgets · investments · reconcile   │
                    └─────────────────┬───────────────────┘
                                      │ REST + cookies
┌──────────────┐    MCP (stdio)       ▼         ┌──────────────┐
│ Chat harness │ ──► apps/mcp ────────────────► │  apps/api    │
│ Cursor /     │    skills + confirm flow       │  (Fastify)   │
│ Claude / …   │                              └──────┬───────┘
└──────────────┘                                     │
                                                     ▼
                                            PostgreSQL (Drizzle)
```

- **Web** — Works without any LLM: setup, accounts, movements, CSV import, budgets, reconciliation, analytics charts, PWA-friendly shell.
- **REST API** — Auth, balances, analytics, budgets, imports, MCP token management, confirm-gated postings.
- **MCP** — `list_accounts`, `get_balances`, `list_transactions`, `preview_post_transaction`, `commit_post_transaction`.
- **Harness** — Skills per domain (net worth, reconciliation, budgets, …), agent templates, system prompt — see [harness/README.md](harness/README.md).

Default book context: **MXN**, timezone **America/Mexico_City** (configurable via env).

---

## Quick start (development)

**Requirements:** Node ≥ 20, pnpm 9, Docker (for Postgres).

```bash
cp .env.example .env
docker compose up postgres -d
pnpm install
pnpm db:generate   # only after schema changes
pnpm db:migrate
pnpm dev
```

| Service | URL |
| ------- | --- |
| API health | http://localhost:3001/health |
| Web | http://localhost:5173 |

1. Open the web UI and **initialize** the instance (first user).
2. Create accounts and post movements via the dashboard or API confirm flow.
3. (Optional) Build MCP and connect a harness — [MCP setup](docs/mcp-setup.md).

**Full stack in Docker (dev):**

```bash
docker compose up --build
```

Same URLs; Postgres data persists in a Compose volume.

---

## Chat harness (LLM + MCP)

Talk to **your** ledger from Cursor, Claude Code, Codex, OpenCode, or Claude Desktop:

1. Run FinLLM and create an MCP token (`ledger.read`, and `ledger.write` if you need postings).
2. Register the stdio MCP server — examples in [`harness/config/`](harness/config/) and [`.mcp.json.example`](.mcp.json.example).
3. Load **skills** (sync for Cursor: `./scripts/sync-harness-skills.sh`).

Guides: [Harness (es/en)](harness/README.md) · [MCP tools & tokens](docs/mcp-setup.md) · [Evolution process](harness/EVOLUTION.md)

---

## Repository map

| Path | Role |
| ---- | ---- |
| `apps/api` | Fastify REST, sessions, imports, confirm tokens, MCP bearer auth |
| `apps/web` | React dashboard, hash routes, theme, en/es i18n |
| `apps/mcp` | MCP stdio server → API |
| `packages/db` | Drizzle schema + migrations |
| `packages/domain` | Ledger validation (splits, transfers) |
| `packages/money` | Parsing, FX helpers (bigint) |
| `harness/` | End-user skills, agents, prompts, MCP config examples |
| `infra/` | Dockerfiles, nginx SPA + security headers |
| `docs/` | Architecture, deployment, calculations, ADRs |
| `scripts/` | DB backup/restore, harness skill sync |

---

## Development

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

CI runs lint, build, typecheck, unit tests, and Playwright + axe accessibility checks on the web app. Financial behavior changes should include tests in `packages/domain` or `packages/money`.

---

## Backup

```bash
export DATABASE_URL=postgresql://finllm:finllm@localhost:5432/finllm
./scripts/backup-db.sh
./scripts/restore-db.sh backups/your-file.sql.gz
```

See also `scripts/verify-backup-restore.sh`.

---

## Security

Scoped MCP tokens, confirm-only transaction writes, production bootstrap secret, CSP on the web image — [SECURITY.md](SECURITY.md).

---

## Documentation index

| Doc | Contents |
| --- | -------- |
| [docs/README.md](docs/README.md) | Full doc map |
| [docs/FEATURE_STATUS.md](docs/FEATURE_STATUS.md) | Implemented vs planned |
| [docs/architecture.md](docs/architecture.md) | Packages, principles, flows |
| [docs/deployment.md](docs/deployment.md) | Dev, Compose, Traefik production |
| [docs/calculations.md](docs/calculations.md) | Money, balances, net worth |
| [docs/mcp-setup.md](docs/mcp-setup.md) | Tokens, tools, client config |
| [docs/adr/](docs/adr/) | Architecture decision records |
| [AGENTS.md](AGENTS.md) | Instructions for coding agents |
| [harness/README.md](harness/README.md) | End-user chat + skills |

---

## Visión (resumen)

FinLLM es un **libro mayor personal** alojado por ti: la web y el API guardan la verdad contable; el chat con un LLM solo **lee y escribe a través de MCP**, con confirmación para asientos. Las **skills** del harness enseñan al modelo qué herramientas usar y qué no inventar. Detalle de uso en español: [harness/README.md](harness/README.md).
