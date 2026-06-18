import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FileText, Search, Edit, Trash2, Clock, Save, X, Plus, Eye, User, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useDynamicTime } from '../../hooks/useDynamicTime';
import Pagination from '../../components/Pagination';
import SearchableDriverDropdown from '../../components/SearchableDriverDropdown';
import SearchableRankDropdown from '../../components/SearchableRankDropdown';
import SearchableUnitDropdown from '../../components/SearchableUnitDropdown';
import SearchableVehicleTypeDropdown from '../../components/SearchableVehicleTypeDropdown';
import { API_BASE } from '../../config/api.js';
import { getAccessToken } from '../../utils/auth.js';
const AdminPanel = () => {
  const normalize = (value = '') =>
  value.replace(/\s+/g, '').toUpperCase();
  const {
    entries = [],
    vehicles = [],
    vehicleCount = 0,
    vehiclePage = 1,
    vehiclePageSize = 10,
    vehicleTotalPages = 1,
    fetchVehicles,
    setVehiclePage,
    vehicleStatuses = [],
    updateVehicle,
    deleteVehicle,
    addVehicle,
    addVehicleEntry,
    addDriver,
    users,
    drivers,
    vehicleTypes = [],
    fetchVehicleTypes,
    addVehicleType,
    currentAdmin
  } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVehicleForEdit, setSelectedVehicleForEdit] = useState(null);
  const [editVehicleData, setEditVehicleData] = useState({
    licensePlate: '',
    unit: '',
    tagId: '',
    vehicleType: '',
    color: '',
    make: '',
    model: '',
    year: '',
    driver: '',
    driver_name: '',
    driver_rank: 'Civilian',
    driver_phone_number: '',
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false);
  const [selectedVehicleForView, setSelectedVehicleForView] = useState(null);
  const [newVehicleData, setNewVehicleData] = useState({
    licensePlate: '',
    unit: '',
    tagId: '',
    vehicleType: '',
    color: '',
    make: '',
    model: '',
    year: '',
    driver: '',
    driver_name: '',
    driver_rank: '',
    driver_phone_number: '',
    employee_id: '',
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [importing, setImporting] = useState(false);
  const [showImportResultModal, setShowImportResultModal] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);
  const { formattedDate, formattedDay, formatTime } = useDynamicTime();
  const [ranks, setRanks] = useState([]);

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

  const getRankName = (rankId) => {
    const rank = ranks.find(r => r.id === rankId);
    return rank ? rank.name : 'N/A';
  };


  // Use backend-driven pagination state
  const [currentPage, setCurrentPage] = useState(vehiclePage);
  const itemsPerPage = vehiclePageSize;
  const totalPages = Math.max(1, Math.ceil(vehicleCount / itemsPerPage));

  // Debug: Log vehicles array and pagination info
  // console.log('Total vehicles from context:', vehicles.length);
  // console.log('Current page:', currentPage);
  // console.log('Items per page:', itemsPerPage);

  const handleSortByName = () => {
    if (sortField === 'name') {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField('name');
      setSortDirection('asc');
    }
  };

  const handleOpenEditModal = async (vehicle) => {
    await fetchVehicleTypes();
    setSelectedVehicleForEdit(vehicle);
    // Find the vehicle type object from vehicleTypes if possible, else leave empty
    let vehicleTypeObj = null;
    if (vehicle.vehicle_type) {
      vehicleTypeObj = vehicleTypes.find(vt => vt.id === vehicle.vehicle_type || vt.name === vehicle.vehicle_type);
      if (!vehicleTypeObj && typeof vehicle.vehicle_type === 'string') {
        vehicleTypeObj = { id: vehicle.vehicle_type, name: vehicle.vehicle_type };
      }
    }
    setEditVehicleData({
      licensePlate: vehicle.license_plate || '',
      unit: vehicle.unit ? vehicle.unit.toString() : '',
      tagId: vehicle.current_tag_id || vehicle.tag_id || '',
      vehicleType: vehicleTypeObj || '',
      color: vehicle.color || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year || '',
      driver: vehicle.default_driver || (vehicle.driver && vehicle.driver.id) || '',
      driver_name: (vehicle.driver && vehicle.driver.name) || vehicle.driver_name || '',
      driver_rank: (vehicle.driver && vehicle.driver.rank) || vehicle.driver_rank || 'Civilian',
      driver_phone_number: (vehicle.driver && vehicle.driver.phone_number) || vehicle.driver_phone_number || '',
      employee_id: (vehicle.driver && vehicle.driver.employee_id) || vehicle.employee_id || '',
      comment: vehicle.comment || '',
      flag_status: vehicle.flag_status || false,
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedVehicleForEdit(null);
    setEditVehicleData({
      licensePlate: '',
      unit: '',
      tagId: '',
      vehicleType: '',
      color: '',
      make: '',
      model: '',
      year: '',
      driver: '',
      driver_name: '',
      driver_rank: 'Civilian',
      driver_phone_number: '',
    });
  };

  const handleEditVehicleChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === 'tagId' ? value.toUpperCase() : value;
    setEditVehicleData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    if (!selectedVehicleForEdit) return;

    if (editVehicleData.licensePlate !== selectedVehicleForEdit.license_plate) {
      const existingVehicle = vehicles.find(
        v => v.license_plate.toLowerCase() === editVehicleData.licensePlate.toLowerCase() && v.id !== selectedVehicleForEdit.id
      );
      if (existingVehicle) {
        setValidationMessage(`Vehicle number "${editVehicleData.licensePlate}" already exists in the system. Please use a different license plate number.`);
        setShowValidationModal(true);
        return;
      }
    }

    if (editVehicleData.tagId && editVehicleData.tagId.trim() && editVehicleData.tagId !== (selectedVehicleForEdit.current_tag_id || selectedVehicleForEdit.tag_id)) {
      const existingTagId = vehicles.find(
        v => (v.current_tag_id || v.tag_id) === editVehicleData.tagId && v.id !== selectedVehicleForEdit.id
      );
      if (existingTagId) {
        setValidationMessage(`Tag ID "${editVehicleData.tagId}" already exists in the system. Please use a different tag ID.`);
        setShowValidationModal(true);
        return;
      }
    }

    // Chassis number check removed

    try {
      let driverId = selectedVehicleForEdit.driver;

      if (editVehicleData.driver === 'new' && editVehicleData.driver_name) {
        const driverData = {
          name: editVehicleData.driver_name,
          driver_rank: editVehicleData.driver_rank,
          phone_number: editVehicleData.driver_phone_number || '0000000000',
        };
        const newDriver = await addDriver(driverData);
        driverId = newDriver.id;
      } else if (editVehicleData.driver && editVehicleData.driver !== 'new') {
        driverId = parseInt(editVehicleData.driver);
      }

      // Build the update payload strictly as required by the API
      const updatedVehicleData = {
        license_plate: normalize(editVehicleData.licensePlate),
        default_driver: typeof driverId === 'object' ? driverId.id : driverId || '',
        vehicle_type: editVehicleData.vehicleType?.id || '',
        unit: editVehicleData.unit ? Number(editVehicleData.unit) : null,
        tag_id: editVehicleData.tagId || '',
        status: (selectedVehicleForEdit.status || 'OUT').toUpperCase(),
        year: parseInt(editVehicleData.year) || new Date().getFullYear(),
        make: editVehicleData.make,
        model: editVehicleData.model,
        color: editVehicleData.color,
        flag_status: selectedVehicleForEdit.flag_status || false,
        comment: editVehicleData.comment || selectedVehicleForEdit.comment || '',
      };

      if (typeof updateVehicle === 'function') {
        // Always pass the vehicle id as a property for updateVehicle
        await updateVehicle({ ...updatedVehicleData, id: selectedVehicleForEdit.id });
        setToastMessage('Vehicle updated successfully!');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        handleCloseEditModal();
      } else {
        console.warn('updateVehicle not implemented in AppContext.');
        alert('Update functionality not implemented.');
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      alert(`Failed to update vehicle: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDelete = (vehicleId) => {
    setVehicleToDelete(vehicleId);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (vehicleToDelete == null) return;
    if (typeof deleteVehicle === 'function') {
      deleteVehicle(vehicleToDelete);
      setToastMessage('Vehicle deleted successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } else {
      console.warn('deleteVehicle not implemented in AppContext.');
      alert('Delete requested — but deleteVehicle is not implemented.');
    }
    setIsDeleteConfirmOpen(false);
    setVehicleToDelete(null);
  };

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
  };

  const handleImportButtonClick = () => {
    if (importing) return;
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      setValidationMessage('Please select a valid Excel file (.xlsx or .xls).');
      setShowValidationModal(true);
      event.target.value = '';
      return;
    }

    try {
      setImporting(true);
      const token = getAccessToken();
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/vehicles/import/`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          payload?.detail ||
          payload?.message ||
          'Failed to import vehicle data.';
        throw new Error(message);
      }

      const resultPayload = {
        totalRows: payload?.total_rows ?? 0,
        importedCount: payload?.imported_count ?? payload?.created ?? 0,
        duplicateCount: payload?.duplicate_count ?? 0,
        failedCount: payload?.failed_count ?? 0,
        skippedCount: payload?.skipped ?? 0,
        errors: Array.isArray(payload?.errors) ? payload.errors : [],
      };

      const summary = `Import completed: ${resultPayload.importedCount} imported, ${resultPayload.duplicateCount} duplicate, ${resultPayload.failedCount} failed out of ${resultPayload.totalRows} rows.`;
      setToastMessage(summary);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);

      setImportResult(resultPayload);
      setShowImportResultModal(true);

      fetchVehicles({ page: currentPage, search: searchTerm });
    } catch (error) {
      setValidationMessage(error.message || 'Import failed.');
      setShowValidationModal(true);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setNewVehicleData({
      licensePlate: '',
      unit: '',
      tagId: '',
      vehicleType: '',
      color: '',
      make: '',
      model: '',
      year: '',
      driver: '',
      driver_name: '',
      driver_rank: '',
      driver_phone_number: '',
      employee_id: '',
    });
  };
  

  const handleOpenViewDetailsModal = (vehicle) => {
    setSelectedVehicleForView(vehicle);
    setIsViewDetailsModalOpen(true);
  };

  const handleCloseViewDetailsModal = () => {
    setIsViewDetailsModalOpen(false);
    setSelectedVehicleForView(null);
  };

  const handleNewVehicleChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === 'tagId' ? value.toUpperCase() : value;
    setNewVehicleData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleAddNewVehicle = async (e) => {
    e.preventDefault();
    if (!newVehicleData.licensePlate) {
      alert('License Plate is required.');
      return;
    }

const existingVehicle = vehicles.find(
  v => normalize(v.license_plate) === normalize(newVehicleData.licensePlate)
);
    if (existingVehicle) {
      setValidationMessage(`Vehicle number "${newVehicleData.licensePlate}" already exists in the system. Please use a different license plate number.`);
      setShowValidationModal(true);
      return;
    }

    if (newVehicleData.tagId && newVehicleData.tagId.trim()) {
      const existingTagId = vehicles.find(
        v => (v.current_tag_id || v.tag_id) === newVehicleData.tagId
      );
      if (existingTagId) {
        setValidationMessage(`Tag ID "${newVehicleData.tagId}" already exists in the system. Please use a different tag ID.`);
        setShowValidationModal(true);
        return;
      }
    }

    try {
      if (!currentAdmin) {
        alert('You must be logged in to add vehicles.');
        return;
      }

      let driverId = null;

      if (newVehicleData.driver_name && newVehicleData.driver_name.trim()) {
        // SearchableRankDropdown returns rank ID (number or 'All')
        // Convert to number if it's a valid rank ID, otherwise null
        const rankId = (newVehicleData.driver_rank && newVehicleData.driver_rank !== 'All') 
          ? (typeof newVehicleData.driver_rank === 'number' ? newVehicleData.driver_rank : parseInt(newVehicleData.driver_rank))
          : null;
        
        const driverData = {
          name: newVehicleData.driver_name,
          rank: rankId,
          phone_number: newVehicleData.driver_phone_number || '0000000000',
          employee_id: newVehicleData.employee_id || '',
        };
        console.log('Creating driver with data:', driverData);
        const newDriver = await addDriver(driverData);
        console.log('Driver created:', newDriver);
        driverId = newDriver.id;
      } else if (newVehicleData.driver && newVehicleData.driver !== 'new' && newVehicleData.driver !== '') {
        driverId = parseInt(newVehicleData.driver);
      }

      const yearValue = newVehicleData.year ? parseInt(newVehicleData.year) : new Date().getFullYear();
      
      const vehicleData = {
        license_plate: normalize(newVehicleData.licensePlate),
        unit: newVehicleData.unit ? Number(newVehicleData.unit) : null,
        tag_id: newVehicleData.tagId || "",
        color: newVehicleData.color,
        make: newVehicleData.make,
        model: newVehicleData.model,
        year: isNaN(yearValue) ? new Date().getFullYear() : yearValue,
        default_driver: driverId,
        user: currentAdmin?.id || 1,
        status: 'OUT',
        vehicle_type: newVehicleData.vehicleType?.id || '',
        flag_status: false,
        comment: '',
      };

      console.log('Sending vehicle data:', vehicleData);

      const newVehicle = await addVehicle(vehicleData);
      console.log('Vehicle added successfully:', newVehicle);

      setToastMessage('Vehicle added successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      handleCloseAddModal();
      fetchVehicles({ page: currentPage, search: searchTerm });
    } catch (error) {
      console.error('Error adding vehicle:', error);
      alert(`Failed to add vehicle: ${error.message || 'Unknown error'}`);
    }
  };




  // Backend-driven search and pagination
  // Only fetch vehicles in useEffect to avoid double requests
  useEffect(() => {
    fetchVehicles({ page: currentPage, search: searchTerm });
  }, [currentPage, searchTerm]);

  const handleSearch = (e) => {
    const value = e.target.value;
setSearchTerm(value);
setCurrentPage(1);
setVehiclePage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setVehiclePage(page);
  };


  // Fetch vehicle types only when Add New Vehicle modal is opened, and only once per open
  useEffect(() => {
    if (isAddModalOpen) {
      fetchVehicleTypes();
    }
    // Only runs when modal opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddModalOpen]);

  return (
    <div className="space-y-6">
      {showToast && (
        <div className="fixed top-5 right-5 bg-green-500 text-white py-3 px-4 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in-down z-50">
          <span>{toastMessage}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FileText className="h-6 w-6 text-blue-600 mr-2" />
          <h1 className="font-bold text-slate-900 dark:text-white">Admin Panel</h1>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
          <Clock size={16} className="mr-1" />
          <span>{formattedDate}</span>
          <span className="mx-2">•</span>
          <span>{formattedDay}</span>
          <span className="mx-2">•</span>
          <span>{formatTime('p')}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2 mr-3">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Total Vehicles</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">Registered in the system</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{vehicleCount}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Vehicles</div>
          </div>
        </div>
      </div>

      {/* Add New Vehicle Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add New Vehicle Record</h3>
              <button
                onClick={handleCloseAddModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form id="add-vehicle-form" onSubmit={handleAddNewVehicle} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Driver Info */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-slate-900 dark:text-white">Driver Information</h4>
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">Select Existing Driver</label>
                      <SearchableDriverDropdown
                        value={newVehicleData.driver}
                        onChange={(value) => handleNewVehicleChange({ target: { name: 'driver', value } })}
                        placeholder="Search and select driver..."
                        className="md:flex-1"
                        includeNew={false}
                      />
                    </div>

                    {/* Add New Driver Form - Always visible below */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                      <h5 className="text-sm font-medium text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <User size={16} className="text-green-600 dark:text-green-400" />
                        <span>Or Add New Driver</span>
                      </h5>
                      <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <label className="label md:w-1/3 md:text-right md:pr-4">Driver Name</label>
                          <input
                            type="text"
                            name="driver_name"
                            value={newVehicleData.driver_name}
                            onChange={handleNewVehicleChange}
                            className="input md:flex-1"
                            placeholder="Enter the Driver Name"
                            autoComplete="off"
                          />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <label className="label md:w-1/3 md:text-right md:pr-4">Driver Rank</label>
                          <SearchableRankDropdown
                            value={newVehicleData.driver_rank}
                            onChange={(value) => handleNewVehicleChange({ target: { name: 'driver_rank', value } })}
                            placeholder="Select or search rank..."
                            className="md:flex-1"
                          />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <label className="label md:w-1/3 md:text-right md:pr-4">Phone Number</label>
                          <input
                            type="text"
                            name="driver_phone_number"
                            value={newVehicleData.driver_phone_number}
                            onChange={handleNewVehicleChange}
                            className="input md:flex-1"
                            placeholder="Enter the Phone Number"
                            autoComplete="off"
                            maxLength={10}
                          />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <label className="label md:w-1/3 md:text-right md:pr-4">Employee ID</label>
                          <input
                            type="text"
                            name="employee_id"
                            value={newVehicleData.employee_id}
                            onChange={handleNewVehicleChange}
                            className="input md:flex-1"
                            placeholder="Enter the Employee ID (Optional)"
                            autoComplete="off"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-slate-900 dark:text-white">Vehicle Information</h4>
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">License Plate *</label>
                      <input
                        type="text"
                        name="licensePlate"
                        value={newVehicleData.licensePlate}
                        onChange={handleNewVehicleChange}
                        className="input md:flex-1"
                        placeholder="Enter the License Plate"
                        autoComplete="off"
                        required
                      />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">Unit</label>
                      <div className="md:flex-1">
        <SearchableUnitDropdown
  value={newVehicleData.unit}
  onChange={(value) => setNewVehicleData(prev => ({ ...prev, unit: value }))}
  placeholder="Select unit (Optional)"
/>
                      </div>
                    </div>
                    {/* Chassis Number field removed */}
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">Tag ID</label>
                      <input
                        type="text"
                        name="tagId"
                        value={newVehicleData.tagId}
                        onChange={handleNewVehicleChange}
                        className="input md:flex-1"
                        placeholder="Enter the Tag ID (Optional)"
                        autoComplete="off"
                      />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">Vehicle Type</label>
                      <SearchableVehicleTypeDropdown
                        value={newVehicleData.vehicleType}
                        onChange={vehicleTypeObj => setNewVehicleData(prev => ({ ...prev, vehicleType: vehicleTypeObj }))}
                        vehicleTypes={vehicleTypes}
                        onCreate={addVehicleType}
                        placeholder="Select or create vehicle type (Optional)"
                        className="md:flex-1"
                      />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">Color</label>
                      <input
                        type="text"
                        name="color"
                        value={newVehicleData.color}
                        onChange={handleNewVehicleChange}
                        className="input md:flex-1"
                        placeholder="Enter the Color (Optional)"
                        autoComplete="off"
                      />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">Make</label>
                      <input
                        type="text"
                        name="make"
                        value={newVehicleData.make}
                        onChange={handleNewVehicleChange}
                        className="input md:flex-1"
                        placeholder="Enter the Make (Optional)"
                        autoComplete="off"
                      />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">Model</label>
                      <input
                        type="text"
                        name="model"
                        value={newVehicleData.model}
                        onChange={handleNewVehicleChange}
                        className="input md:flex-1"
                        placeholder="Enter the Model (Optional)"
                        autoComplete="off"
                      />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">Year</label>
                      <input
                        type="number"
                        name="year"
                        value={newVehicleData.year}
                        onChange={handleNewVehicleChange}
                        className="input md:flex-1"
                        placeholder="Enter the Year (Optional)"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* Actions */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
              <button
                onClick={handleCloseAddModal}
                className="btn bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-vehicle-form"
                className="btn btn-primary"
              >
                Save Vehicle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {isEditModalOpen && selectedVehicleForEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Vehicle Record</h3>
              <button
                onClick={handleCloseEditModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form id="edit-vehicle-form" onSubmit={handleUpdateVehicle} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-slate-900 dark:text-white">Vehicle Information</h4>
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">License Plate *</label>
                      <input
                        type="text"
                        name="licensePlate"
                        value={editVehicleData.licensePlate}
                        onChange={handleEditVehicleChange}
                        className="input md:flex-1"
                        placeholder="Enter the License Plate"
                        autoComplete="off"
                        required
                      />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">Unit</label>
           <SearchableUnitDropdown
  value={editVehicleData.unit}
  onChange={(value) => setEditVehicleData(prev => ({ ...prev, unit: value }))}
  placeholder="Select unit (Optional)"
/>
                    </div>
                    {/* Chassis Number field removed */}
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">Tag ID</label>
                      <input
                        type="text"
                        name="tagId"
                        value={editVehicleData.tagId}
                        onChange={handleEditVehicleChange}
                        className="input md:flex-1"
                        placeholder="Enter the Tag ID (Optional)"
                        autoComplete="off"
                      />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">Vehicle Type</label>
                      <SearchableVehicleTypeDropdown
                        value={editVehicleData.vehicleType}
                        onChange={vehicleType => setEditVehicleData(prev => ({ ...prev, vehicleType }))}
                        vehicleTypes={vehicleTypes}
                        onCreate={addVehicleType}
                        placeholder="Select or create vehicle type (Optional)"
                        className="md:flex-1"
                      />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">Color</label>
                      <input
                        type="text"
                        name="color"
                        value={editVehicleData.color}
                        onChange={handleEditVehicleChange}
                        className="input md:flex-1"
                        placeholder="Enter the Color (Optional)"
                        autoComplete="off"
                      />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">Make</label>
                      <input
                        type="text"
                        name="make"
                        value={editVehicleData.make}
                        onChange={handleEditVehicleChange}
                        className="input md:flex-1"
                        placeholder="Enter the Make (Optional)"
                        autoComplete="off"
                      />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">Model</label>
                      <input
                        type="text"
                        name="model"
                        value={editVehicleData.model}
                        onChange={handleEditVehicleChange}
                        className="input md:flex-1"
                        placeholder="Enter the Model (Optional)"
                        autoComplete="off"
                      />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">Year</label>
                      <input
                        type="number"
                        name="year"
                        value={editVehicleData.year}
                        onChange={handleEditVehicleChange}
                        className="input md:flex-1"
                        placeholder="Enter the Year (Optional)"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-slate-900 dark:text-white">Driver Information</h4>
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="label md:w-1/3 md:text-right md:pr-4">Select Existing Driver</label>
                      <SearchableDriverDropdown
                        value={editVehicleData.driver}
                        onChange={(value) => handleEditVehicleChange({ target: { name: 'driver', value } })}
                        placeholder="Search and select driver..."
                        className="md:flex-1"
                        includeNew={false}
                        displayValue={editVehicleData.driver_name}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
              <button
                onClick={handleCloseEditModal}
                className="btn bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-vehicle-form"
                className="btn btn-primary"
              >
                Update Vehicle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {isViewDetailsModalOpen && selectedVehicleForView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Eye className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Vehicle Details</h3>
                </div>
                <button
                  onClick={handleCloseViewDetailsModal}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-slate-900 dark:text-white">Vehicle Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">License Plate:</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedVehicleForView.license_plate}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Unit:</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedVehicleForView.unit_name || 'N/A'}
                      </span>
                    </div>
                  </div>
                  {/* Chassis Number display removed */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Tag ID:</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedVehicleForView.current_tag_id || selectedVehicleForView.tag_id || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Color:</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedVehicleForView.color || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Make:</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedVehicleForView.make || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Model:</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedVehicleForView.model || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Year:</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedVehicleForView.year || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Vehicle Type:</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedVehicleForView.vehicle_type_name || selectedVehicleForView.vehicle_type || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Status:</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedVehicleForView.status?.toUpperCase() === 'IN' ? 'In' : 'Out'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedVehicleForView.driver && (
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-slate-900 dark:text-white">Driver Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Name:</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {selectedVehicleForView.driver.name}
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Employee ID:</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {selectedVehicleForView.driver.employee_id || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Rank:</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getRankName(selectedVehicleForView.driver.rank) === 'General' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : getRankName(selectedVehicleForView.driver.rank) === 'Lieutenant' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                          {getRankName(selectedVehicleForView.driver.rank) || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Phone Number:</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {selectedVehicleForView.driver.phone_number || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={handleCloseViewDetailsModal}
                className="btn btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Delete Confirmation Modal */}
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Confirm Deletion</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">Are you sure you want to delete this record?</p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => { setIsDeleteConfirmOpen(false); setVehicleToDelete(null); }}
                    className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
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

        {showImportResultModal && importResult && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Import Result</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Total Rows:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{importResult.totalRows}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Imported:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{importResult.importedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Duplicates:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{importResult.duplicateCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Failed:</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">{importResult.failedCount}</span>
                </div>
              </div>

              {importResult.errors?.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">First Errors</h4>
                  <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 p-2 text-xs space-y-1 bg-slate-50 dark:bg-slate-900/40">
                    {importResult.errors.slice(0, 10).map((err, idx) => (
                      <div key={`${err.row || idx}-${idx}`} className="text-slate-700 dark:text-slate-300">
                        Row {err.row || '-'}: {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowImportResultModal(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

      <div className="card">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="SEARCH BY LICENCE PLATE, OWNER, UNIT, MOBILE NUMBER, OR TAG ID..."
                className="input pl-10 w-full"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportFileChange}
              />
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                  setVehiclePage(1);
                  fetchVehicles({ page: 1, search: '' });
                }}
                className="btn flex items-center justify-center bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                title="Reload"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <button
                onClick={handleImportButtonClick}
                className="btn flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={importing}
              >
                <FileText size={16} />
                <span>{importing ? 'Importing...' : 'Import'}</span>
              </button>
              <button onClick={handleOpenAddModal} className="btn btn-primary flex items-center justify-center gap-2">
                <Plus size={16} />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Licence Plate
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none"
                  onClick={handleSortByName}
                  title="Click to sort by name"
                >
                  <div className="flex items-center gap-1">
                    Name
                    {sortField === 'name' && (
                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Activities
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {vehicle.license_plate}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                      {(vehicle.driver && vehicle.driver.name) || vehicle.driver_name || 'No Driver'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                      {vehicle.unit_name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {getRankName((vehicle.driver && vehicle.driver.rank) || vehicle.driver_rank)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleOpenViewDetailsModal(vehicle)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 text-sm font-medium"
                      title="View Details"
                    >
                      <Eye size={14} className="inline mr-1" />
                      View Details
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenEditModal(vehicle)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(vehicle.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {vehicleCount > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={page => {
              setCurrentPage(page);
              setVehiclePage(page);
            }}
            totalItems={vehicleCount}
            itemsPerPage={itemsPerPage}
          />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
