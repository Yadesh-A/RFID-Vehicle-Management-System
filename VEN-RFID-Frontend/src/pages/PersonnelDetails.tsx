import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useDynamicTime } from '../hooks/useDynamicTime';
import {
  Search, Plus, Edit, Eye, Phone, User, Shield, Car, X, Save, Trash2, Clock
} from 'lucide-react';
import { Driver } from '../types/types';
import Pagination from '../components/Pagination';
import { DRIVER_PAGE_SIZE } from '../config/pagination';
import SearchableRankDropdown from '../components/SearchableRankDropdown';
import RefreshButton from '../components/RefreshButton';

const PersonnelDetails = () => {
  const navigate = useNavigate();
  const {
    drivers = [],
    driverCount = 0,
    driverPage = 1,
    driverTotalPages = 1,
    fetchDrivers,
    setDriverPage,
    vehicles,
    addDriver,
    updateDriver,
    deleteDriver,
    currentAdmin,
    refreshAllData
  } = useApp();
  const { formattedDate, formattedDay, formatTime } = useDynamicTime();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRank, setFilterRank] = useState<string>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    driver_id: '',
    name: '',
    driver_rank: '',
    vehicle_type: 'Car',
    phone_number: '',
    employee_id: '',
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Use backend-driven pagination state
  const currentPage = driverPage;
  const itemsPerPage = DRIVER_PAGE_SIZE;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAllData();
    setIsRefreshing(false);
  };

  // Check user permissions
  const userLevel = currentAdmin?.level || sessionStorage.getItem('userLevel');
  const canAdd = userLevel === 'Super Admin' || userLevel === 'Admin';
  const canEdit = userLevel === 'Super Admin' || userLevel === 'Admin';
  const canDelete = userLevel === 'Super Admin';

// Get vehicle number directly from driver object (now included in API response)
const getVehicleNumber = (driver: Driver) => {
  // The backend now includes vehicle_number in the driver API response
  return driver.vehicle_number || 'N/A';
};

  // Backend-driven: drivers is already the current page's data
  const paginatedDrivers = drivers;
  const totalPages = Math.max(1, Math.ceil(driverCount / itemsPerPage));

  // Fetch drivers when page/search/filter changes
  useEffect(() => {
    fetchDrivers({
      page: currentPage,
      pageSize: itemsPerPage,
      search: searchTerm,
      rank: filterRank,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, searchTerm, filterRank]);

  // Reset to first page on search/filter
  useEffect(() => {
    setDriverPage(1);
  }, [searchTerm, filterRank, setDriverPage]);

  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.driver_id?.trim()) {
      errors.driver_id = 'Driver ID is required';
    }
    
    if (!formData.phone_number?.trim()) {
      errors.phone_number = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone_number)) {
      errors.phone_number = 'Phone number must be 10 digits';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

// Handle Add
  const handleOpenAddModal = () => {
    setFormData({
      // FIX 1: Generate a temporary ID so validation passes
      driver_id: `DRV${Date.now()}`, 
      name: '',
      driver_rank: '',
      vehicle_type: 'Car',
      phone_number: '',
      employee_id: '',
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      // FIX 2: Create a payload that maps 'driver_rank' to 'rank'
      const payload = {
        ...formData,
        rank: formData.driver_rank, // Backend expects 'rank'
      };

      await addDriver(payload);
      setIsAddModalOpen(false);
      setToastMessage('Personnel added successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('Error adding personnel:', error);
      setToastMessage('Error adding personnel');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };
// Handle Edit
  const handleOpenEditModal = (driver: Driver) => {
    setSelectedDriver(driver);
    setFormData({
      // FIX 1: Use 'driver.id' (backend field) instead of 'driver.driver_id'
      // FIX 2: Add String(...) to convert the number to text so .trim() doesn't crash
      driver_id: String(driver.id || ''), 
      
      name: driver.name || '',
      driver_rank: driver.rank || '',
      vehicle_type: driver.vehicle_type || 'Car',
      phone_number: driver.phone_number || '',
      employee_id: driver.employee_id || '',
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedDriver) return;
    
    try {
      await updateDriver({
        ...selectedDriver,
        ...formData,
        rank: formData.driver_rank,
      });
      setIsEditModalOpen(false);
      setToastMessage('Personnel updated successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('Error updating personnel:', error);
      setToastMessage('Error updating personnel');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  // Handle Delete
  const handleOpenDeleteModal = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDriver) return;
    
    try {
      await deleteDriver(selectedDriver.id);
      setIsDeleteModalOpen(false);
      setToastMessage('Personnel deleted successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('Error deleting personnel:', error);
      setToastMessage('Error deleting personnel');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  // Handle View Details
  const handleViewDetails = (driverId: number) => {
    navigate(`/personnel/${driverId}`);
  };

  // Rank badge component
  const RankBadge = ({ rank }: { rank: string }) => {
    const colors = {
      General: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      Lieutenant: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      Civilian: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[rank as keyof typeof colors]}`}>
        <Shield size={12} />
        {rank}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-5 right-5 bg-green-500 text-white py-3 px-4 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in-down z-50">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <User className="h-6 w-6 text-blue-600 mr-2" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Personnel Details</h1>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Total Personnel: <span className="font-semibold">{driverCount}</span>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Clock size={14} />
            <span>{formattedDay}</span>
            <span className="mx-2">•</span>
            <span>{formattedDate}</span>
            <span className="mx-2">•</span>
            <span>{formatTime('p')}</span>
          </div>
          <RefreshButton onRefresh={handleRefresh} loading={isRefreshing} />
        </div>
      </div>

      {/* Main Card */}
      <div className="card">
        {/* Search Bar and Controls */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="SEARCH BY NAME, PHONE, DRIVER ID, or EMPLOYEE ID.."
                  className="input pl-10 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Filter by Rank */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield size={16} className="text-slate-400" />
                </div>
                <SearchableRankDropdown
                  value={filterRank}
                  onChange={(value) => setFilterRank(value)}
                  placeholder="All Ranks"
                  includeAll={true}
                  className="pl-10 pr-8"
                />
              </div>
            </div>

            {/* Add Button */}
            {canAdd && (
              <button
                onClick={handleOpenAddModal}
                className="btn btn-primary flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                <span>Add Personnel</span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Driver Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Vehicle Number
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {paginatedDrivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                      <User size={48} className="mb-4 opacity-50" />
                      <p className="text-lg font-medium">No personnel found</p>
                      <p className="text-sm mt-2">
                        {searchTerm ? 'Try adjusting your search criteria' : 'Personnel records will appear here once added'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedDrivers.map((driver) => (
                  <tr
                    key={driver.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <User size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {driver.name}
                          </div>
                          {/* <div className="text-xs text-slate-500 dark:text-slate-400">
                            ID: {driver.id}
                          </div> */}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900 dark:text-white">
                        {driver.employee_id || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RankBadge rank={driver.driver_rank} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                        <Car size={16} className="text-slate-400" />
                        <span className="font-mono">
                          {getVehicleNumber(driver)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                        <Phone size={16} className="text-slate-400" />
                        <span>{driver.phone_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(driver.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-md text-sm font-medium transition-colors"
                        >
                          <Eye size={14} />
                          View
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleOpenEditModal(driver)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleOpenDeleteModal(driver)}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
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

        {/* Mobile Cards */}
        <div className="lg:hidden divide-y divide-slate-200 dark:divide-slate-700">
          {paginatedDrivers.length === 0 ? (
            <div className="p-8 text-center">
              <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                <User size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-medium">No personnel found</p>
                <p className="text-sm mt-2">
                  {searchTerm ? 'Try adjusting your search criteria' : 'Personnel records will appear here once added'}
                </p>
              </div>
            </div>
          ) : (
            paginatedDrivers.map((driver) => (
              <div
                key={driver.id}
                className="p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <User size={24} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {driver.name}
                      </div>
                      {/* <div className="text-xs text-slate-500 dark:text-slate-400">
                        {driver.driver_id}
                      </div> */}
                    </div>
                  </div>
                  <RankBadge rank={driver.driver_rank} />
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-2">
                      <Car size={14} />
                      Vehicle
                    </span>
                    <span className="font-medium font-mono">{getVehicleNumber(driver)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-2">
                      <Phone size={14} />
                      Phone
                    </span>
                    <span className="font-medium">{driver.phone_number}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleViewDetails(driver.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-md text-sm font-medium transition-colors"
                  >
                    <Eye size={14} />
                    View
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => handleOpenEditModal(driver)}
                      className="px-3 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleOpenDeleteModal(driver)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {paginatedDrivers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setDriverPage}
            totalItems={driverCount}
            itemsPerPage={itemsPerPage}
          />
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Add New Personnel
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 px-3 py-2"
                    placeholder="Enter The Personnel Name"
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Rank *
                  </label>
                  <SearchableRankDropdown
                    value={formData.driver_rank}
                    onChange={(value) => setFormData({ ...formData, driver_rank: value })}
                    placeholder="SELECT OR SEARCH FOR RANK..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 px-3 py-2"
                  >
                    <option value="Car">Car</option>
                    <option value="Bike">Bike</option>
                    <option value="Truck">Truck</option>
                    <option value="Bus">Bus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 px-3 py-2"
                    placeholder="Enter The Phone Number"
                    maxLength={10}
                  />
                  {formErrors.phone_number && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.phone_number}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 px-3 py-2"
                    placeholder="ID or AADHAR"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors inline-flex items-center gap-2"
                >
                  <Save size={16} />
                  Add Personnel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Edit Personnel
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ">
                    Driver ID
                  </label>
                  <input
                    type="text"
                    value={formData.driver_id}
                    onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                    className="w-full rounded-md border border-slate-300 
             bg-slate-100 !bg-slate-100 
             text-slate-600 
             cursor-not-allowed 
             px-3 py-2 
             opacity-100"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 px-3 py-2"
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Rank *
                  </label>
                  <SearchableRankDropdown
                    value={formData.driver_rank}
                    onChange={(value) => setFormData({ ...formData, driver_rank: value })}
                    placeholder="SELECT or SEARCH FOR RANKS..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 px-3 py-2"
                  >
                    <option value="Car">Car</option>
                    <option value="Bike">Bike</option>
                    <option value="Truck">Truck</option>
                    <option value="Bus">Bus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 px-3 py-2"
                    maxLength={10}
                  />
                  {formErrors.phone_number && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.phone_number}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 px-3 py-2"
                    placeholder="ID or AADHAR"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors inline-flex items-center gap-2"
                >
                  <Save size={16} />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Delete Personnel
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Are you sure you want to delete <strong>{selectedDriver.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonnelDetails;
