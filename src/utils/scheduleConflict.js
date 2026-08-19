import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { programsRepository } from '../db/programsRepository';
import { DAY_ORDER, timeToMinutes, minutesToTime, getEndTime, formatTime } from './dateUtils';
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

export function findNextAvailableStart(candidate, existingSchedules) {
  const duration = Number(candidate.duration_minutes);
  const days = candidate.days_of_week ?? [];
  if (!Number.isFinite(duration) || duration <= 0 || days.length === 0) return null;

  let minutes = timeToMinutes(candidate.start_time);
  const origin = minutes;

  for (let step = 0; step < 200; step += 1) {
    const probe = {
      ...candidate,
      start_time: minutesToTime(minutes),
    };
    const conflict = findScheduleConflict(probe, existingSchedules);
    if (!conflict) return step === 0 ? null : probe.start_time;

    const conflictEnd = timeToMinutes(conflict.start_time) + Number(conflict.duration_minutes);
    let next = conflictEnd;
    if (next <= minutes) next += MINUTES_PER_DAY;
    minutes = next;
    if (minutes - origin >= MINUTES_PER_DAY) return null;
  }

  return null;
}

export function conflictMessage(conflict, programName, nextAvailable) {
  const end = getEndTime(conflict.start_time, conflict.duration_minutes);
  const otherProgram = conflict.program?.name ?? programName;
  const zoneLabel = conflict.zone
    ? getZoneDisplayName(conflict.zone, otherProgram)
    : 'another valve';
  const programPart = otherProgram ? ` in ${otherProgram}` : '';
  let message = `This schedule overlaps ${formatCycleLabel(conflict.cycle)} on ${zoneLabel}${programPart} (${formatTime(conflict.start_time)} – ${formatTime(end)}).`;
  if (nextAvailable) {
    message += ` Next available: ${formatTime(nextAvailable)}.`;
  }
  return message;
}

export async function getAllSchedulesForConflict() {
  const [programs, zones] = await Promise.all([
    programsRepository.getAll(),
    zonesRepository.getAll(),
  ]);
  const programById = new Map(programs.map(program => [program.id, program]));
  const result = [];

  for (const zone of zones) {
    const program = programById.get(zone.program_id);
    const schedules = withCycleNumbers(await schedulesRepository.getByZoneId(zone.id));
    for (const schedule of schedules) {
      result.push({ ...schedule, zone, program });
    }
  }

  return result;
}

export async function getSchedulesForProgram(programId) {
  const all = await getAllSchedulesForConflict();
  if (!programId) return all;
  return all.filter(item => item.zone?.program_id === programId);
}

export async function assertNoScheduleConflict(schedule, { excludeId, programName } = {}) {
  const zone = await zonesRepository.getById(schedule.zone_id);
  if (!zone) throw new Error('Valve not found.');

  const existing = await getAllSchedulesForConflict();
  const conflict = findScheduleConflict({ ...schedule, id: excludeId ?? schedule.id }, existing);
  if (!conflict) return;

  const name = conflict.program?.name
    ?? programName
    ?? (await programsRepository.getById(conflict.zone?.program_id ?? zone.program_id))?.name;
  const nextAvailable = findNextAvailableStart({ ...schedule, id: excludeId ?? schedule.id }, existing);
  throw new Error(conflictMessage(conflict, name, nextAvailable));
}
