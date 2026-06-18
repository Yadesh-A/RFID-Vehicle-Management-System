import { useGlobalTimeContext } from '../context/GlobalTimeContext';

export const useDynamicTime = () => {
  const { formatTime, formattedDate, formattedDay } = useGlobalTimeContext();
  return { formatTime, formattedDate, formattedDay };
};