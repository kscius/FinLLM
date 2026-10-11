# Feature status

| Area | Status | Notes |
| ---- | ------ | ----- |
| Auth / single-user setup | Implemented | `/api/v1/setup/initialize`, `/api/v1/setup/status`; web hides init when already set up |
| Accounts (MXN/USD) | Implemented | REST |
| Transactions / splits / transfers | Implemented | Domain validation |
| Balances / net worth | Implemented | Asset − liability |
| CSV import preview + commit | Implemented | Duplicate via idempotency keys |
| Budgets | Implemented | Web create/list + `GET /api/v1/budgets/:id/variance` |
| Reconciliation UI | Implemented | Web uncleared list + date filter + mark reconciled |
| Web UX / design system | Implemented | i18n en/es (default en, localStorage), gráficos Recharts, PWA, OG/PNG, marca SVG, hash routes (EN + slugs ES legacy), tema, axe Playwright en CI |
| Web analytics API | Implemented | `GET /api/v1/analytics/net-worth-series`, `expenses-by-category` |
| Investments | Partial | Web vista de activos; analytics/lotes Phase 4+ |
| Web — movements / CSV | Implemented | Gasto/ingreso, import preview+commit, crear cuentas |
| MCP read tools | Implemented | list_accounts, get_balances, list_transactions |
| MCP mutations | Implemented | preview_post_transaction + commit_post_transaction (confirm flow) |
| Security hardening | Implemented | CSP (nginx), Drizzle CVE patch, confirm-only txn writes, MCP token TTL/revoke, setup bootstrap |
| Docker Compose | Implemented | postgres + api + web |
| Backup / restore | Implemented | `scripts/backup-db.sh`, `restore-db.sh`, `verify-backup-restore.sh` (Docker pg fallback) |
| Automated tests | Partial | Money + ledger + CSV import unit tests |
| Bank aggregators | Unsupported | Manual import only |
| Built-in external AI | Disabled | `AI_FEATURES_ENABLED=false` |
| Harness skills + MCP configs | Implemented | `harness/`, `registry.json`, domain skills, `sync-harness-skills.sh` |
| Harness agents (templates) | Implemented | `harness/agents/` — orchestrator + domain specialists |
| Harness evolution process | Implemented | `harness/EVOLUTION.md`, `feedback/skill-proposal.md` |
