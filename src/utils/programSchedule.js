import { DAY_ORDER, DAY_LABELS } from './dateUtils';

export const WATERING_MODE_WEEKDAY = 'weekday';
export const WATERING_MODE_INTERVAL = 'interval';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const CALENDAR_DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Defaults for programs created before interval scheduling. */
export function normalizeProgramSchedule(program = {}) {
  const mode = program.watering_mode === WATERING_MODE_INTERVAL
    ? WATERING_MODE_INTERVAL
    : WATERING_MODE_WEEKDAY;
  const intervalDays = Number(program.interval_days);
  const neverOn = normalizeNeverOnDays(program.never_on_days);
  return {
    watering_mode: mode,
    interval_days: mode === WATERING_MODE_INTERVAL && Number.isFinite(intervalDays) && intervalDays >= 1
      ? Math.round(intervalDays)
      : null,
    program_start_date: parseDateOnly(program.program_start_date),
    program_end_date: parseDateOnly(program.program_end_date),
    never_on_days: mode === WATERING_MODE_INTERVAL ? neverOn : [],
  };
}

export function normalizeNeverOnDays(days) {
  if (!Array.isArray(days)) return [];
  const allowed = new Set(DAY_ORDER);
  const unique = [];
  for (const day of days) {
    if (allowed.has(day) && !unique.includes(day)) unique.push(day);
  }
  return unique.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
}

export function getDayKeyFromDate(date) {
  return CALENDAR_DAY_KEYS[date.getDay()];
}

export function parseDateOnly(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateOnly(value);
  }
  const text = String(value).trim();
  if (!DATE_ONLY.test(text)) return null;
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return text;
}

export function formatDateOnly(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysBetween(startDate, endDate) {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

export function addDays(date, count) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return startOfDay(next);
}

function parseDateOnlyToLocalDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Move forward day-by-day until the date is not on a never-on weekday. */
export function slideIntervalDate(date, neverOnDays = []) {
  const blocked = new Set(normalizeNeverOnDays(neverOnDays));
  if (blocked.size === 0) return startOfDay(date);

  let current = startOfDay(date);
  let guard = 0;
  while (blocked.has(getDayKeyFromDate(current)) && guard < 7) {
    current = addDays(current, 1);
    guard += 1;
  }
  return current;
}

export function rawIntervalDate(startDate, cycleIndex, intervalDays) {
  return addDays(startDate, cycleIndex * intervalDays);
}

export function effectiveIntervalDate(startDate, cycleIndex, intervalDays, neverOnDays = []) {
  return slideIntervalDate(rawIntervalDate(startDate, cycleIndex, intervalDays), neverOnDays);
}

export function isWithinProgramDateRange(program, date = new Date()) {
  const { program_start_date, program_end_date } = normalizeProgramSchedule(program);
  if (!program_start_date) return false;
  const start = parseDateOnlyToLocalDate(program_start_date);
  const day = startOfDay(date);
  if (day < start) return false;
  if (!program_end_date) return true;
  const end = parseDateOnlyToLocalDate(program_end_date);
  return day <= end;
}

function programEndDate(program) {
  const { program_end_date } = normalizeProgramSchedule(program);
  return program_end_date ? parseDateOnlyToLocalDate(program_end_date) : null;
}

/** True when an interval program should water on this calendar date. */
export function isIntervalWateringDay(program, date = new Date()) {
  const schedule = normalizeProgramSchedule(program);
  if (schedule.watering_mode !== WATERING_MODE_INTERVAL) return false;
  if (!schedule.program_start_date || !schedule.interval_days) return false;

  const target = startOfDay(date);
  const start = parseDateOnlyToLocalDate(schedule.program_start_date);
  if (target < start) return false;

  const end = programEndDate(program);
  const maxCycle = Math.max(0, Math.ceil(daysBetween(start, target) / schedule.interval_days));

  for (let cycle = 0; cycle <= maxCycle; cycle += 1) {
    const effective = effectiveIntervalDate(
      start,
      cycle,
      schedule.interval_days,
      schedule.never_on_days,
    );
    if (end && effective > end) break;
    if (effective.getTime() === target.getTime()) return true;
    if (effective > target) break;
  }

  return false;
}

export function validateProgramScheduleFields(fields) {
  const errors = {};
  const mode = fields.watering_mode === WATERING_MODE_INTERVAL
    ? WATERING_MODE_INTERVAL
    : WATERING_MODE_WEEKDAY;

  if (mode === WATERING_MODE_INTERVAL) {
    const intervalDays = Number(fields.interval_days);
    if (!Number.isFinite(intervalDays) || intervalDays < 1 || intervalDays > 365) {
      errors.interval_days = 'Enter every 1–365 days.';
    }
    const start = parseDateOnly(fields.program_start_date);
    if (!start) errors.program_start_date = 'Start date is required for interval watering.';
    if (fields.program_end_mode === 'date') {
      const end = parseDateOnly(fields.program_end_date);
      if (!end) errors.program_end_date = 'Enter an end date or choose Never.';
      else if (start && end < start) errors.program_end_date = 'End date must be on or after the start date.';
    }
  }

  return errors;
}

export function programSchedulePayload(fields) {
  const mode = fields.watering_mode === WATERING_MODE_INTERVAL
    ? WATERING_MODE_INTERVAL
    : WATERING_MODE_WEEKDAY;

  if (mode === WATERING_MODE_WEEKDAY) {
    return {
      watering_mode: WATERING_MODE_WEEKDAY,
      interval_days: null,
      program_start_date: null,
      program_end_date: null,
      never_on_days: [],
    };
  }

  return {
    watering_mode: WATERING_MODE_INTERVAL,
    interval_days: Math.round(Number(fields.interval_days)),
    program_start_date: parseDateOnly(fields.program_start_date),
    program_end_date: fields.program_end_mode === 'date'
      ? parseDateOnly(fields.program_end_date)
      : null,
    never_on_days: normalizeNeverOnDays(fields.never_on_days),
  };
}

export function formatWateringModeLabel(program) {
  const schedule = normalizeProgramSchedule(program);
  return schedule.watering_mode === WATERING_MODE_INTERVAL ? 'Interval' : 'Weekdays';
}

export function formatIntervalSummary(program) {
  const schedule = normalizeProgramSchedule(program);
  if (schedule.watering_mode !== WATERING_MODE_INTERVAL || !schedule.interval_days) return null;
  const dayWord = schedule.interval_days === 1 ? 'day' : 'days';
  return `Every ${schedule.interval_days} ${dayWord}`;
}

export function formatNeverOnSummary(program) {
  const schedule = normalizeProgramSchedule(program);
  if (schedule.never_on_days.length === 0) return 'None';
  return schedule.never_on_days.map(day => DAY_LABELS[day]).join(' · ');
}

export function formatProgramDateRange(program) {
  const schedule = normalizeProgramSchedule(program);
  if (schedule.watering_mode !== WATERING_MODE_INTERVAL || !schedule.program_start_date) return null;

  const startLabel = formatDisplayDate(schedule.program_start_date);
  if (!schedule.program_end_date) {
    return { start: startLabel, end: 'Never' };
  }
  return { start: startLabel, end: formatDisplayDate(schedule.program_end_date) };
}

export function formatDisplayDate(dateOnly) {
  const date = parseDateOnlyToLocalDate(dateOnly);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function initialProgramScheduleFields(program) {
  const schedule = normalizeProgramSchedule(program);
  return {
    watering_mode: schedule.watering_mode,
    interval_days: schedule.interval_days ?? 3,
    program_start_date: schedule.program_start_date ?? formatDateOnly(new Date()),
    program_end_mode: schedule.program_end_date ? 'date' : 'never',
    program_end_date: schedule.program_end_date ?? '',
    never_on_days: schedule.never_on_days ?? [],
  };
}

export { DAY_ORDER, DAY_LABELS };
