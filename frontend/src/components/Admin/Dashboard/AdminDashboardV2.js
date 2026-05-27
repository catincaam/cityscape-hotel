import React, { useEffect, useState } from 'react';
import axios from 'axios';
import KPICards from './KPICards';
import BookingTrend from './BookingTrend';
import RevenueByCity from './RevenueByCity';
import OccupancyHeatmap from './OccupancyHeatmap';
import ServiceUsage from './ServiceUsage';
import GuestSentiment from './GuestSentiment';
import PredictiveForecasts from './PredictiveForecasts';
import './AdminDashboardV2.css';

export default function AdminDashboardV2({ onViewAllFeedback }) {
  const [period, setPeriod] = useState('thisMonth');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    axios.get('/api/admin/dashboard/overview', { params: { period } })
      .then((res) => {
        if (active) setData(res.data);
      })
      .catch((err) => {
        console.error('Dashboard overview error', err);
        if (active) setError('Could not load analytics.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [period]);

  const periodOptions = [
    { value: 'today', label: 'Today' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'thisYear', label: 'This Year' }
  ];

  return (
    <div className="dashboard-v2-container">
      <div className="dashboard-v2-header">
        <div>
          <h2>Reports & Analytics</h2>
          <p>Performance insights and forecasts</p>
        </div>
        <div className="dashboard-period-tabs">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              className={period === option.value ? 'active' : ''}
              onClick={() => setPeriod(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="dashboard-error">{error}</div>}
      <KPICards kpis={data?.kpis} loading={loading} />
      <div className="dashboard-v2-row">
        <BookingTrend data={data?.bookingTrend || []} loading={loading} />
        <RevenueByCity data={data?.revenueByCity || []} loading={loading} />
      </div>
      <div className="dashboard-v2-row dashboard-v2-row-balanced">
        <OccupancyHeatmap
          data={data?.occupancyHeatmap || []}
          loading={loading}
          mode={data?.heatmapMode || 'daily'}
          period={period}
        />
        <ServiceUsage data={data?.serviceUsage || []} loading={loading} />
      </div>
      <PredictiveForecasts />
      <GuestSentiment data={data?.recentFeedback || []} loading={loading} onViewAll={onViewAllFeedback} />
    </div>
  );
}
