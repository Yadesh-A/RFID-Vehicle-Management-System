import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X, User } from 'lucide-react';
import { API_BASE } from '../config/api.js';
import { getAccessToken } from '../utils/auth.js';

interface SearchableDriverDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  includeNew?: boolean;
}

const SearchableDriverDropdown: React.FC<SearchableDriverDropdownProps> = ({
  value,
  onChange,
  placeholder = "Select driver...",
  className = "",
  disabled = false,
  includeNew = false
}) => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDrivers, setFilteredDrivers] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch drivers from API as user types
  useEffect(() => {
    let ignore = false;
    const fetchDrivers = async () => {
      const token = getAccessToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      let url = `${API_BASE}/drivers/?search=${encodeURIComponent(searchTerm)}&page_size=10`;
      const res = await fetch(url, { headers });
      if (!ignore) {
        if (res.ok) {
          const data = await res.json();
          let driverList = data.results || [];
          // Add "Add New Driver" option if includeNew is true
          if (includeNew) {
            driverList.push({ id: 'new', name: '+ Add New Driver', employee_id: '', driver_rank: '', isNewOption: true });
          }
          setDrivers(driverList);
          setFilteredDrivers(driverList);
        } else {
          setDrivers([]);
          setFilteredDrivers([]);
        }
      }
    };
    if (searchTerm.trim() || isOpen || includeNew) {
      fetchDrivers();
    } else {
      setDrivers([]);
      setFilteredDrivers([]);
    }
    return () => { ignore = true; };
  }, [searchTerm, includeNew, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (driver: any) => {
    onChange(driver.id.toString());
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
    onChange('');
    setSearchTerm('');
    inputRef.current?.focus();
  };

  // Ensure selected driver is always visible in the dropdown
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);

  useEffect(() => {
    if (!value || value === 'new') {
      setSelectedDriver(null);
      return;
    }
    // If selected driver is not in the current drivers list, fetch it
    if (!drivers.find(d => d.id && d.id.toString() === value)) {
      const token = getAccessToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      fetch(`${API_BASE}/drivers/${value}/`, { headers })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setSelectedDriver(data);
        });
    } else {
      setSelectedDriver(drivers.find(d => d.id && d.id.toString() === value) || null);
    }
  }, [value, drivers]);

  const getSelectedDriverDisplay = () => {
    if (!value) return '';
    if (value === 'new') return '+ Add New Driver';
    const driver = drivers.find(d => d.id && d.id.toString() === value) || selectedDriver;
    return driver ? `${driver.name} - ${driver.driver_rank} (${driver.employee_id || 'No ID'})` : '';
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : getSelectedDriverDisplay()}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50"
          >
            <ChevronDown size={16} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredDrivers.length > 0 ? (
            filteredDrivers.map((driver, index) => (
              <button
                key={driver.id || index}
                type="button"
                onClick={() => handleSelect(driver)}
                className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 focus:bg-slate-100 dark:focus:bg-slate-700 focus:outline-none"
              >
                <div className="flex items-center gap-2">
                  {driver.isNewOption ? (
                    <User size={14} className="text-green-600 dark:text-green-400" />
                  ) : (
                    <User size={14} className="text-slate-400" />
                  )}
                  <div className="flex flex-col items-start">
                    <span className={`text-slate-900 dark:text-white ${driver.isNewOption ? 'text-green-600 dark:text-green-400 font-medium' : ''}`}>
                      {driver.name}
                    </span>
                    {!driver.isNewOption && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {driver.driver_rank} • {driver.employee_id}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-slate-500 dark:text-slate-400 text-sm">
              No drivers found
            </div>
          )}

          {searchTerm && filteredDrivers.length < drivers.filter(driver =>
            (driver.name && driver.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (driver.employee_id && driver.employee_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (driver.driver_rank && driver.driver_rank.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (driver.phone_number && driver.phone_number.includes(searchTerm))
          ).length && (
            <div className="px-3 py-2 text-slate-400 dark:text-slate-500 text-xs border-t border-slate-200 dark:border-slate-700">
              Showing top 10 results. Type more to refine.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableDriverDropdown;
