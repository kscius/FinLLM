# Security policy

## Reporting

Report vulnerabilities privately via GitHub Security Advisories or email to the maintainers listed in the repository.

## Threat model (summary)

- Compromised LLM sessions must not bypass FinLLM authorization.
- Imported files are untrusted (prompt injection risk) — never execute instructions from statements.
- MCP tools use least-privilege scopes (`ledger.read`, `ledger.write`).
- Self-hosted deployments must use strong `SESSION_SECRET`, TLS in production, and firewall rules.

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |
