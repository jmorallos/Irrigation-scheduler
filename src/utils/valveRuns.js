import { normalizeLastWaterRecord } from './lastWater';
import { parseDateOnly, programScheduleEventTemplates } from './programSchedule';
import { computeLastWater, computeNextWater } from './wateringCalendar';

function parseDateOnlyToLocalDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** `05:00 AM` — padded hour to match Last Run / Next Run. */
export function formatRunTime(time) {
  if (time == null || time === '') return null;
  const [hoursRaw, minutesRaw] = String(time).split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${String(displayHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
}

function formatRunDate(dateOnly) {
  const parsed = parseDateOnly(dateOnly);
  if (!parsed) return null;
  const date = parseDateOnlyToLocalDate(parsed);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = String(date.getDate()).padStart(2, '0');
  return `${weekday}, ${month} ${day}`;
}

/** `Wed, Sep 02 at 05:00 AM` — date only when time is missing. */
export function formatRunAt(dateOnly, time) {
  const dateLabel = formatRunDate(dateOnly);
  if (!dateLabel) return null;
  const timeLabel = formatRunTime(time);
  if (!timeLabel) return dateLabel;
  return `${dateLabel} at ${timeLabel}`;
}

export function formatLastRun(valve) {
  const record = normalizeLastWaterRecord(valve);
  if (!record.last_water_date) return null;
  return formatRunAt(record.last_water_date, record.last_water_time);
}

export function groupSchedulesByZoneId(schedules = []) {
  const map = new Map();
  for (const schedule of schedules) {
    if (!schedule?.zone_id) continue;
    if (!map.has(schedule.zone_id)) map.set(schedule.zone_id, []);
    map.get(schedule.zone_id).push(schedule);
  }
  return map;
}

function compareNextRun(a, b) {
  const byDate = String(a.date).localeCompare(String(b.date));
  if (byDate !== 0) return byDate;
  return String(a.startTime ?? '').localeCompare(String(b.startTime ?? ''));
}

function eventsFromProgram(program, membershipSchedules) {
  const templates = programScheduleEventTemplates(program);
  if (templates.length > 0) {
    return templates.map(template => ({
      status: 'active',
      start_time: template.start_time,
      duration_minutes: template.duration_minutes,
      days_of_week: template.days_of_week,
    }));
  }
  return membershipSchedules;
}

/** Latest past program event across every program this valve belongs to. */
export function computeLatestLastWater({
  memberships = [],
  programsById,
  schedulesByMembershipId,
  fromDate = new Date(),
} = {}) {
  if (!programsById || !schedulesByMembershipId) return null;
  const candidates = [];
  for (const membership of memberships) {
    if (membership.status && membership.status !== 'active') continue;
    const program = programsById.get(membership.program_id);
    if (!program || program.status === 'inactive') continue;
    const last = computeLastWater(
      program,
      eventsFromProgram(program, schedulesByMembershipId.get(membership.id) ?? []),
      fromDate,
    );
    if (last) candidates.push(last);
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => -compareNextRun(a, b));
  return candidates[0];
}

/** Earliest upcoming run across every program this valve belongs to. */
export function computeEarliestNextRun({
  valve,
  memberships = [],
  programsById,
  schedulesByMembershipId,
  fromDate = new Date(),
} = {}) {
  if (!programsById || !schedulesByMembershipId) return null;
  const candidates = [];
  for (const membership of memberships) {
    if (membership.status && membership.status !== 'active') continue;
    const program = programsById.get(membership.program_id);
    if (!program || program.status === 'inactive') continue;
    const schedules = schedulesByMembershipId.get(membership.id) ?? [];
    const next = computeNextWater(valve, program, schedules, fromDate);
    if (next) candidates.push(next);
  }
  if (candidates.length === 0) return null;
  candidates.sort(compareNextRun);
  return candidates[0];
}

export function formatNextRun(args) {
  const next = computeEarliestNextRun(args);
  if (!next) return null;
  return formatRunAt(next.date, next.startTime);
}
