import React from 'react';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMondayFirstDay(date) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function formatShortDate(value) {
  const date = getDate(value);
  if (!date) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getLevel(value, maxValue) {
  if (!value || !maxValue) return 0;
  const ratio = value / maxValue;
  if (ratio >= 0.8) return 4;
  if (ratio >= 0.55) return 3;
  if (ratio >= 0.3) return 2;
  return 1;
}

function buildWeeks(data) {
  const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  const weeks = [];

  sorted.forEach((item) => {
    const date = getDate(item.date);
    if (!date) return;

    let currentWeek = weeks[weeks.length - 1];
    const weekday = getMondayFirstDay(date);

    if (!currentWeek || weekday === 0) {
      currentWeek = Array.from({ length: 7 }, () => null);
      weeks.push(currentWeek);
    }

    currentWeek[weekday] = item;
  });

  return weeks;
}

export default function OccupancyHeatmap({ data, loading }) {
  const values = data.map((item) => Number(item.value || 0));
  const maxValue = Math.max(0, ...values);
  const average = values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;
  const busiest = data.reduce((best, item) => (
    Number(item.value || 0) > Number(best?.value || 0) ? item : best
  ), null);
  const quietest = data.reduce((best, item) => {
    if (!best) return item;
    return Number(item.value || 0) < Number(best.value || 0) ? item : best;
  }, null);
  const weeks = buildWeeks(data);

  return (
    <section className="dashboard-card occupancy-heatmap">
      <div className="dashboard-card-heading">
        <h3>Occupancy Heatmap</h3>
        {!loading && data.length > 0 && <span>Last 35 days</span>}
      </div>
      {loading ? (
        <div className="dashboard-empty">Loading heatmap...</div>
      ) : data.length === 0 ? (
        <div className="dashboard-empty">No occupancy data yet.</div>
      ) : (
        <div className="heatmap-panel">
          <p className="heatmap-help">
            Each square is one day. Darker and higher percentages mean more rooms were occupied.
          </p>
          <div className="heatmap-axis">
            <span />
            {WEEK_DAYS.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="heatmap-grid" aria-label="Daily occupancy by week">
            {weeks.map((week, weekIndex) => (
              <React.Fragment key={`week-${weekIndex}`}>
                <span className="heatmap-week-label">
                  {week.find(Boolean) ? formatShortDate(week.find(Boolean).date) : ''}
                </span>
                {week.map((item, dayIndex) => (
                  item ? (
                    <span
                      key={item.date}
                      className={`heat-cell level-${getLevel(Number(item.value || 0), maxValue)}`}
                      title={`${formatShortDate(item.date)}: ${item.value}% occupied`}
                    >
                      {item.value}%
                    </span>
                  ) : (
                    <span key={`empty-${weekIndex}-${dayIndex}`} className="heat-cell empty" />
                  )
                ))}
              </React.Fragment>
            ))}
          </div>
          <div className="heatmap-summary">
            <div>
              <span>Average</span>
              <strong>{average}%</strong>
            </div>
            <div>
              <span>Busiest</span>
              <strong>{busiest ? `${formatShortDate(busiest.date)} · ${busiest.value}%` : 'N/A'}</strong>
            </div>
            <div>
              <span>Quietest</span>
              <strong>{quietest ? `${formatShortDate(quietest.date)} · ${quietest.value}%` : 'N/A'}</strong>
            </div>
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
