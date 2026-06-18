// User (replaces Admin)
export interface User {
  id: number;
  user_id: string;
  username: string;
  email: string;
  phone_number: string;
  user_level?: 'Quarter Master' | 'Employee' | 'Admin' | 'Super Admin';
  role: 'Quarter Master' | 'Employee' | 'Admin' | 'Super Admin';
  plain_password?: string;
}

// Driver (replaces Employee functionality)
export interface Driver {
  id: number;
  driver_id: string;
  name: string;
  driver_rank: string; // Accepts any rank string
  rank?: number; // Backend uses rank as FK to DriverRank
  vehicle_type: string;
  phone_number: string;
  employee_id?: string;
  vehicle_number?: string; // Added: License plate of assigned vehicle
}

// Vehicle (enhanced)
export interface Vehicle {
  id: number;
  license_plate: string;
  vehicle_number?: string; // For backward compatibility
  tag_id?: string;
  current_tag_id?: string;
  color: string;
  make: string;
  model: string;
  year: number;
  driver?: number | null; // Sometimes driver, sometimes default_driver
  default_driver?: number | null;
  driver_detail?: Driver;
  user: number;
  user_detail?: User;
  status: 'in' | 'out';
  unit?: string;
  unit_name?: string;
  vehicle_type?: string;
  vehicle_type_name?: string;
  flag_status: boolean;
  flag_category?: string;
  comment?: string;
  flagged_by?: number;
  flagged_by_name?: string;
  is_active: boolean;
  created_at: string;
}

// VehicleLogs (replaces Entry)
export interface VehicleLogs {
  id: number;
  vehicle: number;
  vehicle_detail?: Vehicle;
  driver: number | null;
  driver_detail?: Driver;
  entry_time: string;
  exit_time: string | null;
  location: string;
  flag_status: boolean;
  flag_category?: string;
  comment?: string;
  // Additional fields from MovementLogSerializer
  vehicle_plate?: string;
  driver_name?: string;
  driver_phone?: string;
  unit?: string;
  rank?: string;
  timestamp?: string;
}

// Dashboard Stats
export interface DashboardStats {
  total_vehicles: number;
  vehicles_inside: number;
  active_tags: number;
  today_entries: number;
  vehicle_type_data?: Array<{name: string; value: number}>;
  recent_entries?: Array<{
    id: number;
    vehicleId: number;
    licensePlate: string;
    driverName: string;
    type: 'entry' | 'exit';
    timestamp: string;
    location: string;
  }>;
}

// Legacy types for backward compatibility (will be removed)
export interface Admin {
  id: number;
  name: string;
  password: string;
  plain_password?: string;
  level: 'Quarter Master' | 'Employee' | 'Admin' | 'Super Admin';
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  rfid: boolean;
  rfid_status: 'army' | 'visitor' | 'red_flag';
  vehicle_number?: string;
  vehicle_type?: string;
  last_entry?: string;
  last_exit?: string;
  status: 'Inside' | 'Outside';
  notes?: string;
}

export interface VehicleEntry {
  id: string;
  vehicleId: string;
  type: 'entry' | 'exit';
  timestamp: string;
  location: string;
  imageUrl?: string;
  videoUrl?: string;
  notes?: string;
  operator?: string;
}

export interface CameraFeed {
  id: string;
  name: string;
  location: string;
  type: 'entry' | 'exit';
  status: 'online' | 'offline';
  url: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  sender: number;
  sender_name: string;
  target_roles: string[];
  sent_at: string;
  is_read?: boolean;
  read_by: string[];
}
