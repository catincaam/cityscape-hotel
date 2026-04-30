import React from 'react';

export default function RevenueByCity({ data, loading }) {
  const max = Math.max(1, ...data.map((item) => item.amount || 0));

  return (
    <section className="dashboard-card revenue-by-city">
      <div className="dashboard-card-heading">
        <h3>Revenue by City</h3>
      </div>
      {loading ? (
        <div className="dashboard-empty">Loading revenue...</div>
      ) : data.length ? (
        <div className="city-list">
          {data.map((item) => (
            <div className="city-row" key={item.city}>
              <div className="city-row-top">
                <span>{item.city}</span>
                <strong>€{Number(item.amount).toLocaleString()}</strong>
              </div>
              <div className="city-bar">
                <span style={{ width: `${Math.max(8, (item.amount / max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard-empty">No city revenue yet.</div>
      )}
    </section>
  );
}
