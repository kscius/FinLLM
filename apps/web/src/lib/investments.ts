import type { BalanceRow } from "./types.js";

export type PortfolioSegment = "holdings" | "cash" | "all";

/** Net-worth ASSET rows for the investments surface. */
export function assetBalances(rows: BalanceRow[] | null | undefined): BalanceRow[] {
  return rows?.filter((b) => b.type === "ASSET" && b.includeInNetWorth) ?? [];
}

export function isCashLike(row: BalanceRow): boolean {
  return !row.subtype || row.subtype === "CASH";
}

export function isHoldingLike(row: BalanceRow): boolean {
  return row.subtype === "BANK";
}

export function filterBySegment(
  rows: BalanceRow[] | null | undefined,
  segment: PortfolioSegment,
): BalanceRow[] {
  const assets = assetBalances(rows);
  switch (segment) {
    case "holdings":
      return assets.filter(isHoldingLike);
    case "cash":
      return assets.filter(isCashLike);
    case "all":
      return assets;
    default: {
      const _exhaustive: never = segment;
      return _exhaustive;
    }
  }
}

export function sumAbsMinor(rows: BalanceRow[]): bigint {
  let total = 0n;
  for (const r of rows) {
    try {
      const v = BigInt(r.balanceMinor);
      total += v < 0n ? -v : v;
    } catch {
      /* skip malformed */
    }
  }
  return total;
}

export function allocationShare(row: BalanceRow, totalAbs: bigint): number {
  if (totalAbs === 0n) return 0;
  try {
    const v = BigInt(row.balanceMinor);
    const abs = v < 0n ? -v : v;
    return Number((abs * 10000n) / totalAbs) / 100;
  } catch {
    return 0;
  }
}
