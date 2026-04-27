
import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function KPICards() {
  const [kpi, setKpi] = useState({ revenue: 0, occupancy: 0, avgBookingValue: 0, satisfaction: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchKPI() {
      setLoading(true);
      try {
        const res = await axios.get('/api/admin/dashboard/kpi');
        setKpi(res.data);
        setError(null);
      } catch (err) {
        setError('Eroare la încărcarea KPI-urilor');
      } finally {
        setLoading(false);
      }
    }
    fetchKPI();
  }, []);

  if (loading) return <div className="kpi-cards">Loading...</div>;
  if (error) return <div className="kpi-cards">{error}</div>;

  return (
    <div className="kpi-cards">
      <div className="kpi-card"><div className="kpi-label">Total Revenue</div><div className="kpi-value">€{kpi.revenue?.toLocaleString()}</div></div>
      <div className="kpi-card"><div className="kpi-label">Occupancy Rate</div><div className="kpi-value">{kpi.occupancy}%</div></div>
      <div className="kpi-card"><div className="kpi-label">Avg Booking Value</div><div className="kpi-value">€{kpi.avgBookingValue?.toLocaleString()}</div></div>
      <div className="kpi-card"><div className="kpi-label">Satisfaction Score</div><div className="kpi-value">{kpi.satisfaction}/5</div></div>
    </div>
  );
}
