import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LogIn, LogOut } from 'lucide-react';
import { format } from 'date-fns';

interface RecentEntry {
  id: number;
  vehicleId: number;
  licensePlate: string;
  driverName: string;
  type: 'entry' | 'exit';
  timestamp: string;
  location: string;
}

interface RecentEntriesProps {
  entries: RecentEntry[];
  vehicleMap?: Record<string, { licensePlate: string; owner: string }>;
}

const RecentEntries: React.FC<RecentEntriesProps> = ({ entries }) => {
  return (
    <div className="card overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
        <h2 className="font-semibold text-slate-900 dark:text-white">Recent Activity</h2>
        <Link to="/entries" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center">
          View all <ArrowRight size={16} className="ml-1" />
        </Link>
      </div>
      <div className="overflow-hidden">
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {entries.length === 0 ? (
            <li className="p-6 text-center text-slate-500 dark:text-slate-400">No recent entries</li>
          ) : (
            entries.map((entry) => (
              <li key={`${entry.id}-${entry.type}`} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center">
                  <div className={`p-2 rounded-full ${
                    entry.type === 'entry' 
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {entry.type === 'entry' ? <LogIn size={18} /> : <LogOut size={18} />}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {entry.licensePlate || 'Unknown Vehicle'}
                      </p>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {format(new Date(entry.timestamp), 'h:mm a')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {entry.driverName} • {entry.type === 'entry' ? 'Entered' : 'Exited'} via {entry.location}
                    </p>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default RecentEntries;
