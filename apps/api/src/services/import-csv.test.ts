import { describe, expect, it } from "vitest";
import { parseCsvContent } from "./import-csv.js";

describe("parseCsvContent", () => {
  it("parses headered CSV", () => {
    const rows = parseCsvContent("date,amount,description\n2026-01-15,-50.00,Groceries");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.amount).toBe("-50.00");
  });
});
