import { DAY_ORDER, DAY_LABELS, getTodayKey, formatDaysCompact } from './dateUtils';
import { sortProgramsByController } from '../db/programSort';
import { getProgramTheme, getZoneTheme } from './programColors';
import { decorateZoneSchedules } from './scheduleStats';
import { getZoneNumber, getZoneShortName } from './scheduleUtils';

/**
 * Minutes by day = sum of active cycle durations on that weekday.
 * Weekly program minutes = duration × run days.
 * Today minutes/starts = cycles that run today.
 * Zone minutes = that zone's daily cycle total (not multiplied by days).
 */
export async function buildScheduleChartData({
  programsRepository,
  zonesRepository,
  schedulesRepository,
}) {
  const todayKey = getTodayKey();
  const programs = sortProgramsByController(await programsRepository.getAll());
  const minutesByDay = DAY_ORDER.map(day => ({
    key: day,
    label: DAY_LABELS[day],
    minutes: 0,
  }));
  const dayIndex = Object.fromEntries(minutesByDay.map((item, index) => [item.key, index]));
  const byProgramToday = [];
  const byProgramWeek = [];
  const zoneTotals = [];

  for (const program of programs) {
    if (program.status !== 'active') continue;

    let todayMinutes = 0;
    let todayStarts = 0;
    let weekMinutes = 0;
    const zones = await zonesRepository.getByProgramId(program.id);

    for (const zone of zones) {
      if (zone.status !== 'active') continue;
      const schedules = await schedulesRepository.getByZoneId(zone.id);

      for (const schedule of schedules) {
        if (schedule.status !== 'active') continue;
        const duration = Number(schedule.duration_minutes) || 0;
        const days = schedule.days_of_week ?? [];
        weekMinutes += duration * days.length;

        for (const day of days) {
          const index = dayIndex[day];
          if (index != null) minutesByDay[index].minutes += duration;
        }

        if (days.includes(todayKey)) {
          todayMinutes += duration;
          todayStarts += 1;
        }
      }

      const decorated = decorateZoneSchedules(schedules);
      if (decorated.length > 0) {
        const first = decorated[0];
        const soak = decorated.map(item => item.soakHours).findLast(value => value != null) ?? null;
        const theme = getZoneTheme(zone, program);
        const zoneNumber = getZoneNumber(zone);
        const name = getZoneShortName(zone);
        zoneTotals.push({
          id: zone.id,
          zoneNumber,
          name: zoneNumber != null ? `${zoneNumber} · ${name}` : name,
          program: program.controller_program || program.name,
          days: formatDaysCompact(first.days_of_week),
          minutes: first.dailyRuntime,
          hours: Math.round((first.dailyRuntime / 60) * 100) / 100,
          runs: first.runsPerDay,
          soakHours: soak,
          color: theme.badgeHex,
          track: theme.rowAltHex,
          rowHex: theme.rowHex,
          borderHex: theme.borderHex,
        });
      }
    }

    const theme = getProgramTheme(program);
    const colors = {
      color: theme.badgeHex,
      track: theme.rowAltHex,
    };

    if (weekMinutes > 0) {
      byProgramWeek.push({
        id: program.id,
        name: program.name,
        minutes: weekMinutes,
        ...colors,
      });
    }

    if (todayMinutes > 0 || todayStarts > 0) {
      byProgramToday.push({
        id: program.id,
        name: program.name,
        minutes: todayMinutes,
        starts: todayStarts,
        ...colors,
      });
    }
  }

  return {
    minutesByDay,
    byProgramToday: byProgramToday.sort((a, b) => b.minutes - a.minutes),
    byProgramWeek: byProgramWeek.sort((a, b) => b.minutes - a.minutes),
    zoneTotals: zoneTotals.sort((a, b) => (a.zoneNumber ?? 999) - (b.zoneNumber ?? 999)),
  };
}

export function maxValue(items, key = 'minutes') {
  return Math.max(...items.map(item => item[key]), 1);
}

export function maxMinutes(items) {
  return maxValue(items, 'minutes');
}
