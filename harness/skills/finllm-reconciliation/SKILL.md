---
name: finllm-reconciliation
description: >-
  Bank reconciliation — uncleared splits, reconcile states UNCLEARED/CLEARED/RECONCILED.
  MCP list_transactions; web UI can mark reconciled.
---

# Reconciliation

## Tools

- `list_accounts` — asset/liability accounts
- `list_transactions` with `reconcileState: UNCLEARED` and `accountId`

## Workflow in chat

1. Identify account (user name or pick from list).
2. List uncleared splits; present date, description, debit/credit minor.
3. User confirms items cleared → **web UI** `PATCH /api/v1/splits/:id/reconcile` or dashboard; MCP reconcile write may be added later.

## Rules

- Reconciliation is matching **ledger** to **bank reality**; do not delete transactions in chat without explicit product support.
- If counts disagree with user’s bank app, help investigate missing imports (see `finllm-csv-import`).
