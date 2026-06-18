import React from 'react';
import { RefreshCw } from 'lucide-react';

interface RefreshButtonProps {
  onRefresh: () => void;
  loading?: boolean;
  className?: string;
}

const RefreshButton: React.FC<RefreshButtonProps> = ({ 
  onRefresh, 
  loading = false,
  className = '' 
}) => {
  return (
    <button
      onClick={onRefresh}
      disabled={loading}
      className={`
        inline-flex items-center gap-2 px-4 py-2 
        bg-blue-600 hover:bg-blue-700 
        dark:bg-blue-500 dark:hover:bg-blue-600
        text-white font-medium rounded-lg
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        shadow-sm hover:shadow-md
        ${className}
      `}
      title="Refresh data"
    >
      <RefreshCw 
        size={18} 
        className={loading ? 'animate-spin' : ''} 
      />
      <span className="hidden sm:inline">Refresh</span>
    </button>
  );
};

export default RefreshButton;
