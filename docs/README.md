# FinLLM documentation

Central index for product, operations, and integration docs.

## Product

| Document | Purpose |
| -------- | ------- |
| [FEATURE_STATUS.md](FEATURE_STATUS.md) | What ships today vs roadmap |
| [architecture.md](architecture.md) | Modular monolith, packages, auth, confirm flow |
| [calculations.md](calculations.md) | Minor units, balances, net worth, spending |
| [mcp-setup.md](mcp-setup.md) | MCP build, tokens, tools, client examples |

## Operations

| Document | Purpose |
| -------- | ------- |
| [deployment.md](deployment.md) | Local dev, Docker Compose, Traefik / TLS production |
| [../SECURITY.md](../SECURITY.md) | Threat model, reporting, production checklist |
| [../scripts/](../scripts/) | `backup-db.sh`, `restore-db.sh`, `verify-backup-restore.sh` |

## Harness (end users + LLM chat)

| Document | Purpose |
| -------- | ------- |
| [../harness/README.md](../harness/README.md) | Chat flow, skills, agents, MCP config |
| [../harness/EVOLUTION.md](../harness/EVOLUTION.md) | How skills/agents evolve with the product |
| [../harness/skills/registry.json](../harness/skills/registry.json) | Skill maturity, triggers, MCP tools |
| [../harness/prompts/finllm-system.md](../harness/prompts/finllm-system.md) | System prompt fragment |

## Engineering

| Document | Purpose |
| -------- | ------- |
| [../AGENTS.md](../AGENTS.md) | Monorepo map, commands, change discipline |
| [../CLAUDE.md](../CLAUDE.md) | Short pointer for Claude Code |
| [adr/](adr/) | Architecture decision records |

## Related env templates

| File | Use |
| ---- | --- |
| [../.env.example](../.env.example) | Local `pnpm dev` + Postgres |
| [../deploy/traefik-example/.env.example](../deploy/traefik-example/.env.example) | Production Traefik stack (copy to your host) |
