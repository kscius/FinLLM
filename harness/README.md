# FinLLM harness — chat con tu ledger

El **usuario final** no contabiliza en el chat: habla con un asistente en el **harness** (Cursor, Claude Code, Codex, OpenCode, Claude Desktop, etc.). El modelo usa **MCP** para leer y, con confirmación, escribir en **tu** instancia FinLLM self-hosted.

## Flujo

1. Levanta FinLLM (`docker compose`, `pnpm db:migrate`, `pnpm dev` o Compose completo).
2. Inicializa la instancia en la web y crea un token MCP (`ledger.read` y, si quieres asientos, `ledger.write`).
3. Compila el servidor MCP: `pnpm --filter @finllm/mcp run build`.
4. Registra el servidor MCP en tu harness (ejemplos en [`config/`](config/)).
5. Carga **skills** y opcionalmente **agents** (ver abajo).

```
Usuario ──chat──► Harness (Cursor / Claude / Codex / …)
                      │ skills + agents (evolucionan con el producto)
                      ▼ MCP (stdio)
                 apps/mcp ──REST──► apps/api ──► PostgreSQL
```

## Skills por dominio financiero

Catálogo vivo: [`skills/registry.json`](skills/registry.json) · índice: [`skills/README.md`](skills/README.md).

| Capa | Skills |
| ---- | ------ |
| Meta | `finllm-skill-router` |
| Base | `finllm-chat-assistant`, `finllm-ledger-mutations` |
| Dominio | patrimonio, cuentas, transferencias, FX, presupuestos, conciliación, CSV, cashflow, inversiones (planned), impuestos (límite) |

**Cursor:** `./scripts/sync-harness-skills.sh` copia `harness/skills/` → [`.cursor/skills/`](../.cursor/skills/).

**Evolución:** nuevas áreas financieras → [`EVOLUTION.md`](EVOLUTION.md) + plantilla [`feedback/skill-proposal.md`](feedback/skill-proposal.md).

## Agents (subagents del harness)

Plantillas en [`agents/`](agents/) — orquestador, presupuestos, conciliación, import, inversiones. Instálalas en tu harness según el producto (Cursor `~/.cursor/agents/`, etc.).

## Prompt de sistema

[`prompts/finllm-system.md`](prompts/finllm-system.md)

## Configuración MCP

| Herramienta | Ejemplo |
| ----------- | ------- |
| Cursor | [`config/cursor-mcp.json.example`](config/cursor-mcp.json.example) |
| Claude Desktop | [`config/claude-desktop-mcp.json.example`](config/claude-desktop-mcp.json.example) |
| Claude Code | [`.mcp.json.example`](../.mcp.json.example) |
| Codex | [`config/codex-config.toml.example`](config/codex-config.toml.example) |
| OpenCode | [`config/opencode.json.example`](config/opencode.json.example) |

Detalle: [docs/mcp-setup.md](../docs/mcp-setup.md).

## Herramientas MCP (MVP)

**Lectura:** `list_accounts`, `get_balances`, `list_transactions`  
**Escritura:** `preview_post_transaction`, `commit_post_transaction`
