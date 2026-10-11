<!-- Synced from harness/skills by scripts/sync-harness-skills.sh — edit canonical file there. -->

---
name: finllm-skill-router
description: >-
  Route FinLLM harness chat to the correct domain skill using registry.json.
  Use at the start of finance questions or when the topic shifts (budgets, FX,
  reconciliation, imports, investments, taxes).
---

# FinLLM skill router

## Registry

Read [`registry.json`](registry.json) in this directory for the full catalog (`id`, `triggers`, `maturity`, `mcp_tools`).

## Routing steps

1. Classify the user message into **one primary domain** (and optional secondary).
2. Load the matching `harness/skills/<id>/SKILL.md` (or `.cursor/skills/<id>/` after sync).
3. Always keep **global guardrails** from `harness/prompts/finllm-system.md` and `finllm-chat-assistant`.
4. If the user wants to **post** to the ledger, also load `finllm-ledger-mutations`.
5. If `maturity` is `planned`, state product limits and use read-only tools only.

## Domain → skill map (quick)

| Topic | Skill id |
| ----- | -------- |
| Patrimonio / saldos | `finllm-net-worth-balances` |
| Plan de cuentas | `finllm-accounts-chart` |
| Transferencias | `finllm-transfers` |
| USD/MXN / FX | `finllm-multi-currency-fx` |
| Presupuestos | `finllm-budgets` |
| Conciliación | `finllm-reconciliation` |
| CSV / import | `finllm-csv-import` |
| Gastos / flujo | `finllm-cashflow-spending` |
| Inversiones | `finllm-investments` |
| Impuestos | `finllm-taxes-advisory` |

## Evolution

When no skill fits, suggest filing [`harness/feedback/skill-proposal.md`](../../feedback/skill-proposal.md) and use `finllm-chat-assistant` with explicit tool calls.
