import { useGlobalTimeContext } from '../context/GlobalTimeContext';

/**
 * Hook that provides a consistent global time that increments from the shared initial time
 * This ensures all components across the app use the same synchronized time
 */
export const useGlobalTime = () => {
  const { currentTime } = useGlobalTimeContext();
  return currentTime;
};
