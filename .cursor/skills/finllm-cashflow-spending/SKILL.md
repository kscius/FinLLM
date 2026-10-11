<!-- Synced from harness/skills by scripts/sync-harness-skills.sh — edit canonical file there. -->

---
name: finllm-cashflow-spending
description: >-
  Spending and cashflow views from posted splits — income/expense accounts,
  transfers excluded from spending aggregates. Read via list_transactions and balances.
---

# Cashflow and spending

## Domain note

- **Transfers** are excluded from spending aggregates in FinLLM domain logic.
- Spending/income comes from **INCOME/EXPENSE** account legs.

## Tools

- `list_transactions` with filters (date range when user specifies; account if needed)
- `get_balances` for period context

## Rules

- Aggregate only from tool results; state date range and accounts used.
- If user wants categories not in chart of accounts, suggest account structure changes via product, not ad-hoc relabeling in chat.
