import React from 'react';

function getLevel(value) {
  if (value >= 75) return 4;
  if (value >= 50) return 3;
  if (value >= 25) return 2;
  if (value > 0) return 1;
  return 0;
}

export default function OccupancyHeatmap({ data, loading }) {
  return (
    <section className="dashboard-card occupancy-heatmap">
      <div className="dashboard-card-heading">
        <h3>Occupancy Heatmap</h3>
      </div>
      {loading ? (
        <div className="dashboard-empty">Loading heatmap...</div>
      ) : (
        <div className="heatmap-panel">
          <div className="heatmap-grid">
            {data.map((item) => (
              <span
                key={item.date}
                className={`heat-cell level-${getLevel(item.value)}`}
                title={`${item.date}: ${item.value}% occupied`}
              />
            ))}
          </div>
          <div className="heatmap-legend">
            <span>Low demand</span>
            <div>
              {[0, 1, 2, 3, 4].map((level) => <i key={level} className={`level-${level}`} />)}
            </div>
            <span>Peak season</span>
          </div>
        </div>
      )}
    </section>
  );
}
