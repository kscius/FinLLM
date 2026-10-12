type Props = {
  lines?: number;
  className?: string;
};

export function Skeleton({ lines = 3, className = "" }: Props) {
  return (
    <div className={`skeleton-block ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton-line" style={{ width: i === lines - 1 ? "72%" : "100%" }} />
      ))}
    </div>
  );
}
