# FinLLM domain skills

Skills teach harness models **how** to call FinLLM safely; product behavior is defined by the API and [FEATURE_STATUS.md](../../docs/FEATURE_STATUS.md). Repo mission: [README.md](../../README.md).

Catálogo maestro: [`registry.json`](registry.json) (maturity, triggers, MCP tools).

## Siempre cargar en el harness

| Skill | Rol |
| ----- | --- |
| `finllm-skill-router` | Elegir dominio |
| `finllm-chat-assistant` | Lecturas y límites generales |
| `finllm-ledger-mutations` | Asientos con preview/commit |

## Por dominio financiero

| Skill | Maturity |
| ----- | -------- |
| `finllm-net-worth-balances` | active |
| `finllm-accounts-chart` | active |
| `finllm-transfers` | seed |
| `finllm-multi-currency-fx` | seed |
| `finllm-budgets` | seed |
| `finllm-reconciliation` | active |
| `finllm-csv-import` | seed |
| `finllm-cashflow-spending` | seed |
| `finllm-spending-insights` | seed |
| `finllm-financial-coach` | seed |
| `finllm-savings-goals` | seed |
| `finllm-investments` | planned |
| `finllm-taxes-advisory` | planned |

## Evolución

Ver [`../EVOLUTION.md`](../EVOLUTION.md). Propuestas: [`../feedback/skill-proposal.md`](../feedback/skill-proposal.md).

```bash
./scripts/sync-harness-skills.sh
```
