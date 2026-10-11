<!-- Synced from harness/skills by scripts/sync-harness-skills.sh — edit canonical file there. -->

---
name: finllm-budgets
description: >-
  Budgets in FinLLM — create/list via API/web in MVP; compare spending using
  ledger reads. Use for presupuesto, límites, variance questions.
---

# Budgets

## MVP surface

- **Create/list budgets:** REST or web UI (`docs/FEATURE_STATUS.md` — partial).
- **MCP:** no dedicated budget tools yet; use reads to support Q&A.

## Tools (reads)

- `get_balances`, `list_transactions` (filter by date/account when supported)

## Rules

- Do not invent budget lines or variance numbers; if API data is missing, say budgets must be created in the app first.
- For “am I over budget?”, only answer when you can cite transaction/balance tool data or future budget MCP/API response.

## Evolution

When `list_budgets` MCP ships, update this skill and bump `registry.json` maturity to `active`.
