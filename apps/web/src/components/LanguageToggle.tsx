import { useTranslation } from "react-i18next";
import { persistLocale, SUPPORTED_LOCALES, type AppLocale } from "../lib/locale.js";
import { setAppLocale } from "../lib/i18n.js";

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const value = (i18n.language?.slice(0, 2) === "es" ? "es" : "en") as AppLocale;

  return (
    <label className="locale-toggle">
      <span className="sr-only">{t("common.language")}</span>
      <select
        className="theme-select"
        value={value}
        aria-label={t("common.language")}
        onChange={async (e) => {
          const next = e.target.value as AppLocale;
          persistLocale(next);
          await setAppLocale(next);
        }}
      >
        {SUPPORTED_LOCALES.map((loc) => (
          <option key={loc.code} value={loc.code}>{loc.label}</option>
        ))}
      </select>
    </label>
  );
}
