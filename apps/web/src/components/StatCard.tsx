type Props = {
  label: string;
  value: string;
  hint?: string;
  id?: string;
};

export function StatCard({ label, value, hint, id }: Props) {
  return (
    <article className="stat-card" aria-labelledby={id}>
      <p className="stat-card-label" id={id}>{label}</p>
      <p className="stat-card-value" aria-live="polite">{value}</p>
      {hint && <p className="stat-card-hint">{hint}</p>}
    </article>
  );
}
