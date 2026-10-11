/** ISO 4217 currency codes supported in MVP */
export type CurrencyCode = "MXN" | "USD";

const EXPONENT: Record<CurrencyCode, number> = {
  MXN: 2,
  USD: 2,
};

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

/** Parse decimal string to integer minor units (half-even not needed on parse — exact 2dp only). */
export function parseToMinor(amount: string, currency: CurrencyCode): bigint {
  const trimmed = amount.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new MoneyError(`Invalid amount format: ${amount}`);
  }
  const negative = trimmed.startsWith("-");
  const normalized = negative ? trimmed.slice(1) : trimmed;
  const parts = normalized.split(".");
  const whole = parts[0] ?? "0";
  const frac = parts[1] ?? "";
  if (frac.length > EXPONENT[currency]) {
    throw new MoneyError(`Too many decimal places for ${currency}`);
  }
  const padded = frac.padEnd(EXPONENT[currency], "0");
  const minor = BigInt(whole) * BigInt(10 ** EXPONENT[currency]) + BigInt(padded || "0");
  return negative ? -minor : minor;
}

export function formatMinor(minor: bigint, currency: CurrencyCode): string {
  const exp = EXPONENT[currency];
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const divisor = BigInt(10 ** exp);
  const whole = abs / divisor;
  const frac = (abs % divisor).toString().padStart(exp, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

export function formatDisplay(minor: bigint, currency: CurrencyCode): string {
  const value = formatMinor(minor, currency);
  return `${value} ${currency}`;
}

/** Bankers rounding for bigint: round half-even to target scale */
export function roundHalfEven(value: bigint, scale: number, targetScale: number): bigint {
  if (targetScale > scale) {
    throw new MoneyError("targetScale must be <= scale");
  }
  const factor = BigInt(10 ** (scale - targetScale));
  const half = factor / 2n;
  const remainder = value % factor;
  const base = value - remainder;
  let rounded: bigint;
  if (remainder < half) rounded = base;
  else if (remainder > half) rounded = base + factor;
  else {
    const whole = base / factor;
    rounded = whole % 2n === 0n ? base : base + factor;
  }
  return rounded / factor;
}

/** Convert USD minor to MXN minor using mxn_per_usd as decimal string (up to 8 dp). */
export function usdMinorToMxnMinor(usdMinor: bigint, mxnPerUsd: string): bigint {
  const rateParts = mxnPerUsd.trim().split(".");
  if (!/^\d+(\.\d{1,8})?$/.test(mxnPerUsd.trim()) || Number(mxnPerUsd) <= 0) {
    throw new MoneyError(`Invalid FX rate: ${mxnPerUsd}`);
  }
  const rateWhole = BigInt(rateParts[0] ?? "0");
  const rateFrac = (rateParts[1] ?? "").padEnd(8, "0").slice(0, 8);
  const rateScaled = rateWhole * 10n ** 8n + BigInt(rateFrac);
  const product = usdMinor * rateScaled;
  return roundHalfEven(product, 8, 0);
}

export function assertSameCurrency(a: CurrencyCode, b: CurrencyCode): void {
  if (a !== b) {
    throw new MoneyError(`Currency mismatch: ${a} vs ${b}`);
  }
}
