import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";
import es from "../locales/es.json";
import { applyDocumentLang, readStoredLocale, type AppLocale } from "./locale.js";

export function initI18n(): AppLocale {
  const locale = readStoredLocale();
  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources: {
        en: { translation: en },
        es: { translation: es },
      },
      lng: locale,
      fallbackLng: "en",
      interpolation: { escapeValue: false },
    });
  }
  applyDocumentLang(locale);
  return locale;
}

export async function setAppLocale(locale: AppLocale): Promise<void> {
  await i18n.changeLanguage(locale);
  applyDocumentLang(locale);
}

export { i18n };
