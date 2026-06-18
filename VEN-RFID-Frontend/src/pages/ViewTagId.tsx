import React, { useState, useEffect } from 'react';
import { CreditCard, Clock, Calendar, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface TagScan {
  tagId: string;
  timestamp: string;
  gate: string;
}

const ViewTagId: React.FC = () => {
  const [tagScans, setTagScans] = useState<TagScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch recent tag scans from Django API (No Node.js)
  const fetchTagScans = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/recent-tag-scans/');
      if (!response.ok) {
        throw new Error('Failed to fetch tag scans');
      }
      const data = await response.json();
      if (data.ok) {
        setTagScans(data.scans);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching tag scans:', err);
      setError('Could not load tag scans. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 1 second
  useEffect(() => {
    fetchTagScans(); // Initial fetch
    const interval = setInterval(fetchTagScans, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDateTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return {
        date: format(date, 'MMM dd, yyyy'),
        time: format(date, 'HH:mm:ss'), // Hour:Minute:Second
      };
    } catch {
      return { date: 'Invalid Date', time: 'Invalid Time' };
    }
  };

  const getGateBadgeColor = (gate: string) => {
    switch (gate) {
      case 'ENTRY':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'EXIT':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <CreditCard className="h-6 w-6 text-blue-600 mr-2" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">View Tag ID</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Auto-refreshing every second</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          This page displays the last 10 scanned RFID tag IDs in real-time. When you scan a tag at the entry or exit gate, 
          it will appear here immediately with the tag ID number, date, and time.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Card Container */}
      <div className="card">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Recent Tag Scans (Last 10)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Showing the most recent RFID tag scans from both entry and exit gates
          </p>
        </div>

        {/* Loading State */}
        {loading && tagScans.length === 0 ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading tag scans...</p>
          </div>
        ) : tagScans.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center">
            <CreditCard size={48} className="mx-auto text-slate-400 mb-4" />
            <p className="text-lg font-medium text-slate-900 dark:text-white">No tag scans yet</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Scan an RFID tag at the entry or exit gate to see it appear here
            </p>
          </div>
        ) : (
          /* Tag Scans List */
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {tagScans.map((scan, index) => {
              const { date, time } = formatDateTime(scan.timestamp);
              return (
                <div
                  key={`${scan.tagId}-${scan.timestamp}-${index}`}
                  className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    {/* Tag ID */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Tag ID</p>
                          <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                            {scan.tagId}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex-1 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Scanned Date</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {date}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="flex-1 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Scanned Time</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {time}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Gate Badge */}
                    <div className="flex-1 text-right">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getGateBadgeColor(
                          scan.gate
                        )}`}
                      >
                        {scan.gate}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {tagScans.length > 0 && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-sm">
              <div className="text-slate-600 dark:text-slate-400">
                Total Scans: <span className="font-semibold text-slate-900 dark:text-white">{tagScans.length}</span>
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-xs">
                Automatically refreshing • Last 10 scans only
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewTagId;
