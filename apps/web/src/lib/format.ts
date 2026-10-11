import { formatDisplay, type CurrencyCode } from "@finllm/money";
import { i18n } from "./i18n.js";

export function formatMinorDisplay(minor: string, currency: CurrencyCode = "MXN"): string {
  try {
    return formatDisplay(BigInt(minor), currency);
  } catch {
    return `${minor} ${currency}`;
  }
}

export function accountTypeLabel(type: string): string {
  const key = `accountTypes.${type}`;
  if (i18n.isInitialized && i18n.exists(key)) {
    return i18n.t(key);
  }
  return type;
}
