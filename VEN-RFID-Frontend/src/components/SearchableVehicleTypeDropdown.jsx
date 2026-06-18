
import React, { useState, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

const SearchableVehicleTypeDropdown = ({ value, onChange, vehicleTypes = [], onCreate, placeholder = 'Select vehicle type...', className = '', disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const filteredTypes = searchTerm
    ? vehicleTypes.filter(type => type.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : vehicleTypes.slice(0, 10);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (type) => {
    onChange(type);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputChange = (e) => {
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

  const handleCreateType = async (typeName) => {
    if (!typeName.trim() || !onCreate) return;
    setLoading(true);
    try {
      await onCreate(typeName);
      setSearchTerm('');
      setIsOpen(false);
    } catch {
      alert('Error creating vehicle type');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : value?.name || ''}
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
          ) : filteredTypes.length > 0 ? (
            filteredTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => handleSelect(type)}
                className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 focus:bg-slate-100 dark:focus:bg-slate-700 focus:outline-none"
              >
                <div className="flex items-center gap-2">
                  <Search size={14} className="text-slate-400" />
                  <span className="text-slate-900 dark:text-white">{type.name}</span>
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-slate-500 dark:text-slate-400 text-sm">
              No vehicle types found
            </div>
          )}

          {/* Create new vehicle type option */}
          {searchTerm && !filteredTypes.some(t => t.name.toLowerCase() === searchTerm.toLowerCase()) && (
            <button
              type="button"
              onClick={() => handleCreateType(searchTerm)}
              className="w-full px-3 py-2 text-left bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 focus:outline-none border-t border-slate-200 dark:border-slate-700"
              disabled={loading}
            >
              + Create new type "{searchTerm}"
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableVehicleTypeDropdown;
