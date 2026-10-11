# Security policy

## Reporting

Report vulnerabilities privately via GitHub Security Advisories or email to the maintainers listed in the repository.

## Threat model (summary)

- Compromised LLM sessions must not bypass FinLLM authorization.
- Imported files are untrusted (prompt injection risk) — never execute instructions from statements.
- MCP tools use least-privilege scopes (`ledger.read`, `ledger.write`).
- Self-hosted deployments must use strong `SESSION_SECRET`, TLS in production, and firewall rules.
- Transaction writes use **preview + confirm** only (`POST /api/v1/confirm/*`); direct `POST /api/v1/transactions` is disabled.
- After bootstrap, set `SETUP_BOOTSTRAP_SECRET` and keep `ALLOW_PUBLIC_SETUP_STATUS=false` in production.
- MCP `ledger.write` tokens require `X-Mcp-Write-Confirm: 1` and expire by default (`MCP_TOKEN_DEFAULT_TTL_DAYS`).

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |
