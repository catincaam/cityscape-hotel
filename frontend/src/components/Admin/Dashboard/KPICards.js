import React from 'react';
import { Bed, CreditCard, Star, Ticket } from 'lucide-react';

const cards = [
  { key: 'revenue', label: 'Total Revenue', icon: CreditCard, format: (value) => `€${Number(value || 0).toLocaleString()}`, changeKey: 'revenueChange' },
  { key: 'occupancyRate', label: 'Occupancy Rate', icon: Bed, format: (value) => `${Number(value || 0)}%`, changeKey: 'occupancyChange' },
  { key: 'avgBookingValue', label: 'Avg Booking Value', icon: Ticket, format: (value) => `€${Number(value || 0).toLocaleString()}`, changeKey: 'avgBookingChange' },
  { key: 'satisfaction', label: 'Satisfaction Score', icon: Star, format: (value) => `${Number(value || 0).toFixed(1)}/5`, changeKey: 'satisfactionChange' }
];

export default function KPICards({ kpis, loading }) {
  return (
    <div className="kpi-cards">
      {cards.map(({ key, label, icon: Icon, format, changeKey }) => {
        const change = Number(kpis?.[changeKey] || 0);
        const changePrefix = change > 0 ? '+' : '';

        return (
          <div className="kpi-card" key={key}>
            <div className="kpi-card-top">
              <span className="kpi-icon"><Icon size={20} /></span>
              <span className={`kpi-change ${change < 0 ? 'negative' : ''}`}>
                {changePrefix}{change}{key === 'satisfaction' ? '' : '%'}
              </span>
            </div>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{loading ? '...' : format(kpis?.[key])}</div>
          </div>
        );
      })}
    </div>
  );
}
