import React from 'react';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PERIOD_LABELS = {
  today: 'Today',
  thisWeek: 'This Week',
  thisMonth: 'This Month',
  thisYear: 'This Year'
};

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

function getPeriodCopy(period, mode, count) {
  if (mode === 'monthly') {
    return {
      subtitle: 'Monthly average occupancy for the selected year.',
      range: PERIOD_LABELS[period] || 'Selected Year',
      averageDetail: `Across ${count} month${count === 1 ? '' : 's'}`
    };
  }

  return {
    subtitle: period === 'today'
      ? 'Room occupancy for the selected day.'
      : 'Daily room occupancy for the selected period.',
    range: PERIOD_LABELS[period] || 'Selected Period',
    averageDetail: `Across ${count} day${count === 1 ? '' : 's'}`
  };
}

export default function OccupancyHeatmap({ data, loading, mode = 'daily', period = 'thisMonth' }) {
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
  const copy = getPeriodCopy(period, mode, data.length);
  const metrics = [
    {
      label: 'Average Occupancy',
      value: `${average}%`,
      detail: copy.averageDetail
    },
    {
      label: mode === 'monthly' ? 'Peak Month' : 'Peak Day',
      value: busiest ? `${busiest.value}%` : 'N/A',
      detail: busiest ? (busiest.label || formatShortDate(busiest.date)) : 'No data'
    },
    {
      label: 'Lowest Activity',
      value: quietest ? `${quietest.value}%` : 'N/A',
      detail: quietest ? (quietest.label || formatShortDate(quietest.date)) : 'No data'
    }
  ];

  return (
    <section className="dashboard-card occupancy-heatmap">
      <div className="dashboard-card-heading heatmap-heading">
        <div>
          <span className="dashboard-card-kicker">Demand Pattern</span>
          <h3>Occupancy Overview</h3>
          <p>{copy.subtitle}</p>
        </div>
        {!loading && data.length > 0 && <span className="heatmap-period">{copy.range}</span>}
      </div>
      {loading ? (
        <div className="dashboard-empty">Loading heatmap...</div>
      ) : data.length === 0 ? (
        <div className="dashboard-empty">No occupancy data yet.</div>
      ) : (
        <div className="heatmap-panel">
          {mode === 'monthly' ? (
            <div className="heatmap-board monthly">
              <div className="heatmap-month-grid" aria-label="Monthly occupancy">
                {data.map((item) => (
                  <span
                    key={item.date}
                    className={`heat-cell month-cell level-${getLevel(Number(item.value || 0), maxValue)}`}
                    title={`${item.label || item.date}: ${item.value}% occupied`}
                  >
                    <small>{item.label || item.date}</small>
                    <strong>{item.value}</strong>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="heatmap-board">
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
                          {item.value}
                        </span>
                      ) : (
                        <span key={`empty-${weekIndex}-${dayIndex}`} className="heat-cell empty" />
                      )
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          <div className="heatmap-summary">
            {metrics.map((metric) => (
              <article key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
                <small>{metric.detail}</small>
              </article>
            ))}
          </div>

          <div className="heatmap-legend">
            <span>Low occupancy</span>
            <i />
            <span>High occupancy</span>
          </div>
        </div>
      )}
    </section>
  );
}
