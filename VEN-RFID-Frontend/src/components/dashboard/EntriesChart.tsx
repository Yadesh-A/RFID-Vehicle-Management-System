import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { VehicleEntry } from '../../types/types';
import { format, startOfDay, endOfDay, eachHourOfInterval, isSameHour, subDays } from 'date-fns';
import { useGlobalTime } from '../../hooks/useGlobalTime';

interface EntriesChartProps {
  entries: VehicleEntry[];
  days?: number;
}

const EntriesChart: React.FC<EntriesChartProps> = ({ entries, days = 1 }) => {
  const currentTime = useGlobalTime();
  
  // Get the range of dates to display
  const endDate = endOfDay(currentTime);
  const startDate = startOfDay(subDays(currentTime, days - 1));
  
  // Generate time slots for the selected range
  const timeSlots = eachHourOfInterval({ start: startDate, end: endDate });
  
  // Prepare data for chart
  const data = timeSlots.map(hour => {
    const hourEntries = entries.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return isSameHour(entryDate, hour) && entry.type === 'entry';
    }).length;
    
    const hourExits = entries.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return isSameHour(entryDate, hour) && entry.type === 'exit';
    }).length;
    
    return {
      hour: format(hour, 'h a'),
      entries: hourEntries,
      exits: hourExits,
      timestamp: hour.getTime()
    };
  });
  
  // Only show data points with activity or recent hours
  const filteredData = data.filter((item) => {
    // Keep points with activity
    if (item.entries > 0 || item.exits > 0) return true;
    
    // Keep points from the last 12 hours
    const timeDiff = currentTime.getTime() - item.timestamp;
    const hourDiff = timeDiff / (1000 * 60 * 60);
    return hourDiff <= 12;
  });
  
  return (
    <div className="card h-full">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <h2 className="font-semibold text-slate-900 dark:text-white">Traffic Activity</h2>
      </div>
      <div className="p-6 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={filteredData}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="hour" 
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid rgba(229, 231, 235, 1)',
                borderRadius: '0.375rem'
              }}
            />
            <Legend />
            <Bar dataKey="entries" name="Entries" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="exits" name="Exits" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EntriesChart;