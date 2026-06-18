import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Car,
  User,
  Phone,
  Hash,
  Tag,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const VehicleDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { vehicles, drivers, vehicleStatuses, loading } = useApp();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading vehicle data...</p>
        </div>
      </div>
    );
  }

  const vehicle = vehicles.find(v => v.id.toString() === id);
  const driver = vehicle?.driver ? drivers.find(d => d.id === vehicle.driver) : null;
  const latestStatus = vehicleStatuses
    .filter(status => status.vehicle === vehicle?.id)
    .sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime())[0];

  if (!vehicle) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-xl font-semibold">Vehicle Not Found</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">The vehicle you're looking for doesn't exist or has been removed.</p>
          <Link to="/" className="mt-4 inline-block btn btn-primary">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with back button */}
      <div>
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 mb-4">
          <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Vehicle Details
        </h1>
      </div>

      {/* Vehicle Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle Info Card */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Car size={18} className="mr-2 text-blue-600" /> Vehicle Information
          </h2>

          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center text-slate-600 dark:text-slate-400">
                <Tag size={16} className="mr-2" /> Vehicle Number Plate
              </div>
              <div className="font-medium">{vehicle.vehicle_number}</div>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center text-slate-600 dark:text-slate-400">
                <User size={16} className="mr-2" /> Driver Name
              </div>
              <div className="font-medium">{driver?.name || 'N/A'}</div>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center text-slate-600 dark:text-slate-400">
                <User size={16} className="mr-2" /> Driver Rank
              </div>
              <div className="font-medium">{driver?.driver_rank || 'N/A'}</div>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center text-slate-600 dark:text-slate-400">
                <Hash size={16} className="mr-2" /> Employee ID
              </div>
              <div className="font-medium">{driver?.employee_id || 'N/A'}</div>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center text-slate-600 dark:text-slate-400">
                <Car size={16} className="mr-2" /> Vehicle Type
              </div>
              <div className="font-medium">{driver?.vehicle_type || 'N/A'}</div>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center text-slate-600 dark:text-slate-400">
                <Phone size={16} className="mr-2" /> Phone Number
              </div>
              <div className="font-medium">{driver?.phone_number || 'N/A'}</div>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center text-slate-600 dark:text-slate-400">
                <Hash size={16} className="mr-2" /> Chassis Number
              </div>
              <div className="font-medium">{vehicle.chassis_number}</div>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center text-slate-600 dark:text-slate-400">
                <Tag size={16} className="mr-2" /> Tag ID
              </div>
              <div className="font-medium">{vehicle.tag_id}</div>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center text-slate-600 dark:text-slate-400">
                <CheckCircle size={16} className="mr-2" /> Status (In/Out)
              </div>
              <div className="font-medium">{vehicle.status === 'in' ? 'In' : 'Out'}</div>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center text-slate-600 dark:text-slate-400">
                <Car size={16} className="mr-2" /> Colour
              </div>
              <div className="font-medium">{vehicle.color}</div>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center text-slate-600 dark:text-slate-400">
                <Car size={16} className="mr-2" /> Make and Model
              </div>
              <div className="font-medium">{vehicle.make} {vehicle.model}</div>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center text-slate-600 dark:text-slate-400">
                <Car size={16} className="mr-2" /> Year
              </div>
              <div className="font-medium">{vehicle.year}</div>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center text-slate-600 dark:text-slate-400">
                <Clock size={16} className="mr-2" /> Entry Time
              </div>
              <div className="font-medium">
                {latestStatus?.entry_time ? format(new Date(latestStatus.entry_time), 'PPpp') : 'N/A'}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center text-slate-600 dark:text-slate-400">
                <Clock size={16} className="mr-2" /> Exit Time
              </div>
              <div className="font-medium">
                {latestStatus?.exit_time ? format(new Date(latestStatus.exit_time), 'PPpp') : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder for additional content if needed */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Additional Information</h2>
          <p className="text-slate-600 dark:text-slate-400">
            This section can be used for additional vehicle details or actions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetails;
