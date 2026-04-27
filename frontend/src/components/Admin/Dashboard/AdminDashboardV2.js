import React from 'react';
import KPICards from './KPICards';
import BookingTrend from './BookingTrend';
import RevenueByCity from './RevenueByCity';
import OccupancyHeatmap from './OccupancyHeatmap';
import ServiceUsage from './ServiceUsage';
import GuestSentiment from './GuestSentiment';
import PredictiveForecasts from './PredictiveForecasts';
import './AdminDashboardV2.css';

export default function AdminDashboardV2() {
  return (
    <div className="dashboard-v2-container">
      <div className="dashboard-v2-header">
        <h2>Reports & Analytics</h2>
        {/* TODO: Add period selector */}
      </div>
      <KPICards />
      <div className="dashboard-v2-row">
        <BookingTrend />
        <RevenueByCity />
      </div>
      <div className="dashboard-v2-row">
        <OccupancyHeatmap />
        <ServiceUsage />
      </div>
      <PredictiveForecasts />
      <GuestSentiment />
    </div>
  );
}
