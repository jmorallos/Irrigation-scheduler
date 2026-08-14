import { DAY_ORDER, DAY_LABELS } from './dateUtils';
import { sortProgramsByController } from '../db/programSort';

/**
 * Build chart datasets from active programs, zones, and schedules.
 * Minutes by day = sum of cycle durations that run on each weekday.
 * Minutes by program = sum of (duration × run days) per program per week.
 */
export async function buildScheduleChartData({
  programsRepository,
  zonesRepository,
  schedulesRepository,
}) {
  const programs = sortProgramsByController(await programsRepository.getAll());
  const minutesByDay = Object.fromEntries(DAY_ORDER.map(day => [day, 0]));
  const minutesByProgram = [];

  for (const program of programs) {
    if (program.status !== 'active') continue;

    let programWeekly = 0;
    const zones = await zonesRepository.getByProgramId(program.id);

    for (const zone of zones) {
      if (zone.status !== 'active') continue;
      const schedules = await schedulesRepository.getByZoneId(zone.id);

      for (const schedule of schedules) {
        if (schedule.status !== 'active') continue;

        const duration = schedule.duration_minutes;
        for (const day of schedule.days_of_week) {
          if (day in minutesByDay) {
            minutesByDay[day] += duration;
          }
        }
        programWeekly += duration * schedule.days_of_week.length;
      }
    }

    if (programWeekly > 0) {
      minutesByProgram.push({
        id: program.id,
        name: program.name,
        minutes: programWeekly,
      });
    }
  }

  return {
    byDay: DAY_ORDER.map(day => ({
      day,
      label: DAY_LABELS[day],
      minutes: minutesByDay[day],
    })),
    byProgram: minutesByProgram.sort((a, b) => b.minutes - a.minutes),
  };
}

export function maxMinutes(items) {
  return Math.max(...items.map(item => item.minutes), 1);
}
