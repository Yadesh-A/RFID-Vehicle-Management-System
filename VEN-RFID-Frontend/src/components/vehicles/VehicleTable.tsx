import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Vehicle, VehicleEntry } from '../../types/types';
import { ChevronDown, ChevronUp, Search, Filter, ArrowUpRight, CheckCircle, XCircle } from 'lucide-react';

interface VehicleTableProps {
  vehicles: Vehicle[];
  recentEntries: Record<string, VehicleEntry | undefined>;
}

const VehicleTable: React.FC<VehicleTableProps> = ({ vehicles, recentEntries }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'licensePlate' | 'owner' | 'lastActivity'>('lastActivity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'inside' | 'outside'>('all');
  
  // Filter vehicles based on search term and status filter
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (statusFilter === 'all') return true;
    
    const recentEntry = recentEntries[vehicle.id];
    if (!recentEntry) return statusFilter === 'outside';
    
    return statusFilter === 'inside' ? 
      recentEntry.type === 'entry' : 
      recentEntry.type === 'exit';
  });
  
  // Sort vehicles
  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    if (sortField === 'licensePlate') {
      return sortDirection === 'asc' 
        ? a.licensePlate.localeCompare(b.licensePlate)
        : b.licensePlate.localeCompare(a.licensePlate);
    }
    
    if (sortField === 'owner') {
      return sortDirection === 'asc'
        ? a.owner.localeCompare(b.owner)
        : b.owner.localeCompare(a.owner);
    }
    
    // Sort by last activity timestamp
    const entryA = recentEntries[a.id];
    const entryB = recentEntries[b.id];
    
    if (!entryA && !entryB) return 0;
    if (!entryA) return sortDirection === 'asc' ? -1 : 1;
    if (!entryB) return sortDirection === 'asc' ? 1 : -1;
    
    const timeA = new Date(entryA.timestamp).getTime();
    const timeB = new Date(entryB.timestamp).getTime();
    
    return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
  });
  
  const handleSort = (field: 'licensePlate' | 'owner' | 'lastActivity') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  return (
    <div className="card">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 sm:mb-0">
            Vehicles
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search vehicles..."
                className="input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter size={16} className="text-slate-400" />
              </div>
              <select
                className="input pl-10 pr-8 appearance-none bg-[right_0.5rem_center] bg-no-repeat"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")" }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'inside' | 'outside')}
              >
                <option value="all">All Vehicles</option>
                <option value="inside">Currently Inside</option>
                <option value="outside">Currently Outside</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="table-container">
        <table className="table">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th scope="col" className="pl-6 pr-3 py-3.5">
                <div className="flex items-center">
                  <button
                    onClick={() => handleSort('licensePlate')}
                    className="group inline-flex"
                  >
                    License Plate
                    <span className="ml-2 flex-none text-slate-400 group-hover:visible">
                      {sortField === 'licensePlate' ? (
                        sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      ) : (
                        <ChevronDown size={16} className="invisible group-hover:visible" />
                      )}
                    </span>
                  </button>
                </div>
              </th>
              <th scope="col">
                <div className="flex items-center">
                  <button
                    onClick={() => handleSort('owner')}
                    className="group inline-flex"
                  >
                    Owner
                    <span className="ml-2 flex-none text-slate-400 group-hover:visible">
                      {sortField === 'owner' ? (
                        sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      ) : (
                        <ChevronDown size={16} className="invisible group-hover:visible" />
                      )}
                    </span>
                  </button>
                </div>
              </th>
              <th scope="col">Vehicle</th>
              <th scope="col">Status</th>
              <th scope="col">
                <div className="flex items-center">
                  <button
                    onClick={() => handleSort('lastActivity')}
                    className="group inline-flex"
                  >
                    Last Activity
                    <span className="ml-2 flex-none text-slate-400 group-hover:visible">
                      {sortField === 'lastActivity' ? (
                        sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      ) : (
                        <ChevronDown size={16} className="invisible group-hover:visible" />
                      )}
                    </span>
                  </button>
                </div>
              </th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
            {sortedVehicles.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500 dark:text-slate-400">
                  No vehicles found
                </td>
              </tr>
            ) : (
              sortedVehicles.map((vehicle) => {
                const recentEntry = recentEntries[vehicle.id];
                const isInside = recentEntry ? recentEntry.type === 'entry' : false;
                
                return (
                  <tr key={vehicle.id}>
                    <td className="font-medium text-slate-900 dark:text-white">
                      {vehicle.licensePlate}
                    </td>
                    <td>{vehicle.owner}</td>
                    <td>
                      {vehicle.make} {vehicle.model} ({vehicle.year})
                    </td>
                    <td>
                      <div className="flex items-center">
                        {isInside ? (
                          <span className="badge badge-green flex items-center">
                            <CheckCircle size={12} className="mr-1" /> Inside
                          </span>
                        ) : (
                          <span className="badge badge-yellow flex items-center">
                            <XCircle size={12} className="mr-1" /> Outside
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {recentEntry ? (
                        <div>
                          <div className={`text-sm ${
                            recentEntry.type === 'entry' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                          }`}>
                            {recentEntry.type === 'entry' ? 'Entered' : 'Exited'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(recentEntry.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500 dark:text-slate-400">No activity</span>
                      )}
                    </td>
                    <td>
                      <Link
                        to={`/vehicles/${vehicle.id}`}
                        className="btn btn-secondary flex items-center text-xs py-1.5"
                      >
                        View Details <ArrowUpRight size={14} className="ml-1" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VehicleTable;