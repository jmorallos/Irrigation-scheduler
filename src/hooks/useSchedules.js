import { useState, useEffect, useCallback } from 'react';
import { schedulesRepository } from '../db/schedulesRepository';
import { withCycleNumbers } from '../utils/scheduleUtils';

export function useSchedules(zoneId) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!zoneId) { setLoading(false); return; }
    try {
      const data = await schedulesRepository.getByZoneId(zoneId);
      setSchedules(withCycleNumbers(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [zoneId]);

  useEffect(() => { load(); }, [load]);

  const createSchedule = useCallback(async (data) => {
    await schedulesRepository.create({ zone_id: zoneId, ...data });
    await schedulesRepository.renumberCyclesForZone(zoneId);
    await load();
  }, [zoneId, load]);

  const updateSchedule = useCallback(async (id, data) => {
    await schedulesRepository.update(id, data);
    await schedulesRepository.renumberCyclesForZone(zoneId);
    await load();
  }, [zoneId, load]);

  const deleteSchedule = useCallback(async (id) => {
    await schedulesRepository.delete(id);
    await schedulesRepository.renumberCyclesForZone(zoneId);
    await load();
  }, [zoneId, load]);

  const toggleStatus = useCallback(async (id, current) => {
    await schedulesRepository.update(id, { status: current === 'active' ? 'inactive' : 'active' });
    await load();
  }, [load]);

  return { schedules, loading, error, reload: load, createSchedule, updateSchedule, deleteSchedule, toggleStatus };
}
