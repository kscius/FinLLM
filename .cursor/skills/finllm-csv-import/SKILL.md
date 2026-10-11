<!-- Synced from harness/skills by scripts/sync-harness-skills.sh — edit canonical file there. -->

---
name: finllm-csv-import
description: >-
  CSV import into FinLLM — deterministic parser, preview+commit API, idempotency.
  No LLM parsing of file contents. Guide user through web or REST.
---

# CSV import

## Hard rule

**Never** parse or invent CSV rows in the model. Imports are **deterministic** (`apps/api` import service).

## User flow

1. User prepares CSV per product format/docs.
2. **Preview** then **commit** via web UI or `POST` import endpoints with idempotency keys.
3. After import, verify with `list_transactions` / `get_balances`.

## Chat role

- Explain duplicate protection (`external_ref`, idempotency).
- Help map columns to income/expense/asset accounts using `list_accounts`.
- Do not upload secrets or full bank credentials in chat.
