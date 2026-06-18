import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Flag, Search, Plus, X, Edit2, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { useDynamicTime } from '../hooks/useDynamicTime';
import Pagination from '../components/Pagination';
import SearchableVehicleDropdown from '../components/SearchableVehicleDropdown';
import { API_BASE } from '../config/api.js';
import { getAccessToken } from '../utils/auth.js';

const VehicleFlags: React.FC = () => {
  const {
    vehicles,
    drivers,
    flaggedVehicles,
    fetchVehicles,
    fetchFlaggedVehicles,
    toggleVehicleFlag,
    flaggedVehicleCount,
    flaggedVehiclePage,
    flaggedVehiclePageSize,
    flaggedVehicleTotalPages,
    setFlaggedVehiclePage
  } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [selectedVehicleForView, setSelectedVehicleForView] = useState<any>(null);
  const [flagCategory, setFlagCategory] = useState('');
  const [flagComment, setFlagComment] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isUnflagConfirmOpen, setIsUnflagConfirmOpen] = useState(false);
  const [vehicleToUnflag, setVehicleToUnflag] = useState<number | null>(null);
  const { formattedDate, formattedDay, formatTime } = useDynamicTime();
  const [ranks, setRanks] = useState([]);

  // Server-side search: flaggedVehicles is already filtered
  const safeFlaggedVehicles = Array.isArray(flaggedVehicles) ? flaggedVehicles : [];
  const safeDrivers = Array.isArray(drivers) ? drivers : [];

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

  // Pagination state from context
  const currentPage = flaggedVehiclePage;
  const itemsPerPage = flaggedVehiclePageSize;
  const totalPages = flaggedVehicleTotalPages;

  // Fetch vehicles on mount for the add modal dropdown
  useEffect(() => {
    fetchVehicles();
  }, []);

  // Fetch flagged vehicles on mount and when page/search changes
  useEffect(() => {
    fetchFlaggedVehicles(currentPage, itemsPerPage, searchTerm);
  }, [currentPage, itemsPerPage, searchTerm]);

  // Get unflagged vehicles for the add modal
  const unflaggedVehicles = vehicles.filter((v: any) => !v.flag_status);

  const handleAddFlag = async () => {
    if (!selectedVehicleId || !flagCategory || !flagComment.trim()) {
      alert('Please select a vehicle, choose a category, and provide a comment.');
      return;
    }

    try {
      await toggleVehicleFlag(selectedVehicleId, true, flagComment, flagCategory);
      setIsAddModalOpen(false);
      setSelectedVehicleId(null);
      setFlagCategory('');
      setFlagComment('');
      setToastMessage('Vehicle flagged successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('Error flagging vehicle:', error);
      alert('Failed to flag vehicle. Please try again.');
    }
  };

  const handleRemoveFlag = (vehicleId: number) => {
    setVehicleToUnflag(vehicleId);
    setIsUnflagConfirmOpen(true);
  };

  const handleConfirmRemoveFlag = async () => {
    if (vehicleToUnflag == null) return;
    try {
      await toggleVehicleFlag(vehicleToUnflag, false, '', '');
      setToastMessage('Flag removed successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('Error removing flag:', error);
      alert('Failed to remove flag. Please try again.');
    } finally {
      setIsUnflagConfirmOpen(false);
      setVehicleToUnflag(null);
    }
  };

  const handleEditComment = async () => {
    if (!selectedVehicleId || !flagCategory || !flagComment.trim()) {
      alert('Please choose a category and provide a comment.');
      return;
    }

    try {
      await toggleVehicleFlag(selectedVehicleId, true, flagComment, flagCategory);
      setIsEditModalOpen(false);
      setSelectedVehicleId(null);
      setFlagCategory('');
      setFlagComment('');
      setToastMessage('Flag details updated successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('Error updating flag details:', error);
      alert('Failed to update flag details. Please try again.');
    }
  };

  const openEditModal = (vehicle: any) => {
    setSelectedVehicleId(vehicle.id);
    setFlagCategory(vehicle.flag_category || '');
    setFlagComment(vehicle.comment || '');
    setIsEditModalOpen(true);
  };

  const openViewModal = (vehicle: any) => {
    setSelectedVehicleForView(vehicle);
    setIsViewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {showToast && (
        <div className="fixed top-5 right-5 bg-green-500 text-white py-3 px-4 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in-down z-50">
          <span>{toastMessage}</span>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Flag className="h-6 w-6 text-red-600 mr-2" />
          <h1 className="font-bold text-slate-900 dark:text-white">Vehicle Flags</h1>
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

      {/* Alert Banner */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
              Flagged Vehicles Alert
            </h3>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              {flaggedVehicles.length} vehicle(s) currently flagged. These vehicles require special attention or have restrictions.
            </p>
          </div>
        </div>
      </div>

      {/* Add Flag Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-red-50 to-orange-50 dark:from-slate-800 dark:to-slate-800 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Flag className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Flag Vehicle</h3>
                </div>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setSelectedVehicleId(null);
                    setFlagCategory('');
                    setFlagComment('');
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 space-y-5">
              {/* Vehicle Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Select Vehicle <span className="text-red-500">*</span>
                </label>
                <SearchableVehicleDropdown
                  value={selectedVehicleId}
                  onChange={setSelectedVehicleId}
                  fetchFromAPI={true}
                  placeholder="Search by vehicle number or driver name..."
                  className="w-full"
                />
              </div>

              {/* Category Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={flagCategory}
                  onChange={(e) => setFlagCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                >
                  <option value="">Select a category...</option>
                  {flagCategories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Comment Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Comment <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={flagComment}
                  onChange={(e) => setFlagComment(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
                  placeholder="Enter detailed comment or additional information about why this vehicle is being flagged..."
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Provide specific details about the flagging reason
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setSelectedVehicleId(null);
                  setFlagCategory('');
                  setFlagComment('');
                }}
                className="px-5 py-2.5 rounded-lg font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFlag}
                className="px-5 py-2.5 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all flex items-center space-x-2"
              >
                <Flag size={16} />
                <span>Flag Vehicle</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Flag Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Edit2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Flag Details</h3>
                </div>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedVehicleId(null);
                    setFlagCategory('');
                    setFlagComment('');
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 space-y-5">
              {/* Category Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={flagCategory}
                  onChange={(e) => setFlagCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Select a category...</option>
                  {flagCategories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Comment Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Comment <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={flagComment}
                  onChange={(e) => setFlagComment(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  placeholder="Enter detailed comment or additional information..."
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Update the details about why this vehicle is flagged
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedVehicleId(null);
                  setFlagCategory('');
                  setFlagComment('');
                }}
                className="px-5 py-2.5 rounded-lg font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditComment}
                className="px-5 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all flex items-center space-x-2"
              >
                <Edit2 size={16} />
                <span>Update Details</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unflag Confirmation Modal */}
      {isUnflagConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Confirm Remove Flag</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">Are you sure you want to remove the flag from this vehicle?</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => { setIsUnflagConfirmOpen(false); setVehicleToUnflag(null); }}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRemoveFlag}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                >
                  Remove Flag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {isViewModalOpen && selectedVehicleForView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Flag Details</h3>
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setSelectedVehicleForView(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Vehicle</label>
                <div className="text-sm text-slate-900 dark:text-white font-medium">
                  {selectedVehicleForView.vehicle_number}
                </div>
              </div>
              <div>
                <label className="label">Flagged By</label>
                <div className="text-sm text-slate-900 dark:text-white">
                  {selectedVehicleForView.flagged_by_name || 'Unknown'}
                </div>
              </div>
              {selectedVehicleForView.flag_category && (
                <div>
                  <label className="label">Reason</label>
                  <div className="text-sm text-slate-900 dark:text-white bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800 font-medium">
                    {selectedVehicleForView.flag_category}
                  </div>
                </div>
              )}
              <div>
                <label className="label">Comment</label>
                <div className="text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700 p-3 rounded border">
                  {selectedVehicleForView.comment || 'No comment provided'}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedVehicleForView(null);
                }}
                className="btn bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="card">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search by license plate, driver name, unit, rank, category, or comment..."
                className="input pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn bg-red-600 text-white hover:bg-red-700 flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              <span>Flag Vehicle</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  License Plate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Driver Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {safeFlaggedVehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    {searchTerm ? 'No flagged vehicles match your search.' : 'No vehicles are currently flagged.'}
                  </td>
                </tr>
              ) : (
                safeFlaggedVehicles.map((vehicle: any) => {
                  const driver = drivers.find((d: any) => d.id === vehicle.driver);
                  
                  return (
                    <tr key={vehicle.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Flag className="h-4 w-4 text-red-600 mr-2" />
                          <span className="font-medium text-slate-900 dark:text-white">
                            {vehicle.license_plate || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 dark:text-white">
                          {vehicle.driver?.name || 'No Driver'}

                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {vehicle.unit_name || 'N/A'}

                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getRankName(vehicle.driver?.rank) === 'General'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                            : getRankName(vehicle.driver?.rank) === 'Lieutenant'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {getRankName(vehicle.driver?.rank)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {vehicle.driver?.phone_number || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openViewModal(vehicle)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline text-sm"
                        >
                          View Details
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openEditModal(vehicle)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                            title="Edit Flag Details"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleRemoveFlag(vehicle.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            title="Remove Flag"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setFlaggedVehiclePage}
          totalItems={flaggedVehicleCount}
          itemsPerPage={itemsPerPage}
        />
      </div>
    </div>
  );
};

export default VehicleFlags;
