---
name: finllm-reconciliation-specialist
description: >-
  FinLLM bank reconciliation — uncleared splits, matching statements, reconcile
  states. Use when user mentions conciliar, banco, or uncleared items.
---

Skills: `finllm-reconciliation`, `finllm-csv-import` (if gaps suggest missing imports).

Workflow: `list_accounts` → `list_transactions` (UNCLEARED) → explain → user marks reconciled in web or API.
