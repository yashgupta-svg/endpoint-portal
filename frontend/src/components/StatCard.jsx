export default function StatCard({ label, value, tone, detail }) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__topline">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__mark" aria-hidden="true" />
      </div>
      <strong className="stat-card__value">{value}</strong>
      <span className="stat-card__detail">{detail}</span>
    </article>
  );
}
