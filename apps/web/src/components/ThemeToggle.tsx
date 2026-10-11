import { useEffect, useState } from "react";
import { applyTheme, getStoredTheme, type ThemeMode } from "../lib/theme.js";

const LABELS: Record<ThemeMode, string> = {
  system: "Sistema",
  light: "Claro",
  dark: "Oscuro",
};

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  return (
    <label className="theme-toggle">
      <span className="sr-only">Tema de la interfaz</span>
      <select
        className="theme-select"
        value={mode}
        onChange={(e) => setMode(e.target.value as ThemeMode)}
        aria-label="Tema de la interfaz"
      >
        {(Object.keys(LABELS) as ThemeMode[]).map((key) => (
          <option key={key} value={key}>{LABELS[key]}</option>
        ))}
      </select>
    </label>
  );
}
