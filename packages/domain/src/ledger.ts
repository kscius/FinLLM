import type { CurrencyCode } from "@finllm/money";
import { usdMinorToMxnMinor } from "@finllm/money";

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";

export interface SplitInput {
  accountId: string;
  accountType: AccountType;
  currencyCode: CurrencyCode;
  debitMinor: bigint;
  creditMinor: bigint;
}

export interface PostingValidationResult {
  kind: "POSTING" | "TRANSFER";
  bookDebitTotal: bigint;
  bookCreditTotal: bigint;
}

export class LedgerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LedgerValidationError";
  }
}

function assertXorDebitCredit(debit: bigint, credit: bigint): void {
  const d = debit > 0n;
  const c = credit > 0n;
  if (d === c) {
    throw new LedgerValidationError("Split must have exactly one of debit or credit");
  }
}

export function normalBalanceSide(type: AccountType): "DEBIT" | "CREDIT" {
  if (type === "ASSET" || type === "EXPENSE") return "DEBIT";
  return "CREDIT";
}

export function nativeSignedBalance(
  type: AccountType,
  debitSum: bigint,
  creditSum: bigint,
): bigint {
  const raw = debitSum - creditSum;
  const side = normalBalanceSide(type);
  return side === "DEBIT" ? raw : -raw;
}

export function toBookMinor(
  nativeDebit: bigint,
  nativeCredit: bigint,
  currency: CurrencyCode,
  bookCurrency: CurrencyCode,
  mxnPerUsd?: string,
): { bookDebit: bigint; bookCredit: bigint } {
  if (currency === bookCurrency) {
    return { bookDebit: nativeDebit, bookCredit: nativeCredit };
  }
  if (currency === "USD" && bookCurrency === "MXN" && mxnPerUsd) {
    const bookDebit =
      nativeDebit > 0n ? usdMinorToMxnMinor(nativeDebit, mxnPerUsd) : 0n;
    const bookCredit =
      nativeCredit > 0n ? usdMinorToMxnMinor(nativeCredit, mxnPerUsd) : 0n;
    return { bookDebit, bookCredit };
  }
  throw new LedgerValidationError(`Unsupported currency pair ${currency}/${bookCurrency}`);
}

export function validateAndClassifyPosting(
  splits: SplitInput[],
  bookCurrency: CurrencyCode,
  mxnPerUsd?: string,
): PostingValidationResult {
  if (splits.length < 2) {
    throw new LedgerValidationError("Posted transaction requires at least two splits");
  }

  let hasIncomeExpense = false;
  let hasAssetLiability = false;
  const currencies = new Set<CurrencyCode>();
  const commodityTotals = new Map<CurrencyCode, { debit: bigint; credit: bigint }>();
  let bookDebit = 0n;
  let bookCredit = 0n;

  for (const s of splits) {
    assertXorDebitCredit(s.debitMinor, s.creditMinor);
    currencies.add(s.currencyCode);
    if (s.accountType === "INCOME" || s.accountType === "EXPENSE") {
      hasIncomeExpense = true;
    }
    if (s.accountType === "ASSET" || s.accountType === "LIABILITY") {
      hasAssetLiability = true;
    }
    const t = commodityTotals.get(s.currencyCode) ?? { debit: 0n, credit: 0n };
    t.debit += s.debitMinor;
    t.credit += s.creditMinor;
    commodityTotals.set(s.currencyCode, t);

    const book = toBookMinor(s.debitMinor, s.creditMinor, s.currencyCode, bookCurrency, mxnPerUsd);
    bookDebit += book.bookDebit;
    bookCredit += book.bookCredit;
  }

  for (const [ccy, totals] of commodityTotals) {
    if (totals.debit !== totals.credit) {
      throw new LedgerValidationError(`Commodity ${ccy} does not balance`);
    }
  }
  if (bookDebit !== bookCredit) {
    throw new LedgerValidationError("Book currency (MXN) does not balance");
  }

  const kind =
    !hasIncomeExpense && hasAssetLiability && currencies.size === 1 ? "TRANSFER" : "POSTING";

  if (kind === "TRANSFER" && hasIncomeExpense) {
    throw new LedgerValidationError("Transfer cannot include income/expense accounts");
  }
  if (kind === "POSTING" && !hasIncomeExpense) {
    throw new LedgerValidationError("Posting requires income or expense splits");
  }

  return { kind, bookDebitTotal: bookDebit, bookCreditTotal: bookCredit };
}

export function spendingFromSplits(
  splits: Array<{ accountType: AccountType; bookDebit: bigint; bookCredit: bigint; kind: string }>,
): bigint {
  let total = 0n;
  for (const s of splits) {
    if (s.kind === "TRANSFER") continue;
    if (s.accountType === "EXPENSE") {
      total += s.bookDebit - s.bookCredit;
    }
  }
  return total;
}
