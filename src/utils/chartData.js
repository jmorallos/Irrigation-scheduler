import { getTodayKey } from './dateUtils';
import { sortProgramsByController } from '../db/programSort';
import { getProgramTheme } from './programColors';

/**
 * Build chart datasets for programs scheduled today only.
 * Minutes = sum of cycle durations running today.
 * Starts = count of cycles starting today (one per active cycle).
 */
export async function buildScheduleChartData({
  programsRepository,
  zonesRepository,
  schedulesRepository,
}) {
  const todayKey = getTodayKey();
  const programs = sortProgramsByController(await programsRepository.getAll());
  const byProgramToday = [];

  for (const program of programs) {
    if (program.status !== 'active') continue;

    let minutes = 0;
    let starts = 0;
    const zones = await zonesRepository.getByProgramId(program.id);

    for (const zone of zones) {
      if (zone.status !== 'active') continue;
      const schedules = await schedulesRepository.getByZoneId(zone.id);

      for (const schedule of schedules) {
        if (schedule.status !== 'active') continue;
        if (!schedule.days_of_week.includes(todayKey)) continue;

        minutes += schedule.duration_minutes;
        starts += 1;
      }
    }

    if (minutes > 0 || starts > 0) {
      const theme = getProgramTheme(program);
      byProgramToday.push({
        id: program.id,
        name: program.name,
        minutes,
        starts,
        color: theme.badgeHex,
        track: theme.rowAltHex,
      });
    }
  }

  return {
    byProgramToday: byProgramToday.sort((a, b) => b.minutes - a.minutes),
  };
}

export function maxValue(items, key = 'minutes') {
  return Math.max(...items.map(item => item[key]), 1);
}

// Back-compat alias used by chart components for minutes scaling
export function maxMinutes(items) {
  return maxValue(items, 'minutes');
}
