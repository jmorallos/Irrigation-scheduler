import { useState, useEffect } from 'react';
import { programsRepository } from '../db/programsRepository';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { sortProgramsByController } from '../db/programSort';
import { getZoneNumber } from '../utils/scheduleUtils';
import { decorateZoneSchedules } from '../utils/scheduleStats';
import { getProgramTheme, getZoneTheme } from '../utils/programColors';

export function useMainSchedule() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const programs = sortProgramsByController(await programsRepository.getAll());
        const result = [];

        for (const program of programs) {
          if (program.status !== 'active') continue;
          const zones = await zonesRepository.getByProgramId(program.id);

          for (const zone of zones) {
            if (zone.status !== 'active') continue;
            const decorated = decorateZoneSchedules(await schedulesRepository.getByZoneId(zone.id));
            const theme = getZoneTheme(zone, program);

            for (const schedule of decorated) {
              result.push({
                id: schedule.id,
                program,
                zone,
                schedule,
                soakHours: schedule.soakHours,
                dailyRuntime: schedule.dailyRuntime,
                runsPerDay: schedule.runsPerDay,
                theme,
                programTheme: getProgramTheme(program),
                zoneNumber: getZoneNumber(zone),
              });
            }
          }
        }

        result.sort((a, b) => {
          const codeA = (a.program.controller_program ?? 'ZZ').toUpperCase();
          const codeB = (b.program.controller_program ?? 'ZZ').toUpperCase();
          if (codeA !== codeB) return codeA.localeCompare(codeB);
          return a.schedule.start_time.localeCompare(b.schedule.start_time);
        });

        setRows(result);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { rows, loading };
}
