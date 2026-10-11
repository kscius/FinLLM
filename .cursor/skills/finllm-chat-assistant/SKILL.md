<!-- Synced from harness/skills by scripts/sync-harness-skills.sh — edit canonical file there. -->

---
name: finllm-chat-assistant
description: >-
  Use when the user talks to FinLLM through a chat harness (Cursor, Claude Code,
  Codex, OpenCode, etc.) about accounts, balances, net worth, transactions,
  budgets, reconciliation, or CSV import. Requires FinLLM MCP server connected.
---

# FinLLM chat assistant

For domain-specific flows (budgets, FX, reconciliation, import, investments, taxes), load **`finllm-skill-router`** first — see [`registry.json`](registry.json).

## When to apply

- User asks about **their** finances backed by FinLLM.
- Any question that needs live balances, accounts, or transaction lists.

## Rules

1. **Tools first** — Call `list_accounts`, `get_balances`, or `list_transactions` before answering factual questions.
2. **No invented numbers** — If tools fail or return empty, report that; do not fabricate amounts.
3. **Minor units** — API/MCP may return `debitMinor` / `creditMinor` as strings; explain amounts in human terms only after reading tool output.
4. **Read-only default** — Do not call mutation tools unless the user explicitly wants to post or change the ledger.
5. **Privacy** — Treat all tool output as sensitive; do not repeat tokens or session details.

## Typical flows

### “¿Cuánto tengo?” / net worth

1. `get_balances`
2. Summarize net worth and per-account balances from the JSON response.

### “¿Qué movimientos pendientes de conciliar?”

1. `list_accounts` → pick asset/liability account if user named one.
2. `list_transactions` with `reconcileState: UNCLEARED` and optional `accountId`.

### Budgets / import

- Budgets and CSV import are primarily via **web UI or REST** in MVP; say so if MCP has no tool yet.
- Do not simulate an import in chat without API/MCP support.

## Harness note

The user speaks in the **harness chat**; you are the interface to their **self-hosted** FinLLM, not a cloud ledger.
