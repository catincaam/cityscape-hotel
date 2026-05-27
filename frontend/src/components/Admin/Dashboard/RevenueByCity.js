import React from 'react';

const formatEuro = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
}).format(Number(value || 0));

export default function RevenueByCity({ data, loading }) {
  const max = Math.max(1, ...data.map((item) => item.amount || 0));

  return (
    <section className="dashboard-card revenue-by-city">
      <div className="dashboard-card-heading">
        <div>
          <span className="dashboard-card-kicker">Paid Revenue</span>
          <h3>Revenue by City</h3>
          <p>Collected money from active and completed stays.</p>
        </div>
      </div>
      {loading ? (
        <div className="dashboard-empty">Loading revenue...</div>
      ) : data.length ? (
        <div className="city-list">
          {data.map((item) => (
            <div className="city-row" key={item.city}>
              <div className="city-row-top">
                <span>{item.city}</span>
                <strong>{formatEuro(item.amount)}</strong>
              </div>
              <div className="city-bar">
                <span style={{ width: `${Math.max(8, (item.amount / max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard-empty">No paid revenue yet.</div>
      )}
    </section>
  );
}
