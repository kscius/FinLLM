import { BrandMark } from "./BrandMark.js";

type Props = {
  as?: "h1" | "div";
  subtitle?: string;
  compact?: boolean;
};

export function BrandLockup({ as = "div", subtitle, compact }: Props) {
  const Tag = as;
  return (
    <Tag className={`brand-lockup${compact ? " brand-lockup--compact" : ""}`}>
      <BrandMark size={compact ? 32 : 40} />
      <span className="brand-lockup-text">
        <span className="brand-word">FinLLM</span>
        {subtitle && <span className="brand-tagline">{subtitle}</span>}
      </span>
    </Tag>
  );
}
