export const LOCALE_STORAGE_KEY = "finllm_locale";

export const SUPPORTED_LOCALES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]["code"];

const DEFAULT_LOCALE: AppLocale = "en";

export function readStoredLocale(): AppLocale {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw === "en" || raw === "es") return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

export function persistLocale(locale: AppLocale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export function applyDocumentLang(locale: AppLocale): void {
  document.documentElement.lang = locale === "es" ? "es" : "en";
}
