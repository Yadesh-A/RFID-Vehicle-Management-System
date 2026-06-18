import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { FileText, Search, Clock, Flag, X, Plus, Edit, Download, Filter, Car, Calendar } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useDynamicTime } from '../hooks/useDynamicTime';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from '../components/Pagination';
import SearchableRankDropdown from '../components/SearchableRankDropdown';
import SearchableVehicleDropdown from '../components/SearchableVehicleDropdown';
import { API_BASE } from '../config/api.js';
import { getAccessToken } from '../utils/auth.js';
import { apiFetch } from '../utils/api.js';

const VehicleEntries: React.FC = () => {
  const navigate = useNavigate();
  const { vehicleStatuses, vehicles, drivers, flagVehicleLog, updateVehicleLog, addVehicle, addDriver, addVehicleEntry, currentAdmin, refreshVehicleStatuses, fetchVehicleTypes, vehicleTypes } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyInside, setShowOnlyInside] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<{ id: number; vehicleId: number; licensePlate: string } | null>(null);
  const [flagCategory, setFlagCategory] = useState('');
  const [flagComment, setFlagComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorToastMessage, setErrorToastMessage] = useState('');
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  
  // Server-side pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  // Flag categories
  const flagCategories = [
    'Suspicious Activity',
    'Unauthorized Access Attempt',
    'Policy Violation',
    'Expired or Invalid Documents',
    'Tag Misuse',
    'Safety Concerns',
    'Blacklisted Vehicle',
    'Security Alert',
    'Misbehavior by Driver',
    'Stolen / Suspected Stolen',
    'Others'
  ];
  const [isAddLogModalOpen, setIsAddLogModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLogForEdit, setSelectedLogForEdit] = useState<any>(null);
  const [editExitTime, setEditExitTime] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [logFormData, setLogFormData] = useState({
    licensePlate: '',
    driverName: '',
    unit: '',
    rank: '',
    entryTime: '',
    exitTime: '',
    // For new vehicle
    chassisNumber: '',
    tagId: '',
    vehicleType: '',
    color: '',
    make: '',
    model: '',
    year: '',
    driverPhone: '',
  });
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const { formattedDate, formattedDay, formatTime } = useDynamicTime();

  // Fetch data with server-side pagination
  const fetchData = async () => {
    const result = await refreshVehicleStatuses(showOnlyInside, searchTerm, currentPage, itemsPerPage, selectedDate);
    if (result) {
      setTotalCount(result.count);
    }
  };

  // Debounced search effect - fetch from server when search term changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1); // Reset to page 1 on search
      fetchData();
    }, 500); // 500ms debounce

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, showOnlyInside, selectedDate]);

  // Fetch data when page changes
  useEffect(() => {
    fetchData();
  }, [currentPage]);

  // Auto-refresh vehicle statuses every 30 seconds with current filters
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 5000); // Refresh every 5 second

    return () => clearInterval(interval);
  }, [showOnlyInside, searchTerm, currentPage, selectedDate]);

  // Download filter states
  const [downloadFilters, setDownloadFilters] = useState({
    startDate: '',
    endDate: '',
  });
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Process vehicle logs data (no client-side filtering, all done server-side)
  const processedLogs = useMemo(() => {
    return vehicleStatuses.map(log => {
      const vehicle = vehicles.find(v => v.id === log.vehicle);
      const driver = drivers.find(d => d.id === log.driver);

      return {
        id: log.id,
        vehicleId: log.vehicle, // This is the vehicle ID from the API
        licensePlate: log.license_plate || log.vehicle_plate || vehicle?.license_plate || 'N/A',
        driverName: log.driver_name || driver?.name || 'N/A',
        entryTime: log.entry_time || log.timestamp || null,
        exitTime: log.exit_time || null,
        unit: log.unit || vehicle?.unit_name || 'N/A',
        location: log.location,
        vehicle: vehicle,
        driver: driver,
      };
    });
  }, [vehicleStatuses, vehicles, drivers]);

  // Calculate total pages from server count
  const totalPages = Math.ceil(totalCount / itemsPerPage);


  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
    } catch {
      return 'Invalid Date';
    }
  };



  const handleOpenFlagModal = (logId: number, vehicleId: number, licensePlate: string) => {
    setSelectedLog({ id: logId, vehicleId, licensePlate });
    setFlagComment('');
    setIsFlagModalOpen(true);
  };

  const handleCloseFlagModal = () => {
    setIsFlagModalOpen(false);
    setSelectedLog(null);
    setFlagCategory('');
    setFlagComment('');
    setIsSubmitting(false);
  };


  const handleOpenEditModal = (log: any) => {
    setSelectedLogForEdit(log);
    setEditExitTime(log.exitTime || '');
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedLogForEdit(null);
    setEditExitTime('');
    setIsSubmitting(false);
  };

  const handleSubmitFlag = async () => {
    if (!selectedLog || !flagCategory || !flagComment.trim()) {
      alert('Please select a category and provide a reason for flagging this vehicle.');
      return;
    }

    setIsSubmitting(true);
    try {
      await flagVehicleLog(selectedLog.id, selectedLog.vehicleId, flagComment, flagCategory);
      alert('Vehicle flagged successfully!');
      handleCloseFlagModal();
    } catch (error) {
      console.error('Error flagging vehicle:', error);
      alert('Failed to flag vehicle. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedLogForEdit || !editExitTime) {
      alert('Please provide an exit time.');
      return;
    }

    // Validate that exit time is not in the future
    const exitTime = new Date(editExitTime);
    const now = new Date();
    if (exitTime > now) {
      setValidationMessage('Exit time cannot be in the future. Please select a past or current time.');
      setShowValidationModal(true);
      return;
    }

    // Validate that exit time is after entry time
    const entryTime = new Date(selectedLogForEdit.entryTime);
    if (exitTime <= entryTime) {
      setValidationMessage('Exit time must be after entry time.');
      setShowValidationModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateVehicleLog(selectedLogForEdit.id, { exit_time: editExitTime });
      
      // Force refresh the current page data
      await fetchData();

      setToastMessage('Exit time updated successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      handleCloseEditModal();
    } catch (error) {
      console.error('Error updating log:', error);
      alert('Failed to update log. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAddLogModal = () => {
    // Fetch necessary data for the modal
    fetchVehicleTypes();
    // Note: drivers are fetched from SearchableDriverDropdown internally
    // vehicle-units are handled by SearchableUnitDropdown

    setIsAddLogModalOpen(true);
    setSelectedVehicle(null);
    // Explicitly set empty strings for time fields to prevent auto-fill
    setLogFormData({
      licensePlate: '',
      driverName: '',
      unit: '',
      rank: '',
      entryTime: '', // Empty string - no default time
      exitTime: '', // Empty string - no default time
      chassisNumber: '',
      tagId: '',
      vehicleType: '',
      color: '',
      make: '',
      model: '',
      year: '',
      driverPhone: '',
    });
    setIsCreatingNew(false);
  };

  const handleCloseAddLogModal = () => {
    setIsAddLogModalOpen(false);
    setSelectedVehicle(null);
    setLogFormData({
      licensePlate: '',
      driverName: '',
      unit: '',
      rank: '',
      entryTime: '',
      exitTime: '',
      chassisNumber: '',
      tagId: '',
      vehicleType: '',
      color: '',
      make: '',
      model: '',
      year: '',
      driverPhone: '',
    });
    setIsCreatingNew(false);
  };

// --- REPLACE YOUR handleVehicleSelection WITH THIS ---
  const handleVehicleSelection = async (vehicleId: number | null) => {
    setSelectedVehicle(vehicleId);
    if (vehicleId === null) {
      setIsCreatingNew(false);
      // Reset form with empty time fields
      setLogFormData({
        licensePlate: '', 
        driverName: '', 
        unit: '', 
        rank: '', 
        entryTime: '', // Empty string - no default time
        exitTime: '', // Empty string - no default time
        chassisNumber: '', 
        tagId: '', 
        vehicleType: '', 
        color: '', 
        make: '', 
        model: '', 
        year: '', 
        driverPhone: '',
      });
    } else {
      setIsCreatingNew(false);
      
      // Fetch the complete vehicle data from API to ensure we have all fields
      try {
        const token = getAccessToken();
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const res = await fetch(`${API_BASE}/vehicles/${vehicleId}/`, { headers });
        
        if (res.ok) {
          const vehicle = await res.json();
          console.log('Fetched vehicle from API:', vehicle);
          
          // Extract driver information - check if driver is nested object or just ID
          let driver: any = null;
          let driverId: number | null = null;
          
          if (vehicle.driver && typeof vehicle.driver === 'object') {
            // Driver is a nested object
            driver = vehicle.driver;
            console.log('Using nested driver object:', driver);
          } else {
            // Driver is just an ID, look it up
            driverId = vehicle.default_driver || vehicle.driver || null;
            console.log('Driver ID:', driverId);
            
            if (driverId) {
              driver = drivers.find(d => d.id === driverId);
              console.log('Found driver from drivers array:', driver);
            }
          }
          
          // Extract all fields with multiple fallbacks
          const licensePlate = vehicle.license_plate || vehicle.vehicle_number || '';
          const driverName = driver?.name || vehicle.driver_name || '';
          const unit = vehicle.unit_name || vehicle.unit || '';
          const rank = driver?.driver_rank || driver?.rank || '';
          const driverPhone = driver?.phone_number || '';
          
          console.log('Extracted data:', {
            licensePlate,
            driverName,
            unit,
            rank,
            driverPhone
          });
          
          setLogFormData({
            licensePlate: licensePlate,
            driverName: driverName,
            unit: unit,
            rank: rank,
            entryTime: '', // Empty string - user must manually select time
            exitTime: '', // Empty string - user must manually select time
            chassisNumber: vehicle.chassis_number || '',
            tagId: vehicle.tag_id || vehicle.current_tag_id || '',
            vehicleType: vehicle.vehicle_type_name || vehicle.vehicle_type || '',
            color: vehicle.color || '',
            make: vehicle.make || '',
            model: vehicle.model || '',
            year: vehicle.year?.toString() || '',
            driverPhone: driverPhone,
          });
          
          console.log('Form data successfully set!');
        } else {
          console.error('Failed to fetch vehicle:', res.status);
          alert('Failed to load vehicle details. Please try again.');
        }
      } catch (error) {
        console.error('Error fetching vehicle:', error);
        alert('Error loading vehicle details. Please try again.');
      }
    }
  };

  const handleCreateNewVehicle = () => {
    setIsCreatingNew(true);
    setSelectedVehicle(null);
    // Explicitly set empty strings for time fields to prevent auto-fill
    setLogFormData({
      licensePlate: '',
      driverName: '',
      unit: '',
      rank: '',
      entryTime: '', // Empty string - no default time
      exitTime: '', // Empty string - no default time
      chassisNumber: '',
      tagId: '',
      vehicleType: '',
      color: '',
      make: '',
      model: '',
      year: '',
      driverPhone: '',
    });
  };

  const handleLogFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLogFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitAddLog = async () => {
    // Debug: Log the form data to see what's being submitted
    console.log('=== SUBMITTING LOG ===');
    console.log('Entry Time from form:', logFormData.entryTime);
    console.log('Exit Time from form:', logFormData.exitTime);
    console.log('Full form data:', logFormData);

    if (!logFormData.entryTime) {
      alert('Entry time is required.');
      return;
    }

    // Validate that entry time is not in the future
    const entryTime = new Date(logFormData.entryTime);
    const now = new Date();
    if (entryTime > now) {
      setValidationMessage('Entry time cannot be in the future. Please select a past or current time.');
      setShowValidationModal(true);
      return;
    }

    // Validate that exit time is not in the future if provided
    if (logFormData.exitTime) {
      const exitTime = new Date(logFormData.exitTime);
      if (exitTime > now) {
        setValidationMessage('Exit time cannot be in the future. Please select a past or current time.');
        setShowValidationModal(true);
        return;
      }
    }

    // Check for duplicate license plate when creating new vehicle
    if (isCreatingNew && logFormData.licensePlate) {
      const existingVehicle = vehicles.find(
        v =>
          (v.license_plate || '').toLowerCase() ===
          (logFormData.licensePlate || '').toLowerCase()
      );

      if (existingVehicle) {
        alert(
          `Vehicle number "${logFormData.licensePlate}" already exists in the system. Please use a different license plate number.`
        );
        return;
      }
    }

    // Check if vehicle is already inside (has an entry without exit)
    if (!isCreatingNew && selectedVehicle) {
      const vehicleAlreadyInside = vehicleStatuses.find(
        log => log.vehicle === selectedVehicle && !log.exit_time
      );
      
      if (vehicleAlreadyInside) {
        setValidationMessage('This vehicle is already inside the premises. Please mark an exit before adding a new entry.');
        setShowValidationModal(true);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isCreatingNew) {
        // Create new vehicle first
        const driverData = {
          driver_id: `DRV${Date.now()}`,
          name: logFormData.driverName,
          driver_rank: logFormData.rank as 'General' | 'Lieutenant' | 'Civilian',
          vehicle_type: logFormData.vehicleType || 'Car',
          phone_number: logFormData.driverPhone,
        };
        const newDriver = await addDriver(driverData);
        const vehicleData = {
          license_plate: logFormData.licensePlate,
          chassis_number: logFormData.chassisNumber || `CH${Date.now()}`,
          tag_id: logFormData.tagId || `TAG${Date.now()}`,
          color: logFormData.color,
          make: logFormData.make,
          model: logFormData.model,
          year: parseInt(logFormData.year),
          default_driver: newDriver.id,
          user: currentAdmin?.id || 1,
          status: 'OUT',
          unit: logFormData.unit,
          vehicle_type: logFormData.vehicleType || 'Car',
          flag_status: false,
          is_active: true,
        };
        const newVehicle = await addVehicle(vehicleData);
        // Now add log
        console.log('Adding vehicle entry with times:', {
          entry_time: logFormData.entryTime,
          exit_time: logFormData.exitTime || null
        });
        
        await addVehicleEntry({
          vehicle: newVehicle.id,
          driver: newDriver.id,
          entry_time: logFormData.entryTime,
          exit_time: logFormData.exitTime || null,
          location: 'Main Gate',
          flag_status: false,
        });
      } else {
        // Add log for existing vehicle
        if (!selectedVehicle) {
          alert('Please select a vehicle.');
          return;
        }
        
        // Fetch the vehicle from API to get the driver ID
        try {
          const token = getAccessToken();
          const headers: any = { 'Content-Type': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const res = await fetch(`${API_BASE}/vehicles/${selectedVehicle}/`, { headers });
          
          if (!res.ok) {
            alert('Failed to fetch vehicle details. Please try again.');
            return;
          }
          
          const vehicle = await res.json();
          const driverId = vehicle.default_driver || vehicle.driver?.id || vehicle.driver;
          
          if (!driverId) {
            alert('Vehicle does not have an assigned driver.');
            return;
          }
          
          console.log('Adding vehicle entry with times:', {
            entry_time: logFormData.entryTime,
            exit_time: logFormData.exitTime || null
          });
          
          await addVehicleEntry({
            vehicle: selectedVehicle,
            driver: driverId,
            entry_time: logFormData.entryTime,
            exit_time: logFormData.exitTime || null,
            location: 'Main Gate',
            flag_status: false,
          });
        } catch (error) {
          console.error('Error fetching vehicle for log entry:', error);
          alert('Failed to add log. Please try again.');
          return;
        }
      }
      setToastMessage('Log added successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      handleCloseAddLogModal();
    } catch (error) {
      console.error('Error adding log:', error);
      alert('Failed to add log. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadPDF = async () => {
    try {
      // Fetch ALL logs for download by paginating through all pages
      const params = new URLSearchParams();
      
      // Add the same filters as current view
      if (showOnlyInside === true) {
        params.append('currently_inside', 'true');
      }
      
      if (searchTerm && searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      if (selectedDate && selectedDate.trim()) {
        params.append('date', selectedDate.trim());
      }
      
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
      
      // Now filter logs based on download filters (client-side filtering for download)
      let filteredLogs = [...allLogs];

      if (downloadFilters.startDate) {
        const startDate = new Date(downloadFilters.startDate);
        filteredLogs = filteredLogs.filter(log => new Date(log.entry_time) >= startDate);
      }
      if (downloadFilters.endDate) {
        const endDate = new Date(downloadFilters.endDate);
        endDate.setHours(23, 59, 59, 999);
        filteredLogs = filteredLogs.filter(log => new Date(log.entry_time) <= endDate);
      }

  // Sort logs by entry time in descending order (most recent first)
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const timeA = new Date(a.entry_time || a.timestamp).getTime();
    const timeB = new Date(b.entry_time || b.timestamp).getTime();
    return timeB - timeA; // Descending order (most recent first)
  });

  // Create PDF
  const doc = new jsPDF();

  // Add logo (MOVED UP 🔥)
  try {
    const logoImg = new Image();
    logoImg.src = '/src/img/Ven Logo 3.jpg';
    doc.addImage(logoImg, 'JPEG', 20, 10, 30, 30);
  } catch (error) {}

  // Report Title (MOVED UP 🔥)
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("VEHICLE LOGS REPORT", 105, 30, { align: "center" });

  // Date range subtitle (MOVED UP)
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
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

  // Generated time (MOVED UP)
  doc.setFontSize(10);
  const generatedText = `Generated on ${format(new Date(), "dd MMM yyyy, hh:mm a")}`;
  doc.text(generatedText, 105, 44, { align: "center" });

  // Horizontal Line (MOVED UP)
  doc.setDrawColor(180, 180, 180);
  doc.line(20, 48, 190, 48);

  // Prepare table data - directly from sorted logs (most recent first)
  const tableData: string[][] = [];
  sortedLogs.forEach(log => {
    const vehicle = vehicles.find(v => v.id === log.vehicle);
    const driver = drivers.find(d => d.id === log.driver);

    const vehicleNumber = log.license_plate || log.vehicle_plate || vehicle?.license_plate || 'N/A';
    const driverName = driver?.name || log.driver_name || 'N/A';
    const unit = log.unit || vehicle?.unit_name || 'N/A';

    if (log.entry_time && !log.exit_time) {
      tableData.push([
        vehicleNumber,
        driverName,
        format(new Date(log.entry_time), 'MMM dd, yyyy hh:mm a'),
        'Currently Inside',
        unit
      ]);
    } else if (log.exit_time) {
      const entryTime = log.entry_time
        ? format(new Date(log.entry_time), 'MMM dd, yyyy hh:mm a')
        : 'N/A';
      tableData.push([
        vehicleNumber,
        driverName,
        entryTime,
        format(new Date(log.exit_time), 'MMM dd, yyyy hh:mm a'),
        unit
      ]);
    }
  });

  // Add table (START MUCH HIGHER 🔥 MAIN FIX)
  autoTable(doc, {
    head: [['Vehicle Number', 'Driver Name', 'Entry Time', 'Exit Time', 'Unit']],
    body: tableData,
    startY: 60,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${data.pageNumber} of ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
    },
  });

  // Generate filename
  let filename = 'vehicle_logs_report';
  if (downloadFilters.startDate && downloadFilters.endDate) {
    filename += `_${downloadFilters.startDate}_to_${downloadFilters.endDate}`;
  } else if (downloadFilters.startDate) {
    filename += `_from_${downloadFilters.startDate}`;
  } else if (downloadFilters.endDate) {
    filename += `_to_${downloadFilters.endDate}`;
  }
  filename += '.pdf';

      // Save PDF
      doc.save(filename);
      setShowDownloadModal(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to download logs. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {showToast && (
        <div className="fixed top-5 right-5 bg-green-500 text-white py-3 px-4 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in-down z-50">
          <span>{toastMessage}</span>
        </div>
      )}
      {showErrorToast && (
        <div className="fixed top-5 right-5 bg-red-500 text-white py-3 px-4 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in-down z-50">
          <span>{errorToastMessage}</span>
        </div>
      )}
      {showValidationModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Validation Error</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">{validationMessage}</p>
              <div className="flex justify-center">
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FileText className="h-6 w-6 text-blue-600 mr-2" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vehicle Logs</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleOpenAddLogModal}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Add Log</span>
          </button>
          <button
            onClick={() => setShowDownloadModal(true)}
            className="btn bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
          >
            <Download size={16} />
            <span>Download Logs</span>
          </button>
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
            <Clock size={16} className="mr-1" />
            <span>{formattedDate}</span>
            <span className="mx-2">•</span>
            <span>{formattedDay}</span>
            <span className="mx-2">•</span>
            <span>{formatTime('p')}</span>
          </div>
        </div>
      </div>

      {/* Add Log Modal */}
      {isAddLogModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div key={`add-log-modal-${selectedVehicle}-${isCreatingNew}`} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[120vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Plus className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Vehicle Log</h3>
                </div>
                <button
                  onClick={handleCloseAddLogModal}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  disabled={isSubmitting}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Vehicle Selection */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-slate-900 dark:text-white">Select Vehicle</h4>
                <div>
                  <label className="label">Choose Vehicle</label>
                  <SearchableVehicleDropdown
                    value={selectedVehicle}
                    onChange={handleVehicleSelection}
                    fetchFromAPI={true}
                    placeholder="Search by vehicle number or driver name..."
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleCreateNewVehicle}
                    className="btn bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                    disabled={isSubmitting}
                  >
                    <Plus size={16} />
                    <span>Create New Vehicle</span>
                  </button>
                </div>
              </div>

              {/* Driver Information - Only show when vehicle is selected or creating new */}
              {(selectedVehicle || isCreatingNew) && (
                <div className="space-y-6">
                  <h4 className="text-md font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-600 pb-2">
                    {isCreatingNew ? 'New Vehicle & Driver Information' : 'Driver Information'}
                  </h4>

                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">License Plate *</label>
                      <input
                        type="text"
                        name="licensePlate"
                        value={logFormData.licensePlate}
                        onChange={handleLogFormChange}
                        className="input md:flex-1 bg-slate-100 text-slate-600 cursor-not-allowed"
                        placeholder="Enter the License Plate"
                        disabled={isSubmitting || !isCreatingNew}
                        required
                      />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">Driver Name *</label>
                      <input
                        type="text"
                        name="driverName"
                        value={logFormData.driverName}
                        onChange={handleLogFormChange}
                        className="input md:flex-1 bg-slate-100 text-slate-600 cursor-not-allowed"
                        placeholder="Enter the Driver Name"
                        disabled={isSubmitting || !isCreatingNew}
                        required
                      />
                    </div>
                    {isCreatingNew && (
                      <div className="flex flex-col md:flex-row md:items-center gap-2">
                        <label className="label md:w-1/3 md:text-right md:pr-4">Unit *</label>
                        <input
                          type="text"
                          name="unit"
                          value={logFormData.unit}
                          onChange={handleLogFormChange}
                          className="input md:flex-1"
                          placeholder="Enter the Unit"
                          disabled={isSubmitting}
                          required
                        />
                      </div>
                    )}
                    {isCreatingNew && (
                      <div className="flex flex-col md:flex-row md:items-center gap-2">
                        <label className="label md:w-1/3 md:text-right md:pr-4">Rank *</label>
                        <SearchableRankDropdown
                          value={logFormData.rank}
                          onChange={(value) => setLogFormData(prev => ({ ...prev, rank: value }))}
                          placeholder="Select or search rank..."
                          className="md:flex-1"
                          disabled={isSubmitting}
                        />
                      </div>
                    )}
                    {isCreatingNew && (
                      <div className="flex flex-col md:flex-row md:items-center gap-2">
                        <label className="label md:w-1/3 md:text-right md:pr-4">Phone Number</label>
                        <input
                          type="text"
                          name="driverPhone"
                          value={logFormData.driverPhone}
                          onChange={handleLogFormChange}
                          className="input md:flex-1"
                          placeholder="Enter the Phone Number"
                          disabled={isSubmitting}
                        />
                      </div>
                    )}

                    {/* Vehicle Information - Only for new vehicles */}
                    {isCreatingNew && (
                      <>
                        <div className="border-t border-slate-200 dark:border-slate-600 my-4"></div>
                        <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                          Vehicle Information
                        </h5>
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <label className="label md:w-1/3 md:text-right md:pr-4">Chassis Number</label>
                          <input
                            type="text"
                            name="chassisNumber"
                            value={logFormData.chassisNumber}
                            onChange={handleLogFormChange}
                            className="input md:flex-1"
                            placeholder="Enter the Chassis Number"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <label className="label md:w-1/3 md:text-right md:pr-4">Tag ID</label>
                          <input
                            type="text"
                            name="tagId"
                            value={logFormData.tagId}
                            onChange={handleLogFormChange}
                            className="input md:flex-1"
                            placeholder="Enter the Tag ID"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <label className="label md:w-1/3 md:text-right md:pr-4">Vehicle Type</label>
                          <select
                            name="vehicleType"
                            value={logFormData.vehicleType}
                            onChange={handleLogFormChange}
                            className="input md:flex-1"
                            disabled={isSubmitting}
                          >
                            <option value="">Select Vehicle Type</option>
                            <option value="Car">Car</option>
                            <option value="Truck">Truck</option>
                            <option value="Van">Van</option>
                            <option value="Bus">Bus</option>
                            <option value="Bike">Bike</option>
                          </select>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <label className="label md:w-1/3 md:text-right md:pr-4">Color</label>
                          <input
                            type="text"
                            name="color"
                            value={logFormData.color}
                            onChange={handleLogFormChange}
                            className="input md:flex-1"
                            placeholder="Enter the Color"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <label className="label md:w-1/3 md:text-right md:pr-4">Make</label>
                          <input
                            type="text"
                            name="make"
                            value={logFormData.make}
                            onChange={handleLogFormChange}
                            className="input md:flex-1"
                            placeholder="Enter the Make"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <label className="label md:w-1/3 md:text-right md:pr-4">Model</label>
                          <input
                            type="text"
                            name="model"
                            value={logFormData.model}
                            onChange={handleLogFormChange}
                            className="input md:flex-1"
                            placeholder="Enter the Model"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <label className="label md:w-1/3 md:text-right md:pr-4">Year</label>
                          <input
                            type="number"
                            name="year"
                            value={logFormData.year}
                            onChange={handleLogFormChange}
                            className="input md:flex-1"
                            placeholder="Enter the Year"
                            min="1900"
                            max={new Date().getFullYear() + 1}
                            disabled={isSubmitting}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Log Details */}
              {(selectedVehicle || isCreatingNew) && (
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-slate-900 dark:text-white">Log Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Entry Time *</label>
                      <input
                        key={`entry-time-${selectedVehicle}-${isCreatingNew}`}
                        type="datetime-local"
                        name="entryTime"
                        value={logFormData.entryTime}
                        onChange={handleLogFormChange}
                        className="input"
                        disabled={isSubmitting}
                        required
                        autoComplete="off"
                        data-initial=""
                        max={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                    <div>
                      <label className="label">Exit Time (Optional)</label>
                      <input
                        key={`exit-time-${selectedVehicle}-${isCreatingNew}`}
                        type="datetime-local"
                        name="exitTime"
                        value={logFormData.exitTime}
                        onChange={handleLogFormChange}
                        className="input"
                        disabled={isSubmitting}
                        autoComplete="off"
                        data-initial=""
                        max={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
              <button
                onClick={handleCloseAddLogModal}
                className="btn bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAddLog}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || (!selectedVehicle && !isCreatingNew) || !logFormData.entryTime}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Add Log</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedLogForEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Edit className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Exit Time</h3>
                </div>
                <button
                  onClick={handleCloseEditModal}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  disabled={isSubmitting}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Vehicle:</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedLogForEdit.licensePlate}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Entry Time:</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatDateTime(selectedLogForEdit.entryTime)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Exit Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={editExitTime}
                  onChange={(e) => setEditExitTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={isSubmitting}
                  required
                  max={new Date().toISOString().slice(0, 16)}
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Exit time must be after the entry time.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
              <button
                onClick={handleCloseEditModal}
                className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 font-medium transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEdit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || !editExitTime}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Edit size={16} />
                    <span>Update</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flag Modal */}
      {isFlagModalOpen && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Flag className="h-5 w-5 text-red-600 mr-2" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Flag Vehicle</h3>
                </div>
                <button
                  onClick={handleCloseFlagModal}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  disabled={isSubmitting}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Vehicle:</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedLog.licensePlate}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={flagCategory}
                  onChange={(e) => setFlagCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  disabled={isSubmitting}
                >
                  <option value="">Select a category...</option>
                  {flagCategories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Comment <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={flagComment}
                  onChange={(e) => setFlagComment(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all min-h-[120px] resize-none"
                  placeholder="Enter comment or additional details..."
                  disabled={isSubmitting}
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  This information will be visible in the Vehicle Flags page and associated with this vehicle.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
              <button
                onClick={handleCloseFlagModal}
                className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 font-medium transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFlag}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || !flagCategory || !flagComment.trim()}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Flagging...</span>
                  </>
                ) : (
                  <>
                    <Flag size={16} />
                    <span>Flag Vehicle</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Download className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Download Vehicle Logs</h3>
                </div>
                <button
                  onClick={() => setShowDownloadModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Date Range */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Date Range</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</label>
                    <input
                      type="date"
                      value={downloadFilters.startDate}
                      onChange={(e) => setDownloadFilters(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">End Date</label>
                    <input
                      type="date"
                      value={downloadFilters.endDate}
                      onChange={(e) => setDownloadFilters(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
              <button
                onClick={() => setShowDownloadModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={downloadPDF}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Container */}
      <div className="card">
        {/* Search Bar */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by license plate, driver name, or unit..."
                  className="input pl-10 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Total Logs: <span className="font-semibold">{totalCount}</span>
              </div>
            </div>
            
            {/* Filter Buttons */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Currently Inside Filter */}
              <button
                onClick={() => setShowOnlyInside(!showOnlyInside)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  showOnlyInside
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <Car size={16} />
                <span>{showOnlyInside ? 'Showing Currently Inside' : 'Show Currently Inside Only'}</span>
                {showOnlyInside && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                    {processedLogs.length}
                  </span>
                )}
              </button>

              {/* Date Filter */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Filter by date"
                  />
                </div>
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate('')}
                    className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 underline"
                  >
                    Clear date
                  </button>
                )}
              </div>

              {/* Clear All Filters */}
              {(showOnlyInside || selectedDate) && (
                <button
                  onClick={() => {
                    setShowOnlyInside(false);
                    setSelectedDate('');
                  }}
                  className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Table Container */}
        <div className="overflow-x-auto">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    License Plate
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Driver Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Entry Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Exit Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Activities
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {processedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                        <FileText size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium">No vehicle logs found</p>
                        <p className="text-sm mt-2">
                          {searchTerm ? 'Try adjusting your search criteria' : 'Vehicle logs will appear here once recorded'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  processedLogs.map((log) => (
                    <tr
                      key={log.id}
                      className={`transition-colors ${
                        log.vehicle?.flag_status 
                          ? 'bg-red-200 dark:bg-red-900/60 hover:bg-red-300 dark:hover:bg-red-900/70 border-l-4 border-red-600' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      {/* License Plate */}
                      <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {log.licensePlate}
                          </span>
                      </td>

                      {/* Driver Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {log.driverName}
                          </span>
                          {log.driver?.phone_number && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {log.driver.phone_number}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Entry Time */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            {formatDateTime(log.entryTime)}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {log.location || 'Main Gate'}
                          </span>
                        </div>
                      </td>

                      {/* Exit Time */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.exitTime ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                              {formatDateTime(log.exitTime)}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {log.location || 'Main Gate'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Currently Inside
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Unit */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-900 dark:text-white font-medium">
                          {log.unit}
                        </span>
                      </td>

                      {/* Activities */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.vehicleId ? (
                          <button
                            onClick={() => navigate(`/vehicle-history/${log.vehicleId}`)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium text-sm underline"
                          >
                            View
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400 dark:text-slate-500">N/A</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(log)}
                            className="p-2 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit Exit Time"
                          >
                            <Edit size={16} />
                          </button>
                          {log.vehicle?.flag_status ? (
                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                              <Flag size={16} className="fill-current" />
                              <span className="text-xs font-medium">Flagged</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenFlagModal(log.id, log.vehicle?.id || 0, log.licensePlate)}
                              className="p-2 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Flag Vehicle"
                            >
                              <Flag size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {processedLogs.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalCount}
            itemsPerPage={itemsPerPage}
          />
        )}

        {/* Footer with summary */}
        {processedLogs.length > 0 && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-sm">
              <div className="text-slate-600 dark:text-slate-400">
                Total: <span className="font-semibold text-slate-900 dark:text-white">{totalCount}</span> log entries
                {processedLogs.length < totalCount && (
                  <span className="ml-2 text-xs text-slate-500">
                    (Showing {processedLogs.length} on this page)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-slate-600 dark:text-slate-400">
                    Currently Inside: <span className="font-semibold text-slate-900 dark:text-white">
                      {processedLogs.filter(log => !log.exitTime).length}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-slate-600 dark:text-slate-400">
                    Exited: <span className="font-semibold text-slate-900 dark:text-white">
                      {processedLogs.filter(log => log.exitTime).length}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleEntries;
