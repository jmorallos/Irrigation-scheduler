import { programsRepository } from '../db/programsRepository';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { mediaRepository } from '../db/mediaRepository';
import { base64ToBlob } from './imageUtils';

export function parseBackupFile(text) {
  return JSON.parse(text);
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
      throw new Error('Invalid zone record in backup.');
    }
    if (!programIds.has(zone.program_id)) {
      throw new Error(`Zone "${zone.name ?? zone.id}" references a missing program.`);
    }
    zoneIds.add(zone.id);
  }

  for (const schedule of data.schedules) {
    if (!schedule?.id || !schedule?.zone_id) {
      throw new Error('Invalid schedule record in backup.');
    }
    if (!zoneIds.has(schedule.zone_id)) {
      throw new Error('A schedule references a missing zone.');
    }
  }

  return data;
}

export async function snapshotAllData() {
  return {
    programs: await programsRepository.getAll(),
    zones: await zonesRepository.getAll(),
    schedules: await schedulesRepository.getAll(),
    media: await mediaRepository.getAll(),
  };
}

async function clearAllStores() {
  await mediaRepository.clear();
  await schedulesRepository.clear();
  await zonesRepository.clear();
  await programsRepository.clear();
}

async function writeSnapshot(snapshot) {
  for (const record of snapshot.media) {
    await mediaRepository.putRaw(record);
  }
  for (const program of snapshot.programs) {
    await programsRepository.putRaw(program);
  }
  for (const zone of snapshot.zones) {
    await zonesRepository.putRaw(zone);
  }
  for (const schedule of snapshot.schedules) {
    await schedulesRepository.putRaw(schedule);
  }
}

export async function restoreSnapshot(snapshot) {
  await clearAllStores();
  await writeSnapshot(snapshot);
}

export async function applyBackup(data) {
  await clearAllStores();

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
  for (const zone of data.zones) {
    const row = { ...zone };
    if (row.profile_image_id && !restoredMediaIds.has(row.profile_image_id)) {
      row.profile_image_id = null;
      missingPhotos += 1;
    }
    await zonesRepository.putRaw(row);
  }
  for (const schedule of data.schedules) {
    await schedulesRepository.putRaw(schedule);
  }

  return { missingPhotos };
}
