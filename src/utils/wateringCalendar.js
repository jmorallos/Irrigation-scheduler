import { getDateForDayKey, DAY_ORDER } from './dateUtils';
import { normalizeLastWaterRecord } from './lastWater';
import {
  normalizeProgramSchedule,
  isIntervalWateringDay,
  effectiveIntervalDate,
  addDays,
  startOfDay,
  formatDateOnly,
  formatDisplayDate,
  daysBetween,
  slideIntervalDate,
  getDayKeyFromDate,
  WATERING_MODE_INTERVAL,
} from './programSchedule';
import { formatTime, formatDuration } from './dateUtils';

function parseDateOnlyToLocalDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Calendar dates in the Mon–Sun week that contains referenceDate. */
export function weekDates(referenceDate = new Date()) {
  return DAY_ORDER.map(dayKey => getDateForDayKey(dayKey, referenceDate));
}

export function isIntervalProgram(program) {
  return normalizeProgramSchedule(program).watering_mode === WATERING_MODE_INTERVAL;
}

/** True when an active cycle should run on this calendar date. */
export function scheduleRunsOnDate(program, schedule, date) {
  if (schedule?.status !== 'active') return false;
  if (isIntervalProgram(program)) {
    return isIntervalWateringDay(program, date);
  }
  const dayKey = getDayKeyFromDate(startOfDay(date));
  return (schedule.days_of_week ?? []).includes(dayKey);
}

/** Weekday keys (Mon–Sun) when this program waters in the current week. */
export function wateringDaysInWeek(program, referenceDate = new Date()) {
  if (!isIntervalProgram(program)) return null;
  return DAY_ORDER.filter((dayKey, index) => (
    isIntervalWateringDay(program, weekDates(referenceDate)[index])
  ));
}

/** Effective weekday keys for a cycle this week (interval or cycle picks). */
export function effectiveScheduleDays(program, schedule, referenceDate = new Date()) {
  if (isIntervalProgram(program)) {
    return wateringDaysInWeek(program, referenceDate) ?? [];
  }
  return schedule?.days_of_week ?? [];
}

function findFirstIntervalOnOrAfter(program, fromDate) {
  const schedule = normalizeProgramSchedule(program);
  const start = parseDateOnlyToLocalDate(schedule.program_start_date);
  const from = startOfDay(fromDate);
  const end = schedule.program_end_date ? parseDateOnlyToLocalDate(schedule.program_end_date) : null;

  if (from < start) {
    const first = effectiveIntervalDate(start, 0, schedule.interval_days, schedule.never_on_days);
    if (end && first > end) return null;
    return first;
  }

  const maxCycle = Math.ceil(daysBetween(start, from) / schedule.interval_days) + 1;
  for (let cycle = 0; cycle <= maxCycle; cycle += 1) {
    const effective = effectiveIntervalDate(
      start,
      cycle,
      schedule.interval_days,
      schedule.never_on_days,
    );
    if (end && effective > end) break;
    if (effective >= from) return effective;
  }
  return null;
}

export function findNextIntervalWaterDate(program, valve, fromDate = new Date()) {
  const schedule = normalizeProgramSchedule(program);
  if (schedule.watering_mode !== WATERING_MODE_INTERVAL) return null;
  if (!schedule.program_start_date || !schedule.interval_days) return null;

  const from = startOfDay(fromDate);
  const start = parseDateOnlyToLocalDate(schedule.program_start_date);
  const end = schedule.program_end_date ? parseDateOnlyToLocalDate(schedule.program_end_date) : null;
  const lastWater = normalizeLastWaterRecord(valve).last_water_date;

  let candidate = null;
  if (lastWater) {
    const lastDate = parseDateOnlyToLocalDate(lastWater);
    if (lastDate >= start) {
      candidate = slideIntervalDate(addDays(lastDate, schedule.interval_days), schedule.never_on_days);
      while (candidate < from) {
        candidate = slideIntervalDate(addDays(candidate, schedule.interval_days), schedule.never_on_days);
      }
    }
  }

  if (!candidate || candidate < start) {
    candidate = findFirstIntervalOnOrAfter(program, from);
  }

  if (!candidate) return null;
  if (end && candidate > end) return null;
  return candidate;
}

export function findNextWeekdayWaterDate(program, schedules, valve, fromDate = new Date()) {
  const from = startOfDay(fromDate);
  const active = schedules.filter(schedule => schedule.status === 'active');
  if (active.length === 0) return null;

  const lastWater = normalizeLastWaterRecord(valve).last_water_date;
  let searchFrom = from;
  if (lastWater) {
    const afterLast = addDays(parseDateOnlyToLocalDate(lastWater), 1);
    if (afterLast > searchFrom) searchFrom = afterLast;
  }

  for (let offset = 0; offset < 14; offset += 1) {
    const date = addDays(searchFrom, offset);
    const dayKey = getDayKeyFromDate(date);
    const hasRun = active.some(schedule => (schedule.days_of_week ?? []).includes(dayKey));
    if (hasRun) return date;
  }
  return null;
}

export function computeNextWater(valve, program, schedules, fromDate = new Date()) {
  const active = schedules.filter(schedule => schedule.status === 'active')
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  if (active.length === 0) return null;

  const date = isIntervalProgram(program)
    ? findNextIntervalWaterDate(program, valve, fromDate)
    : findNextWeekdayWaterDate(program, schedules, valve, fromDate);
  if (!date) return null;

  const startTime = active[0].start_time;
  const durationMinutes = active.reduce(
    (sum, schedule) => sum + Number(schedule.duration_minutes || 0),
    0,
  );

  return {
    date: formatDateOnly(date),
    startTime,
    durationMinutes,
  };
}

export function formatNextWater(valve, program, schedules, fromDate = new Date()) {
  const next = computeNextWater(valve, program, schedules, fromDate);
  if (!next) return null;

  const parts = [formatDisplayDate(next.date)];
  if (next.startTime) parts.push(formatTime(next.startTime));
  if (next.durationMinutes != null) parts.push(formatDuration(next.durationMinutes));
  return parts.join(' · ');
}
