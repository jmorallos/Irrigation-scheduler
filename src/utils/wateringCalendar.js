import { getDateForDayKey, DAY_ORDER, weekDatesFrom, formatTime, formatDuration } from './dateUtils';
import { normalizeLastWaterRecord } from './lastWater';
import {
  normalizeProgramSchedule,
  isIntervalWateringDay,
  isWeekdayWateringDay,
  effectiveIntervalDate,
  addDays,
  startOfDay,
  formatDateOnly,
  formatDisplayDate,
  daysBetween,
  slideIntervalDate,
  WATERING_MODE_INTERVAL,
} from './programSchedule';

function parseDateOnlyToLocalDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Calendar dates in the Mon–Sun week that contains referenceDate. */
export function weekDates(referenceDate = new Date()) {
  return weekDatesFrom(referenceDate);
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
  return isWeekdayWateringDay(program, date, schedule.days_of_week);
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

  const { program_start_date, program_end_date } = normalizeProgramSchedule(program);
  if (program_start_date) {
    const start = parseDateOnlyToLocalDate(program_start_date);
    if (searchFrom < start) searchFrom = start;
  }
  const end = program_end_date ? parseDateOnlyToLocalDate(program_end_date) : null;

  for (let offset = 0; offset < 21; offset += 1) {
    const date = addDays(searchFrom, offset);
    if (end && date > end) return null;
    const hasRun = active.some(schedule => scheduleRunsOnDate(program, schedule, date));
    if (hasRun) return date;
  }
  return null;
}

function combineDateAndTime(date, time) {
  const [hoursRaw, minutesRaw] = String(time ?? '').split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  if (Number.isFinite(hours) && Number.isFinite(minutes)) {
    next.setHours(hours, minutes, 0, 0);
  }
  return next;
}

/** Most recent program event that has already started (not valve last-water fields). */
export function computeLastWater(program, schedules, fromDate = new Date()) {
  const active = (schedules ?? [])
    .filter(schedule => (schedule.status ?? 'active') === 'active' && schedule.start_time)
    .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
  if (active.length === 0) return null;

  const from = fromDate instanceof Date ? fromDate : new Date(fromDate);
  const fromDay = startOfDay(from);
  const lookback = isIntervalProgram(program) ? 400 : 28;
  const { program_start_date } = normalizeProgramSchedule(program);
  const start = program_start_date ? parseDateOnlyToLocalDate(program_start_date) : null;

  for (let offset = 0; offset <= lookback; offset += 1) {
    const date = addDays(fromDay, -offset);
    if (start && date < start) break;

    const dayEvents = active.filter(schedule => scheduleRunsOnDate(program, schedule, date));
    if (dayEvents.length === 0) continue;

    for (let index = dayEvents.length - 1; index >= 0; index -= 1) {
      const event = dayEvents[index];
      if (combineDateAndTime(date, event.start_time) > from) continue;
      const duration = Number(event.duration_minutes);
      return {
        date: formatDateOnly(date),
        startTime: event.start_time,
        durationMinutes: Number.isFinite(duration) ? duration : null,
      };
    }
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
