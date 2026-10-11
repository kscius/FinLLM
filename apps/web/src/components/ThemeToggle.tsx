import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { applyTheme, getStoredTheme, type ThemeMode } from "../lib/theme.js";

export function ThemeToggle() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  const label = t("theme.label");

  return (
    <label className="theme-toggle">
      <span className="sr-only">{label}</span>
      <select
        className="theme-select"
        value={mode}
        onChange={(e) => setMode(e.target.value as ThemeMode)}
        aria-label={label}
      >
        <option value="system">{t("theme.system")}</option>
        <option value="light">{t("theme.light")}</option>
        <option value="dark">{t("theme.dark")}</option>
      </select>
    </label>
  );
}
