import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, PieLabelRenderProps } from 'recharts';

interface PieChartData {
  name: string;
  value: number;
}

interface VehicleTypePieChartProps {
  data: PieChartData[];
  colors?: Record<string, string>;
}

// Default colors to use if the 'colors' prop isn't provided or a type is missing.
const DEFAULT_COLORS = ['#3b82f6', '#8b5cf6', '#f97316', '#10b981', '#64748b'];

const VehicleTypePieChart: React.FC<VehicleTypePieChartProps> = ({ data, colors }) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md h-full">
      <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Vehicle Types</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                // Use the color from the map if it exists, otherwise fall back to default colors
                fill={colors?.[entry.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} 
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [value, 'Vehicles']}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VehicleTypePieChart;