import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    up: boolean;
  };
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'orange';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'blue',
}) => {
  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300';
      case 'amber':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300';
      case 'red':
        return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300';
      case 'purple':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300';
      case 'orange':
        return 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300';
      case 'blue':
      default:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
    }
  };

  return (
    <div className="card p-6 h-full min-w-[240px] flex-shrink-0">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${getColorClasses()}`}>
          {icon}
        </div>
        <div className="ml-4">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
          <div className="mt-1 flex items-baseline">
            <p className="text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
            {trend && (
              <p
                className={`ml-2 flex items-baseline text-sm font-medium ${
                  trend.up
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                <span>{trend.up ? '↑' : '↓'}</span>
                <span className="sr-only">{trend.up ? 'Increased' : 'Decreased'} by</span>
                {trend.value}%
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCard;