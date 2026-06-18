import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { format } from 'date-fns';

interface GlobalTimeContextType {
  currentTime: Date;
  formatTime: (formatString: string) => string;
  formattedDate: string;
  formattedDay: string;
}

const GlobalTimeContext = createContext<GlobalTimeContextType | undefined>(undefined);

interface GlobalTimeProviderProps {
  children: ReactNode;
  initialTime: Date;
}

export const GlobalTimeProvider: React.FC<GlobalTimeProviderProps> = ({ children, initialTime }) => {
  const startTimeRef = useRef(Date.now());
  const [currentTime, setCurrentTime] = useState(() => new Date(initialTime.getTime()));

  useEffect(() => {
    // Reset start time when initialTime changes
    startTimeRef.current = Date.now();
    setCurrentTime(new Date(initialTime.getTime()));

    const timerId = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setCurrentTime(new Date(initialTime.getTime() + elapsed));
    }, 50); // Update every 50ms for very smooth updates

    return () => {
      clearInterval(timerId);
    };
  }, [initialTime]);

  const formatTime = (formatString: string) => {
    return format(currentTime, formatString);
  };

  const formattedDate = format(currentTime, 'PPP'); // e.g., 'October 15th, 2025'
  const formattedDay = format(currentTime, 'eeee'); // e.g., 'Wednesday'

  const value = {
    currentTime,
    formatTime,
    formattedDate,
    formattedDay,
  };

  return (
    <GlobalTimeContext.Provider value={value}>
      {children}
    </GlobalTimeContext.Provider>
  );
};

export const useGlobalTimeContext = () => {
  const context = useContext(GlobalTimeContext);
  if (context === undefined) {
    throw new Error('useGlobalTimeContext must be used within a GlobalTimeProvider');
  }
  return context;
};
