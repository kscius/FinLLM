import type { Db } from "@finllm/db";
import { accounts } from "@finllm/db";

export const SYSTEM_ACCOUNT_SEEDS = [
  {
    code: "3900",
    name: "Opening Balances",
    type: "EQUITY" as const,
    subtype: "OPENING_BALANCES" as const,
    currencyCode: "MXN",
    isSystem: true,
  },
  {
    code: "3990",
    name: "Trading USD",
    type: "EQUITY" as const,
    subtype: "TRADING" as const,
    currencyCode: "USD",
    isSystem: true,
  },
  {
    code: "3991",
    name: "Trading MXN",
    type: "EQUITY" as const,
    subtype: "TRADING" as const,
    currencyCode: "MXN",
    isSystem: true,
  },
  {
    code: "4990",
    name: "FX Gain",
    type: "INCOME" as const,
    subtype: "FX_GAIN" as const,
    currencyCode: "MXN",
    isSystem: true,
    includeInCashflow: false,
  },
  {
    code: "5990",
    name: "FX Loss",
    type: "EXPENSE" as const,
    subtype: "FX_LOSS" as const,
    currencyCode: "MXN",
    isSystem: true,
    includeInCashflow: false,
  },
];

export async function seedSystemAccounts(db: Db, bookId: string): Promise<void> {
  for (const seed of SYSTEM_ACCOUNT_SEEDS) {
    await db.insert(accounts).values({
      bookId,
      code: seed.code,
      name: seed.name,
      type: seed.type,
      subtype: seed.subtype,
      currencyCode: seed.currencyCode,
      isSystem: true,
      includeInCashflow: seed.includeInCashflow ?? true,
    });
  }
}
