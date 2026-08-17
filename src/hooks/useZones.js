import { useState, useEffect, useCallback } from 'react';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { mediaRepository } from '../db/mediaRepository';
import { applyProfileImageChange } from '../utils/profileImageService';
import { getZoneNumber } from '../utils/scheduleUtils';
import { isZoneNumberTaken, zoneNumberConflictMessage } from '../utils/zoneIdentity';

export async function applyZoneIdentityUpdate(id, data) {
  const { profileImageChange, ...zoneData } = data;
  const existing = await zonesRepository.getById(id);
  const prevNumber = getZoneNumber(existing);
  const nextNumber = zoneData.zone_number ?? prevNumber;
  const all = await zonesRepository.getAll();
  const siblingIds = all
    .filter(zone => zone.id !== id && getZoneNumber(zone) === prevNumber)
    .map(zone => zone.id);
  if (isZoneNumberTaken(all, nextNumber, [id, ...siblingIds])) {
    throw new Error(zoneNumberConflictMessage(nextNumber));
  }
  const imageId = await applyProfileImageChange(
    'zone',
    id,
    profileImageChange,
    existing?.profile_image_id ?? null,
  );
  const updated = await zonesRepository.update(id, { ...zoneData, profile_image_id: imageId });
  for (const siblingId of siblingIds) {
    await zonesRepository.update(siblingId, {
      name: updated.name,
      color: updated.color,
      zone_number: updated.zone_number,
      profile_image_id: updated.profile_image_id,
    });
  }
  return updated;
}

export function useZones(programId) {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!programId) { setLoading(false); return; }
    try {
      const data = await zonesRepository.getByProgramId(programId);
      data.sort((a, b) => {
        const numA = getZoneNumber(a) ?? 999;
        const numB = getZoneNumber(b) ?? 999;
        if (numA !== numB) return numA - numB;
        return a.name.localeCompare(b.name);
      });
      setZones(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => { load(); }, [load]);

  const createZone = useCallback(async (data) => {
    const { profileImageChange, ...zoneData } = data;
    const all = await zonesRepository.getAll();
    if (isZoneNumberTaken(all, zoneData.zone_number)) {
      throw new Error(zoneNumberConflictMessage(zoneData.zone_number));
    }
    const zone = await zonesRepository.create({ program_id: programId, ...zoneData, profile_image_id: null });
    const imageId = await applyProfileImageChange('zone', zone.id, profileImageChange, null);
    if (imageId !== zone.profile_image_id) {
      await zonesRepository.update(zone.id, { profile_image_id: imageId });
    }
    await load();
  }, [programId, load]);

  const updateZone = useCallback(async (id, data) => {
    await applyZoneIdentityUpdate(id, data);
    await load();
  }, [load]);

  const deleteZone = useCallback(async (id) => {
    const zone = await zonesRepository.getById(id);
    if (zone?.profile_image_id) {
      await mediaRepository.deleteById(zone.profile_image_id);
    }
    const schedules = await schedulesRepository.getByZoneId(id);
    for (const s of schedules) await schedulesRepository.delete(s.id);
    await zonesRepository.delete(id);
    await load();
  }, [load]);

  const toggleStatus = useCallback(async (id, current) => {
    await zonesRepository.update(id, { status: current === 'active' ? 'inactive' : 'active' });
    await load();
  }, [load]);

  return { zones, loading, error, reload: load, createZone, updateZone, deleteZone, toggleStatus };
}

export function useAllZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await zonesRepository.getAll();
      data.sort((a, b) => {
        const numA = getZoneNumber(a) ?? 999;
        const numB = getZoneNumber(b) ?? 999;
        if (numA !== numB) return numA - numB;
        return (a.name ?? '').localeCompare(b.name ?? '');
      });
      setZones(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateZone = useCallback(async (id, data) => {
    await applyZoneIdentityUpdate(id, data);
    await load();
  }, [load]);

  return { zones, loading, error, reload: load, updateZone };
}
