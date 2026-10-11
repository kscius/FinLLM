export type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "finllm-theme";

export function getStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* private mode */
  }
  return "system";
}

export function applyTheme(mode: ThemeMode): void {
  if (mode === "system") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = mode;
  }
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function initTheme(): void {
  applyTheme(getStoredTheme());
}
