# FinLLM architecture (MVP)

FinLLM is a **modular monolith**: deterministic ledger services are the system of record; LLM clients interact through **MCP** and never perform authoritative calculations.

## Packages

| Package | Role |
| ------- | ---- |
| `@finllm/money` | Integer minor units, parsing, FX conversion helpers |
| `@finllm/domain` | Ledger invariants (balanced splits, transfer vs posting) |
| `@finllm/db` | Drizzle schema + PostgreSQL migrations |
| `@finllm/api` | Fastify REST API, sessions, imports, audit |
| `@finllm/web` | React dashboard (works without an LLM) |
| `@finllm/mcp` | MCP stdio server (read tools in MVP) |

## Principles

1. **Book currency** defaults to MXN (`America/Mexico_City`).
2. Amounts stored as **bigint minor units** — no float money.
3. **Double-entry** splits; transfers are one transaction, two asset legs.
4. **MCP** uses scoped bearer tokens; mutations require preview/confirm (roadmap: full two-phase commit on all writes).
5. **Imports** are untrusted; CSV is parsed deterministically without LLM.

See `docs/adr/` for decision records.
