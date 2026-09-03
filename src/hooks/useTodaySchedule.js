import { useState, useEffect, useCallback, useRef } from 'react';
import { programsRepository } from '../db/programsRepository';
import { loadProgramHydratedZones } from '../utils/valveRecords';
import { schedulesRepository } from '../db/schedulesRepository';
import { getTodayKey, getDateForDayKey } from '../utils/dateUtils';
import { scheduleRunsOnDate } from '../utils/wateringCalendar';
import { withCycleNumbers } from '../utils/scheduleUtils';
import { sortProgramsByController } from '../db/programSort';

export function useTodaySchedule(dayKey, referenceDate = new Date()) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasLoaded = useRef(false);
  const referenceMs = referenceDate instanceof Date ? referenceDate.getTime() : Number(referenceDate);

  const load = useCallback(async () => {
    const showSpinner = !hasLoaded.current;
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const todayKey = dayKey || getTodayKey();
      const anchor = new Date(referenceMs);
      const viewDate = getDateForDayKey(todayKey, anchor);
      const programs = sortProgramsByController(await programsRepository.getAll());
      const result = [];

      for (const program of programs.filter(p => p.status === 'active')) {
        const zones = await loadProgramHydratedZones(program.id);
        for (const zone of zones.filter(z => z.status === 'active')) {
          const schedules = withCycleNumbers(await schedulesRepository.getByZoneId(zone.id));
          for (const schedule of schedules) {
            if (scheduleRunsOnDate(program, schedule, viewDate)) {
              result.push({ schedule, zone, program });
            }
          }
        }
      }

      result.sort((a, b) => {
        const byTime = a.schedule.start_time.localeCompare(b.schedule.start_time);
        if (byTime !== 0) return byTime;
        return (a.schedule.cycle ?? 1) - (b.schedule.cycle ?? 1);
      });
      setItems(result);
      hasLoaded.current = true;
    } catch (err) {
      setError(err.message);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [dayKey, referenceMs]);

  useEffect(() => { load(); }, [load]);

  return { items, loading, error, reload: load };
}
