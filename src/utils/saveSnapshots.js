import { programsRepository } from '../db/programsRepository';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { mediaRepository } from '../db/mediaRepository';
import { savesRepository } from '../db/savesRepository';
import { formatZoneName, getZoneNumber, getZoneShortName } from './scheduleUtils';

function uniqueName(base, existing) {
  const names = new Set(existing.map(name => name.trim().toLowerCase()));
  const trimmed = (base || 'Saved').trim();
  if (!names.has(trimmed.toLowerCase())) return trimmed;
  let index = 2;
  while (names.has(`${trimmed} (${index})`.toLowerCase())) index += 1;
  return `${trimmed} (${index})`;
}

async function cloneMedia(id, collected, seen) {
  if (!id || seen.has(id)) return;
  const record = await mediaRepository.getById(id);
  if (!record?.blob) return;
  seen.add(id);
  collected.push({
    ...record,
    blob: record.blob.slice(0, record.blob.size, record.blob.type),
  });
}

export async function saveProgram(programId) {
  const program = await programsRepository.getById(programId);
  if (!program) throw new Error('Program not found.');

  const zones = await zonesRepository.getByProgramId(programId);
  const schedules = [];
  const media = [];
  const seen = new Set();

  await cloneMedia(program.profile_image_id, media, seen);
  for (const zone of zones) {
    await cloneMedia(zone.profile_image_id, media, seen);
    schedules.push(...(await schedulesRepository.getByZoneId(zone.id)));
  }

  return savesRepository.create({
    type: 'program',
    name: program.name,
    source_id: program.id,
    summary: { zones: zones.length, cycles: schedules.length },
    payload: { program, zones, schedules, media },
  });
}

export async function saveZone(zoneId) {
  const zone = await zonesRepository.getById(zoneId);
  if (!zone) throw new Error('Zone not found.');

  const program = await programsRepository.getById(zone.program_id);
  const schedules = await schedulesRepository.getByZoneId(zoneId);
  const media = [];
  const seen = new Set();
  await cloneMedia(zone.profile_image_id, media, seen);

  return savesRepository.create({
    type: 'zone',
    name: zone.name,
    source_id: zone.id,
    summary: { cycles: schedules.length, programName: program?.name ?? '' },
    payload: { zone, schedules, media },
  });
}

async function restorePhoto(oldId, media, ownerType, ownerId) {
  if (!oldId) return null;
  const record = (media ?? []).find(item => item.id === oldId);
  if (!record?.blob) return null;
  return mediaRepository.saveForOwner(ownerType, ownerId, record.blob, record.mime_type);
}

export async function restoreProgramSave(save) {
  const { program, zones = [], schedules = [], media = [] } = save.payload ?? {};
  if (!program) throw new Error('This save is missing program data.');

  const existing = await programsRepository.getAll();
  const created = await programsRepository.create({
    name: uniqueName(program.name, existing.map(item => item.name)),
    controller_program: program.controller_program ?? null,
    color: program.color,
    description: program.description ?? '',
    status: program.status ?? 'active',
    profile_image_id: null,
  });

  const photoId = await restorePhoto(program.profile_image_id, media, 'program', created.id);
  if (photoId) await programsRepository.update(created.id, { profile_image_id: photoId });

  const zoneIds = {};
  for (const zone of zones) {
    const nextZone = await zonesRepository.create({
      program_id: created.id,
      name: zone.name,
      zone_number: zone.zone_number,
      color: zone.color,
      status: zone.status ?? 'active',
      profile_image_id: null,
    });
    zoneIds[zone.id] = nextZone.id;
    const zonePhoto = await restorePhoto(zone.profile_image_id, media, 'zone', nextZone.id);
    if (zonePhoto) await zonesRepository.update(nextZone.id, { profile_image_id: zonePhoto });
  }

  for (const schedule of schedules) {
    const zoneId = zoneIds[schedule.zone_id];
    if (!zoneId) continue;
    await schedulesRepository.create({
      zone_id: zoneId,
      start_time: schedule.start_time,
      duration_minutes: schedule.duration_minutes,
      days_of_week: schedule.days_of_week ?? [],
      status: schedule.status ?? 'active',
      notes: schedule.notes ?? '',
      cycle: schedule.cycle,
    });
  }

  return created;
}

export async function restoreZoneSave(save, programId) {
  const { zone, schedules = [], media = [] } = save.payload ?? {};
  if (!zone) throw new Error('This save is missing zone data.');

  const existing = await zonesRepository.getByProgramId(programId);
  const used = existing.map(item => getZoneNumber(item)).filter(n => n != null);
  let number = getZoneNumber(zone) ?? 1;
  while (used.includes(number)) number += 1;

  const created = await zonesRepository.create({
    program_id: programId,
    name: formatZoneName(number, getZoneShortName(zone) || zone.name),
    zone_number: number,
    color: zone.color,
    status: zone.status ?? 'active',
    profile_image_id: null,
  });

  const photoId = await restorePhoto(zone.profile_image_id, media, 'zone', created.id);
  if (photoId) await zonesRepository.update(created.id, { profile_image_id: photoId });

  for (const schedule of schedules) {
    await schedulesRepository.create({
      zone_id: created.id,
      start_time: schedule.start_time,
      duration_minutes: schedule.duration_minutes,
      days_of_week: schedule.days_of_week ?? [],
      status: schedule.status ?? 'active',
      notes: schedule.notes ?? '',
      cycle: schedule.cycle,
    });
  }

  return created;
}
