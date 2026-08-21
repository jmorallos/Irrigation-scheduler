import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DAY_ORDER, getTodayKey } from '../utils/dateUtils';

const SelectedDayContext = createContext(null);

export function SelectedDayProvider({ children }) {
  const clockToday = getTodayKey();
  const [selectedDay, setSelectedDayState] = useState(() => {
    try {
      sessionStorage.removeItem('selected-weekday');
    } catch {
      /* ignore */
    }
    return clockToday;
  });

  const setSelectedDay = useCallback((day) => {
    if (!DAY_ORDER.includes(day)) return;
    setSelectedDayState(day);
  }, []);

  const value = useMemo(() => ({
    selectedDay,
    setSelectedDay,
    clockToday,
    isClockToday: selectedDay === clockToday,
  }), [selectedDay, setSelectedDay, clockToday]);

  return (
    <SelectedDayContext.Provider value={value}>
      {children}
    </SelectedDayContext.Provider>
  );
}

export function useSelectedDay() {
  const ctx = useContext(SelectedDayContext);
  if (!ctx) {
    throw new Error('useSelectedDay must be used within SelectedDayProvider');
  }
  return ctx;
}
