import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft, User, Shield, Phone, Car, Calendar, MapPin, Clock, FileText
} from 'lucide-react';
import { format } from 'date-fns';
import VehicleCarousel from '../components/VehicleCarousel';
import Pagination from '../components/Pagination';
import { API_BASE } from '../config/api.js';
import { getAccessToken } from '../utils/auth.js';

const PersonnelDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { drivers } = useApp();
  const [currentPage, setCurrentPage] = useState(1);
  const [driverVehicles, setDriverVehicles] = useState([]);
  const [driverLogs, setDriverLogs] = useState([]);
  const [logsCount, setLogsCount] = useState(0);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState(false);
  const driver = drivers.find(d => d.id.toString() === id);
  console.log("SELECTED DRIVER : ",driver);
  
  useEffect(() => {
    if (!driver) return;
    setLoading(true);
    const token = getAccessToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    // Fetch vehicles for this driver
    fetch(`${API_BASE}/vehicles/?default_driver=${driver.id}`, { headers })
      .then(res => res.json())
      .then(data => {
        setDriverVehicles(data.results || []);
      })
      .catch(err => console.error('Error fetching vehicles:', err));
    
    // Fetch vehicle logs for this driver, paginated
    // Use driver parameter instead of search to filter by driver ID
    fetch(`${API_BASE}/visits/?driver=${driver.id}&page=${currentPage}&page_size=${itemsPerPage}`, { headers })
      .then(res => res.json())
      .then(data => {
        console.log('Driver logs response:', data);
        setDriverLogs(data.results || []);
        setLogsCount(data.count || 0);
      })
      .catch(err => {
        console.error('Error fetching driver logs:', err);
        setDriverLogs([]);
        setLogsCount(0);
      })
      .finally(() => setLoading(false));
  }, [driver, currentPage]);

  const totalPages = Math.ceil(logsCount / itemsPerPage);

  if (!driver) {
    return (
      <div className="p-4 md:p-6 lg:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Personnel Not Found
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              The personnel you're looking for doesn't exist.
            </p>
            <button
              onClick={() => navigate('/personnel')}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to Personnel List
            </button>
          </div>
        </div>
      </div>
    );
  }


  // Rank badge component
  const RankBadge = ({ rank }: { rank: string }) => {
    const colors = {
      General: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      Lieutenant: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      Civilian: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${colors[rank as keyof typeof colors] || ''}`}>
        <Shield size={14} />
        {rank}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/personnel')}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Personnel List</span>
        </button>

        {/* Header Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Avatar */}
            <div className="h-24 w-24 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <User size={48} className="text-blue-600 dark:text-blue-400" />
            </div>

            {/* Info */}
            <div className="flex-grow">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {driver.name}
                </h1>
                <RankBadge rank={driver.driver_rank} />
              </div>
              <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <FileText size={14} />
                  <span>Driver ID: <span className="font-mono font-medium">{driver.id}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={14} />
                  <span>Employee ID: <span className="font-mono font-medium">{driver.employee_id || 'N/A'}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} />
                  <span>Phone: <span className="font-medium">{driver.phone_number}</span></span>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Assigned Vehicles */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Car size={20} />
              Assigned Vehicles
            </h2>
          </div>
          <div className="p-6">
            <VehicleCarousel vehicles={driverVehicles} />
          </div>
        </div>

        {/* Entry/Exit History */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock size={20} />
              Entry/Exit History
            </h2>
          </div>
          <div className="p-6">
            {loading ? (
              <p className="text-slate-500 dark:text-slate-400 text-center py-4">Loading...</p>
            ) : driverLogs.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-center py-4">
                No entry/exit records found
              </p>
            ) : (
              <>
                <div className="space-y-4">
                  {driverLogs.map((log: any) => {
                    const vehicle = driverVehicles.find((v: any) => v.id === log.vehicle);
                    
                    // Safely format dates
                    const formatSafeDate = (dateString: any) => {
                      if (!dateString) return 'N/A';
                      try {
                        const date = new Date(dateString);
                        if (isNaN(date.getTime())) return 'Invalid Date';
                        return format(date, 'PPpp');
                      } catch {
                        return 'Invalid Date';
                      }
                    };
                    
                    return (
                      <div
                        key={log.id}
                        className="border border-slate-200 dark:border-slate-700 rounded-lg p-4"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex-grow">
                            <div className="flex items-center gap-2 mb-2">
                              <Car size={16} className="text-slate-400" />
                              <span className="font-semibold text-slate-900 dark:text-white font-mono">
                                {log.vehicle_plate || vehicle?.license_plate || vehicle?.vehicle_number || 'Unknown Vehicle'}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                <Calendar size={14} />
                                <span>Entry: {formatSafeDate(log.entry_time)}</span>
                              </div>
                              {log.exit_time ? (
                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                  <Calendar size={14} />
                                  <span>Exit: {formatSafeDate(log.exit_time)}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                  <Calendar size={14} />
                                  <span>Exit: Still inside</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mt-2">
                              <MapPin size={14} />
                              <span>Location: {log.location || 'N/A'}</span>
                            </div>
                            {log.comment && (
                              <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                <span className="font-medium">Note:</span> {log.comment}
                              </div>
                            )}
                          </div>
                          {log.flag_status && (
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                ⚠️ Flagged
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={logsCount}
                    itemsPerPage={itemsPerPage}
                  />
                )}
              </>
            )}
          </div>
        </div>


      </div>
    </div>
  );
};

export default PersonnelDetail;
