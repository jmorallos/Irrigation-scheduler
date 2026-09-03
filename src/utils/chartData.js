import { DAY_ORDER, DAY_LABELS, getTodayKey, getDateForDayKey, formatDayDateNumber } from './dateUtils';
import { sortProgramsByController } from '../db/programSort';
import { getProgramTheme, getZoneTheme } from './programColors';
import { getZoneNumber, getZoneShortName } from './scheduleUtils';
import { loadProgramHydratedZones } from './valveRecords';
import { gallonsForRun, gallonsForWeek } from './waterUsage';
import {
  scheduleRunsOnDate,
  effectiveScheduleDays,
  isIntervalProgram,
  weekDates,
} from './wateringCalendar';

/**
 * Minutes by day = sum of active cycle durations on that weekday.
 * Weekly program minutes = duration × run days.
 * Today minutes/starts = cycles that run on the selected weekday.
 * Zone minutes = that zone's cycle total for the selected weekday only.
 * Gallons use each valve's GPH when set (same day/week rules as minutes).
 */
export async function buildScheduleChartData({
  programsRepository,
  zonesRepository,
  schedulesRepository,
  dayKey = getTodayKey(),
  referenceDate = new Date(),
}) {
  const todayKey = dayKey;
  const calendarWeek = weekDates(referenceDate);
  const programs = sortProgramsByController(await programsRepository.getAll());
  const minutesByDay = DAY_ORDER.map((day, index) => ({
    key: day,
    label: DAY_LABELS[day],
    dateNumber: formatDayDateNumber(calendarWeek[index]),
    minutes: 0,
    gallons: 0,
  }));
  const dayIndex = Object.fromEntries(minutesByDay.map((item, index) => [item.key, index]));
  const byProgramToday = [];
  const byProgramWeek = [];
  const zoneTotals = [];

  for (const program of programs) {
    if (program.status !== 'active') continue;

    let todayMinutes = 0;
    let todayStarts = 0;
    let todayGallons = 0;
    let weekMinutes = 0;
    let weekGallons = 0;
    const zones = await loadProgramHydratedZones(program.id);

    for (const zone of zones) {
      if (zone.status !== 'active') continue;
      const schedules = await schedulesRepository.getByZoneId(zone.id);
      let zoneTodayMinutes = 0;
      let zoneTodayRuns = 0;
      let zoneTodayGallons = 0;
      let zoneWeekGallons = 0;

      for (const schedule of schedules) {
        if (schedule.status !== 'active') continue;
        const duration = Number(schedule.duration_minutes) || 0;
        const days = effectiveScheduleDays(program, schedule, referenceDate);
        const runGallons = gallonsForRun(zone.gph, duration);
        const scheduleWeekGallons = gallonsForWeek(zone.gph, duration, days);

        weekMinutes += duration * days.length;
        if (scheduleWeekGallons != null) weekGallons += scheduleWeekGallons;
        if (scheduleWeekGallons != null) zoneWeekGallons += scheduleWeekGallons;

        if (isIntervalProgram(program)) {
          calendarWeek.forEach((date, index) => {
            if (scheduleRunsOnDate(program, schedule, date)) {
              minutesByDay[index].minutes += duration;
              if (runGallons != null) minutesByDay[index].gallons += runGallons;
            }
          });
        } else {
          for (const day of days) {
            const index = dayIndex[day];
            if (index != null) {
              minutesByDay[index].minutes += duration;
              if (runGallons != null) minutesByDay[index].gallons += runGallons;
            }
          }
        }

        const viewDate = getDateForDayKey(todayKey, referenceDate);
        if (scheduleRunsOnDate(program, schedule, viewDate)) {
          todayMinutes += duration;
          todayStarts += 1;
          zoneTodayMinutes += duration;
          zoneTodayRuns += 1;
          if (runGallons != null) {
            todayGallons += runGallons;
            zoneTodayGallons += runGallons;
          }
        }
      }

      if (zoneTodayMinutes > 0) {
        const theme = getZoneTheme(zone, program);
        const zoneNumber = getZoneNumber(zone);
        const name = getZoneShortName(zone);
        zoneTotals.push({
          id: zone.id,
          zoneNumber,
          name: zoneNumber != null ? `${zoneNumber} · ${name}` : name,
          program: program.controller_program || program.name,
          prefix: program.controller_program || null,
          programColor: program.color,
          minutes: zoneTodayMinutes,
          gallons: zoneTodayGallons > 0 ? zoneTodayGallons : null,
          weekGallons: zoneWeekGallons > 0 ? zoneWeekGallons : null,
          hours: Math.round((zoneTodayMinutes / 60) * 100) / 100,
          runs: zoneTodayRuns,
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
        prefix: program.controller_program || null,
        programColor: program.color,
        minutes: weekMinutes,
        gallons: weekGallons > 0 ? weekGallons : null,
        ...colors,
      });
    }

    if (todayMinutes > 0 || todayStarts > 0) {
      byProgramToday.push({
        id: program.id,
        name: program.name,
        prefix: program.controller_program || null,
        programColor: program.color,
        minutes: todayMinutes,
        gallons: todayGallons > 0 ? todayGallons : null,
        starts: todayStarts,
        ...colors,
      });
    }
  }

  const selectedDayIndex = dayIndex[todayKey];
  const dayGallonsTotal = selectedDayIndex != null ? minutesByDay[selectedDayIndex].gallons : 0;
  const weekGallonsTotal = minutesByDay.reduce((sum, day) => sum + day.gallons, 0);

  return {
    minutesByDay,
    byProgramToday: byProgramToday.sort((a, b) => b.minutes - a.minutes),
    byProgramWeek: byProgramWeek.sort((a, b) => b.minutes - a.minutes),
    zoneTotals: zoneTotals.sort((a, b) => (a.zoneNumber ?? 999) - (b.zoneNumber ?? 999)),
    dayGallonsTotal: dayGallonsTotal > 0 ? dayGallonsTotal : null,
    weekGallonsTotal: weekGallonsTotal > 0 ? weekGallonsTotal : null,
  };
}

export function maxValue(items, key = 'minutes') {
  return Math.max(...items.map(item => item[key]), 1);
}

export function maxMinutes(items) {
  return maxValue(items, 'minutes');
}
