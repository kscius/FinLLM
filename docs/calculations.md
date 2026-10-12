# Financial calculation methodology (MVP)

Authoritative rules live in `@finllm/money` and `@finllm/domain`; the API applies them on every read/write. LLM clients must not reimplement this logic — use tool and API outputs only. See [architecture.md](architecture.md).

## Money representation

- Storage: `bigint` minor units (centavos for MXN, cents for USD).
- Parsing rejects more than two decimal places.
- FX: `mxn_per_usd` as decimal string; conversion uses integer math with **round half-even** to centavos.

## Balances

- Only `POSTED` transactions affect balances.
- **Asset / expense** accounts: `balance = sum(debit) - sum(credit)`.
- **Liability / equity / income** accounts: inverted (credit-normal).

## Net worth

`NW = sum(asset balances) - sum(liability balances)` for accounts with `include_in_net_worth`.

Transfers between owned asset accounts net to zero in net worth and are excluded from spending aggregates.

## Spending (MVP)

Sum of expense account book debits minus credits on non-transfer transactions.
