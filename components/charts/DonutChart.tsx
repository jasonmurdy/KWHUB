import React from 'react';

interface DonutChartProps {
  data: { name: string; value: number; color: string }[];
}

const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return <p className="text-sm text-center text-on-surface-variant py-8">No data to display.</p>;
  
  let accumulated = 0;
  const segments = data.map(item => {
    const percentage = item.value / total;
    const dashArray = 2 * Math.PI * 20; // Circumference of the circle
    const dashOffset = dashArray * (1 - accumulated);
    const strokeDasharray = `${percentage * dashArray} ${dashArray * (1 - percentage)}`;
    accumulated += percentage;
    return { ...item, dashOffset, strokeDasharray };
  });

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="relative w-32 h-32 flex-shrink-0">
            <svg viewBox="0 0 44 44" className="transform -rotate-90">
                {segments.map((segment) => (
                <circle
                    key={segment.name}
                    cx="22"
                    cy="22"
                    r="20"
                    fill="transparent"
                    stroke={segment.color}
                    strokeWidth="4"
                    strokeDasharray={segment.strokeDasharray}
                    strokeDashoffset={segment.dashOffset}
                />
                ))}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-on-surface">{total}</span>
            </div>
        </div>
      <div className="w-full">
        <ul className="space-y-2 text-sm">
          {data.map(item => (
            <li key={item.name} className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-on-surface-variant">{item.name}</span>
              </span>
              <span className="font-semibold text-on-surface">{item.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DonutChart;