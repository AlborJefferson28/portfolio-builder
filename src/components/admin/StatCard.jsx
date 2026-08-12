export default function StatCard({ label, value, hint }) {
  return (
    <div className="adm-stat-card">
      <span className="adm-stat-label">{label}</span>
      <span className="adm-stat-value">{value}</span>
      {hint && <span className="adm-stat-hint">{hint}</span>}
    </div>
  );
}
