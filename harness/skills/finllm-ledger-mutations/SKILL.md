---
name: finllm-ledger-mutations
description: >-
  Use before posting transactions through FinLLM MCP. Enforces preview → user
  confirm → commit. Requires ledger.write scope on FINLLM_MCP_TOKEN.
---

# FinLLM ledger mutations (MCP)

## When to apply

User asks to **record**, **post**, **book**, or **enter** a transaction, transfer, or journal entry in FinLLM via the chat harness.

## Two-phase commit (mandatory)

1. **`preview_post_transaction`** — Build balanced splits (≥2 legs). Each split: `accountId`, `debitMinor`, `creditMinor` (strings, minor units; one side zero).
2. **Show the user** — Date, description, every leg (account + debit/credit). Ask explicit yes/no to commit.
3. **`commit_post_transaction`** — Only after confirmation, with `confirmId` from the preview response.

Never call `commit_post_transaction` without a prior preview in the same conversation unless the user repeats the exact preview payload and confirms again.

## Preconditions

- MCP token must include **`ledger.write`** (create via `POST /api/v1/mcp/tokens` with header **`X-Mcp-Write-Confirm: 1`**).
- Use `list_accounts` to resolve valid `accountId` values; do not guess UUIDs.

## Double-entry

- Splits must balance in book currency; domain validation runs on the server.
- Transfers: one transaction, two asset/liability legs (see `docs/calculations.md`).

## On errors

- `403 ledger.write` — Tell user to mint a write-scoped token and update harness MCP env.
- Validation errors — Quote server message; do not “fix” amounts silently without user approval.

## What not to do

- Do not post via raw REST unless the user’s harness has no MCP write tools (prefer MCP for audit + confirm tokens).
- Do not use floating-point math to compute split amounts in the model; use user-stated amounts or integer minor strings they approve.
