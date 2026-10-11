import { describe, expect, it } from "vitest";
import { nativeSignedBalance, spendingFromSplits, validateAndClassifyPosting } from "./ledger.js";

describe("ledger invariants", () => {
  it("classifies same-currency transfer", () => {
    const result = validateAndClassifyPosting(
      [
        {
          accountId: "a1",
          accountType: "ASSET",
          currencyCode: "MXN",
          debitMinor: 0n,
          creditMinor: 10000n,
        },
        {
          accountId: "a2",
          accountType: "ASSET",
          currencyCode: "MXN",
          debitMinor: 10000n,
          creditMinor: 0n,
        },
      ],
      "MXN",
    );
    expect(result.kind).toBe("TRANSFER");
  });

  it("transfer does not count as spending", () => {
    const spend = spendingFromSplits([
      {
        accountType: "ASSET",
        bookDebit: 10000n,
        bookCredit: 0n,
        kind: "TRANSFER",
      },
    ]);
    expect(spend).toBe(0n);
  });

  it("asset balance uses debit-normal", () => {
    expect(nativeSignedBalance("ASSET", 5000n, 2000n)).toBe(3000n);
    expect(nativeSignedBalance("LIABILITY", 1000n, 4000n)).toBe(3000n);
  });
});
