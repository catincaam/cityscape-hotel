import React, { useEffect, useState } from 'react';
import axios from 'axios';

function shortDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', { weekday: 'short' });
}

function normalizeBars(items, key = 'value') {
  const max = Math.max(1, ...items.map((item) => Number(item[key] || 0)));
  return items.map((item) => ({
    ...item,
    height: Math.max(12, (Number(item[key] || 0) / max) * 86)
  }));
}

export default function PredictiveForecasts() {
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    axios.get('/api/admin/dashboard/predictions', { params: { horizon: 7 } })
      .then((res) => {
        if (active) setPredictions(res.data);
      })
      .catch((err) => {
        console.error('Prediction fetch failed', err);
        if (active) {
          setPredictions(null);
          setError('Python ML service is not running on localhost:9100, so forecasts are temporarily unavailable.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const bookingBars = normalizeBars(predictions?.bookingForecast || []);
  const revenueTotal = Number(predictions?.revenueTotal || 0);
  const occupancy = predictions?.occupancyForecast || [];
  const lowDay = predictions?.insights?.lowOccupancyDate;
  const lowValue = predictions?.insights?.lowOccupancyValue;

  return (
    <section className="dashboard-card predictive-forecasts">
      <div className="dashboard-card-heading">
        <div>
          <h3>Predictive Forecasts</h3>
          <p>Python ML service projections for the next 7 days</p>
        </div>
      </div>

      {error && <div className="prediction-error">{error}</div>}

      <div className="forecast-grid">
        <div className="forecast-card">
          <span>Booking Forecast</span>
          {loading ? (
            <p>Loading Python forecast...</p>
          ) : bookingBars.length ? (
            <>
              <div className="mini-bars dynamic">
                {bookingBars.map((item) => (
                  <div key={item.date} className="mini-bar-day" title={`${item.date}: ${item.value} bookings`}>
                    <i style={{ height: `${item.height}px` }} />
                    <span>{shortDate(item.date)}</span>
                  </div>
                ))}
              </div>
              <p>Expected average: {Math.round(bookingBars.reduce((sum, item) => sum + item.value, 0) / bookingBars.length)} bookings/day.</p>
            </>
          ) : (
            <p>Booking forecast appears as soon as the Python model responds.</p>
          )}
        </div>

        <div className="forecast-card">
          <span>Revenue Forecast</span>
          {loading ? (
            <p>Loading revenue projection...</p>
          ) : predictions ? (
            <>
              <strong>€{Math.round(revenueTotal).toLocaleString()}</strong>
              <p>Projected total revenue over the next {predictions.horizonDays} days.</p>
            </>
          ) : (
            <>
              <strong>Pending</strong>
              <p>Revenue forecast appears after the Python model responds.</p>
            </>
          )}
        </div>

        <div className="forecast-card">
          <span>Occupancy Forecast</span>
          {loading ? (
            <p>Loading occupancy projection...</p>
          ) : occupancy.length ? (
            <>
              <div className="occupancy-forecast-list">
                {occupancy.map((item) => (
                  <div key={item.date}>
                    <span>{shortDate(item.date)}</span>
                    <strong>{item.value}%</strong>
                  </div>
                ))}
              </div>
              <p>{lowDay ? `Lowest predicted occupancy: ${lowValue}% on ${shortDate(lowDay)}.` : 'No low-occupancy risk detected.'}</p>
            </>
          ) : (
            <>
              <strong>TODO</strong>
              <p>Occupancy forecast appears after the Python service is running.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
