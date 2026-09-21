import { DAY_ORDER, endsNextDay, formatDays, formatTime, formatTimeRange, getEndTime } from './dateUtils';
import { formatMinutes } from './formatMinutes';
import {
  formatDisplayDate,
  formatIntervalSummary,
  WATERING_MODE_INTERVAL,
} from './programSchedule';
import { gallonsForRun, formatGallons, sumGallons } from './waterUsage';
import { computeLastWater, computeNextWater } from './wateringCalendar';

/** Compact event window: `4:30-5:00 AM`. */
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

/** Time range plus minutes: `4:00-5:45 AM, 105 min`. */
export function formatValveWindow(startTime, durationMinutes) {
  const minutes = Number(durationMinutes);
  const minutesLabel = Number.isFinite(minutes) ? `${Math.round(minutes)} min` : '—';
  return `${formatCycleWindow(startTime, durationMinutes)}, ${minutesLabel}`;
}

export function formatCycleListItem(index, startTime, durationMinutes) {
  return `Event ${index + 1} - ${formatCycleWindow(startTime, durationMinutes)}`;
}

export function formatWeekdaysHyphen(days = []) {
  const ordered = DAY_ORDER.filter(day => days.includes(day));
  if (ordered.length === 0) return '—';
  return formatDays(ordered);
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

function minutesLabelFor(program, activeSchedules) {
  const fromProgram = Number(program?.duration_minutes);
  if (Number.isFinite(fromProgram) && fromProgram >= 1) {
    return formatMinutes(Math.round(fromProgram));
  }
  const fallback = Number(activeSchedules[0]?.duration_minutes);
  if (Number.isFinite(fallback) && fallback >= 1) {
    return formatMinutes(Math.round(fallback));
  }
  return '—';
}

function formatListDate(dateOnly) {
  if (!dateOnly) return '—';
  return formatDisplayDate(dateOnly).replace(/, \d{4}$/, '');
}

/** List stamp: `Fri, Sep 11` or `Fri, Sep 11, 10:00 AM` (no year, no duration). */
export function formatListStamp(dateOnly, time) {
  if (!dateOnly) return '—';
  const dateLabel = formatListDate(dateOnly);
  return time ? `${dateLabel}, ${formatTime(time)}` : dateLabel;
}

function lastWaterLabelFor(program, activeSchedules, fromDate) {
  const last = computeLastWater(program, activeSchedules, fromDate);
  if (!last) return '—';
  return formatListStamp(last.date, last.startTime);
}

function nextWaterLabelFor(program, programMemberships, valveById, schedules, fromDate) {
  let bestKey = null;
  let bestLabel = null;
  for (const membership of programMemberships) {
    const valve = valveById.get(membership.valve_id);
    if (!valve) continue;
    const membershipSchedules = schedules.filter(
      schedule => schedule.zone_id === membership.id && schedule.status === 'active',
    );
    const next = computeNextWater(valve, program, membershipSchedules, fromDate);
    if (!next) continue;
    const key = `${next.date}T${next.startTime ?? ''}`;
    if (bestKey == null || key < bestKey) {
      bestKey = key;
      bestLabel = formatListStamp(next.date, next.startTime);
    }
  }
  return bestLabel ?? '—';
}

function groupedValveWindows(programMemberships, valveById, activeSchedules) {
  const byMembership = new Map();
  for (const membership of programMemberships) {
    const valve = valveById.get(membership.valve_id);
    const valveNumber = valve?.zone_number;
    if (valveNumber == null) continue;
    byMembership.set(membership.id, { valveNumber, schedules: [] });
  }
  for (const schedule of activeSchedules) {
    const group = byMembership.get(schedule.zone_id);
    if (group) group.schedules.push(schedule);
  }
  return [...byMembership.values()]
    .filter(group => group.schedules.length > 0)
    .sort((a, b) => a.valveNumber - b.valveNumber)
    .map(group => ({
      ...group,
      schedules: group.schedules
        .slice()
        .sort((a, b) => String(a.start_time ?? '').localeCompare(String(b.start_time ?? ''))),
    }));
}

function valveWindowsFor(programMemberships, valveById, activeSchedules) {
  return groupedValveWindows(programMemberships, valveById, activeSchedules).map(group => ({
    valveNumber: group.valveNumber,
    label: group.schedules
      .map(schedule => formatValveWindow(schedule.start_time, schedule.duration_minutes))
      .join('; '),
  }));
}

function valveWindowRowsFor(programMemberships, valveById, activeSchedules) {
  return groupedValveWindows(programMemberships, valveById, activeSchedules).flatMap(group =>
    group.schedules.map(schedule => {
      const minutes = Number(schedule.duration_minutes);
      return {
        valveNumber: group.valveNumber,
        timeRangeLabel: schedule.start_time
          ? formatTimeRange(schedule.start_time, schedule.duration_minutes)
          : '—',
        minutes: Number.isFinite(minutes) ? Math.round(minutes) : null,
      };
    }),
  );
}

function progTotalMinutesFor(activeSchedules) {
  return activeSchedules.reduce((total, schedule) => {
    const minutes = Number(schedule.duration_minutes) || 0;
    return total + minutes;
  }, 0);
}

function progTotalLabelFor(activeSchedules, membershipById, valveById) {
  const totalMinutes = progTotalMinutesFor(activeSchedules);
  const gallons = [];
  for (const schedule of activeSchedules) {
    const minutes = Number(schedule.duration_minutes) || 0;
    const membership = membershipById.get(schedule.zone_id);
    const valve = membership ? valveById.get(membership.valve_id) : null;
    gallons.push(gallonsForRun(valve?.gph, minutes));
  }
  if (totalMinutes <= 0) return '—';
  if (gallons.length > 0 && gallons.every(value => value != null)) {
    return formatGallons(sumGallons(gallons)) ?? '—';
  }
  return formatMinutes(totalMinutes);
}

/**
 * Schedule summary for one Programs-list row.
 * Valve windows are grouped by valve number (time range + minutes).
 */
export function buildProgramListSummary(program, {
  memberships = [],
  valves = [],
  schedules = [],
  fromDate = new Date(),
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

  const valveWindows = valveWindowsFor(programMemberships, valveById, sortedSchedules);
  const valveWindowRows = valveWindowRowsFor(programMemberships, valveById, sortedSchedules);
  const valveWindowsLabel = valveWindows.length === 0
    ? '—'
    : valveWindows.map(window => `${window.valveNumber}: ${window.label}`).join(', ');
  const progTotalMinutes = progTotalMinutesFor(sortedSchedules);

  const interval = formatIntervalSummary(program);
  const weekdayKeys = unionWeekdays(sortedSchedules);
  const daysLabel = interval
    ?? formatWeekdaysHyphen(weekdayKeys.length > 0 ? weekdayKeys : (program.days_of_week ?? []));

  const valvesLabel = memberValves.length === 0
    ? '—'
    : memberValves.map(valve => valve.zone_number).filter(number => number != null).join(', ');

  return {
    minutesLabel: minutesLabelFor(program, sortedSchedules),
    lastWaterLabel: lastWaterLabelFor(program, sortedSchedules, fromDate),
    nextWaterLabel: nextWaterLabelFor(program, programMemberships, valveById, schedules, fromDate),
    daysLabel,
    valveWindows,
    valveWindowRows,
    valveWindowsLabel,
    valvesLabel,
    valveCount: memberValves.length,
    startLabel: program.program_start_date ? formatListDate(program.program_start_date) : '—',
    endLabel: program.program_end_date ? formatListDate(program.program_end_date) : 'Never',
    progTotalMinutes,
    progTotalLabel: progTotalLabelFor(sortedSchedules, membershipById, valveById),
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
