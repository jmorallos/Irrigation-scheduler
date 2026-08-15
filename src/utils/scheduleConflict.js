import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { programsRepository } from '../db/programsRepository';
import { DAY_ORDER, timeToMinutes, getEndTime, formatTime } from './dateUtils';
import { formatCycleLabel, getZoneDisplayName, withCycleNumbers } from './scheduleUtils';

const MINUTES_PER_DAY = 1440;

function nextDay(day) {
  return DAY_ORDER[(DAY_ORDER.indexOf(day) + 1) % 7];
}

function occupiedWindows({ start_time, duration_minutes, days_of_week }) {
  const start = timeToMinutes(start_time);
  const duration = Number(duration_minutes);
  const end = start + duration;
  const windows = [];

  for (const day of days_of_week ?? []) {
    if (end <= MINUTES_PER_DAY) {
      windows.push({ day, start, end });
    } else {
      windows.push({ day, start, end: MINUTES_PER_DAY });
      windows.push({ day: nextDay(day), start: 0, end: end - MINUTES_PER_DAY });
    }
  }

  return windows;
}

function windowsOverlap(a, b) {
  return a.day === b.day && a.start < b.end && b.start < a.end;
}

export function findScheduleConflict(candidate, existingSchedules) {
  if (candidate.status === 'inactive') return null;

  const candidateWindows = occupiedWindows(candidate);

  for (const existing of existingSchedules) {
    if (existing.status === 'inactive') continue;
    if (candidate.id && existing.id === candidate.id) continue;

    const existingWindows = occupiedWindows(existing);
    const overlaps = candidateWindows.some(cw =>
      existingWindows.some(ew => windowsOverlap(cw, ew)),
    );
    if (overlaps) return existing;
  }

  return null;
}

export function conflictMessage(conflict, programName) {
  const end = getEndTime(conflict.start_time, conflict.duration_minutes);
  const zoneLabel = conflict.zone
    ? getZoneDisplayName(conflict.zone, programName)
    : 'another zone';
  return `This schedule overlaps ${formatCycleLabel(conflict.cycle)} on ${zoneLabel} (${formatTime(conflict.start_time)} – ${formatTime(end)}).`;
}

export async function getSchedulesForProgram(programId) {
  const zones = await zonesRepository.getByProgramId(programId);
  const result = [];

  for (const zone of zones) {
    const schedules = withCycleNumbers(await schedulesRepository.getByZoneId(zone.id));
    for (const schedule of schedules) {
      result.push({ ...schedule, zone });
    }
  }

  return result;
}

export async function assertNoScheduleConflict(schedule, { excludeId, programName } = {}) {
  const zone = await zonesRepository.getById(schedule.zone_id);
  if (!zone) throw new Error('Zone not found.');

  const existing = await getSchedulesForProgram(zone.program_id);
  const conflict = findScheduleConflict({ ...schedule, id: excludeId ?? schedule.id }, existing);
  if (!conflict) return;

  const name = programName ?? (await programsRepository.getById(zone.program_id))?.name;
  throw new Error(conflictMessage(conflict, name));
}
