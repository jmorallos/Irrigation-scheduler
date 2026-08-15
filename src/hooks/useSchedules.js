import { useState, useEffect, useCallback } from 'react';
import { schedulesRepository } from '../db/schedulesRepository';
import { withCycleNumbers } from '../utils/scheduleUtils';
import { assertNoScheduleConflict } from '../utils/scheduleConflict';

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
    const payload = { zone_id: zoneId, ...data };
    await assertNoScheduleConflict(payload);
    await schedulesRepository.create(payload);
    await schedulesRepository.renumberCyclesForZone(zoneId);
    await load();
  }, [zoneId, load]);

  const updateSchedule = useCallback(async (id, data) => {
    const existing = await schedulesRepository.getById(id);
    await assertNoScheduleConflict({ ...existing, ...data }, { excludeId: id });
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
    const next = current === 'active' ? 'inactive' : 'active';
    if (next === 'active') {
      const existing = await schedulesRepository.getById(id);
      await assertNoScheduleConflict({ ...existing, status: 'active' }, { excludeId: id });
    }
    await schedulesRepository.update(id, { status: next });
    await load();
  }, [load]);

  return { schedules, loading, error, reload: load, createSchedule, updateSchedule, deleteSchedule, toggleStatus };
}
