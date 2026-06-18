import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { API_BASE } from '../config/api.js';
import { getAccessToken } from '../utils/auth.js';

interface SearchableUnitDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const SearchableUnitDropdown: React.FC<SearchableUnitDropdownProps> = ({
  value,
  onChange,
  placeholder = "Select unit...",
  className = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch units from API
  useEffect(() => {
    setLoading(true);
    const token = getAccessToken();
    fetch(`${API_BASE}/vehicle-units/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        let units = Array.isArray(data) ? data : (data.results || []);
        setAvailableUnits(units);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filter units based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUnits(availableUnits.slice(0, 10));
    } else {
      const filtered = availableUnits
        .filter(unit =>
          unit.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, 10);
      setFilteredUnits(filtered);
    }
  }, [searchTerm, availableUnits]);

  // Create new unit via API
  const handleCreateUnit = async (unitName: string) => {
    if (!unitName.trim()) return;
    setLoading(true);
    const token = getAccessToken();
    try {
      const res = await fetch(`${API_BASE}/vehicle-units/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name: unitName })
      });
      if (res.ok) {
        const newUnit = await res.json();
        setAvailableUnits(prev => [...prev, newUnit]);
        onChange(newUnit.id.toString());
        setIsOpen(false);
        setSearchTerm('');
      } else {
        alert('Failed to create unit');
      }
    } catch (e) {
      alert('Error creating unit');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSelect = (unit: any) => {
    onChange(unit.id.toString());
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

  const getSelectedDisplay = () => {
    if (!value) return '';
    const unit = availableUnits.find(u => u.id.toString() === value);
    return unit ? unit.name : '';
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : getSelectedDisplay()}
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
          {loading ? (
            <div className="px-3 py-2 text-slate-500 dark:text-slate-400 text-sm">Loading...</div>
          ) : filteredUnits.length > 0 ? (
            filteredUnits.map((unit, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelect(unit)}
                className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 focus:bg-slate-100 dark:focus:bg-slate-700 focus:outline-none"
              >
                <div className="flex items-center gap-2">
                  <Search size={14} className="text-slate-400" />
                  <span className="text-slate-900 dark:text-white">{unit.name}</span>
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-slate-500 dark:text-slate-400 text-sm">
              No units found
            </div>
          )}

          {/* Create new unit option */}
          {searchTerm && !filteredUnits.some(u => u.name === searchTerm) && (
            <button
              type="button"
              onClick={() => handleCreateUnit(searchTerm)}
              className="w-full px-3 py-2 text-left bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 focus:outline-none border-t border-slate-200 dark:border-slate-700"
              disabled={loading}
            >
              + Create new unit "{searchTerm}"
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableUnitDropdown;
