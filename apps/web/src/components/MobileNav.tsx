import { useTranslation } from "react-i18next";
import { NavIcon } from "./NavIcon.js";
import { VIEW_META } from "../lib/navigation.js";
import type { AppView } from "../lib/types.js";

const MOBILE_VIEWS: AppView[] = ["overview", "activity", "movements", "investments", "budgets"];

type Props = {
  view: AppView;
  onNavigate: (view: AppView) => void;
};

export function MobileNav({ view, onNavigate }: Props) {
  const { t } = useTranslation();

  return (
    <nav className="mobile-nav" aria-label={t("nav.mobile")}>
      {MOBILE_VIEWS.map((key) => (
        <button
          key={key}
          type="button"
          className="mobile-nav-btn"
          aria-current={view === key ? "page" : undefined}
          onClick={() => onNavigate(key)}
        >
          <NavIcon view={key} />
          <span>{t(VIEW_META[key].titleKey)}</span>
        </button>
      ))}
    </nav>
  );
}
