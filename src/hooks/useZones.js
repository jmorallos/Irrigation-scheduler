import { useState, useEffect, useCallback } from 'react';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { mediaRepository } from '../db/mediaRepository';
import { applyProfileImageChange } from '../utils/profileImageService';
import { getZoneNumber } from '../utils/scheduleUtils';

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
    const zone = await zonesRepository.create({ program_id: programId, ...zoneData, profile_image_id: null });
    const imageId = await applyProfileImageChange('zone', zone.id, profileImageChange, null);
    if (imageId !== zone.profile_image_id) {
      await zonesRepository.update(zone.id, { profile_image_id: imageId });
    }
    await load();
  }, [programId, load]);

  const updateZone = useCallback(async (id, data) => {
    const { profileImageChange, ...zoneData } = data;
    const existing = await zonesRepository.getById(id);
    const imageId = await applyProfileImageChange(
      'zone',
      id,
      profileImageChange,
      existing?.profile_image_id ?? null,
    );
    await zonesRepository.update(id, { ...zoneData, profile_image_id: imageId });
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
