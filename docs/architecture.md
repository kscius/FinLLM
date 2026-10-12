# FinLLM architecture

FinLLM is a **modular monolith**: one deployable unit with strict package boundaries. Deterministic ledger services are the **system of record**; LLM clients interact only through **MCP** (and humans through the **web** or **REST**). Models never perform authoritative calculations.

## System context

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  apps/web   │     │  apps/mcp   │     │  (future)   │
│  React SPA  │     │  stdio MCP  │     │  mobile…    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │ session cookie     │ Bearer token      │
       └────────────────────┼───────────────────┘
                            ▼
                    ┌───────────────┐
                    │   apps/api    │
                    │   Fastify     │
                    └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        @finllm/domain  @finllm/money  @finllm/db
              │             │             │
              └─────────────┴─────────────┘
                            ▼
                      PostgreSQL
```

## Packages

| Package | Role |
| ------- | ---- |
| `@finllm/money` | Integer minor units, parsing, FX conversion helpers (round half-even) |
| `@finllm/domain` | Ledger invariants: balanced splits, transfer vs expense/income posting |
| `@finllm/db` | Drizzle schema, migrations under `packages/db/drizzle/` |
| `@finllm/api` | HTTP API, auth, rate limits, CSV import, confirm tokens, MCP token CRUD |
| `@finllm/web` | Dashboard: overview analytics, movements, import, budgets, investments view, reconciliation |
| `@finllm/mcp` | Thin MCP tool layer; every mutation goes through API confirm endpoints |

## Design principles

1. **Book currency** defaults to MXN (`FINLLM_BOOK_CURRENCY`), timezone `America/Mexico_City`.
2. Amounts are stored as **bigint minor units** — no floating-point money in application code.
3. **Double-entry** via transaction splits; transfers are one transaction with two asset legs.
4. **Posted vs draft** — Only `POSTED` transactions affect balances (see [calculations.md](calculations.md)).
5. **Imports are untrusted** — CSV is parsed deterministically; file content is never LLM-interpreted for posting.
6. **Writes are confirm-gated** — Direct `POST /api/v1/transactions` is disabled; use preview/commit (web, API, or MCP).
7. **MCP least privilege** — Scopes `ledger.read` and `ledger.write`; write tokens need `X-Mcp-Write-Confirm: 1` at creation; TTL and revoke supported.

## Authentication surfaces

| Client | Mechanism |
| ------ | --------- |
| Web UI | Session cookie after login; instance bootstrap via `/api/v1/setup/initialize` |
| MCP | `Authorization: Bearer <mcp_token>` on API calls from `apps/mcp` |
| Setup (prod) | `X-Setup-Bootstrap` header when `SETUP_BOOTSTRAP_SECRET` is set |

Single-user / single-book MVP: registration is off by default (`ALLOW_REGISTRATION=false`).

## Confirm flow (mutations)

All new ledger postings share one pattern:

1. **Preview** — `POST /api/v1/confirm/preview` (or MCP `preview_post_transaction`) returns a `confirmId` and human-readable summary.
2. **Commit** — `POST /api/v1/confirm/commit` (or MCP `commit_post_transaction`) with that id after explicit user approval.

This applies to web movements, API integrators, and MCP harness skills (`finllm-ledger-mutations`).

## Web application (0.1.0)

Hash-based routes (English slugs; legacy Spanish slugs still work):

| View | Purpose |
| ---- | ------- |
| Overview | Net worth, balance breakdown, analytics series |
| Movements | Income/expense posting via confirm flow |
| Import | CSV preview + commit with idempotency |
| Budgets | Create/list budgets, variance API |
| Investments | Asset-oriented view (analytics depth Phase 4+) |
| Reconciliation | Uncleared splits, date filters, mark reconciled |

i18n: English and Spanish; theme light/dark; PWA shell; accessibility checked in CI (axe + Playwright).

## API surface (representative)

| Area | Endpoints |
| ---- | --------- |
| Auth | `/api/v1/auth/login`, `logout`, `register` (when enabled) |
| Setup | `/api/v1/setup/status`, `initialize` |
| Ledger | `/api/v1/accounts`, `balances`, `transactions`, `confirm/*` |
| Analytics | `/api/v1/analytics/net-worth-series`, `expenses-by-category` |
| Budgets | `/api/v1/budgets`, `budgets/:id/variance` |
| Import | `/api/v1/imports/csv/preview`, `imports/:id/commit` |
| Reconcile | `PATCH /api/v1/splits/:splitId/reconcile` |
| MCP admin | `/api/v1/mcp/tokens` (CRUD) |

Health: `/health`, `/ready`.

## Harness layer (not in runtime path)

`harness/` is **documentation and agent configuration** shipped with the repo: skills teach MCP usage per domain; agents are optional role templates. Canonical skills live in `harness/skills/`; Cursor mirrors via `./scripts/sync-harness-skills.sh`. See [harness/README.md](../harness/README.md) and [EVOLUTION.md](../harness/EVOLUTION.md).

## External AI

`AI_FEATURES_ENABLED=false` by default. FinLLM does not send ledger data to a bundled cloud model; any LLM is chosen and hosted by the user via their harness.

## Decisions

See [adr/](adr/) — e.g. modular monolith (ADR-0001), Fastify + Drizzle (ADR-0002).

## Related docs

- [FEATURE_STATUS.md](FEATURE_STATUS.md) — implementation matrix  
- [deployment.md](deployment.md) — how to run in dev and production  
- [mcp-setup.md](mcp-setup.md) — client wiring  
- [SECURITY.md](../SECURITY.md) — threat model summary  
