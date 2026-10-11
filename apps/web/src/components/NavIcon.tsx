import type { ReactNode } from "react";
import type { AppView } from "../lib/types.js";

const paths: Record<AppView, ReactNode> = {
  overview: (
    <path
      d="M4 4h7v7H4V4zm9 0h7v4h-7V4zm0 6h7v10h-7V10zM4 13h7v7H4v-7z"
      fill="currentColor"
    />
  ),
  movements: (
    <path
      d="M4 6h16v2H4V6zm0 5h10v2H4v-2zm0 5h14v2H4v-2z"
      fill="currentColor"
    />
  ),
  import: (
    <>
      <path d="M12 3v10m0 0l-3.5-3.5M12 13l3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 17h16v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" fill="currentColor" />
    </>
  ),
  budgets: (
    <path
      d="M5 5h14v3H5V5zm0 6h14v2H5v-2zm0 5h9v2H5v-2z"
      fill="currentColor"
    />
  ),
  investments: (
    <path
      d="M4 16l4-6 4 3 5-8 3 5v7H4v-3z"
      fill="currentColor"
      opacity="0.9"
    />
  ),
  reconciliation: (
    <>
      <path d="M5 8h14M5 12h10M5 16h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 14l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

type Props = { view: AppView };

export function NavIcon({ view }: Props) {
  return (
    <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      {paths[view]}
    </svg>
  );
}
