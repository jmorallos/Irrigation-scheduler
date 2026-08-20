import { useState, useEffect, useCallback } from 'react';
import { programsRepository } from '../db/programsRepository';
import { loadProgramHydratedZones } from '../utils/valveRecords';
import { schedulesRepository } from '../db/schedulesRepository';
import { getTodayKey } from '../utils/dateUtils';
import { withCycleNumbers } from '../utils/scheduleUtils';
import { sortProgramsByController } from '../db/programSort';

export function useTodaySchedule(dayKey) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const todayKey = dayKey || getTodayKey();
      const programs = sortProgramsByController(await programsRepository.getAll());
      const result = [];

      for (const program of programs.filter(p => p.status === 'active')) {
        const zones = await loadProgramHydratedZones(program.id);
        for (const zone of zones.filter(z => z.status === 'active')) {
          const schedules = withCycleNumbers(await schedulesRepository.getByZoneId(zone.id));
          for (const schedule of schedules) {
            if (schedule.status === 'active' && schedule.days_of_week.includes(todayKey)) {
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dayKey]);

  useEffect(() => { load(); }, [load]);

  return { items, loading, error, reload: load };
}
