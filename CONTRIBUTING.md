# Contributing to FinLLM

1. Fork and clone the repository.
2. Install Node 20+ and pnpm 9.
3. Copy `.env.example` to `.env` and start Postgres (`docker compose up postgres -d`).
4. Run `pnpm install`, `pnpm db:generate`, `pnpm db:migrate`, `pnpm dev`.
5. Run `pnpm test` and `pnpm typecheck` before opening a PR.

Please open issues for substantial design changes. Financial behavior changes need tests in `packages/domain` or `packages/money`.
