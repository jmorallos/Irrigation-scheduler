import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DAY_ORDER, getTodayKey } from '../utils/dateUtils';

const STORAGE_KEY = 'selected-weekday';
const SelectedDayContext = createContext(null);

function readStored() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (DAY_ORDER.includes(stored)) return stored;
  } catch {
    /* ignore quota / private mode */
  }
  return getTodayKey();
}

export function SelectedDayProvider({ children }) {
  const clockToday = getTodayKey();
  const [selectedDay, setSelectedDayState] = useState(readStored);

  const setSelectedDay = useCallback((day) => {
    if (!DAY_ORDER.includes(day)) return;
    setSelectedDayState(day);
    try {
      sessionStorage.setItem(STORAGE_KEY, day);
    } catch {
      /* ignore quota / private mode */
    }
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
