import { useState, useEffect } from 'react';
import { programsRepository } from '../db/programsRepository';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { DAY_ORDER } from '../utils/dateUtils';
import { withCycleNumbers, getZoneNumber } from '../utils/scheduleUtils';
import { sortProgramsByController } from '../db/programSort';

export function useWeeklySchedule() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const programs = sortProgramsByController(await programsRepository.getAll());
        const result = [];

        for (const program of programs) {
          const zones = await zonesRepository.getByProgramId(program.id);
          zones.sort((a, b) => {
            const numA = getZoneNumber(a) ?? 999;
            const numB = getZoneNumber(b) ?? 999;
            if (numA !== numB) return numA - numB;
            return a.name.localeCompare(b.name);
          });
          const rows = [];

          for (const zone of zones) {
            const schedules = withCycleNumbers(await schedulesRepository.getByZoneId(zone.id));
            const dayMap = Object.fromEntries(DAY_ORDER.map(day => [day, []]));

            for (const schedule of schedules.filter(s => s.status === 'active')) {
              for (const day of schedule.days_of_week) {
                dayMap[day].push(schedule);
              }
            }

            for (const day of DAY_ORDER) {
              dayMap[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
            }

            rows.push({ zone, program, days: dayMap });
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
