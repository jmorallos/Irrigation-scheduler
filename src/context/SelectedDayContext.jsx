import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  DAY_ORDER,
  getTodayKey,
  startOfWeekMonday,
  startOfDay,
  addWeeks,
  getDateForDayKey,
  weekDatesFrom,
  formatWeekRange,
  formatDayDateNumber,
  isSameCalendarDay,
  isSameWeekMonday,
} from '../utils/dateUtils';

const SelectedDayContext = createContext(null);

function selectedDayForWeek(weekStart, clockDate = new Date()) {
  if (isSameWeekMonday(weekStart, clockDate)) return getTodayKey(clockDate);
  return 'mon';
}

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
  const weekStartRef = useRef(weekStart);
  const selectedDayRef = useRef(selectedDay);
  weekStartRef.current = weekStart;
  selectedDayRef.current = selectedDay;

  const setSelectedDay = useCallback((day) => {
    if (!DAY_ORDER.includes(day)) return;
    setSelectedDayState(day);
  }, []);

  const shiftWeek = useCallback((delta) => {
    const next = addWeeks(weekStartRef.current, delta);
    setWeekStart(next);
    setSelectedDayState(selectedDayForWeek(next));
  }, []);

  const shiftDay = useCallback((delta) => {
    const current = getDateForDayKey(selectedDayRef.current, weekStartRef.current);
    const next = startOfDay(current);
    next.setDate(next.getDate() + (Number(delta) || 0));
    setWeekStart(startOfWeekMonday(next));
    setSelectedDayState(getTodayKey(next));
  }, []);

  const goToDate = useCallback((date) => {
    if (!date || Number.isNaN(date.getTime())) return;
    const day = startOfDay(date);
    setWeekStart(startOfWeekMonday(day));
    setSelectedDayState(getTodayKey(day));
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
      shiftDay,
      goToDate,
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
  }, [selectedDay, setSelectedDay, weekStart, shiftWeek, shiftDay, goToDate, goToCurrentWeek]);

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
