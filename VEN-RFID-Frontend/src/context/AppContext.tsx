import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User, Driver, Vehicle, VehicleLogs, DashboardStats, Notification,
  Admin, Employee, VehicleEntry // Legacy types for compatibility
} from '../types/types';
import { API_CONFIG } from '../config/api.js';
import { getAccessToken } from '../utils/auth.js';
import { apiFetch } from '../utils/api.js';
import { DRIVER_PAGE_SIZE, VEHICLE_PAGE_SIZE, VEHICLE_HISTORY_PAGE_SIZE } from '../config/pagination';

const API_BASE = API_CONFIG.BASE_URL;

// Export API_BASE so other components can use it
export { API_BASE };

// Function to generate the initial time as current IST
const getSharedInitialTime = (): Date => {
  // Get current UTC time
  const now = new Date();
  
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  
  // Get UTC time in milliseconds and add IST offset
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const istTime = new Date(utcTime + istOffset);
  
  return istTime;
};

interface AppContextType {
  // Flagged vehicle pagination
  flaggedVehicleCount: number;
  flaggedVehiclePage: number;
  flaggedVehiclePageSize: number;
  flaggedVehicleTotalPages: number;
  setFlaggedVehiclePage: (page: number) => void;
  fetchFlaggedVehicles: (page?: number, pageSize?: number) => Promise<void>;
      // Vehicle log pagination
      vehicleLogCount: number;
      vehicleLogPage: number;
      vehicleLogPageSize: number;
      vehicleLogTotalPages: number;
      fetchVehicleLogs: (vehicleId: number, page?: number, pageSize?: number) => Promise<void>;
      setVehicleLogPage: (page: number) => void;
    // User pagination
    userCount: number;
    userPage: number;
    userPageSize: number;
    userTotalPages: number;
    fetchUsers: (page?: number, pageSize?: number) => Promise<void>;
    setUserPage: (page: number) => void;
  // New API data
  users: User[];
  drivers: Driver[];
  vehicles: Vehicle[];
  vehicleCount: number;
  vehiclePage: number;
  vehiclePageSize: number;
  vehicleTotalPages: number;
  vehicleStatuses: VehicleLogs[];
  vehicleTypes: Array<{ id: number; name: string }>;
  fetchVehicleTypes: () => Promise<void>;
  addVehicleType: (name: string) => Promise<void>;
  dashboardStats: DashboardStats | null;
  notifications: Notification[];
  flaggedVehicles: Vehicle[];
  
  // Legacy compatibility
  currentAdmin: Admin | null;
  employees: Employee[];
  entries: VehicleEntry[];
  
  loading: boolean;
  sharedInitialTime: Date;
  
  // User functions
  setCurrentAdmin: (admin: Admin | null) => void;
  updateCurrentAdmin: (admin: Admin) => void;
  
  // Driver pagination
  driverCount: number;
  driverPage: number;
  driverPageSize: number;
  driverTotalPages: number;
  fetchDrivers: (options?: { page?: number; pageSize?: number; search?: string; rank?: string }) => Promise<void>;
  setDriverPage: (page: number) => void;

  // Driver functions
  addDriver: (driver: Omit<Driver, 'id' | 'created_at' | 'updated_at'>) => Promise<Driver>;
  updateDriver: (driver: Driver) => Promise<void>;
  deleteDriver: (id: number) => Promise<void>;
  
  // Vehicle functions
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) => Promise<Vehicle>;
  updateVehicle: (vehicle: Vehicle) => Promise<void>;
  deleteVehicle: (id: number) => Promise<void>;
  getVehicleById: (id: string) => Vehicle | undefined;
  searchVehicles: (query: string) => Vehicle[];
  fetchVehicles: (options?: { page?: number; pageSize?: number; search?: string }) => Promise<void>;
  setVehiclePage: (page: number) => void;
  
  // Vehicle Flag functions
  // fetchFlaggedVehicles updated above
  toggleVehicleFlag: (vehicleId: number, flagStatus: boolean, comment: string, category?: string) => Promise<void>;
  flagVehicleLog: (logId: number, vehicleId: number, comment: string, category?: string) => Promise<void>;
  updateVehicleLog: (logId: number, updates: Partial<VehicleLogs>) => Promise<void>;
  
  // Vehicle Status functions
  addVehicleEntry: (entry: Omit<VehicleLogs, 'id'>) => Promise<void>;
  markVehicleExit: (vehicleId: number) => Promise<void>;
  getVehicleStatuses: (vehicleId: number) => VehicleLogs[];
  refreshVehicleStatuses: (currentlyInside?: boolean, search?: string, page?: number, pageSize?: number, date?: string) => Promise<any>;
  
  // Notification functions
  fetchNotifications: () => Promise<void>;
  sendNotification: (notification: { title: string; message: string; target_roles: string[] }) => Promise<void>;
  markNotificationAsRead: (notificationId: number) => Promise<void>;
  getUnreadNotificationsCount: () => number;
  
  // Legacy compatibility functions
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (employee: Employee) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  addEntry: (entry: Omit<VehicleEntry, 'id'>) => Promise<void>;
  getEntriesByVehicleId: (vehicleId: string) => VehicleEntry[];
  filterEntries: (params: { status?: string; date?: Date }) => VehicleEntry[];
  addVehicleToEmployee: (employeeId: string, vehicleData: { vehicle_number: string, vehicle_type: string, notes: string }) => Promise<void>;
  addVehicleAndEntries: (vehicleData: any) => Promise<void>;
  
  // Dashboard
  fetchDashboardStats: () => Promise<void>;
  
  // Refresh all data
  refreshAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Add missing vehicleTotalPages state
    const [vehicleTotalPages, setVehicleTotalPages] = useState<number>(1);
  // New state
  const [users, setUsers] = useState<User[]>([]);
  const [userCount, setUserCount] = useState<number>(0);
  const [userPage, setUserPage] = useState<number>(1);
  const [userPageSize, _setUserPageSize] = useState<number>(20);
  const [userTotalPages, setUserTotalPages] = useState<number>(1);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverCount, setDriverCount] = useState<number>(0);
  const [driverPage, setDriverPage] = useState<number>(1);
  const [driverPageSize, _setDriverPageSize] = useState<number>(DRIVER_PAGE_SIZE);
  const [driverTotalPages, setDriverTotalPages] = useState<number>(1);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleCount, setVehicleCount] = useState<number>(0);
  const [vehicleLogCount, setVehicleLogCount] = useState<number>(0);
  const [vehicleLogPage, setVehicleLogPage] = useState<number>(1);
  const [vehicleLogPageSize, _setVehicleLogPageSize] = useState<number>(20);
  const [vehicleLogTotalPages, setVehicleLogTotalPages] = useState<number>(1);
  const [vehiclePage, setVehiclePage] = useState<number>(1);
  const [vehiclePageSize, _setVehiclePageSize] = useState<number>(10);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [flaggedVehicles, setFlaggedVehicles] = useState<Vehicle[]>([]);
  const [flaggedVehicleCount, setFlaggedVehicleCount] = useState<number>(0);
  const [flaggedVehiclePage, setFlaggedVehiclePage] = useState<number>(1);
  const [flaggedVehiclePageSize, _setFlaggedVehiclePageSize] = useState<number>(20);
  const [flaggedVehicleTotalPages, setFlaggedVehicleTotalPages] = useState<number>(1);
  const [vehicleStatuses, setVehicleStatuses] = useState<VehicleLogs[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<Array<{ id: number; name: string }>>([]);
  // Fetch vehicle types from backend
  const fetchVehicleTypes = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/vehicle-types/`);
      if (res.ok) {
        const data = await res.json();
        setVehicleTypes(data.results || data || []);
      }
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
    }
  };

  // Add a new vehicle type
  const addVehicleType = async (name: string) => {
    try {
      const res = await apiFetch(`${API_BASE}/vehicle-types/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        await fetchVehicleTypes();
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'Failed to add vehicle type');
      }
    } catch (error) {
      console.error('Error adding vehicle type:', error);
      throw error;
    }
  };

  // Legacy state for compatibility
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<VehicleEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [sharedInitialTime] = useState<Date>(getSharedInitialTime());

  // Removed redundant vehicle management data fetch. AdminDashboard is responsible for fetching vehicle data.

  // Fetch notifications when currentAdmin changes
  useEffect(() => {
    if (currentAdmin?.id) {
      fetchNotifications();
    }
  }, [currentAdmin]);

  // Convert new data to legacy format for compatibility
  useEffect(() => {
    // Convert drivers to employees
    const legacyEmployees: Employee[] = drivers.map(driver => ({
      id: driver.id.toString(),
      name: driver.name,
      role: driver.driver_rank,
      rfid: driver.driver_rank !== 'Civilian',
      rfid_status: driver.driver_rank === 'General' ? 'army' : 'visitor',
      vehicle_number: vehicles.find(v => v.driver === driver.id)?.vehicle_number || '',
      vehicle_type: driver.vehicle_type,
      last_entry: undefined,
      last_exit: undefined,
      status: 'Outside',
      notes: '',
    }));
    setEmployees(legacyEmployees);

    // Convert vehicle statuses to entries
    const legacyEntries: VehicleEntry[] = vehicleStatuses.flatMap(status => {
      const entries: VehicleEntry[] = [];
      
      // Skip if vehicle is undefined
      if (!status.vehicle && !status.license_plate) {
        return entries;
      }
      
      // Get vehicle ID - handle both old and new API response formats
      const vehicleId = status.vehicle ? status.vehicle.toString() : status.license_plate || 'unknown';
      
      // Entry
      entries.push({
        id: `${status.id}-entry`,
        vehicleId: vehicleId,
        type: 'entry',
        timestamp: status.entry_time,
        location: status.location,
        notes: status.comment || '',
        operator: status.driver_detail?.name || status.driver_name || '',
      });
      
      // Exit (if exists)
      if (status.exit_time) {
        entries.push({
          id: `${status.id}-exit`,
          vehicleId: vehicleId,
          type: 'exit',
          timestamp: status.exit_time,
          location: status.location,
          notes: status.comment || '',
          operator: status.driver_detail?.name || status.driver_name || '',
        });
      }
      
      return entries;
    });
    setEntries(legacyEntries.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ));
  }, [drivers, vehicles, vehicleStatuses]);

  // Fetch functions
  const fetchUsers = async (page = userPage, pageSize = userPageSize) => {
    try {
      const res = await apiFetch(`${API_BASE}/users/?page=${page}&page_size=${pageSize}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.results || []);
        setUserCount(data.count || 0);
        setUserTotalPages(data.count ? Math.ceil(data.count / pageSize) : 1);
        // Do NOT setUserPage or setUserPageSize here to avoid infinite loop
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Fetch users when userPage or userPageSize changes (for user management pagination)
  useEffect(() => {
    if (!currentAdmin) return;
    const token = getAccessToken();
    if (!token) return;
    fetchUsers(userPage, userPageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPage, userPageSize, currentAdmin]);

  const fetchDrivers = async (options?: { page?: number; pageSize?: number; search?: string; rank?: string }) => {
    const page = options?.page ?? driverPage;
    const pageSize = options?.pageSize ?? driverPageSize;
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (options?.search) params.append('search', options.search);
    if (options?.rank && options.rank !== 'All') params.append('rank', options.rank);
    try {
      const res = await apiFetch(`${API_BASE}/drivers/?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDrivers(data.results || []);
        setDriverCount(data.count || 0);
        setDriverTotalPages(data.count ? Math.ceil(data.count / pageSize) : 1);
        // Do NOT setDriverPage or setDriverPageSize here to avoid infinite loop
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };


  // Backend-driven vehicle logs fetch
  const fetchVehicleLogs = async (vehicleId: number, page = vehicleLogPage, pageSize = vehicleLogPageSize) => {
    try {
      const res = await apiFetch(`${API_BASE}/visits/?vehicle=${vehicleId}&page=${page}&page_size=${pageSize}`);
      if (res.ok) {
        const data = await res.json();
        setVehicleStatuses(data.results || []);
        setVehicleLogCount(data.count || 0);
        setVehicleLogTotalPages(data.count ? Math.ceil(data.count / pageSize) : 1);
      }
    } catch (error) {
      console.error('Error fetching vehicle logs:', error);
    }
  };

  const fetchVehicles = async (options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    license_plate?: string;
    status?: string;
    color?: string;
    make?: string;
  }) => {
    const params = new URLSearchParams();
    if (options?.search) params.append('search', options.search);
    if (options?.license_plate) params.append('license_plate', options.license_plate);
    if (options?.status) params.append('status', options.status);
    if (options?.color) params.append('color', options.color);
    if (options?.make) params.append('make', options.make);
    // Only include page/page_size if provided (for paginated requests)
    if (options?.page !== undefined) params.append('page', String(options.page));
    if (options?.pageSize !== undefined) params.append('page_size', String(options.pageSize));
    const url = `${API_BASE}/vehicles/?${params.toString()}`;
    try {
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.results || []);
        setVehicleCount(data.count || 0);
        setVehicleTotalPages(data.count && options?.pageSize ? Math.ceil(data.count / options.pageSize) : 1);
        // Do NOT setVehiclePage or setVehiclePageSize here to avoid infinite loop
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const fetchVehicleStatuses = async (
    currentlyInside?: boolean, 
    search?: string,
    page?: number,
    pageSize?: number,
    date?: string
  ) => {
    try {
      const params = new URLSearchParams();
      
      // Add pagination parameters
      if (page !== undefined) params.append('page', String(page));
      if (pageSize !== undefined) params.append('page_size', String(pageSize));
      
      // Only add the parameter if currentlyInside is explicitly true
      if (currentlyInside === true) {
        params.append('currently_inside', 'true');
      }
      
      // Add search parameter if provided
      if (search && search.trim()) {
        params.append('search', search.trim());
      }
      
      // Add date parameter if provided
      if (date && date.trim()) {
        params.append('date', date.trim());
      }
      
      const url = `${API_BASE}/visits/${params.toString() ? '?' + params.toString() : ''}`;
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setVehicleStatuses(data.results || []);
        // Return pagination info for the caller
        return {
          results: data.results || [],
          count: data.count || 0,
          next: data.next,
          previous: data.previous
        };
      }
    } catch (error) {
      console.error('Error fetching vehicle statuses:', error);
    }
    return { results: [], count: 0, next: null, previous: null };
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`${API_BASE}/dashboard/stats/`);
      if (res.ok) {
        const data = await res.json();
        setDashboardStats(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlaggedVehicles = async (page = flaggedVehiclePage, pageSize = flaggedVehiclePageSize, search = '') => {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (search) params.append('search', search);
    try {
      const res = await apiFetch(`${API_BASE}/vehicles/flagged/?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFlaggedVehicles(data.results || []);
        setFlaggedVehicleCount(data.count || 0);
        setFlaggedVehicleTotalPages(data.count ? Math.ceil(data.count / pageSize) : 1);
      }
    } catch (error) {
      console.error('Error fetching flagged vehicles:', error);
    }
  };

  const toggleVehicleFlag = async (vehicleId: number, flagStatus: boolean, comment: string, category?: string) => {
    try {
      // Use PATCH for partial update instead of PUT
      const updateData = {
        flag_status: flagStatus,
        flag_category: category || '',
        comment: comment,
        flagged_by: flagStatus && currentAdmin?.id ? currentAdmin.id : null,
      };

      const res = await apiFetch(`${API_BASE}/vehicles/${vehicleId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        const updated = await res.json();
        setVehicles(prev => prev.map(v => v.id === vehicleId ? updated : v));
        await fetchFlaggedVehicles();
        await fetchVehicles(); // Refresh vehicles list
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to update vehicle flag');
      }
    } catch (error) {
      console.error('Error toggling vehicle flag:', error);
      throw error;
    }
  };

  const flagVehicleLog = async (logId: number, vehicleId: number, comment: string, category?: string) => {
    try {
      // Since /visits/ endpoint is read-only, we only update the vehicle
      // The visit log will reflect the vehicle's flag status automatically
      
      const updateData = {
        flag_status: true,
        flag_category: category || '',
        comment: comment,
        flagged_by: currentAdmin?.id || null,
      };

      const res = await apiFetch(`${API_BASE}/vehicles/${vehicleId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        const updated = await res.json();
        setVehicles(prev => prev.map(v => v.id === vehicleId ? updated : v));
        
        // Refresh data to show updated flag status
        await fetchVehicleStatuses();
        await fetchFlaggedVehicles();
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to flag vehicle');
      }
    } catch (error) {
      console.error('Error flagging vehicle log:', error);
      throw error;
    }
  };

  const updateVehicleLog = async (logId: number, updates: Partial<VehicleLogs>) => {
    try {
      // Use the add-exit endpoint to create or update the EXIT log
      const res = await apiFetch(`${API_BASE}/visits/${logId}/add-exit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exit_time: updates.exit_time }),
      });

      if (res.ok) {
        // Refresh to get the latest data immediately
        await Promise.all([
          fetchDashboardStats(),
          refreshVehicleStatuses()
        ]);
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || 'Failed to update exit time');
      }
    } catch (error) {
      console.error('Error updating vehicle log:', error);
      throw error;
    }
  };

  // Notification functions
  const fetchNotifications = async () => {
    if (!currentAdmin?.id) return;
    
    try {
      const res = await apiFetch(`${API_BASE}/notifications/?user_id=${currentAdmin.id}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.results || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const sendNotification = async (notification: { title: string; message: string; target_roles: string[] }) => {
    if (!currentAdmin?.id) return;

    try {
      const res = await apiFetch(`${API_BASE}/notifications/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notification.title,
          message: notification.message,
          target_roles: notification.target_roles,
          sender: currentAdmin.id,
        }),
      });

      if (res.ok) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
    if (!currentAdmin?.id) return;
    
    try {
      const res = await apiFetch(`${API_BASE}/notifications/${notificationId}/mark_read/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentAdmin.id }),
      });

      if (res.ok) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getUnreadNotificationsCount = () => {
    if (!currentAdmin?.id) return 0;
    return notifications.filter(n => !n.is_read).length;
  };

  const deleteDriver = async (id: number) => {
    try {
      const res = await apiFetch(`${API_BASE}/drivers/${id}/`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setDrivers(prev => prev.filter(d => d.id !== id));
      }
    } catch (error) {
      console.error('Error deleting driver:', error);
    }
  };

  // Vehicle CRUD
  const addVehicle = async (vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>): Promise<Vehicle> => {
    try {
      const res = await apiFetch(`${API_BASE}/vehicles/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle),
      });

      if (res.ok) {
        const newVehicle = await res.json();
        setVehicles(prev => [...prev, newVehicle]);
        await fetchDashboardStats();
        return newVehicle;
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData) || `HTTP ${res.status}: ${res.statusText}`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      throw error;
    }
  };

  const updateVehicle = async (vehicle: Vehicle) => {
    try {
      const res = await apiFetch(`${API_BASE}/vehicles/${vehicle.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle),
      });

      if (res.ok) {
        const updatedVehicle = await res.json();
        setVehicles(prev => prev.map(v => v.id === vehicle.id ? updatedVehicle : v));
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
    }
  };

  const deleteVehicle = async (id: number) => {
    try {
      const res = await apiFetch(`${API_BASE}/vehicles/${id}/`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setVehicles(prev => prev.filter(v => v.id !== id));
        await fetchDashboardStats();
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
    }
  };

  const getVehicleById = (id: string) => {
    return vehicles.find(v => v.id.toString() === id);
  };

  const searchVehicles = (query: string) => {
    if (!query) return vehicles;
    const lowercaseQuery = query.toLowerCase();
    return vehicles.filter(v =>
      v.license_plate?.toLowerCase().includes(lowercaseQuery) ||
      v.vehicle_number?.toLowerCase().includes(lowercaseQuery) ||
      v.make?.toLowerCase().includes(lowercaseQuery) ||
      v.model?.toLowerCase().includes(lowercaseQuery)
    );
  };

const addVehicleEntry = async (entry: any) => {
    try {
        console.log('addVehicleEntry called with:', entry);
        
        const entryPayload = {
            vehicle: typeof entry.vehicle === 'object' ? entry.vehicle.id : entry.vehicle,
            driver: typeof entry.driver === 'object' ? entry.driver.id : entry.driver,
            action: 'ENTRY',
            entry_time: entry.entry_time, // Changed from timestamp to entry_time
            location: entry.location || 'Main Gate',
            flag_status: entry.flag_status || false
        };

        console.log('Sending entry payload to backend:', entryPayload);

        // Use /logs/ endpoint for creating new entries (not /visits/ which is read-only)
        const entryRes = await apiFetch(`${API_BASE}/logs/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entryPayload),
        });

        if (!entryRes.ok) {
            const errorData = await entryRes.json().catch(() => ({}));
            console.error("BACKEND REJECTED DATA:", errorData); 
            throw new Error(errorData.detail || JSON.stringify(errorData) || "Failed to add Entry log");
        }

        // Logic for Exit (if provided)
        if (entry.exit_time) {
             const exitPayload = { 
                vehicle: typeof entry.vehicle === 'object' ? entry.vehicle.id : entry.vehicle,
                driver: typeof entry.driver === 'object' ? entry.driver.id : entry.driver,
                action: 'EXIT', 
                exit_time: entry.exit_time, // Changed from timestamp to exit_time
                location: entry.location || 'Main Gate',
                flag_status: entry.flag_status || false
             };
             
             console.log('Sending exit payload to backend:', exitPayload);
             
             await apiFetch(`${API_BASE}/logs/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(exitPayload),
            });
        }

        await refreshVehicleStatuses();
        await fetchDashboardStats();

    } catch (error) {
        console.error('Error adding vehicle entry:', error);
        throw error;
    }
};

  const markVehicleExit = async (vehicleId: number) => {
    try {
      const res = await apiFetch(`${API_BASE}/vehicles/${vehicleId}/mark_exit/`, {
        method: 'POST',
      });

      if (res.ok) {
        await fetchVehicles();
        await fetchVehicleStatuses();
        await fetchDashboardStats();
      }
    } catch (error) {
      console.error('Error marking vehicle exit:', error);
    }
  };

  const getVehicleStatuses = (vehicleId: number) => {
    return vehicleStatuses.filter(status => status.vehicle === vehicleId);
  };

  const refreshVehicleStatuses = async (
    currentlyInside?: boolean, 
    search?: string,
    page?: number,
    pageSize?: number,
    date?: string
  ) => {
    return await fetchVehicleStatuses(currentlyInside, search, page, pageSize, date);
  };

  // Legacy compatibility functions
  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    // Convert employee to driver
    const driver: Omit<Driver, 'id' | 'created_at' | 'updated_at'> = {
      driver_id: `DRV${Date.now()}`, // Generate driver_id
      name: employee.name,
      driver_rank: employee.rfid_status === 'army' ? 'General' : 'Civilian',
      vehicle_type: employee.vehicle_type || 'Car',
      phone_number: '0000000000',
    };
    if (typeof value.addDriver === 'function') {
      await value.addDriver(driver);
    }
  };

  const updateEmployee = async (employee: Employee) => {
    const driver = drivers.find(d => d.id.toString() === employee.id);
    if (driver) {
      const updatedDriver: Driver = {
        ...driver,
        name: employee.name,
        driver_rank: employee.rfid_status === 'army' ? 'General' : 'Civilian',
        vehicle_type: employee.vehicle_type || driver.vehicle_type,
      };
      if (typeof value.updateDriver === 'function') {
        await value.updateDriver(updatedDriver);
      }
    }
  };

  const deleteEmployee = async (id: string) => {
    await deleteDriver(parseInt(id));
  };

  const addEntry = async (entry: Omit<VehicleEntry, 'id'>) => {
    const vehicle = vehicles.find(v => v.id.toString() === entry.vehicleId);
    if (!vehicle) return;

    if (entry.type === 'entry') {
      const vehicleStatus: Omit<VehicleLogs, 'id'> = {
        vehicle: vehicle.id,
        driver: vehicle.driver,
        entry_time: entry.timestamp,
        exit_time: null,
        location: entry.location || 'Main Gate',
        flag_status: false,
        comment: entry.notes || '',
      };
      await addVehicleEntry(vehicleStatus);
    } else {
      await markVehicleExit(vehicle.id);
    }
  };

  const getEntriesByVehicleId = (vehicleId: string) => {
    return entries.filter(entry => entry.vehicleId === vehicleId);
  };

  const filterEntries = (params: { status?: string; date?: Date }) => {
    let filtered = [...entries];
    
    if (params.status) {
      filtered = filtered.filter(entry => entry.type === params.status);
    }
    
    if (params.date) {
      const targetDate = params.date.toDateString();
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.timestamp).toDateString();
        return entryDate === targetDate;
      });
    }
    
    return filtered;
  };

  const addVehicleToEmployee = async (employeeId: string, vehicleData: { vehicle_number: string, vehicle_type: string, notes: string }) => {
    const driver = drivers.find(d => d.id.toString() === employeeId);
    if (!driver) return;

    const user = users[0]; // Use first user as default
    if (!user) return;

    const vehicle: Omit<Vehicle, 'id' | 'make' | 'model' | 'year'> = {
      vehicle_number: vehicleData.vehicle_number,
      chassis_number: `CH${Date.now()}`,
      tag_id: `TAG${Date.now()}`,
      driver: driver.id,
      user: user.id,
      status: 'out',
      flag_status: false,
      comment: '',
      color: '',
    };
    try {
      if (typeof addVehicle === 'function') {
        await addVehicle(vehicle as any);
      }
    } catch (error) {
      console.error('Error adding vehicle to employee:', error);
    }
  };

 // ------------------------------------------------------------------
  //  PASTE THIS BLOCK RIGHT BEFORE THE 'return <AppContext.Provider...'
  // ------------------------------------------------------------------

  // 1. DEFINE THE MISSING FUNCTIONS
  const updateDriver = async (driver: Driver) => {
    try {
      const res = await apiFetch(`${API_BASE}/drivers/${driver.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driver),
      });

      if (res.ok) {
        const updatedDriver = await res.json();
        setDrivers(prev => prev.map(d => d.id === driver.id ? updatedDriver : d));
        await fetchDashboardStats();
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to update driver');
      }
    } catch (error) {
      console.error('Error updating driver:', error);
      throw error;
    }
  };

  const refreshAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDashboardStats(),
        fetchVehicles(),
        fetchDrivers(),
        fetchVehicleStatuses(),
        fetchFlaggedVehicles(),
        fetchNotifications()
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const addVehicleAndEntries = async (vehicleData: any) => {
      try {
          await addVehicle(vehicleData);
      } catch (error) {
          console.error("Error in addVehicleAndEntries:", error);
          throw error;
      }
  };

  // 2. DEFINE THE VALUE OBJECT (Connecting the functions above)
  const value: AppContextType = {
    users,
    userCount,
    userPage,
    userPageSize,
    userTotalPages,
    fetchUsers,
    setUserPage,
    drivers,
    driverCount,
    driverPage,
    driverPageSize,
    driverTotalPages,
    fetchDrivers,
    setDriverPage,
    vehicles,
    vehicleCount,
    vehicleLogCount,
    vehicleLogPage,
    vehicleLogPageSize,
    vehicleLogTotalPages,
    fetchVehicleLogs,
    setVehicleLogPage,
    vehiclePage,
    vehiclePageSize,
    vehicleTotalPages,
    vehicleStatuses,
    vehicleTypes,
    fetchVehicleTypes,
    addVehicleType,
    dashboardStats,
    notifications,
    flaggedVehicles,
    flaggedVehicleCount,
    flaggedVehiclePage,
    flaggedVehiclePageSize,
    flaggedVehicleTotalPages,
    setFlaggedVehiclePage,
    currentAdmin,
    employees,
    entries,
    loading,
    sharedInitialTime,
    setCurrentAdmin,
    
    // Fix: Actually update the state
    updateCurrentAdmin: (admin: Admin) => setCurrentAdmin(admin),

    addDriver: async (driver) => {
      const payload = { ...driver };
      delete (payload as any).id;
      delete (payload as any).created_at;
      delete (payload as any).updated_at;

      const res = await apiFetch(`${API_BASE}/drivers/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to add driver');
      }
      const newDriver = await res.json();
      setDrivers(prev => [...prev, newDriver]);
      setDriverCount(prev => prev + 1);
      return newDriver;
    },

    // HERE IS THE FIX: Linking the function we defined above
    updateDriver, 
    
    deleteDriver,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    getVehicleById,
    searchVehicles,
    fetchFlaggedVehicles,
    toggleVehicleFlag,
    flagVehicleLog,
    updateVehicleLog,
    addVehicleEntry,
    markVehicleExit,
    getVehicleStatuses,
    refreshVehicleStatuses,
    fetchNotifications,
    sendNotification,
    markNotificationAsRead,
    getUnreadNotificationsCount,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addEntry,
    getEntriesByVehicleId,
    filterEntries,
    addVehicleToEmployee,
    
    // HERE IS THE FIX: Linking the function we defined above
    addVehicleAndEntries, 
    
    fetchDashboardStats,
    
    // HERE IS THE FIX: Linking the function we defined above
    refreshAllData, 
    
    fetchVehicles,
    setVehiclePage,
  };

  // ------------------------------------------------------------------
  //  END OF PASTE BLOCK
  // ------------------------------------------------------------------
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
