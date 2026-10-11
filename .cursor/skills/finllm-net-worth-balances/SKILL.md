<!-- Synced from harness/skills by scripts/sync-harness-skills.sh — edit canonical file there. -->

---
name: finllm-net-worth-balances
description: >-
  Net worth and account balances from FinLLM via MCP get_balances. Use for
  patrimonio, cuánto tengo, total assets/liabilities, MXN book currency.
---

# Net worth and balances

## Tools

- Primary: `get_balances`
- Context: `list_accounts` when the user names an account by label/code

## Rules

- Summarize **net worth** and major asset/liability lines from tool JSON only.
- Book currency is typically **MXN**; note when accounts are USD-native if present in account metadata.
- Do not annualize, project returns, or estimate future balances unless the user asks for a hypothetical clearly labeled non-ledger.

## Empty / errors

If balances are zero or empty, suggest initialize/setup, posting transactions, or CSV import via web — do not invent opening balances.
