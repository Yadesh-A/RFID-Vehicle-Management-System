// src/pages/Employees.jsx
/**
 * README: Employees Page Component
 * 
 * This component provides a read-only view of employee records for users with the "Employee" role.
 * It allows filtering, searching, and adding a vehicle to an existing employee record.
 * 
 * Also includes an Admin-like global "Add" button + modal (copied from AdminPanel) — uses separate state
 * so it doesn't interfere with per-employee add modal.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useDynamicTime } from '../hooks/useDynamicTime';
import { format } from 'date-fns';
import {
  Search, Filter, X, ShieldCheck, AlertTriangle, Car, Bike, Truck, Plus, User, Calendar,
  StickyNote, CheckCircle, ShieldAlert, FileText, Edit, Trash2, Clock, Save
} from 'lucide-react';
import Pagination from '../components/Pagination';

// --- Helper Components & Functions ---

const RFIDBadge = ({ status }) => {
  const baseClasses = "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium";
  switch (status) {
    case 'army':
      return <span className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300`}><ShieldCheck size={14} /> ARMY / RFID</span>;
    case 'visitor':
      return <span className={`${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300`}><User size={14} /> VISITOR</span>;
    case 'red_flag':
      return <span className={`${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300`}><AlertTriangle size={14} /> RED FLAG</span>;
    default:
      return null;
  }
};

const VehicleIcon = ({ type }) => {
  const props = { size: 18, className: "text-slate-500" };
  switch (type) {
    case 'Car': return <Car {...props} />;
    case 'Bike': return <Bike {...props} />;
    case 'Truck': return <Truck {...props} />;
    default: return null;
  }
};

const StatusBadge = ({ status, rfidStatus }) => {
  const baseClasses = "inline-flex items-center gap-2 text-sm";
  if (rfidStatus === 'red_flag') {
    return (
      <span className={`${baseClasses} text-red-600 dark:text-red-400 font-semibold`}>
        <ShieldAlert size={14} />
        Not Allowed
      </span>
    );
  }
  if (status === 'Inside') {
    return (
      <span className={`${baseClasses} text-green-600 dark:text-green-400`}>
        <span className="h-2 w-2 rounded-full bg-green-500"></span>
        Inside
      </span>
    );
  }
  if (status === 'Outside') {
    return (
      <span className={`${baseClasses} text-amber-600 dark:text-amber-400`}>
        <span className="h-2 w-2 rounded-full bg-amber-500"></span>
        Outside
      </span>
    );
  }
  return <span className={`${baseClasses} text-slate-400`}>Unknown</span>;
};

const AvatarIcon = ({ employee }) => {
  const baseClasses = "h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center";
  if (!employee) return <div className={baseClasses} />;
  if (employee.vehicle_type) {
    return (
      <div className={baseClasses}>
        <VehicleIcon type={employee.vehicle_type} />
      </div>
    );
  }
  return <div className={`${baseClasses} font-bold text-slate-500`}>{employee.name.charAt(0)}</div>;
};

const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in-down z-50">
      <CheckCircle size={20} />
      <span>{message}</span>
    </div>
  );
};

const WarningDialog = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
    <div className="bg-white dark:bg-slate-800 w-full max-w-md m-4 p-6 rounded-lg shadow-xl text-center">
      <ShieldAlert size={48} className="mx-auto text-red-500 mb-4" />
      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Warning: Red Flag Employee</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300 my-2">
        This employee is marked as "Red Flag". Adding a vehicle may violate security protocols.
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
        Are you sure you want to proceed?
      </p>
      <div className="flex justify-center gap-4">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={onConfirm} className="btn bg-red-600 hover:bg-red-700 text-white">Proceed Anyway</button>
      </div>
    </div>
  </div>
);

// --- Main Component ---

const Employees = () => {
  const { employees, addEmployee, addVehicleToEmployee: addVehicle, updateEmployee, deleteEmployee } = useApp();
  const { formattedDate, formattedDay, formatTime } = useDynamicTime();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ vehicle_type: 'All' });
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [isAddModalOpen, setAddModalOpen] = useState(false); // per-employee add (existing)
  const [isDetailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [isWarningModalOpen, setWarningModalOpen] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [newVehicleData, setNewVehicleData] = useState({ employeeId: '', vehicle_number: '', vehicle_type: 'Car', notes: '' });
  const [formErrors, setFormErrors] = useState({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // ----- ADMIN-SIZED GLOBAL ADD (copied from AdminPanel) -----
  const [adminIsAddModalOpen, setAdminIsAddModalOpen] = useState(false);
  const [adminNewVehicleData, setAdminNewVehicleData] = useState({
    licensePlate: '',
    owner: '',
    rfid_status: 'visitor',
    latestEntry: '',
    latestExit: '',
    status: 'Outside',
  });

  // ----- ADD EMPLOYEE MODAL -----
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [newEmployeeData, setNewEmployeeData] = useState({
    name: '',
    role: '',
    rfid: false,
    rfid_status: 'visitor',
    vehicle_number: '',
    vehicle_type: '',
    notes: '',
  });

  // ----- EDIT EMPLOYEE -----
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editEmployeeData, setEditEmployeeData] = useState({});

  // ----- DELETE EMPLOYEE -----
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  const handleAdminOpenAddModal = () => setAdminIsAddModalOpen(true);
  const handleAdminCloseAddModal = () => {
    setAdminIsAddModalOpen(false);
    setAdminNewVehicleData({
      licensePlate: '',
      owner: '',
      rfid_status: 'visitor',
      latestEntry: '',
      latestExit: '',
      status: 'Outside',
    });
  };
  const handleAdminNewVehicleChange = (e) => {
    const { name, value } = e.target;
    setAdminNewVehicleData(prev => ({ ...prev, [name]: value }));
  };
  const handleAdminAddNewVehicle = (e) => {
    e.preventDefault();
    if (!adminNewVehicleData.licensePlate || !adminNewVehicleData.owner) {
      alert('License Plate and Owner are required.');
      return;
    }
    // Use context to add employee with vehicle
    addEmployee({
      name: adminNewVehicleData.owner,
      role: 'Employee',
      rfid_status: adminNewVehicleData.rfid_status,
      vehicle_number: adminNewVehicleData.licensePlate,
      vehicle_type: 'Car', // Default vehicle type
      last_entry: adminNewVehicleData.latestEntry || new Date().toISOString(),
      status: adminNewVehicleData.status,
      notes: ''
    });
    handleAdminCloseAddModal();
    setShowToast(true);
  };
  // ----- END ADMIN-SIZED GLOBAL ADD -----

  // Employees are now fetched from AppContext

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const filteredAndSortedEmployees = useMemo(() => {
    return employees
      .filter(emp => {
        const searchMatch = searchTerm === '' ||
          emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.vehicle_number?.toLowerCase().includes(searchTerm.toLowerCase());

        const vehicleMatch = filters.vehicle_type === 'All' || emp.vehicle_type === filters.vehicle_type;

        return searchMatch && vehicleMatch;
      })
      .sort((a, b) => {
        const timeA = a.last_entry ? new Date(a.last_entry).getTime() : 0;
        const timeB = b.last_entry ? new Date(b.last_entry).getTime() : 0;
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [employees, searchTerm, filters, sortOrder]);

  // Paginated employees
  const totalPages = Math.ceil(filteredAndSortedEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredAndSortedEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when search or filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  const openAddVehicleModal = (employee) => {
    if (employee.rfid_status === 'red_flag') {
      setSelectedEmployee(employee);
      setWarningModalOpen(true);
    } else {
      setSelectedEmployee(employee);
      setNewVehicleData({ employeeId: employee.id, vehicle_number: '', vehicle_type: 'Car', notes: '' });
      setFormErrors({});
      setAddModalOpen(true);
    }
  };

  const handleProceedWithRedFlag = () => {
    setWarningModalOpen(false);
    if (selectedEmployee) {
      setNewVehicleData({ employeeId: selectedEmployee.id, vehicle_number: '', vehicle_type: 'Car', notes: '' });
      setFormErrors({});
      setAddModalOpen(true);
    }
  };

  const validateVehicleNumber = (number) => {
    const pattern = /^[A-Z]{2}-?\d{2}-?[A-Z]{1,2}-?\d{4}$/i;
    return pattern.test(number);
  };

  const handleAddVehicleSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    if (!newVehicleData.vehicle_number.trim()) {
      errors.vehicle_number = 'Vehicle number is required.';
    } else if (!validateVehicleNumber(newVehicleData.vehicle_number)) {
      errors.vehicle_number = 'Invalid vehicle number format. (e.g., TN-01-AB-1234)';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Use context to add vehicle to employee
    addVehicle(newVehicleData.employeeId, newVehicleData);

    setAddModalOpen(false);
    setToastMessage('Vehicle added successfully!');
    setShowToast(true);
  };

  const openDetailDrawer = (employee) => {
    setSelectedEmployee(employee);
    setDetailDrawerOpen(true);
  };

  // ----- EDIT EMPLOYEE HANDLERS -----
  const handleOpenEditModal = (employee) => {
    setSelectedEmployee(employee);
    setEditEmployeeData({ ...employee });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateEmployee(editEmployeeData.id, editEmployeeData);
    setIsEditModalOpen(false);
    setToastMessage('Employee updated successfully!');
    setShowToast(true);
  };

  // ----- DELETE EMPLOYEE HANDLERS -----
  const handleOpenDeleteConfirm = (employee) => {
    setEmployeeToDelete(employee);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (employeeToDelete) {
      deleteEmployee(employeeToDelete.id);
      setToastMessage('Employee deleted successfully!');
      setShowToast(true);
    }
    setIsDeleteConfirmOpen(false);
    setEmployeeToDelete(null);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      {showToast && <Toast message={toastMessage} onClose={() => setShowToast(false)} />}
      {isWarningModalOpen && <WarningDialog onConfirm={handleProceedWithRedFlag} onCancel={() => setWarningModalOpen(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Vehicle Records</h1>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Clock size={14} />
          <span>{formattedDay}</span>
          <span className="mx-2">•</span>
          <span>{formattedDate}</span>
          <span className="mx-2">•</span>
          <span>{formatTime('p')}</span>
        </div>
      </div>

      {/* Controls: search/filter + Admin Add button */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 flex items-center gap-4">
            <div className="relative flex-grow">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or vehicle..."
                className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 pl-10 py-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Car size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select name="vehicle_type" value={filters.vehicle_type} onChange={handleFilterChange} className="rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 pl-10 py-2">
                  <option>All</option>
                  <option>Car</option>
                  <option>Bike</option>
                  <option>Truck</option>
                </select>
              </div>
            </div>
          </div>

          {/* ADMIN-LIKE GLOBAL ADD BUTTON (copied from AdminPanel) */}
          <div className="mt-2 md:mt-0">
            <button onClick={handleAdminOpenAddModal} className="btn btn-primary inline-flex items-center gap-2">
              <Plus size={16} /> Add
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Vehicle Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Latest Entry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Latest Exit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {paginatedEmployees.map(emp => {
                const isInside = emp.last_entry && (!emp.last_exit || new Date(emp.last_entry) > new Date(emp.last_exit));

                return (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {emp.vehicle_number || emp.name}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {emp.vehicle_number ? emp.name : 'No vehicle assigned'}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                          {emp.vehicle_type || 'Unknown'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {emp.last_entry ? (
                        <div>
                          <div className="text-sm text-green-600 dark:text-green-400">
                            {format(new Date(emp.last_entry), 'PPpp')}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            via Main Entrance
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 dark:text-slate-500">No entry record</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {emp.last_exit ? (
                        <div>
                          <div className="text-sm text-amber-600 dark:text-amber-400">
                            {format(new Date(emp.last_exit), 'PPpp')}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            via Main Exit
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 dark:text-slate-500">No exit record</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isInside
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {isInside ? 'Inside' : 'Outside'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="grid gap-4 lg:hidden">
        {paginatedEmployees.map(emp => (
          <div key={emp.id} className={`bg-white dark:bg-slate-800 rounded-lg shadow p-4 space-y-3 ${emp.rfid_status === 'red_flag' ? 'bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800' : ''}`}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3" onClick={() => openDetailDrawer(emp)}>
                <AvatarIcon employee={emp} />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-white">{emp.name}</div>
                  <div className="text-xs text-slate-500 font-mono">
                    {emp.vehicle_number || <span className="text-slate-400">-</span>}
                  </div>
                </div>
              </div>
              <RFIDBadge status={emp.rfid_status} />
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <StatusBadge status={emp.status} rfidStatus={emp.rfid_status} />
              </div>
              {emp.rfid_status !== 'red_flag' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Entry:</span>
                    <span className="font-medium">{emp.last_entry ? new Date(emp.last_entry).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Exit:</span>
                    <span className="font-medium">{emp.last_exit ? new Date(emp.last_exit).toLocaleDateString() : '-'}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ---------- ADMIN GLOBAL ADD MODAL (copied) ---------- */}
      {adminIsAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add New Vehicle Record</h3>
            
            {/* Vehicle Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">License Plate</label>
                <input type="text" name="licensePlate" value={adminNewVehicleData.licensePlate} onChange={handleAdminNewVehicleChange} className="input" placeholder="ABC-123" />
              </div>
              <div>
                <label className="label">Owner</label>
                <input type="text" name="owner" value={adminNewVehicleData.owner} onChange={handleAdminNewVehicleChange} className="input" placeholder="John Doe" />
              </div>
              <div>
                <label className="label">RFID Status</label>
                <select name="rfid_status" value={adminNewVehicleData.rfid_status} onChange={handleAdminNewVehicleChange} className="input">
                  <option value="visitor">Visitor</option>
                  <option value="army">Army</option>
                  <option value="red_flag">Red Flag</option>
                </select>
              </div>
            </div>

            {/* Entry/Exit Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Latest Entry Time</label>
                <input 
                  type="datetime-local" 
                  name="latestEntry" 
                  value={adminNewVehicleData.latestEntry} 
                  onChange={handleAdminNewVehicleChange}
                  className="input w-full max-w-xs" 
                />
              </div>
              <div>
                <label className="label">Latest Exit Time</label>
                <input 
                  type="datetime-local" 
                  name="latestExit" 
                  value={adminNewVehicleData.latestExit} 
                  onChange={handleAdminNewVehicleChange}
                  className="input w-full max-w-xs" 
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="label">Current Status</label>
              <select name="status" value={adminNewVehicleData.status} onChange={handleAdminNewVehicleChange} className="input">
                <option value="Outside">Outside</option>
                <option value="Inside">Inside</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Note: Status will be automatically determined by entry/exit times if both are provided. This is a fallback.</p>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button 
                onClick={handleAdminCloseAddModal} 
                className="btn bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button 
                onClick={handleAdminAddNewVehicle} 
                className="btn btn-primary"
              >
                Save Vehicle
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ---------- END ADMIN GLOBAL ADD MODAL ---------- */}

      {/* ---------- PER-EMPLOYEE ADD MODAL (existing) ---------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold">Add Vehicle for {selectedEmployee?.name}</h3>
              <button onClick={() => setAddModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddVehicleSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="vehicle_number">Vehicle Number</label>
                  <input type="text" id="vehicle_number" name="vehicle_number" className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50" value={newVehicleData.vehicle_number} onChange={(e) => setNewVehicleData(p => ({...p, vehicle_number: e.target.value.toUpperCase()}))} required />
                  {formErrors.vehicle_number && <p className="text-xs text-red-500 mt-1">{formErrors.vehicle_number}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="vehicle_type">Vehicle Type</label>
                  <select id="vehicle_type" name="vehicle_type" className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50" value={newVehicleData.vehicle_type} onChange={(e) => setNewVehicleData(p => ({...p, vehicle_type: e.target.value}))}>
                    <option>Car</option>
                    <option>Bike</option>
                    <option>Truck</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="notes">Notes (Optional)</label>
                  <textarea id="notes" name="notes" className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50" rows="2" value={newVehicleData.notes} onChange={(e) => setNewVehicleData(p => ({...p, notes: e.target.value}))}></textarea>
                </div>
              </div>
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button type="button" onClick={() => setAddModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Add Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ---------- END PER-EMPLOYEE ADD MODAL ---------- */}

      {/* Detail Drawer */}
      {isDetailDrawerOpen && selectedEmployee && (
        <div className="fixed inset-0 z-40">
          <div onClick={() => setDetailDrawerOpen(false)} className="absolute inset-0 bg-black bg-opacity-40"></div>
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold">Employee Details</h3>
              <button onClick={() => setDetailDrawerOpen(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><X size={20} /></button>
            </div>
            <div className="flex-grow overflow-y-auto p-6 space-y-4">
              <div className="flex items-center gap-4">
                <AvatarIcon employee={selectedEmployee} />
                <div>
                  <h2 className="text-xl font-bold">{selectedEmployee.name}</h2>
                  <p className="text-slate-500 font-mono">{selectedEmployee.vehicle_number || '-'}</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3"><ShieldCheck size={16} className="text-slate-400" /> <span>ID: {selectedEmployee.id}</span></div>
                <div className="flex items-center gap-3"><RFIDBadge status={selectedEmployee.rfid_status} /></div>
                <div className="flex items-center gap-3"><StatusBadge status={selectedEmployee.status} rfidStatus={selectedEmployee.rfid_status} /></div>
                {selectedEmployee.rfid_status !== 'red_flag' && (
                  <>
                    <div className="flex items-center gap-3"><Calendar size={16} className="text-slate-400" /> <span>Entry: {selectedEmployee.last_entry ? new Date(selectedEmployee.last_entry).toLocaleString() : 'N/A'}</span></div>
                    <div className="flex items-center gap-3"><Calendar size={16} className="text-slate-400" /> <span>Exit: {selectedEmployee.status === 'Outside' && selectedEmployee.last_exit ? new Date(selectedEmployee.last_exit).toLocaleString() : '-'}</span></div>
                  </>
                )}
                <div className="flex items-start gap-3"><StickyNote size={16} className="text-slate-400 mt-0.5" /> <span>Notes: {selectedEmployee.notes || 'None'}</span></div>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h4 className="font-semibold mb-2">Entry History (Sample)</h4>
                <ul className="space-y-2 text-xs">
                  <li className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-700/50"><span>IN: 21/05/2024 09:05 AM</span> <span className="text-green-600">Gate A</span></li>
                  <li className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-700/50"><span>OUT: 20/05/2024 06:15 PM</span> <span className="text-red-600">Gate B</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {paginatedEmployees.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredAndSortedEmployees.length}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  );
};

export default Employees;
