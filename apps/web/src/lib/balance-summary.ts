import type { BalanceRow } from "./types.js";

export function sumAbsMinorByType(rows: BalanceRow[], type: string): bigint {
  let n = 0n;
  for (const r of rows) {
    if (r.type !== type) continue;
    try {
      const v = BigInt(r.balanceMinor);
      n += v < 0n ? -v : v;
    } catch {
      /* skip invalid */
    }
  }
  return n;
}
