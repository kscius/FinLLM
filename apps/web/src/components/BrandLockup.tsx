import { useTranslation } from "react-i18next";
import { BrandMark } from "./BrandMark.js";

type Props = {
  as?: "h1" | "div";
  subtitle?: boolean;
  compact?: boolean;
};

export function BrandLockup({ as = "div", subtitle, compact }: Props) {
  const { t } = useTranslation();
  const Tag = as;
  const tagline = subtitle ? t("app.tagline") : undefined;
  return (
    <Tag className={`brand-lockup${compact ? " brand-lockup--compact" : ""}`}>
      <BrandMark size={compact ? 32 : 40} />
      <span className="brand-lockup-text">
        <span className="brand-word">{t("app.name")}</span>
        {tagline && <span className="brand-tagline">{tagline}</span>}
      </span>
    </Tag>
  );
}
