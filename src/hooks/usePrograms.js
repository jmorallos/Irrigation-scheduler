import { useState, useEffect, useCallback } from 'react';
import { programsRepository } from '../db/programsRepository';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';

export function usePrograms() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await programsRepository.getAll();
      data.sort((a, b) => a.created_at.localeCompare(b.created_at));
      setPrograms(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createProgram = useCallback(async (data) => {
    await programsRepository.create(data);
    await load();
  }, [load]);

  const updateProgram = useCallback(async (id, data) => {
    await programsRepository.update(id, data);
    await load();
  }, [load]);

  const deleteProgram = useCallback(async (id) => {
    const zones = await zonesRepository.getByProgramId(id);
    for (const zone of zones) {
      const schedules = await schedulesRepository.getByZoneId(zone.id);
      for (const s of schedules) await schedulesRepository.delete(s.id);
      await zonesRepository.delete(zone.id);
    }
    await programsRepository.delete(id);
    await load();
  }, [load]);

  const toggleStatus = useCallback(async (id, current) => {
    await programsRepository.update(id, { status: current === 'active' ? 'inactive' : 'active' });
    await load();
  }, [load]);

  return { programs, loading, error, reload: load, createProgram, updateProgram, deleteProgram, toggleStatus };
}
