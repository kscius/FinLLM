# FinLLM

Self-hosted personal finance and investment management with **deterministic ledger services** and **LLM access via MCP**. The application is the system of record; models are clients, not accountants.

## Status

Early **0.1.0 MVP** — see [Feature status](docs/FEATURE_STATUS.md) for what is implemented vs planned.

## Quick start

```bash
cp .env.example .env
docker compose up postgres -d
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

- API: http://localhost:3001/health  
- Web: http://localhost:5173  

Initialize the instance from the web UI (first user), then create accounts and post transactions via REST or the dashboard.

## Chat harness (LLM + MCP)

Talk to **your** FinLLM from Cursor, Claude Code, Codex, OpenCode, or Claude Desktop: connect the MCP server, load the bundled **skills**, and chat in the harness UI.

- [Harness guide](harness/README.md) — skills, system prompt, config examples  
- [MCP setup](docs/mcp-setup.md) — tokens, tools, build  
- [AGENTS.md](AGENTS.md) — instructions for agents **developing** this repo  

## Architecture

- [Architecture overview](docs/architecture.md)
- [Calculation methodology](docs/calculations.md)

## Development

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Backup

```bash
export DATABASE_URL=postgresql://finllm:finllm@localhost:5432/finllm
./scripts/backup-db.sh
./scripts/restore-db.sh backups/your-file.sql.gz
```

## License

Apache-2.0 — see [LICENSE](LICENSE).
