import React from 'react';

interface BarChartProps {
  data: { label: string; value: number }[];
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 0);
    if (maxValue === 0) return <p className="text-sm text-center text-on-surface-variant py-8">No data to display.</p>;

    return (
        <div className="space-y-3">
        {data.slice(0, 10).map((item) => (
            <div key={item.label} className="grid grid-cols-4 gap-4 items-center text-sm">
                <div className="col-span-1 truncate text-on-surface-variant font-medium">{item.label}</div>
                <div className="col-span-3 flex items-center gap-2">
                    <div className="w-full bg-surface-variant rounded-full h-4">
                        <div 
                            className="bg-primary h-4 rounded-full transition-all duration-500"
                            style={{ width: `${(item.value / maxValue) * 100}%` }}
                        />
                    </div>
                    <span className="font-semibold text-on-surface w-8 text-right">{item.value}</span>
                </div>
            </div>
        ))}
        </div>
    );
};

export default BarChart;