import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Car, FileText } from 'lucide-react';
import { Vehicle } from '../types/types';

interface VehicleCarouselProps {
  vehicles: Vehicle[];
}

const VehicleCarousel: React.FC<VehicleCarouselProps> = ({ vehicles }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Show 2 vehicles at a time
  const vehiclesPerPage = 2;
  const totalPages = Math.ceil(vehicles.length / vehiclesPerPage);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex + 1 >= totalPages ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex - 1 < 0 ? totalPages - 1 : prevIndex - 1
    );
  };

  const startIndex = currentIndex * vehiclesPerPage;
  const visibleVehicles = vehicles.slice(startIndex, startIndex + vehiclesPerPage);

  // Don't show arrows if there are 2 or fewer vehicles
  const showArrows = vehicles.length > 2;

  if (vehicles.length === 0) {
    return (
      <p className="text-slate-500 dark:text-slate-400 text-center py-4">
        No vehicles assigned to this personnel
      </p>
    );
  }

  return (
    <div className="relative">
      {/* Carousel Container */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {/* Render vehicles in groups of 2 */}
          {Array.from({ length: totalPages }, (_, pageIndex) => (
            <div key={pageIndex} className="flex-none w-full grid grid-cols-2 gap-4">
              {vehicles.slice(pageIndex * vehiclesPerPage, (pageIndex + 1) * vehiclesPerPage).map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                  <div className="font-semibold text-slate-900 dark:text-white font-mono text-lg">
                        {vehicle.vehicle_number}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      vehicle.status === 'in'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {vehicle.status === 'in' ? 'Inside' : 'Outside'}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <FileText size={12} />
                      <span>Tag ID: {vehicle.current_tag_id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Car size={12} />
                      <span>Color: {vehicle.color}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Car size={12} />
                      <span>Make: {vehicle.make}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Car size={12} />
                      <span>Model: {vehicle.model}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Car size={12} />
                      <span>Year: {vehicle.year}</span>
                    </div>
                    {vehicle.unit_name && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <span className="font-semibold">Unit:</span> {vehicle.unit_name}
                      </div>
                    )}
                    {vehicle.flag_status && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-400">
                        ⚠️ Flagged: {vehicle.comment || 'No comment'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {showArrows && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-2 shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors z-10"
            aria-label="Previous vehicles"
          >
            <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-2 shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors z-10"
            aria-label="Next vehicles"
          >
            <ChevronRight size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </>
      )}
    </div>
  );
};

export default VehicleCarousel;
