import { parseToMinor } from "@finllm/money";

export interface CsvImportRow {
  date: string;
  amount: string;
  description: string;
  externalRef: string;
}

export function parseCsvContent(content: string): CsvImportRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0]!.toLowerCase().split(",").map((h) => h.trim());
  const dateIdx = header.findIndex((h) => h === "date" || h === "fecha");
  const amountIdx = header.findIndex((h) => h === "amount" || h === "monto");
  const descIdx = header.findIndex((h) => h === "description" || h === "descripcion" || h === "memo");

  if (dateIdx < 0 || amountIdx < 0) {
    throw new Error("CSV must include date and amount columns");
  }

  const rows: CsvImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(",").map((c) => c.trim());
    const date = cols[dateIdx];
    const amount = cols[amountIdx];
    const description = descIdx >= 0 ? cols[descIdx] ?? "" : "";
    if (!date || !amount) continue;
    parseToMinor(amount, "MXN");
    rows.push({
      date,
      amount,
      description: description.slice(0, 500),
      externalRef: `csv:${i}:${date}:${amount}`,
    });
  }
  return rows;
}
