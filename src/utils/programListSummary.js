import { DAY_ORDER, DAY_LABELS, formatTime, getEndTime, endsNextDay } from './dateUtils';
import {
  formatIntervalSummary,
  formatProgramDateRange,
  WATERING_MODE_INTERVAL,
} from './programSchedule';

/** Compact cycle window: `4:30-5:00 AM`. */
export function formatCycleWindow(startTime, durationMinutes) {
  if (!startTime) return '—';
  const start = formatTime(startTime);
  const end = formatTime(getEndTime(startTime, durationMinutes));
  const suffix = endsNextDay(startTime, durationMinutes) ? ' next day' : '';
  const startPeriod = start.slice(-2);
  const endPeriod = end.slice(-2);
  if (startPeriod === endPeriod && !suffix) {
    return `${start.slice(0, -3)}-${end}`;
  }
  return `${start}-${end}${suffix}`;
}

export function formatCycleListItem(index, startTime, durationMinutes) {
  return `${index + 1} - ${formatCycleWindow(startTime, durationMinutes)}`;
}

export function formatWeekdaysHyphen(days = []) {
  const ordered = DAY_ORDER.filter(day => days.includes(day));
  if (ordered.length === 0) return '—';
  return ordered.map(day => DAY_LABELS[day]).join(' - ');
}

function unionWeekdays(schedules) {
  const set = new Set();
  for (const schedule of schedules) {
    for (const day of schedule.days_of_week ?? []) set.add(day);
  }
  return DAY_ORDER.filter(day => set.has(day));
}

function valveNumberFor(membership, valveById) {
  const valve = valveById.get(membership.valve_id);
  return valve?.zone_number ?? 999;
}

/**
 * Schedule summary for one Programs-list row.
 * Cycles are numbered in start-time order and joined with commas.
 */
export function buildProgramListSummary(program, {
  memberships = [],
  valves = [],
  schedules = [],
} = {}) {
  const valveById = new Map(valves.map(valve => [valve.id, valve]));
  const programMemberships = memberships.filter(membership => membership.program_id === program.id);
  const memberValves = programMemberships
    .map(membership => valveById.get(membership.valve_id))
    .filter(Boolean)
    .sort((a, b) => (a.zone_number ?? 999) - (b.zone_number ?? 999));

  const membershipById = new Map(programMemberships.map(membership => [membership.id, membership]));
  const membershipIds = new Set(programMemberships.map(membership => membership.id));
  const activeSchedules = schedules.filter(
    schedule => membershipIds.has(schedule.zone_id) && schedule.status === 'active',
  );

  const sortedSchedules = [...activeSchedules].sort((a, b) => {
    const byTime = String(a.start_time ?? '').localeCompare(String(b.start_time ?? ''));
    if (byTime !== 0) return byTime;
    const membershipA = membershipById.get(a.zone_id);
    const membershipB = membershipById.get(b.zone_id);
    return valveNumberFor(membershipA ?? {}, valveById) - valveNumberFor(membershipB ?? {}, valveById);
  });

  const cyclesLabel = sortedSchedules.length === 0
    ? '—'
    : sortedSchedules
      .map((schedule, index) => formatCycleListItem(index, schedule.start_time, schedule.duration_minutes))
      .join(', ');

  const interval = formatIntervalSummary(program);
  const daysLabel = interval
    ?? formatWeekdaysHyphen(unionWeekdays(sortedSchedules));

  const range = formatProgramDateRange(program);
  const valvesLabel = memberValves.length === 0
    ? '—'
    : memberValves.map(valve => valve.zone_number).filter(number => number != null).join(', ');

  return {
    daysLabel,
    cyclesLabel,
    valvesLabel,
    valveCount: memberValves.length,
    startLabel: range?.start ?? '—',
    endLabel: range?.end ?? 'Never',
    isInterval: Boolean(interval) || program?.watering_mode === WATERING_MODE_INTERVAL,
  };
}

export function programListSummariesById(programs, catalog) {
  const map = new Map();
  for (const program of programs) {
    map.set(program.id, buildProgramListSummary(program, catalog));
  }
  return map;
}
