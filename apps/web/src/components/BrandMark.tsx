type Props = {
  size?: number;
  className?: string;
  title?: string;
};

/** Marca FinLLM — libro + trazo de flujo (sin asset externo). */
export function BrandMark({ size = 36, className = "", title = "FinLLM" }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <rect x="2" y="2" width="36" height="36" rx="10" className="brand-mark-bg" />
      <path
        d="M11 13h18v2.2H11V13zm0 6.4h12v2.2H11v-2.2zm0 6.4h16v2.2H11v-2.2z"
        className="brand-mark-lines"
      />
      <path
        d="M27 24.5l4 4-4 4"
        className="brand-mark-accent"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
