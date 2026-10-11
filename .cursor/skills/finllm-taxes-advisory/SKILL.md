<!-- Synced from harness/skills by scripts/sync-harness-skills.sh — edit canonical file there. -->

---
name: finllm-taxes-advisory
description: >-
  Tax questions boundary — no licensed tax advice; export/reporting from ledger
  when product supports it. Mexico/US context only as user-stated facts.
---

# Taxes (boundary skill)

## Status

**Planned** — FinLLM does not file taxes or compute ISR/VAT authoritatively in MVP.

## Allowed

- Explain what **data exists in the ledger** (income/expense accounts) via MCP reads.
- Suggest user consult a **licensed tax professional** for filings.
- Point to future export features when listed in FEATURE_STATUS.

## Forbidden

- Specific deduction eligibility, filing instructions, or legal conclusions.
- Fabricating SAT/IRS forms from chat.

## Evolution

Add `finllm-tax-reports` skill when deterministic report endpoints exist.
