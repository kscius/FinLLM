# Feature status

| Area | Status | Notes |
| ---- | ------ | ----- |
| Auth / single-user setup | Implemented | `/api/v1/setup/initialize` |
| Accounts (MXN/USD) | Implemented | REST |
| Transactions / splits / transfers | Implemented | Domain validation |
| Balances / net worth | Implemented | Asset − liability |
| CSV import preview + commit | Implemented | Duplicate via idempotency keys |
| Budgets | Partial | Create/list; variance reports planned |
| Reconciliation UI | Partial | Web uncleared list + mark reconciled; statements UI planned |
| Investments | Planned | Phase 4 |
| MCP read tools | Implemented | list_accounts, get_balances, list_transactions |
| MCP mutations | Implemented | preview_post_transaction + commit_post_transaction (confirm flow) |
| Docker Compose | Implemented | postgres + api + web |
| Backup / restore | Implemented | `scripts/backup-db.sh`, `restore-db.sh`, `verify-backup-restore.sh` (Docker pg fallback) |
| Automated tests | Partial | Money + ledger + CSV import unit tests |
| Bank aggregators | Unsupported | Manual import only |
| Built-in external AI | Disabled | `AI_FEATURES_ENABLED=false` |
