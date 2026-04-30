import React from 'react';

export default function BookingTrend({ data, loading }) {
  const values = data.map((item) => item.occupancy || 0);
  const max = Math.max(1, ...values);
  const points = values.length
    ? values.map((value, index) => {
        const x = 8 + (index * 84) / Math.max(1, values.length - 1);
        const y = 88 - (value / max) * 68;
        return `${x},${y}`;
      }).join(' ')
    : '';

  return (
    <section className="dashboard-card booking-trend">
      <div className="dashboard-card-heading">
        <div>
          <h3>Booking Trend</h3>
          <p>Historical performance vs capacity pressure</p>
        </div>
        <div className="chart-legend">
          <span><i /> Occupancy</span>
          <span><i className="muted" /> Bookings</span>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-empty">Loading trend...</div>
      ) : data.length ? (
        <div className="trend-chart">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={points} fill="none" stroke="#806329" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="trend-days">
            {data.map((item) => (
              <span key={item.date}>{item.label}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="dashboard-empty">No booking trend available.</div>
      )}
    </section>
  );
}
