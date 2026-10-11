<!-- Synced from harness/skills by scripts/sync-harness-skills.sh — edit canonical file there. -->

---
name: finllm-accounts-chart
description: >-
  Chart of accounts in FinLLM — list_accounts, account types (ASSET, LIABILITY,
  INCOME, EXPENSE), MXN/USD. Use when user asks what accounts exist or how to classify.
---

# Chart of accounts

## Tools

- `list_accounts`

## Guidance

- Explain **type** and **subtype** from API fields; map user language (“tarjeta”, “efectivo”, “nómina”) to existing accounts before posting.
- For new account creation, MVP may be REST/web only — if no MCP tool exists, direct user to dashboard/API docs; do not pretend an account was created.

## Posting hint

Income/expense postings need valid account IDs from this list; pair with `finllm-ledger-mutations` when recording.
