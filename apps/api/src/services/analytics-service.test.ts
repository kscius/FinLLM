import { describe, expect, it } from "vitest";
import { netWorthDeltaFromSplit } from "./analytics-service.js";

describe("netWorthDeltaFromSplit", () => {
  it("adds asset debits to net worth", () => {
    expect(netWorthDeltaFromSplit("ASSET", true, 100n, 0n)).toBe(100n);
  });

  it("liability credit reduces net worth", () => {
    expect(netWorthDeltaFromSplit("LIABILITY", true, 0n, 50n)).toBe(-50n);
  });

  it("ignores expense splits", () => {
    expect(netWorthDeltaFromSplit("EXPENSE", true, 100n, 0n)).toBe(0n);
  });
});
