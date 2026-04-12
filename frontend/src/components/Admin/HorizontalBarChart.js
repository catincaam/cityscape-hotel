import React from "react";

/**
 * HorizontalBarChart Component
 * Displays horizontal bars with percentages
 * @param {Array} data - Array of {name, value} objects
 * @param {Array} colors - Array of colors for bars
 */
export function HorizontalBarChart({ data = [], colors = [] }) {
  if (!data || data.length === 0) {
    return <div style={{ color: '#999' }}>No data available</div>;
  }

  const defaultColors = ['#c6a969', '#ff6b6b', '#10b981', '#f59e42', '#8b5cf6', '#ec4899', '#14b8a6'];
  const barColors = colors.length > 0 ? colors : defaultColors;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      padding: '20px 0'
    }}>
      {data.map((item, idx) => {
        const color = barColors[idx % barColors.length];
        const percentage = item.value || 0;

        return (
          <div key={`bar-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* Label */}
            <div style={{
              minWidth: '150px',
              fontSize: '0.95rem',
              fontWeight: 500,
              color: '#333'
            }}>
              {item.name}
            </div>

            {/* Bar Container */}
            <div style={{
              flex: 1,
              height: '28px',
              backgroundColor: '#f0f0f0',
              borderRadius: '6px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {/* Bar Fill */}
              <div style={{
                height: '100%',
                width: `${Math.max(percentage, 5)}%`,  // Minimum 5% for visibility
                backgroundColor: color,
                borderRadius: '6px',
                transition: 'width 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '10px'
              }}>
                {/* Percentage Text Inside Bar */}
                {percentage > 15 && (
                  <span style={{
                    color: 'white',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}>
                    {percentage}%
                  </span>
                )}
              </div>
            </div>

            {/* Percentage Outside Bar (if bar is too small) */}
            {percentage <= 15 && (
              <div style={{
                minWidth: '45px',
                textAlign: 'left',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#333'
              }}>
                {percentage}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default HorizontalBarChart;
