import React from 'react';

const colors = ['#7a5732', '#ba9460', '#dec8a2', '#8d7655', '#c8b99d'];

export default function ServiceUsage({ data, loading }) {
  const total = data.reduce((sum, item) => sum + Number(item.count || 0), 0);
  let offset = 25;
  const segments = data.map((item, index) => {
    const percentage = total ? (item.count / total) * 100 : 0;
    const segment = {
      ...item,
      color: colors[index % colors.length],
      dash: `${percentage} ${100 - percentage}`,
      offset,
      percentage: Math.round(percentage)
    };
    offset -= percentage;
    return segment;
  });

  return (
    <section className="dashboard-card service-usage">
      <div className="dashboard-card-heading">
        <div>
          <span className="dashboard-card-kicker">Guest Add-Ons</span>
          <h3>Service Usage</h3>
          <p>Distribution of booked services in the selected period.</p>
        </div>
      </div>
      {loading ? (
        <div className="dashboard-empty">Loading services...</div>
      ) : data.length && total > 0 ? (
        <div className="service-usage-layout">
          <div className="donut">
            <svg viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1e7d7" strokeWidth="4.8" />
              {segments.map((segment) => (
                <circle
                  key={segment.category}
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="transparent"
                  stroke={segment.color}
                  strokeWidth="4.8"
                  strokeDasharray={segment.dash}
                  strokeDashoffset={segment.offset}
                />
              ))}
            </svg>
            <div>
              <strong>{total}</strong>
              <span>services</span>
            </div>
          </div>
          <div className="service-legend">
            {segments.map((item) => (
              <article key={item.category}>
                <div className="service-legend-top">
                  <i style={{ background: item.color }} />
                  <span>{item.category}</span>
                  <strong>{item.percentage}%</strong>
                </div>
                <div className="service-legend-bar">
                  <span style={{ width: `${item.percentage}%`, background: item.color }} />
                </div>
                <small>{item.count} booked</small>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="dashboard-empty">No services booked in this period.</div>
      )}
    </section>
  );
}
