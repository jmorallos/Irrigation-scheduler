import { programsRepository } from '../db/programsRepository';
import { zonesRepository } from '../db/zonesRepository';
import { valvesRepository } from '../db/valvesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { mediaRepository } from '../db/mediaRepository';
import { savesRepository } from '../db/savesRepository';
import { base64ToBlob, blobToBase64 } from './imageUtils';
import { hydrateZones, legacyZoneNumber } from './valveRecords';
import { formatZoneName, getZoneShortName } from './scheduleUtils';

export function parseBackupFile(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) {
    throw new Error('This is not a backup file. Use a JSON export from this app.');
  }
  if (trimmed.startsWith('<')) {
    throw new Error('This looks like a printable schedule, not a backup. Import only accepts JSON backups.');
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error('This is not a backup file. Use a JSON export from this app.');
  }
}

export function validateBackup(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup file format.');
  }
  if (!data.version || !Array.isArray(data.programs) || !Array.isArray(data.zones) || !Array.isArray(data.schedules)) {
    throw new Error('Invalid backup file format.');
  }

  const programIds = new Set();
  for (const program of data.programs) {
    if (!program?.id || !program?.name) {
      throw new Error('Invalid program record in backup.');
    }
    programIds.add(program.id);
  }

  const zoneIds = new Set();
  for (const zone of data.zones) {
    if (!zone?.id || !zone?.program_id) {
      throw new Error('Invalid program valve record in backup.');
    }
    if (!programIds.has(zone.program_id)) {
      throw new Error('A program valve references a missing program.');
    }
    zoneIds.add(zone.id);
  }

  if (Array.isArray(data.valves)) {
    for (const valve of data.valves) {
      if (!valve?.id || valve.zone_number == null) {
        throw new Error('Invalid valve catalog record in backup.');
      }
    }
  }

  for (const schedule of data.schedules) {
    if (!schedule?.id || !schedule?.zone_id) {
      throw new Error('Invalid schedule record in backup.');
    }
    if (!zoneIds.has(schedule.zone_id)) {
      throw new Error('A schedule references a missing valve.');
    }
  }

  return data;
}

export async function snapshotAllData() {
  return {
    programs: await programsRepository.getAll(),
    valves: await valvesRepository.getAll(),
    zones: await zonesRepository.getAll(),
    schedules: await schedulesRepository.getAll(),
    media: await mediaRepository.getAll(),
    saves: await savesRepository.getAll(),
  };
}

async function serializeMediaList(records) {
  return Promise.all(
    (records ?? []).map(async record => ({
      id: record.id,
      owner_type: record.owner_type,
      owner_id: record.owner_id,
      mime_type: record.mime_type,
      size_bytes: record.size_bytes,
      updated_at: record.updated_at,
      data_base64: record.blob ? await blobToBase64(record.blob) : record.data_base64,
    })),
  );
}

function deserializeMediaList(records) {
  return (records ?? []).map(record => {
    if (!record.data_base64 || !record.mime_type) return { ...record, blob: record.blob };
    const { data_base64, ...rest } = record;
    return { ...rest, blob: base64ToBlob(data_base64, record.mime_type) };
  });
}

export async function serializeSaves(saves) {
  return Promise.all(
    (saves ?? []).map(async save => ({
      ...save,
      payload: {
        ...save.payload,
        media: await serializeMediaList(save.payload?.media),
      },
    })),
  );
}

export function deserializeSaves(saves) {
  return (saves ?? []).map(save => ({
    ...save,
    payload: {
      ...save.payload,
      media: deserializeMediaList(save.payload?.media),
    },
  }));
}

export async function clearLiveData() {
  await mediaRepository.clear();
  await schedulesRepository.clear();
  await zonesRepository.clear();
  await valvesRepository.clear();
  await programsRepository.clear();
}

async function writeSnapshot(snapshot) {
  for (const record of snapshot.media) {
    await mediaRepository.putRaw(record);
  }
  for (const program of snapshot.programs) {
    await programsRepository.putRaw(program);
  }
  for (const valve of snapshot.valves ?? []) {
    await valvesRepository.putRaw(valve);
  }
  for (const zone of snapshot.zones) {
    await zonesRepository.putRaw(zone);
  }
  for (const schedule of snapshot.schedules) {
    await schedulesRepository.putRaw(schedule);
  }
  if (Array.isArray(snapshot.saves)) {
    for (const save of snapshot.saves) {
      await savesRepository.putRaw(save);
    }
  }
}

export async function restoreSnapshot(snapshot) {
  await clearLiveData();
  if (Array.isArray(snapshot.saves)) await savesRepository.clear();
  await writeSnapshot(snapshot);
}

export async function applyBackup(data) {
  await clearLiveData();

  const restoredMediaIds = new Set();

  if (Array.isArray(data.media)) {
    for (const record of data.media) {
      if (!record.id || !record.data_base64 || !record.mime_type) continue;
      try {
        await mediaRepository.putRaw({
          id: record.id,
          owner_type: record.owner_type,
          owner_id: record.owner_id,
          mime_type: record.mime_type,
          size_bytes: record.size_bytes,
          updated_at: record.updated_at,
          blob: base64ToBlob(record.data_base64, record.mime_type),
        });
        restoredMediaIds.add(record.id);
      } catch {
        // Incomplete photo payload — skip and drop the link below.
      }
    }
  }

  let missingPhotos = 0;

  for (const program of data.programs) {
    const row = { ...program };
    if (row.profile_image_id && !restoredMediaIds.has(row.profile_image_id)) {
      row.profile_image_id = null;
      missingPhotos += 1;
    }
    await programsRepository.putRaw(row);
  }
  const valveByNumber = new Map();

  if (Array.isArray(data.valves)) {
    for (const valve of data.valves) {
      const row = { ...valve };
      if (row.profile_image_id && !restoredMediaIds.has(row.profile_image_id)) {
        row.profile_image_id = null;
        missingPhotos += 1;
      }
      await valvesRepository.putRaw(row);
      valveByNumber.set(row.zone_number, row);
    }
  }

  for (const zone of data.zones) {
    let membership = { ...zone };

    if (!membership.valve_id) {
      const number = legacyZoneNumber(zone);
      let valve = number != null ? valveByNumber.get(number) : null;
      if (!valve && number != null) {
        valve = {
          id: crypto.randomUUID(),
          zone_number: number,
          name: zone.name ?? formatZoneName(number, getZoneShortName(zone)),
          color: zone.color ?? 'emerald',
          profile_image_id: zone.profile_image_id ?? null,
          created_at: zone.created_at ?? new Date().toISOString(),
          updated_at: zone.updated_at ?? new Date().toISOString(),
        };
        if (valve.profile_image_id && !restoredMediaIds.has(valve.profile_image_id)) {
          valve.profile_image_id = null;
          missingPhotos += 1;
        }
        await valvesRepository.putRaw(valve);
        valveByNumber.set(number, valve);
      }
      membership = {
        id: zone.id,
        program_id: zone.program_id,
        valve_id: valve?.id ?? null,
        status: zone.status ?? 'active',
        created_at: zone.created_at,
        updated_at: zone.updated_at,
      };
    }

    await zonesRepository.putRaw(membership);
  }
  for (const schedule of data.schedules) {
    await schedulesRepository.putRaw(schedule);
  }

  if (Array.isArray(data.saves)) {
    await savesRepository.clear();
    for (const save of deserializeSaves(data.saves)) {
      await savesRepository.putRaw(save);
    }
  }

  return { missingPhotos };
}
