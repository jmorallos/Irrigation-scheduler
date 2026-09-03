import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  DAY_ORDER,
  getTodayKey,
  startOfWeekMonday,
  addWeeks,
  getDateForDayKey,
  weekDatesFrom,
  formatWeekRange,
  formatDayDateNumber,
  isSameCalendarDay,
  isSameWeekMonday,
} from '../utils/dateUtils';

const SelectedDayContext = createContext(null);

export function SelectedDayProvider({ children }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [selectedDay, setSelectedDayState] = useState(() => {
    try {
      sessionStorage.removeItem('selected-weekday');
    } catch {
      /* ignore */
    }
    return getTodayKey();
  });

  const setSelectedDay = useCallback((day) => {
    if (!DAY_ORDER.includes(day)) return;
    setSelectedDayState(day);
  }, []);

  const shiftWeek = useCallback((delta) => {
    setWeekStart(prev => addWeeks(prev, delta));
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setWeekStart(startOfWeekMonday(new Date()));
    setSelectedDayState(getTodayKey());
  }, []);

  const value = useMemo(() => {
    const clockDate = new Date();
    const clockToday = getTodayKey(clockDate);
    const viewDate = getDateForDayKey(selectedDay, weekStart);
    const weekDates = weekDatesFrom(weekStart);
    const viewingCurrentWeek = isSameWeekMonday(weekStart, clockDate);
    const todayKeyInView = viewingCurrentWeek ? clockToday : null;

    return {
      selectedDay,
      setSelectedDay,
      weekStart,
      shiftWeek,
      goToCurrentWeek,
      viewDate,
      weekDates,
      weekRangeLabel: formatWeekRange(weekStart),
      weekDateNumbers: weekDates.map(formatDayDateNumber),
      clockToday,
      todayKeyInView,
      isClockToday: isSameCalendarDay(viewDate, clockDate),
      viewingCurrentWeek,
    };
  }, [selectedDay, setSelectedDay, weekStart, shiftWeek, goToCurrentWeek]);

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
