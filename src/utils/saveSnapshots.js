import { programsRepository } from '../db/programsRepository';
import { zonesRepository } from '../db/zonesRepository';
import { valvesRepository } from '../db/valvesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { mediaRepository } from '../db/mediaRepository';
import { savesRepository } from '../db/savesRepository';
import { formatZoneName, getZoneNumber, getZoneShortName } from './scheduleUtils';
import { hydrateMembershipById, loadProgramHydratedZones } from './valveRecords';
import { attachValveToProgram, createValveCatalog } from '../hooks/useZones';

function uniqueName(base, existing) {
  const names = new Set(existing.map(name => name.trim().toLowerCase()));
  const trimmed = (base || 'Saved').trim();
  if (!names.has(trimmed.toLowerCase())) return trimmed;
  let index = 2;
  while (names.has(`${trimmed} (${index})`.toLowerCase())) index += 1;
  return `${trimmed} (${index})`;
}

function sameText(a, b) {
  return (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
}

function daysKey(days) {
  return [...(days ?? [])].map(day => String(day)).sort().join(',');
}

function scheduleSignature(schedule) {
  return JSON.stringify({
    start_time: schedule.start_time ?? '',
    duration_minutes: Number(schedule.duration_minutes) || 0,
    days: daysKey(schedule.days_of_week),
    status: schedule.status ?? 'active',
    notes: (schedule.notes ?? '').trim(),
  });
}

function schedulesMatch(a, b) {
  if (a.length !== b.length) return false;
  const left = a.map(scheduleSignature).sort();
  const right = b.map(scheduleSignature).sort();
  return left.every((key, index) => key === right[index]);
}

function programMetaMatches(a, b) {
  return sameText(a.name, b.name)
    && (a.controller_program ?? null) === (b.controller_program ?? null)
    && (a.color ?? '') === (b.color ?? '')
    && (a.description ?? '').trim() === (b.description ?? '').trim()
    && (a.status ?? 'active') === (b.status ?? 'active');
}

function zoneMetaMatches(a, b) {
  return sameText(a.name, b.name)
    && (getZoneNumber(a) ?? null) === (getZoneNumber(b) ?? null)
    && (a.color ?? '') === (b.color ?? '')
    && (a.status ?? 'active') === (b.status ?? 'active');
}

function blobFromMedia(id, media) {
  if (!id) return null;
  return (media ?? []).find(item => item.id === id)?.blob ?? null;
}

async function blobsEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.size !== b.size) return false;
  if (a.size === 0) return true;
  const [left, right] = await Promise.all([a.arrayBuffer(), b.arrayBuffer()]);
  const ua = new Uint8Array(left);
  const ub = new Uint8Array(right);
  if (ua.length !== ub.length) return false;
  for (let i = 0; i < ua.length; i += 1) {
    if (ua[i] !== ub[i]) return false;
  }
  return true;
}

async function photosMatch(savedBlob, liveMediaId) {
  if (!savedBlob && !liveMediaId) return true;
  if (!savedBlob || !liveMediaId) return false;
  const live = await mediaRepository.getById(liveMediaId);
  return blobsEqual(savedBlob, live?.blob ?? null);
}

async function zoneFullyMatches(savedZone, savedSchedules, media, liveZone) {
  if (!zoneMetaMatches(savedZone, liveZone)) return false;
  if (!await photosMatch(blobFromMedia(savedZone.profile_image_id, media), liveZone.profile_image_id)) {
    return false;
  }
  const liveSchedules = await schedulesRepository.getByZoneId(liveZone.id);
  return schedulesMatch(savedSchedules, liveSchedules);
}

async function findIdenticalProgram({ program, zones = [], schedules = [], media = [] }) {
  const existing = await programsRepository.getAll();
  const candidates = existing.filter(item => programMetaMatches(item, program));

  for (const candidate of candidates) {
    if (!await photosMatch(blobFromMedia(program.profile_image_id, media), candidate.profile_image_id)) {
      continue;
    }

    const liveZones = await loadProgramHydratedZones(candidate.id);
    if (liveZones.length !== zones.length) continue;

    const used = new Set();
    let allMatch = true;
    for (const savedZone of zones) {
      const savedCycles = schedules.filter(item => item.zone_id === savedZone.id);
      let found = false;
      for (const liveZone of liveZones) {
        if (used.has(liveZone.id)) continue;
        if (!await zoneFullyMatches(savedZone, savedCycles, media, liveZone)) continue;
        used.add(liveZone.id);
        found = true;
        break;
      }
      if (!found) {
        allMatch = false;
        break;
      }
    }

    if (allMatch) return candidate;
  }

  return null;
}

async function findIdenticalZone({ zone, schedules = [], media = [] }, programId) {
  const liveZones = await loadProgramHydratedZones(programId);
  for (const liveZone of liveZones) {
    if (await zoneFullyMatches(zone, schedules, media, liveZone)) return liveZone;
  }
  return null;
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

  const zones = await loadProgramHydratedZones(programId);
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
  const zone = await hydrateMembershipById(zoneId);
  if (!zone) throw new Error('Valve not found.');

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

  const identical = await findIdenticalProgram(save.payload ?? {});
  if (identical) return { program: identical, identical: true };

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
    const number = getZoneNumber(zone) ?? 1;
    let catalogValve = await valvesRepository.getByNumber(number);
    if (!catalogValve) {
      catalogValve = await createValveCatalog({
        zone_number: number,
        name: zone.name ?? formatZoneName(number, getZoneShortName(zone)),
        color: zone.color,
        profileImageChange: { action: 'none' },
      });
      const photoId = await restorePhoto(zone.profile_image_id, media, 'valve', catalogValve.id);
      if (photoId) await valvesRepository.update(catalogValve.id, { profile_image_id: photoId });
    }

    const membership = await zonesRepository.create({
      program_id: created.id,
      valve_id: catalogValve.id,
      status: zone.status ?? 'active',
    });
    zoneIds[zone.id] = membership.id;
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

  return { program: created, identical: false };
}

export async function restoreZoneSave(save, programId) {
  const { zone, schedules = [], media = [] } = save.payload ?? {};
  if (!zone) throw new Error('This save is missing valve data.');

  const identical = await findIdenticalZone(save.payload ?? {}, programId);
  if (identical) return { zone: identical, identical: true };

  const number = getZoneNumber(zone) ?? 1;
  let catalogValve = await valvesRepository.getByNumber(number);
  if (!catalogValve) {
    catalogValve = await createValveCatalog({
      zone_number: number,
      name: zone.name ?? formatZoneName(number, getZoneShortName(zone) || zone.name),
      color: zone.color,
      profileImageChange: { action: 'none' },
    });
    const photoId = await restorePhoto(zone.profile_image_id, media, 'valve', catalogValve.id);
    if (photoId) await valvesRepository.update(catalogValve.id, { profile_image_id: photoId });
  }

  const membership = await attachValveToProgram(catalogValve.id, programId);

  for (const schedule of schedules) {
    await schedulesRepository.create({
      zone_id: membership.id,
      start_time: schedule.start_time,
      duration_minutes: schedule.duration_minutes,
      days_of_week: schedule.days_of_week ?? [],
      status: schedule.status ?? 'active',
      notes: schedule.notes ?? '',
      cycle: schedule.cycle,
    });
  }

  const hydrated = {
    ...membership,
    ...catalogValve,
    valve_id: catalogValve.id,
    name: catalogValve.name,
    zone_number: catalogValve.zone_number,
    color: catalogValve.color,
    profile_image_id: catalogValve.profile_image_id,
  };
  return { zone: hydrated, identical: false };
}
