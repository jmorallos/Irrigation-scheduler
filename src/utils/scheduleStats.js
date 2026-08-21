import { timeToMinutes, getEndTime } from './dateUtils';
import { withCycleNumbers } from './scheduleUtils';

function daysOverlap(a, b) {
  const daysA = a.days_of_week ?? [];
  const daysB = b.days_of_week ?? [];
  return daysA.some(day => daysB.includes(day));
}

export function soakHoursBetween(previous, next) {
  const prevEnd = timeToMinutes(getEndTime(previous.start_time, previous.duration_minutes));
  let diff = timeToMinutes(next.start_time) - prevEnd;
  if (diff < 0) diff += 1440;
  return Math.round((diff / 60) * 100) / 100;
}

export function formatSoak(hours) {
  if (hours == null) return '—';
  const rounded = Math.round(Number(hours) * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

export function soakMinutesFromHours(hours) {
  if (hours == null) return null;
  return Math.round(Number(hours) * 60);
}

export function decorateZoneSchedules(schedules) {
  const active = withCycleNumbers(schedules.filter(s => s.status === 'active'))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const dailyRuntime = active.reduce((sum, schedule) => sum + Number(schedule.duration_minutes || 0), 0);

  return active.map((schedule, index) => {
    const previous = index > 0 ? active[index - 1] : null;
    const soak = previous && daysOverlap(previous, schedule)
      ? soakHoursBetween(previous, schedule)
      : null;
    return {
      ...schedule,
      soakHours: soak,
      dailyRuntime,
      runsPerDay: active.length,
    };
  });
}

/** Show Daily runtime only on the last row for each valve membership. */
export function withDailyRuntimeOnce(rows) {
  const lastIndexByZone = new Map();
  rows.forEach((row, index) => {
    const key = row.zone?.id ?? row.id;
    lastIndexByZone.set(key, index);
  });
  return rows.map((row, index) => ({
    ...row,
    showDailyRuntime: lastIndexByZone.get(row.zone?.id ?? row.id) === index,
  }));
}

export function scheduleTableTotals(rows) {
  const durationTotal = rows.reduce(
    (sum, row) => sum + Number(row.schedule?.duration_minutes || 0),
    0,
  );
  const seenZones = new Set();
  let dailyRuntimeTotal = 0;
  for (const row of rows) {
    const key = row.zone?.id;
    if (!key || seenZones.has(key)) continue;
    seenZones.add(key);
    dailyRuntimeTotal += Number(row.dailyRuntime || 0);
  }
  return { durationTotal, dailyRuntimeTotal };
}
