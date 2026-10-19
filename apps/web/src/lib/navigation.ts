import type { AppView } from "./types.js";

export const VIEW_META: Record<AppView, { slug: string; titleKey: string }> = {
  overview: { slug: "overview", titleKey: "nav.overview" },
  activity: { slug: "activity", titleKey: "nav.activity" },
  movements: { slug: "movements", titleKey: "nav.movements" },
  import: { slug: "import", titleKey: "nav.import" },
  budgets: { slug: "budgets", titleKey: "nav.budgets" },
  investments: { slug: "investments", titleKey: "nav.investments" },
  reconciliation: { slug: "reconciliation", titleKey: "nav.reconciliation" },
};

/** Legacy Spanish hash slugs (backward compatible). */
const LEGACY_SLUG_TO_VIEW: Record<string, AppView> = {
  resumen: "overview",
  actividad: "activity",
  gastos: "activity",
  movimientos: "movements",
  importar: "import",
  presupuestos: "budgets",
  inversiones: "investments",
  conciliacion: "reconciliation",
};

const SLUG_TO_VIEW = {
  ...Object.fromEntries(Object.entries(VIEW_META).map(([view, meta]) => [meta.slug, view as AppView])),
  ...LEGACY_SLUG_TO_VIEW,
} as Record<string, AppView>;

export function viewFromLocationHash(): AppView | null {
  const raw = window.location.hash.replace(/^#\/?/, "").split("/")[0]?.toLowerCase();
  if (!raw) return null;
  return SLUG_TO_VIEW[raw] ?? null;
}

export function hashForView(view: AppView): string {
  return `#/${VIEW_META[view].slug}`;
}

export function setLocationHashForView(view: AppView): void {
  const next = hashForView(view);
  if (window.location.hash !== next) {
    window.location.hash = next;
  }
}
