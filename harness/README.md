# FinLLM harness — chat con tu ledger

El **usuario final** no contabiliza en el chat: habla con un asistente en el **harness** (Cursor, Claude Code, Codex, OpenCode, Claude Desktop, etc.). El modelo usa **MCP** para leer y, con confirmación, escribir en **tu** instancia FinLLM self-hosted.

**English:** [README at repo root](../README.md) · [MCP setup](../docs/mcp-setup.md)

## Propósito

- **FinLLM (API + PostgreSQL)** es la única fuente de verdad para saldos, patrimonio e historial.
- El LLM **asiste** con lenguaje natural; **no** calcula dinero ni inventa cuentas.
- Las **skills** enseñan qué herramientas MCP usar por dominio (presupuestos, conciliación, FX, …).
- Los **agents** son plantillas opcionales de roles para delegar tareas multi-paso.

## Flujo

1. Levanta FinLLM — desarrollo: [README § Quick start](../README.md#quick-start-development); producción: [docs/deployment.md](../docs/deployment.md).
2. Inicializa la instancia en la web y crea un token MCP (`ledger.read` y, si quieres asientos, `ledger.write` con `X-Mcp-Write-Confirm: 1`).
3. Compila el servidor MCP: `pnpm --filter @finllm/mcp run build`.
4. Registra el servidor MCP en tu harness (ejemplos en [`config/`](config/)).
5. Carga **skills** y opcionalmente **agents** (ver abajo).
6. Usa el fragmento de prompt en [`prompts/finllm-system.md`](prompts/finllm-system.md).

```text
Usuario ──chat──► Harness (Cursor / Claude / Codex / …)
                      │ skills + agents (evolucionan con el producto)
                      ▼ MCP (stdio)
                 apps/mcp ──REST──► apps/api ──► PostgreSQL
```

## Qué puede hacer el asistente hoy

| Capacidad producto | Vía MCP | Skill relacionada |
| ---------------- | ------- | ----------------- |
| Listar cuentas, saldos, movimientos | Sí | `finllm-chat-assistant`, dominio |
| Registrar asientos | Preview + commit | `finllm-ledger-mutations` |
| Conciliación (consulta uncleared) | Lectura de splits | `finllm-reconciliation` |
| Presupuestos / CSV import | Principalmente web/API | `finllm-budgets`, `finllm-csv-import` (seed) |
| Inversiones / impuestos | Vista web parcial; sin asesoría legal | `planned` skills |

Estado detallado: [docs/FEATURE_STATUS.md](../docs/FEATURE_STATUS.md).

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

## Configuración MCP

| Herramienta | Ejemplo |
| ----------- | ------- |
| Cursor | [`config/cursor-mcp.json.example`](config/cursor-mcp.json.example) |
| Claude Desktop | [`config/claude-desktop-mcp.json.example`](config/claude-desktop-mcp.json.example) |
| Claude Code | [`.mcp.json.example`](../.mcp.json.example) |
| Codex | [`config/codex-config.toml.example`](config/codex-config.toml.example) |
| OpenCode | [`config/opencode.json.example`](config/opencode.json.example) |

Detalle: [docs/mcp-setup.md](../docs/mcp-setup.md).

## Herramientas MCP (0.1.0)

**Lectura:** `list_accounts`, `get_balances`, `list_transactions`  
**Escritura:** `preview_post_transaction`, `commit_post_transaction` (siempre mostrar resumen al usuario antes del commit)
