# FinLLM harness agents (plantillas)

Archivos en este directorio son **roles** para el chat del harness. Cópialos a:

- **Cursor:** `~/.cursor/agents/` o `.cursor/agents/` del proyecto
- **Claude Code:** según documentación de subagents del producto
- **Otros:** instrucciones de sistema + skills enlazadas

Cada agent delega en skills de [`../skills/`](../skills/) listadas en [`registry.json`](../skills/registry.json).

| Agent | Dominio |
| ----- | ------- |
| `finllm-orchestrator.md` | Enrutar preguntas y cargar skills |
| `finllm-budget-specialist.md` | Presupuestos y gasto |
| `finllm-reconciliation-specialist.md` | Conciliación |
| `finllm-import-specialist.md` | CSV / import |
| `finllm-investment-analyst.md` | Inversiones (planned) |

Evolución: [`../EVOLUTION.md`](../EVOLUTION.md).
