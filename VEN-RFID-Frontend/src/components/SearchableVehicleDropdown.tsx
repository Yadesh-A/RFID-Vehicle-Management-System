import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { API_BASE } from '../config/api.js';
import { getAccessToken } from '../utils/auth.js';

interface Vehicle {
  id: number;
  license_plate: string;
  vehicle_number?: string; // For backward compatibility
  driver?: number | null | { id: number; name?: string };
  default_driver?: number | null;
}

interface Driver {
  id: number;
  name?: string;
}

interface SearchableVehicleDropdownProps {
  value: number | null;
  onChange: (value: number | null) => void;
  vehicles?: Vehicle[];
  drivers?: Driver[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  fetchFromAPI?: boolean;
}

const SearchableVehicleDropdown: React.FC<SearchableVehicleDropdownProps> = ({
  value,
  onChange,
  vehicles,
  drivers,
  placeholder = 'Search by vehicle number or driver name...',
  className = '',
  disabled = false,
  fetchFromAPI = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [apiVehicles, setApiVehicles] = useState<Vehicle[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Defensive props
  const safeVehicles = fetchFromAPI ? apiVehicles : (Array.isArray(vehicles) ? vehicles : []);
  const safeDrivers = Array.isArray(drivers) ? drivers : [];

  // Fetch vehicles from API if fetchFromAPI is true
  useEffect(() => {
    let ignore = false;
    if (fetchFromAPI) {
      const fetchVehicles = async () => {
        const token = getAccessToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        let url = `${API_BASE}/vehicles/?search=${encodeURIComponent(searchTerm)}&page_size=10`;
        const res = await fetch(url, { headers });
        if (!ignore) {
          if (res.ok) {
            const data = await res.json();
            setApiVehicles(data.results || []);
          } else {
            setApiVehicles([]);
          }
        }
      };
      if (searchTerm.trim() || isOpen) {
        fetchVehicles();
      } else {
        setApiVehicles([]);
      }
    }
    return () => { ignore = true; };
  }, [searchTerm, fetchFromAPI, isOpen]);

  // Helper to get driver from vehicle
  const getDriver = (vehicle: Vehicle) => {
    if (vehicle.driver && typeof vehicle.driver === 'object') {
      return vehicle.driver;
    }
    if (vehicle.driver && typeof vehicle.driver === 'number') {
      return safeDrivers.find(d => d.id === vehicle.driver);
    }
    if (vehicle.default_driver) {
      return safeDrivers.find(d => d.id === vehicle.default_driver);
    }
    return null;
  };

  // 🔍 Filter logic (single source of truth)
  const filteredVehicles = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    return safeVehicles
      .filter(vehicle => {
        const driver = getDriver(vehicle);

        const vehicleNumber = (vehicle.license_plate || vehicle.vehicle_number || '').toLowerCase();
        const driverName = driver?.name?.toLowerCase() || '';

        if (!searchLower) return true;

        return (
          vehicleNumber.includes(searchLower) ||
          driverName.includes(searchLower)
        );
      })
      .slice(0, 10);
  }, [searchTerm, safeVehicles, safeDrivers]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (vehicleId: number) => {
    onChange(vehicleId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleClear = () => {
    onChange(null);
    setSearchTerm('');
    inputRef.current?.focus();
  };

  // Ensure selected vehicle is always visible in the dropdown
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    if (!value || value === null) {
      setSelectedVehicle(null);
      return;
    }
    // If selected vehicle is not in the current vehicles list, fetch it
    if (!safeVehicles.find(v => v.id === value)) {
      const token = getAccessToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      fetch(`${API_BASE}/vehicles/${value}/`, { headers })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setSelectedVehicle(data);
        });
    } else {
      setSelectedVehicle(safeVehicles.find(v => v.id === value) || null);
    }
  }, [value, safeVehicles]);

  const getDisplayValue = () => {
    if (!value) return '';

    const vehicle = safeVehicles.find(v => v.id === value) || selectedVehicle;
    const driver = vehicle ? getDriver(vehicle) : null;

    return `${vehicle?.license_plate || vehicle?.vehicle_number || 'Unknown'} - ${
      driver?.name || 'No Driver'
    }`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : getDisplayValue()}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 px-3 py-2 pr-10 focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
          {value && !isOpen && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(prev => !prev)}
            disabled={disabled}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50"
          >
            <ChevronDown
              size={16}
              className={`transform transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredVehicles.length > 0 ? (
            filteredVehicles.map(vehicle => {
              const driver = getDriver(vehicle);

              return (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => handleSelect(vehicle.id)}
                  className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none"
                >
                  <div className="flex items-center gap-2">
                    <Search size={14} className="text-slate-400" />
                    <span className="text-slate-900 dark:text-white">
                      {vehicle.license_plate || vehicle.vehicle_number || 'Unknown'} –{' '}
                      {driver?.name || 'No Driver'}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-slate-500 dark:text-slate-400 text-sm">
              No vehicles found
            </div>
          )}

          {searchTerm && safeVehicles.length > 10 && (
            <div className="px-3 py-2 text-slate-400 dark:text-slate-500 text-xs border-t border-slate-200 dark:border-slate-700">
              Showing top 10 results. Type more to refine.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableVehicleDropdown;