import React, { useMemo } from 'react';

interface LineChartProps {
  data: { label: string; value: number }[];
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 0), [data]);
  const labels = useMemo(() => data.map(d => d.label), [data]);

  // Calculate points for the SVG path
  const points = useMemo(() => {
    if (data.length < 2 || maxValue === 0) return '';

    const width = 300; // Arbitrary internal width for scaling
    const height = 150; // Arbitrary internal height for scaling
    const xStep = width / (data.length - 1);
    const yRatio = height / maxValue;

    return data.map((item, i) => {
      const x = i * xStep;
      const y = height - (item.value * yRatio);
      return `${x},${y}`;
    }).join(' ');
  }, [data, maxValue]);

  if (data.length === 0 || maxValue === 0) {
    return <p className="text-sm text-center text-on-surface-variant py-8">No data to display.</p>;
  }

  return (
    <div className="flex flex-col items-center w-full h-full p-4 bg-surface-variant/40 rounded-lg">
      <div className="w-full flex-1 relative" style={{ minHeight: '150px' }}>
        <svg viewBox="0 0 300 150" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          {/* Y-axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <line
              key={`y-grid-${i}`}
              x1="0"
              y1={150 * (1 - ratio)}
              x2="300"
              y2={150 * (1 - ratio)}
              stroke="rgb(var(--color-outline) / 0.3)"
              strokeDasharray="2,2"
            />
          ))}

          {/* Line Path */}
          <polyline
            fill="none"
            stroke="rgb(var(--color-primary))"
            strokeWidth="2"
            points={points}
          />
          {/* Points/Dots */}
          {data.map((item, i) => {
            const x = i * (300 / (data.length - 1 || 1));
            const y = 150 - (item.value * (150 / maxValue));
            return (
              <circle
                key={`dot-${i}`}
                cx={x}
                cy={y}
                r="3"
                fill="rgb(var(--color-primary))"
                stroke="rgb(var(--color-on-primary))"
                strokeWidth="1"
              />
            );
          })}
        </svg>
      </div>
      
      {/* Labels */}
      <div className="w-full flex justify-between text-xs text-on-surface-variant mt-2 px-2 overflow-x-auto">
        {labels.map((label, i) => (
          <span key={i} className="flex-shrink-0" style={{ minWidth: '40px', textAlign: 'center' }}>{label}</span>
        ))}
      </div>
    </div>
  );
};

export default LineChart;