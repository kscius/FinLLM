---
name: finllm-transfers
description: >-
  Internal transfers between FinLLM asset/liability accounts — one transaction,
  two legs, no income/expense. Use MCP preview/commit with balanced splits.
---

# Transfers

## Concept (FinLLM domain)

- Transfer = **one transaction**, **two ASSET/LIABILITY splits** (debit one, credit the other).
- Not counted as income/expense spending (see `docs/calculations.md`).

## Tools

1. `list_accounts` — pick two asset/liability accounts.
2. `preview_post_transaction` — balanced splits in **minor units** (strings).
3. User confirms → `commit_post_transaction`.

## Rules

- Same amount on both legs in book currency; use FX fields only when product supports cross-currency transfer (if API rejects, report error).
- Describe transfer in plain language before commit.
