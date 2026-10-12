import type { CurrencyCode } from "@finllm/money";

export type AccountSubtype =
  | "CASH"
  | "BANK"
  | "CREDIT_CARD"
  | "LOAN"
  | "OPENING_BALANCES"
  | "TRADING"
  | "FX_GAIN"
  | "FX_LOSS"
  | "INCOME_GENERIC"
  | "EXPENSE_GENERIC";

export type AccountRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype?: AccountSubtype;
  currencyCode: CurrencyCode;
  isSystem?: boolean;
};

export type AppView = "overview" | "movements" | "import" | "budgets" | "investments" | "reconciliation";

export type BalanceRow = {
  accountId: string;
  code: string;
  name: string;
  type: string;
  currencyCode: CurrencyCode;
  balanceMinor: string;
  includeInNetWorth: boolean;
  subtype?: AccountSubtype;
};
