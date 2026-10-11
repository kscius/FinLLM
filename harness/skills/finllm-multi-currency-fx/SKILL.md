---
name: finllm-multi-currency-fx
description: >-
  MXN/USD and FX in FinLLM — integer minor units, book currency MXN, no float math
  in chat. Use when user asks about dollars, pesos, or conversion.
---

# Multi-currency (MXN / USD)

## Authority

- Stored amounts are **bigint minor units**; FX uses server rules (`@finllm/money`).
- Never convert amounts in the model; use `get_balances` / `list_transactions` output.

## Tools

- `list_accounts` — `currencyCode` per account
- `get_balances` — book-currency totals

## User guidance

- Explain that **book currency** defaults to MXN (`America/Mexico_City`).
- If user needs a manual FX rate entry, direct to API/product docs when no MCP tool exists.
