import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

function shortDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', { weekday: 'short' });
}

function normalizeBars(items, key = 'value', maxHeight = 92) {
  const max = Math.max(1, ...items.map((item) => Number(item[key] || 0)));
  return items.map((item) => {
    const value = Number(item[key] || 0);
    return {
      ...item,
      height: Math.max(14, (value / max) * maxHeight),
      percentage: Math.round((value / max) * 100)
    };
  });
}

function getAverage(items) {
  return items.length
    ? Math.round(items.reduce((sum, item) => sum + Number(item.value || 0), 0) / items.length)
    : 0;
}

function getTrend(items) {
  if (items.length < 2) return 0;
  return Number(items.at(-1)?.value || 0) - Number(items[0]?.value || 0);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
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
          setError('Forecast data is temporarily unavailable. Please try again shortly.');
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
  const occupancy = normalizeBars(predictions?.occupancyForecast || [], 'value', 100);
  const revenueForecast = useMemo(
    () => normalizeBars(predictions?.revenueForecast || [], 'value', 76),
    [predictions]
  );
  const revenueTotal = Number(predictions?.revenueTotal || 0);
  const lowDay = predictions?.insights?.lowOccupancyDate;
  const lowValue = predictions?.insights?.lowOccupancyValue;
  const averageBookings = getAverage(bookingBars);
  const bookingTrend = getTrend(bookingBars);
  const averageOccupancy = getAverage(occupancy);
  const revenuePerDay = predictions?.horizonDays ? Math.round(revenueTotal / predictions.horizonDays) : 0;

  return (
    <section className="dashboard-card predictive-forecasts">
      <div className="dashboard-card-heading">
        <div>
          <span className="dashboard-card-kicker">Forward View</span>
          <h3>Predictive Forecasts</h3>
          <p>ML projections based on paid stay revenue for the next 7 days</p>
        </div>
      </div>

      {error && <div className="prediction-error">{error}</div>}

      <div className="forecast-grid">
        <div className="forecast-card booking-forecast-card">
          <span>Booking Forecast</span>
          {loading ? (
            <p>Loading Python forecast...</p>
          ) : bookingBars.length ? (
            <>
              <div className="forecast-stat-row">
                <strong>{averageBookings}</strong>
                <div>
                  <small>Expected bookings/day</small>
                  <em>{bookingTrend >= 0 ? '+' : ''}{bookingTrend} by end of week</em>
                </div>
              </div>
              <div className="mini-bars dynamic">
                {bookingBars.map((item) => (
                  <div key={item.date} className="mini-bar-day" title={`${item.date}: ${item.value} bookings`}>
                    <i style={{ height: `${item.height}px` }} />
                    <span>{shortDate(item.date)}</span>
                  </div>
                ))}
              </div>
              <p>Projected guest arrival rhythm for the next seven days.</p>
            </>
          ) : (
            <p>Booking forecast appears as soon as prediction data is available.</p>
          )}
        </div>

        <div className="forecast-card revenue-forecast-card">
          <span>Revenue Forecast</span>
          {loading ? (
            <p>Loading revenue projection...</p>
          ) : predictions ? (
            <>
              <strong>{formatCurrency(revenueTotal)}</strong>
              <p>Projected paid revenue over the next {predictions.horizonDays} days.</p>
              <div className="revenue-sparkline" aria-hidden="true">
                {revenueForecast.map((item) => (
                  <i key={item.date} style={{ height: `${item.height}px` }} />
                ))}
              </div>
              <div className="revenue-note">
                <span>{formatCurrency(revenuePerDay)}</span>
                <small>average projected per day</small>
              </div>
            </>
          ) : (
            <>
              <strong>Pending</strong>
              <p>Revenue forecast appears after prediction data is available.</p>
            </>
          )}
        </div>

        <div className="forecast-card occupancy-forecast-card">
          <span>Occupancy Forecast</span>
          {loading ? (
            <p>Loading occupancy projection...</p>
          ) : occupancy.length ? (
            <>
              <div className="occupancy-forecast-list">
                {occupancy.map((item) => (
                  <div key={item.date}>
                    <span>{shortDate(item.date)}</span>
                    <i><b style={{ width: `${item.percentage}%` }} /></i>
                    <strong>{item.value}%</strong>
                  </div>
                ))}
              </div>
              <p>{lowDay ? `Lowest predicted occupancy: ${lowValue}% on ${shortDate(lowDay)}.` : `Average predicted occupancy: ${averageOccupancy}%.`}</p>
            </>
          ) : (
            <>
              <strong>Pending</strong>
              <p>Occupancy forecast appears after prediction data is available.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
