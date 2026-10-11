import type { CurrencyCode } from "@finllm/money";

export type AccountRow = {
  id: string;
  code: string;
  name: string;
  type: string;
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
};
