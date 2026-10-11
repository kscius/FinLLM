import { formatDisplay, type CurrencyCode } from "@finllm/money";

export function formatMinorDisplay(minor: string, currency: CurrencyCode = "MXN"): string {
  try {
    return formatDisplay(BigInt(minor), currency);
  } catch {
    return `${minor} ${currency}`;
  }
}

export function accountTypeLabel(type: string): string {
  const map: Record<string, string> = {
    ASSET: "Activo",
    LIABILITY: "Pasivo",
    EQUITY: "Capital",
    INCOME: "Ingreso",
    EXPENSE: "Gasto",
  };
  return map[type] ?? type;
}
