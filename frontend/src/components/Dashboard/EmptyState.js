export default function EmptyState({ title, text, action }) {
  return (
    <div className="card empty">
      <h4>{title}</h4>
      <p>{text}</p>
      {action && <button className="primary-btn">{action}</button>}
    </div>
  );
}
