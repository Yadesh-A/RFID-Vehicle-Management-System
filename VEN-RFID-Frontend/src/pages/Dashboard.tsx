import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Car, ArrowRightLeft, LogIn, LogOut, Calendar, Clock } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import RecentEntries from '../components/dashboard/RecentEntries';
import VehicleTypePieChart from '../components/dashboard/VehicleTypePieChart';
import RefreshButton from '../components/RefreshButton';
import { useDynamicTime } from '../hooks/useDynamicTime';

const Dashboard: React.FC = () => {
  const { dashboardStats, fetchDashboardStats, loading, refreshAllData } = useApp();
  const { formattedDate, formattedDay, formatTime } = useDynamicTime();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAllData();
    await fetchDashboardStats();
    setIsRefreshing(false);
  };
  
  // Fallbacks if dashboardStats is not loaded
  const stats: { total_vehicles: number; vehicles_inside: number; active_tags: number; today_entries: number } = dashboardStats || {
    total_vehicles: 0,
    vehicles_inside: 0,
    active_tags: 0,
    today_entries: 0,
  };
  
  if (loading || !dashboardStats) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading dashboard data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Overview of vehicle activity and statistics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
            <Calendar size={16} className="mr-1" />
            <span>{formattedDate}</span>
            <span className="mx-2">•</span>
            <span>{formattedDay}</span>
            <span className="mx-2">•</span>
            <Clock size={16} className="mr-1" />
            <span>{formatTime('p')}</span>
          </div>
          <RefreshButton onRefresh={handleRefresh} loading={isRefreshing} />
        </div>
      </div>
      {/* Stats cards */}
      <div className="flex gap-6 overflow-x-auto pb-4 -mx-6 px-6">
        <StatCard
          title="Total Vehicles"
          value={stats.total_vehicles}
          icon={<Car size={20} />}
          color="blue"
        />
        <StatCard
          title="Currently Inside"
          value={stats.vehicles_inside}
          icon={<ArrowRightLeft size={20} />}
          color="purple"
        />
        <StatCard
          title="Active Tags"
          value={stats.active_tags}
          icon={<LogIn size={20} />}
          color="green"
        />
        <StatCard
          title="Today's Entries"
          value={stats.today_entries}
          icon={<LogOut size={20} />}
          color="amber"
        />
      </div>
      {/* Charts and Tables*/}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <VehicleTypePieChart data={dashboardStats?.vehicle_type_data || []} colors={{}} />
        </div>
        <div>
          <RecentEntries 
            entries={dashboardStats?.recent_entries || []} 
          />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

