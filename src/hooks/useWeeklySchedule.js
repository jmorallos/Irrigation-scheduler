import { useState, useEffect } from 'react';
import { programsRepository } from '../db/programsRepository';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { DAY_ORDER } from '../utils/dateUtils';

export function useWeeklySchedule() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const programs = await programsRepository.getAll();
        const result = [];

        for (const program of programs) {
          const zones = await zonesRepository.getByProgramId(program.id);
          const rows = [];

          for (const zone of zones) {
            const schedules = await schedulesRepository.getByZoneId(zone.id);
            const dayMap = {};

            for (const s of schedules.filter(s => s.status === 'active')) {
              for (const day of s.days_of_week) {
                if (!dayMap[day] || s.start_time < dayMap[day].start_time) {
                  dayMap[day] = s;
                }
              }
            }

            const filledDays = Object.fromEntries(
              DAY_ORDER.map(d => [d, dayMap[d] ?? null])
            );

            rows.push({ zone, program, days: filledDays });
          }

          if (rows.length > 0) {
            result.push({ program, rows });
          }
        }

        setGroups(result);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { groups, loading };
}
