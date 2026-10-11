type Illustration = "ledger" | "wallet" | "upload" | "chart" | "reconcile";

import type { ReactNode } from "react";

type Props = {
  title?: string;
  children: ReactNode;
  illustration?: Illustration;
};

function IllustrationSvg({ kind }: { kind: Illustration }) {
  const common = { className: "empty-illus-svg", viewBox: "0 0 80 64", fill: "none", "aria-hidden": true as const };
  switch (kind) {
    case "ledger":
      return (
        <svg {...common}>
          <rect x="12" y="8" width="56" height="48" rx="6" className="empty-illus-stroke" strokeWidth="2" />
          <path d="M22 22h36M22 32h28M22 42h32" className="empty-illus-stroke" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <rect x="10" y="18" width="60" height="36" rx="8" className="empty-illus-fill" />
          <circle cx="52" cy="36" r="6" className="empty-illus-accent" />
        </svg>
      );
    case "upload":
      return (
        <svg {...common}>
          <path d="M40 12v28m0 0l-10-10m10 10l10-10" className="empty-illus-stroke" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M14 48h52" className="empty-illus-stroke" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M14 48V28l12 8 10-16 20 12v16H14z" className="empty-illus-fill" />
        </svg>
      );
    case "reconcile":
      return (
        <svg {...common}>
          <path d="M16 20h48M16 32h36M16 44h42" className="empty-illus-stroke" strokeWidth="2" strokeLinecap="round" />
          <path d="M54 38l8 6-8 6" className="empty-illus-accent" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export function EmptyState({ title, children, illustration }: Props) {
  return (
    <div className="empty-state" role="status">
      {illustration && (
        <div className="empty-illus-wrap">
          <IllustrationSvg kind={illustration} />
        </div>
      )}
      {title && <p className="empty-state-title">{title}</p>}
      <div className="empty-state-body">{children}</div>
    </div>
  );
}
