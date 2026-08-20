import { programsRepository } from '../db/programsRepository';
import { loadProgramHydratedZones } from './valveRecords';
import { schedulesRepository } from '../db/schedulesRepository';
import { DAY_ORDER } from './dateUtils';
import { withCycleNumbers, getZoneNumber } from './scheduleUtils';
import { sortProgramsByController } from '../db/programSort';

export async function loadWeeklyScheduleGroups() {
  const programs = sortProgramsByController(await programsRepository.getAll());
  const result = [];

  for (const program of programs) {
    const zones = await loadProgramHydratedZones(program.id);
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

  return result;
}
