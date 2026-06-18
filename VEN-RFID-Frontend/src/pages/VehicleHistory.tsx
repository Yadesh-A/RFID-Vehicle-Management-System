import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';
import { ArrowLeft, Download, FileText, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from '../components/Pagination';
import { API_BASE } from '../config/api.js';
import { getAccessToken } from '../utils/auth.js';
import { apiFetch } from '../utils/api.js';

const VehicleHistory: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    vehicleStatuses,
    vehicles,
    drivers,
    vehicleLogCount = 0,
    vehicleLogPage = 1,
    vehicleLogPageSize = 20,
    vehicleLogTotalPages = 1,
    fetchVehicleLogs,
    setVehicleLogPage
  } = useApp();
  
  // All state declarations at the top
  const [ranks, setRanks] = useState([]);
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Download filter states
  const [downloadFilters, setDownloadFilters] = useState({
    startDate: '',
    endDate: '',
  });
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const vehicleId = parseInt(id || '0');
  const currentPage = vehicleLogPage;
  const itemsPerPage = vehicleLogPageSize;

  // ALL useEffect hooks MUST be called before any conditional returns
  // Fetch the specific vehicle from API instead of relying on paginated array
  useEffect(() => {
    const fetchVehicle = async () => {
      setLoading(true);
      setError(false);
      
      // First try to find in the existing vehicles array (fast path)
      const existingVehicle = vehicles.find((v: any) => v.id === vehicleId);
      if (existingVehicle) {
        setVehicle(existingVehicle);
        setLoading(false);
        return;
      }
      
      // If not found in array, fetch from API
      try {
        const token = getAccessToken();
        const headers: any = {
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const res = await fetch(`${API_BASE}/vehicles/${vehicleId}/`, {
          headers
        });
        
        if (res.ok) {
          const data = await res.json();
          setVehicle(data);
        } else {
          console.error('Failed to fetch vehicle:', res.status, res.statusText);
          setError(true);
        }
      } catch (err) {
        console.error('Error fetching vehicle:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (vehicleId) {
      fetchVehicle();
    } else {
      setLoading(false);
      setError(true);
    }
  }, [vehicleId, vehicles]);

  // Fetch ranks for displaying rank names
  useEffect(() => {
    const token = getAccessToken();
    fetch(`${API_BASE}/driver-ranks/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        const ranksList = Array.isArray(data) ? data : (data.results || []);
        setRanks(ranksList);
      });
  }, []);

  // Fetch vehicle logs when page changes
  useEffect(() => {
    if (vehicleId) {
      fetchVehicleLogs(vehicleId, currentPage, itemsPerPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, currentPage, itemsPerPage]);

  // Reset to first page on vehicleId change
  useEffect(() => {
    setVehicleLogPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  // Helper functions
  const getRankName = (rankId: any) => {
    const rank = ranks.find((r: any) => r.id === rankId);
    return rank ? (rank as any).name : 'N/A';
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
    } catch {
      return 'Invalid Date';
    }
  };

  // Process logs data - flatten entries and exits into individual actions
  const vehicleLogs = vehicleStatuses
    .filter((log: any) => log.vehicle === vehicleId)
    .flatMap((log: any) => {
      const driver = drivers.find((d: any) => d.id === log.driver);
      const driverName = log.driver_name || driver?.name || log.driver_detail?.name || 'N/A';
      const driverRank = log.rank || driver?.driver_rank || 'N/A';
      const driverPhone = log.driver_phone || driver?.phone_number || log.driver_detail?.phone_number || 'N/A';
      const location = log.location || 'Main Gate';
      
      const actions = [];
      
      // Add entry action
      if (log.entry_time) {
        actions.push({
          id: `${log.id}-entry`,
          timestamp: log.entry_time,
          type: 'Entry',
          driverName,
          driverRank,
          driverPhone,
          location,
        });
      }
      
      // Add exit action if exists
      if (log.exit_time) {
        actions.push({
          id: `${log.id}-exit`,
          timestamp: log.exit_time,
          type: 'Exit',
          driverName,
          driverRank,
          driverPhone,
          location,
        });
      }
      
      return actions;
    })
    // Sort by timestamp in descending order (most recent first)
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const paginatedLogs = vehicleLogs;
  const totalPages = vehicleLogTotalPages;

  const downloadPDF = async () => {
    try {
      // Fetch ALL logs for this vehicle by paginating through all pages
      const params = new URLSearchParams();
      params.append('vehicle', String(vehicleId));
      
      const allLogs = [];
      let page = 1;
      const pageSize = 100; // Use larger page size for faster download
      let hasMore = true;
      
      while (hasMore) {
        params.set('page', String(page));
        params.set('page_size', String(pageSize));
        
        const url = `${API_BASE}/visits/?${params.toString()}`;
        const res = await apiFetch(url);
        
        // If we get a 404, it means we've gone past the last page
        if (res.status === 404) {
          break;
        }
        
        if (!res.ok) {
          throw new Error('Failed to fetch logs for download');
        }
        
        const data = await res.json();
        const pageLogs = data.results || [];
        
        if (pageLogs.length === 0) {
          // No more results
          break;
        }
        
        allLogs.push(...pageLogs);
        
        // Check if there are more pages using the 'next' field or by comparing result count
        if (!data.next || pageLogs.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
        
        // Safety check to prevent infinite loops (max 10,000 pages = 1 million records with pageSize=100)
        if (page > 10000) {
          console.warn('Reached maximum page limit for download (1 million records)');
          break;
        }
      }
      
      let filteredLogs = allLogs;

      if (downloadFilters.startDate) {
        const startDate = new Date(downloadFilters.startDate);
        filteredLogs = filteredLogs.filter(log => new Date(log.entry_time) >= startDate);
      }
      if (downloadFilters.endDate) {
        const endDate = new Date(downloadFilters.endDate);
        endDate.setHours(23, 59, 59, 999);
        filteredLogs = filteredLogs.filter(log => new Date(log.entry_time) <= endDate);
      }

  const doc = new jsPDF();
  doc.setFont("times");

  // Logo
  try {
    const logoImg = new Image();
    logoImg.src = '/src/img/Ven Logo 3.jpg';
    doc.addImage(logoImg, 'JPEG', 20, 10, 30, 30);
  } catch (error) {}

  // Title
  doc.setFontSize(20);
  doc.setFont("times", "bold");
  doc.text("VEHICLE LOG REPORT", 105, 30, { align: "center" });

  // Subtitle
  doc.setFontSize(12);
  doc.setFont("times", "normal");
  let dateRangeText = '';
  if (downloadFilters.startDate && downloadFilters.endDate) {
    dateRangeText = `Date Range: ${format(new Date(downloadFilters.startDate), 'MMM dd, yyyy')} - ${format(new Date(downloadFilters.endDate), 'MMM dd, yyyy')}`;
  } else if (downloadFilters.startDate) {
    dateRangeText = `From: ${format(new Date(downloadFilters.startDate), 'MMM dd, yyyy')}`;
  } else if (downloadFilters.endDate) {
    dateRangeText = `To: ${format(new Date(downloadFilters.endDate), 'MMM dd, yyyy')}`;
  } else {
    dateRangeText = 'All Dates';
  }
  doc.text(dateRangeText, 105, 38, { align: "center" });

  // Generated time
  doc.setFontSize(10);
  const generatedText = `Generated on ${format(new Date(), "dd MMM yyyy, hh:mm a")}`;
  doc.text(generatedText, 105, 44, { align: "center" });

  // Line
  doc.setDrawColor(180, 180, 180);
  doc.line(20, 48, 190, 48);

  // ---------------- VEHICLE INFORMATION ----------------

  doc.setFontSize(14);
  doc.setFont("times", "bold");
  doc.text("Vehicle Information", 20, 60);

  doc.setFontSize(11);

  // Fixed column positions (THIS IS THE MAGIC )
  const leftLabelX = 20;
  const leftValueX = 55;

  const rightLabelX = 110;
  const rightValueX = 145;

  const row1Y = 70;
  const row2Y = 78;

  // Row 1
  doc.setFont("times", "bold");
  doc.text("License Plate:", leftLabelX, row1Y);
  doc.setFont("times", "normal");
  doc.text(`${vehicle.vehicle_number}`, leftValueX, row1Y);

  doc.setFont("times", "bold");
  doc.text("Model:", rightLabelX, row1Y);
  doc.setFont("times", "normal");
  doc.text(`${vehicle.model || 'N/A'}`, rightValueX, row1Y);

  // Row 2
  doc.setFont("times", "bold");
  doc.text("Make:", leftLabelX, row2Y);
  doc.setFont("times", "normal");
  doc.text(`${vehicle.make || 'N/A'}`, leftValueX, row2Y);

  doc.setFont("times", "bold");
  doc.text("Unit:", rightLabelX, row2Y);
  doc.setFont("times", "normal");
  doc.text(`${vehicle.unit_name || 'N/A'}`, rightValueX, row2Y);

  // ---------------- TABLE DATA ----------------

  const tableData: string[][] = [];
  filteredLogs.forEach(log => {
    const entryTime = log.entry_time ? format(new Date(log.entry_time), 'MMM dd, yyyy hh:mm a') : 'N/A';
    const exitTime = log.exit_time ? format(new Date(log.exit_time), 'MMM dd, yyyy hh:mm a') : 'N/A';

    const logDriver = drivers.find((d: any) => d.id === log.driver);
    const logDriverName = log.driver_name || logDriver?.name || log.driver_detail?.name || 'N/A';
    const logDriverRank = log.rank || logDriver?.driver_rank || 'N/A';
    const logDriverPhone = log.driver_phone || logDriver?.phone_number || log.driver_detail?.phone_number || 'N/A';

    tableData.push([
      logDriverName,
      logDriverRank,
      logDriverPhone,
      entryTime,
      exitTime,
    ]);
  });

  // Table (starts just below info)
  autoTable(doc, {
    head: [['Driver', 'Rank', 'Phone', 'Entry Date & Time', 'Exit Date & Time']],
    body: tableData,
    startY: 90,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      font: 'times',
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
      font: 'times',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  // Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${totalPages}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  // Filename
  let filename = `vehicle_log_report_${vehicle.vehicle_number}`;
  filename += '.pdf';

  doc.save(filename);
  setShowDownloadModal(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to download logs. Please try again.');
    }
  };



  // NOW we can do conditional returns after all hooks are called
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading vehicle information...</p>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <FileText size={48} className="mx-auto text-slate-400 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Vehicle Not Found</h2>
          <p className="text-slate-600 dark:text-slate-400">The requested vehicle could not be found.</p>
          <button
            onClick={() => navigate('/entries')}
            className="mt-4 btn btn-primary"
          >
            Back to Vehicle Logs
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/entries')}
            className="mr-4 p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Back to Vehicle Logs"
          >
            <ArrowLeft size={20} />
          </button>
          <FileText className="h-6 w-6 text-blue-600 mr-2" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vehicle History</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{vehicle.vehicle_number}</p>
          </div>
        </div>
        <button
          onClick={() => setShowDownloadModal(true)}
          className="btn bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
        >
          <Download size={16} />
          <span>Download Logs</span>
        </button>
      </div>

      {/* Vehicle Info Card */}
      <div className="card">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Vehicle Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">License Plate</label>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{vehicle.vehicle_number}</p>
            </div>
            <div>
              <label className="label">Make</label>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{vehicle.make || 'N/A'}</p>
            </div>
            <div>
              <label className="label">Model</label>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{vehicle.model || 'N/A'}</p>
            </div>
            <div>
              <label className="label">Unit</label>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{vehicle.unit_name || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="card">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Entry/Exit History</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Total entries: {vehicleLogs.filter(log => log.type === 'Entry').length}
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Phone
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {vehicleLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                        <FileText size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium">No history found</p>
                        <p className="text-sm mt-2">This vehicle has no recorded entries or exits.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((action: any) => {
                    const formattedDateTime = formatDateTime(action.timestamp);
                    const dateParts = formattedDateTime.split(' ');
                    const date = dateParts.slice(0, 3).join(' '); // "MMM dd, yyyy"
                    const time = dateParts.slice(3).join(' '); // "hh:mm a"
                    
                    return (
                      <tr key={action.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {date}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {time}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            action.type === 'Entry'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>
                            {action.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {action.driverName}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            action.driverRank.toLowerCase() === 'general'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                              : action.driverRank.toLowerCase() === 'lieutenant'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                          }`}>
                            {action.driverRank}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {action.driverPhone}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setVehicleLogPage}
          totalItems={vehicleLogCount}
          itemsPerPage={itemsPerPage}
        />
      </div>

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Download Vehicle Logs</h3>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={downloadFilters.startDate}
                  onChange={(e) => setDownloadFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={downloadFilters.endDate}
                  onChange={(e) => setDownloadFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDownloadModal(false)}
                className="flex-1 px-4 py-2 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={downloadPDF}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleHistory;
