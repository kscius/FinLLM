import type { AppView } from "./types.js";

export const VIEW_META: Record<
  AppView,
  { slug: string; documentTitle: string; navLabel: string }
> = {
  overview: { slug: "resumen", documentTitle: "Resumen", navLabel: "Resumen" },
  movements: { slug: "movimientos", documentTitle: "Movimientos", navLabel: "Movimientos" },
  import: { slug: "importar", documentTitle: "Importar", navLabel: "Importar" },
  budgets: { slug: "presupuestos", documentTitle: "Presupuestos", navLabel: "Presupuestos" },
  investments: { slug: "inversiones", documentTitle: "Inversiones", navLabel: "Inversiones" },
  reconciliation: { slug: "conciliacion", documentTitle: "Conciliación", navLabel: "Conciliación" },
};

const SLUG_TO_VIEW = Object.fromEntries(
  Object.entries(VIEW_META).map(([view, meta]) => [meta.slug, view as AppView]),
) as Record<string, AppView>;

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
