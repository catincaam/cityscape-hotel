export default function StatCard({ title, value, highlight }) {
  return (
    <div className={`card ${highlight ? "highlight" : ""}`}>
      <h4>{title}</h4>
      <div className="big">{value}</div>
    </div>
  );
}
