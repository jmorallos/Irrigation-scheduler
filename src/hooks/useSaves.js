import { useState, useEffect, useCallback } from 'react';
import { savesRepository } from '../db/savesRepository';
import { saveProgram as captureProgram, saveZone as captureZone, restoreProgramSave, restoreZoneSave } from '../utils/saveSnapshots';

export function useSaves() {
  const [saves, setSaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setSaves(await savesRepository.getAll());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveProgram = useCallback(async (programId) => {
    const record = await captureProgram(programId);
    await load();
    return record;
  }, [load]);

  const saveZone = useCallback(async (zoneId) => {
    const record = await captureZone(zoneId);
    await load();
    return record;
  }, [load]);

  const restoreProgram = useCallback(async (save) => {
    return restoreProgramSave(save);
  }, []);

  const restoreZone = useCallback(async (save, programId) => {
    return restoreZoneSave(save, programId);
  }, []);

  const deleteSave = useCallback(async (id) => {
    await savesRepository.delete(id);
    await load();
  }, [load]);

  return {
    saves,
    loading,
    error,
    reload: load,
    saveProgram,
    saveZone,
    restoreProgram,
    restoreZone,
    deleteSave,
  };
}
