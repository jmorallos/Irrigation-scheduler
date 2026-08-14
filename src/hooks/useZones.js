import { useState, useEffect, useCallback } from 'react';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';

export function useZones(programId) {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!programId) { setLoading(false); return; }
    try {
      const data = await zonesRepository.getByProgramId(programId);
      data.sort((a, b) => a.created_at.localeCompare(b.created_at));
      setZones(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => { load(); }, [load]);

  const createZone = useCallback(async (name, status = 'active') => {
    await zonesRepository.create({ program_id: programId, name, status });
    await load();
  }, [programId, load]);

  const updateZone = useCallback(async (id, data) => {
    await zonesRepository.update(id, data);
    await load();
  }, [load]);

  const deleteZone = useCallback(async (id) => {
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
