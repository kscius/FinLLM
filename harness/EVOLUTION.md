# Evolución del harness (skills y agents)

FinLLM **no** congela el comportamiento del LLM en un solo prompt: las **skills** y **agents** del repo deben **crecer con el producto y con el uso real**.

## Principios

1. **Ledger primero** — Nueva skill solo promueve flujos que el API/MCP puede ejecutar o que la web expone sin inventar datos.
2. **Un dominio, una skill** — Presupuestos, conciliación, FX, etc. tienen `harness/skills/finllm-<dominio>/SKILL.md` enlazada en [`skills/registry.json`](skills/registry.json).
3. **Agents = roles** — `harness/agents/*.md` son plantillas para subagents del harness (Cursor, Claude Code, etc.); delegan a skills concretas.
4. **Maturity** — `active` | `seed` | `planned` en el registry; alinear con [`docs/FEATURE_STATUS.md`](../docs/FEATURE_STATUS.md).

## Cuándo añadir o subir de nivel

| Señal | Acción |
| ----- | ------ |
| Usuario repite la misma pregunta y el modelo alucina | Añadir skill `seed` con herramientas MCP exactas y anti-patrones |
| Nueva ruta API o tool MCP | Actualizar skill del dominio + `registry.json` + `docs/mcp-setup.md` |
| FEATURE_STATUS pasa a Implemented | Subir `maturity` de `seed`/`planned` → `active` |
| Flujo multi-paso estable (ej. import CSV) | Skill + agent especialista opcional |

## Proceso (contribución)

1. Copia [`feedback/skill-proposal.md`](feedback/skill-proposal.md) o abre issue con dominio, triggers, MCP tools, límites.
2. Añade `harness/skills/finllm-<name>/SKILL.md` (frontmatter `name` + `description` para descubrimiento).
3. Registra entrada en `harness/skills/registry.json`.
4. Si aplica, añade `harness/agents/finllm-<role>.md`.
5. Ejecuta `./scripts/sync-harness-skills.sh` para reflejar en `.cursor/skills/`.
6. Actualiza `harness/skills/README.md` y, si cambia contrato MCP, tests o docs de producto.

## Sincronización Cursor

```bash
./scripts/sync-harness-skills.sh
```

No edites `.cursor/skills/finllm-*` a mano salvo emergencia; vuelve a sincronizar desde `harness/skills/`.

## Roadmap de dominios (referencia)

Alineado con [`skills/registry.json`](skills/registry.json) (oct 2026):

- **active:** `finllm-skill-router`, `finllm-chat-assistant`, `finllm-ledger-mutations`, `finllm-net-worth-balances`, `finllm-accounts-chart`, `finllm-reconciliation`
- **seed:** `finllm-transfers`, `finllm-multi-currency-fx`, `finllm-budgets`, `finllm-csv-import`, `finllm-cashflow-spending` (API/web soportan parte del flujo; MCP sin tools dedicadas aún)
- **planned:** `finllm-investments`, `finllm-taxes-advisory` (disclaimers; sin asesoría legal en el producto)
