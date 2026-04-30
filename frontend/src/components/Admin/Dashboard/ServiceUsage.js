import React from 'react';

const colors = ['#806329', '#aebce6', '#9da9cc', '#e5e1da', '#c8b99d'];

export default function ServiceUsage({ data, loading }) {
  const total = data.reduce((sum, item) => sum + Number(item.count || 0), 0);
  let offset = 25;
  const segments = data.map((item, index) => {
    const percentage = total ? (item.count / total) * 100 : 0;
    const segment = {
      ...item,
      color: colors[index % colors.length],
      dash: `${percentage} ${100 - percentage}`,
      offset
    };
    offset -= percentage;
    return segment;
  });

  return (
    <section className="dashboard-card service-usage">
      <div className="dashboard-card-heading">
        <h3>Service Usage</h3>
      </div>
      {loading ? (
        <div className="dashboard-empty">Loading services...</div>
      ) : data.length && total > 0 ? (
        <div className="service-usage-layout">
          <div className="donut">
            <svg viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f0eee9" strokeWidth="5" />
              {segments.map((segment) => (
                <circle
                  key={segment.category}
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="transparent"
                  stroke={segment.color}
                  strokeWidth="5"
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
              <div key={item.category}>
                <i style={{ background: item.color }} />
                <span>{item.category} ({item.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="dashboard-empty">No services booked in this period.</div>
      )}
    </section>
  );
}
