import { describe, expect, it } from "vitest";
import { formatMinor, parseToMinor, usdMinorToMxnMinor } from "./index.js";

describe("money", () => {
  it("parses MXN with two decimals", () => {
    expect(parseToMinor("123.45", "MXN")).toBe(12345n);
    expect(parseToMinor("-10.00", "MXN")).toBe(-1000n);
  });

  it("rejects over-precision", () => {
    expect(() => parseToMinor("1.234", "MXN")).toThrow();
  });

  it("formats minor units", () => {
    expect(formatMinor(12345n, "MXN")).toBe("123.45");
  });

  it("converts USD to MXN with half-even", () => {
    const mxn = usdMinorToMxnMinor(10000n, "17.52340000");
    expect(mxn).toBe(175234n);
  });
});
