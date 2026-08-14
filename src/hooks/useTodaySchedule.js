import { useState, useEffect } from 'react';
import { programsRepository } from '../db/programsRepository';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { getTodayKey } from '../utils/dateUtils';

export function useTodaySchedule() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const todayKey = getTodayKey();
        const programs = await programsRepository.getAll();
        const result = [];

        for (const program of programs.filter(p => p.status === 'active')) {
          const zones = await zonesRepository.getByProgramId(program.id);
          for (const zone of zones.filter(z => z.status === 'active')) {
            const schedules = await schedulesRepository.getByZoneId(zone.id);
            for (const schedule of schedules) {
              if (schedule.status === 'active' && schedule.days_of_week.includes(todayKey)) {
                result.push({ schedule, zone, program });
              }
            }
          }
        }

        result.sort((a, b) => a.schedule.start_time.localeCompare(b.schedule.start_time));
        setItems(result);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { items, loading };
}
