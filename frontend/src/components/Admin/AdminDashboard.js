import React, { useEffect, useState } from "react";
import axios from "axios";
import { PieChart } from "./PieChart.js";
import { HorizontalBarChart } from "./HorizontalBarChart.js";
// import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const [kpi, setKpi] = useState({ revenue: 0, occupancy: 0, satisfaction: 0 });
  const [revenueByTheme, setRevenueByTheme] = useState([]);
  const [serviceUsage, setServiceUsage] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [occupancyTrends, setOccupancyTrends] = useState([]);
  const [period, setPeriod] = useState("thisMonth");
  const [loading, setLoading] = useState(false);

  // Fetch data with selected period
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [kpiRes, themeRes, usageRes, fbRes, occRes] = await Promise.all([
          axios.get("/api/admin/dashboard/kpi", { params: { period } }),
          axios.get("/api/admin/dashboard/revenue-by-theme", { params: { period } }),
          axios.get("/api/admin/dashboard/service-usage", { params: { period } }),
          axios.get("/api/admin/dashboard/recent-feedback", { params: { period } }),
          axios.get("/api/admin/dashboard/occupancy-trends", { params: { period } }),
        ]);
        setKpi(kpiRes.data);
        setRevenueByTheme(themeRes.data);
        setServiceUsage(usageRes.data);
        setFeedback(fbRes.data);
        setOccupancyTrends(occRes.data);
      } catch (err) {
        // eslint-disable-next-line
        console.error("Admin dashboard fetch error", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [period]);

  // Period filter options
  const periodOptions = [
    // Current
    { value: "today", label: "Today", category: "Current" },
    { value: "thisWeek", label: "This Week", category: "Current" },
    { value: "thisMonth", label: "This Month", category: "Current" },
    { value: "thisQuarter", label: "This Quarter", category: "Current" },
    { value: "thisYear", label: "This Year", category: "Current" },
    // Past
    { value: "yesterday", label: "Yesterday", category: "Past" },
    { value: "lastWeek", label: "Last Week", category: "Past" },
    { value: "lastMonth", label: "Last Month", category: "Past" },
    { value: "lastQuarter", label: "Last Quarter", category: "Past" },
    { value: "lastYear", label: "Last Year", category: "Past" },
  ];

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <div className="admin-dashboard-title">Reports & Analytics</div>
          <div className="admin-dashboard-subtitle">Real-time performance metrics for Cityscape Hotel</div>
        </div>
        
        {/* PERIOD FILTER */}
        <div className="dashboard-period-filter">
          <div className="period-label">Period:</div>
          <div className="period-buttons">
            {periodOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`period-btn ${period === opt.value ? 'active' : ''}`}
                title={opt.category}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {loading && <span className="loading-indicator">↻ Loading...</span>}
        </div>
      </div>
      <div className="admin-dashboard-kpi-row">
        <div className="admin-dashboard-kpi-card">
          <div className="admin-dashboard-kpi-icon kpi-blue">
            <span className="material-symbols-outlined">payments</span>
          </div>
          <div className="admin-dashboard-kpi-label">Total Revenue</div>
          <div className="admin-dashboard-kpi-value">${kpi.revenue.toLocaleString()}</div>
          <span className="admin-dashboard-kpi-growth">+12.5%</span>
        </div>
        <div className="admin-dashboard-kpi-card">
          <div className="admin-dashboard-kpi-icon kpi-orange">
            <span className="material-symbols-outlined">analytics</span>
          </div>
          <div className="admin-dashboard-kpi-label">Average Occupancy</div>
          <div className="admin-dashboard-kpi-value">{kpi.occupancy}%</div>
          <span className="admin-dashboard-kpi-growth">+5.2%</span>
        </div>
        <div className="admin-dashboard-kpi-card">
          <div className="admin-dashboard-kpi-icon kpi-green">
            <span className="material-symbols-outlined">star</span>
          </div>
          <div className="admin-dashboard-kpi-label">Satisfaction Score</div>
          <div className="admin-dashboard-kpi-value">{kpi.satisfaction}/5.0</div>
          <span className="admin-dashboard-kpi-growth">+0.8%</span>
        </div>
        <div className="admin-dashboard-kpi-card">
          <div className="admin-dashboard-kpi-icon kpi-purple">
            <span className="material-symbols-outlined">local_atm</span>
          </div>
          <div className="admin-dashboard-kpi-label">Cash Received</div>
          <div className="admin-dashboard-kpi-value">${kpi.cashReceived?.toLocaleString()}</div>
          <span className="admin-dashboard-kpi-growth">Live</span>
        </div>
      </div>
      {/* TODO: Charts & Feedback sections (mock for now) */}
      <div className="admin-dashboard-main">
        <div className="admin-dashboard-card">
          <div className="admin-dashboard-card-title">Occupancy Trends</div>
          <div style={{height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999'}}>
            {/* Chart disabled temporarily - recharts compatibility issue with React 19 */}
            <p>Chart loading...</p>
          </div>
        </div>
        <div className="admin-dashboard-card">
          <div className="admin-dashboard-card-title">Revenue by Theme</div>
          <div style={{height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'}}>
            {revenueByTheme.length > 0 ? (
              <PieChart
                data={revenueByTheme}
                total={`$${kpi.revenue.toLocaleString()}`}
                colors={['#3b82f6', '#ef4444', '#10b981', '#f59e42', '#8b5cf6']}
              />
            ) : (
              <p style={{color: '#999'}}>Loading chart...</p>
            )}
          </div>
        </div>
      </div>
      <div className="admin-dashboard-bottom">
        <div className="admin-dashboard-card">
          <div className="admin-dashboard-card-title">Service Usage Density</div>
          <div style={{padding: '20px'}}>
            {serviceUsage.length > 0 ? (
              <HorizontalBarChart
                data={serviceUsage}
                colors={['#c6a969', '#ff6b6b', '#10b981', '#f59e42', '#8b5cf6']}
              />
            ) : (
              <p style={{color: '#999', textAlign: 'center'}}>Loading chart...</p>
            )}
          </div>
        </div>
        <div className="admin-dashboard-card">
          <div className="admin-dashboard-card-title">Recent Guest Feedback</div>
          <div className="admin-dashboard-feedback-list">
            {feedback.map(f => {
              const clientName = f.Client ? `${f.Client.FirstName} ${f.Client.LastName}` : 'Guest';
              const clientEmail = f.Client?.Email || '';
              const clientAvatar = f.Client?.profilePicture;
              const checkIn = f.Reservation?.requestedCheckin ? new Date(f.Reservation.requestedCheckin).toLocaleDateString() : 'N/A';
              const rating = Number(f.serviceRating) || 0;
              
              return (
                <div key={f.id} className="admin-dashboard-feedback-card">
                  <div className="admin-dashboard-feedback-header">
                    <div className="admin-dashboard-feedback-avatar">
                      {clientAvatar ? (
                        <img src={clientAvatar} alt={clientName} />
                      ) : (
                        <div className="admin-dashboard-feedback-avatar-initials">
                          {clientName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="admin-dashboard-feedback-info">
                      <div className="admin-dashboard-feedback-name">{clientName}</div>
                      <div className="admin-dashboard-feedback-email">{clientEmail}</div>
                      <div className="admin-dashboard-feedback-room">Check-in: {checkIn} • Reservation #{f.ReservationId}</div>
                    </div>
                    <div className="admin-dashboard-feedback-stars">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="material-symbols-outlined" style={{color: i < rating ? '#FFB800' : '#ddd'}}>star</span>
                      ))}
                      <span style={{marginLeft: 8, fontSize: 12, fontWeight: 600, color: '#555'}}>{rating.toFixed(1)}/5</span>
                    </div>
                  </div>
                  <div className="admin-dashboard-feedback-text">"{f.text || 'No comment'}"</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
