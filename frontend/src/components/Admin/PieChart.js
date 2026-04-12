// Simple SVG Pie Chart Component - No external dependencies
export function PieChart({ data, total, colors }) {
  if (!data || data.length === 0) return <div>No data</div>;

  const size = 200;
  const radius = 80;
  const center = size / 2;

  let currentAngle = -Math.PI / 2; // Start at top
  const slices = [];

  // Calculate angles and create SVG paths
  data.forEach((item, idx) => {
    const sliceAngle = (item.value / 100) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    // SVG arc path
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    const color = colors[idx % colors.length];
    slices.push(
      <path key={idx} d={pathData} fill={color} stroke="white" strokeWidth="2" />
    );

    currentAngle = endAngle;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 30, justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ maxWidth: '100%' }}>
        {slices}
        {/* Center text for donut effect */}
        <circle cx={center} cy={center} r={45} fill="white" />
        <text x={center} y={center - 10} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#333">
          {total}
        </text>
        <text x={center} y={center + 12} textAnchor="middle" fontSize="11" fill="#999">
          Total
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: colors[idx % colors.length],
                flexShrink: 0
              }}
            />
            <span style={{ flex: 1 }}>{item.name}</span>
            <span style={{ fontWeight: 600, minWidth: 30, textAlign: 'right' }}>{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
