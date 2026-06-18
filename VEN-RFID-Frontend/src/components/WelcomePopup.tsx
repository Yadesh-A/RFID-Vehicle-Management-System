import React, { useEffect, useState } from 'react';
import { X, CheckCircle } from 'lucide-react';

interface WelcomePopupProps {
  userName: string;
  onClose: () => void;
}

const WelcomePopup: React.FC<WelcomePopupProps> = ({ userName, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    setTimeout(() => setIsVisible(true), 100);

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-4 px-4 pointer-events-none">
      <div
        className={`
          pointer-events-auto
          relative
          w-full max-w-md
          bg-gradient-to-br from-blue-50 via-white to-indigo-50
          dark:from-slate-800 dark:via-slate-800 dark:to-slate-900
          rounded-2xl
          shadow-2xl
          border border-blue-100 dark:border-slate-700
          overflow-hidden
          transform transition-all duration-300 ease-out
          ${isVisible && !isClosing ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95'}
        `}
      >
        {/* Decorative gradient overlay */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-40 h-40 bg-blue-500 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-indigo-500 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors z-10"
          aria-label="Close"
        >
          <X size={18} className="text-slate-500 dark:text-slate-400" />
        </button>

        {/* Content */}
        <div className="relative p-6">
          {/* Logo and Success Icon */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              {/* Logo */}
              <div className="bg-white dark:bg-slate-700 rounded-xl p-3 shadow-lg">
                <img
                  src="/src/img/VEN-logo2.png"
                  alt="Veeral Enterprises Logo"
                  className="h-16 w-auto"
                />
              </div>
              {/* Success badge */}
              <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1 shadow-lg animate-bounce">
                <CheckCircle size={20} className="text-white" />
              </div>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Welcome Back, {userName}! 👋
            </h2>
            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              Vehicle Monitoring System
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              Veeral Enterprises
            </p>
          </div>

          {/* Decorative divider */}
          <div className="flex items-center justify-center my-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"></div>
          </div>

          {/* Additional info */}
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your session is now active
            </p>
          </div>

          {/* Progress bar for auto-dismiss */}
          <div className="mt-4 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-progress"
            ></div>
          </div>
        </div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePopup;
