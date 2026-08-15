import { getTodayKey, formatDaysCompact } from './dateUtils';
import { sortProgramsByController } from '../db/programSort';
import { getProgramTheme, getZoneTheme } from './programColors';
import { decorateZoneSchedules } from './scheduleStats';
import { getZoneNumber, getZoneShortName } from './scheduleUtils';

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
  const zoneTotals = [];

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

      const decorated = decorateZoneSchedules(schedules);
      if (decorated.length > 0) {
        const first = decorated[0];
        const soak = decorated.map(item => item.soakHours).findLast(value => value != null) ?? null;
        const theme = getZoneTheme(zone, program);
        zoneTotals.push({
          id: zone.id,
          zoneNumber: getZoneNumber(zone),
          name: getZoneShortName(zone),
          program: program.controller_program || program.name,
          days: formatDaysCompact(first.days_of_week),
          minutes: first.dailyRuntime,
          hours: Math.round((first.dailyRuntime / 60) * 100) / 100,
          runs: first.runsPerDay,
          soakHours: soak,
          color: theme.badgeHex,
          rowHex: theme.rowHex,
          borderHex: theme.borderHex,
        });
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
    zoneTotals: zoneTotals.sort((a, b) => (a.zoneNumber ?? 999) - (b.zoneNumber ?? 999)),
  };
}

export function maxValue(items, key = 'minutes') {
  return Math.max(...items.map(item => item[key]), 1);
}

// Back-compat alias used by chart components for minutes scaling
export function maxMinutes(items) {
  return maxValue(items, 'minutes');
}
