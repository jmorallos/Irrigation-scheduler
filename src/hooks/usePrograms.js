import { useState, useEffect, useCallback } from 'react';
import { programsRepository } from '../db/programsRepository';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { applyProfileImageChange } from '../utils/profileImageService';
import { sortProgramsByController } from '../db/programSort';
import { deleteProgramCascade } from '../db/deleteProgramCascade';

export function usePrograms() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await programsRepository.getAll();
      setPrograms(sortProgramsByController(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createProgram = useCallback(async (data) => {
    const { profileImageChange, ...programData } = data;
    const program = await programsRepository.create({ ...programData, profile_image_id: null });
    const imageId = await applyProfileImageChange('program', program.id, profileImageChange, null);
    if (imageId !== program.profile_image_id) {
      await programsRepository.update(program.id, { profile_image_id: imageId });
    }
    await load();
  }, [load]);

  const updateProgram = useCallback(async (id, data) => {
    const { profileImageChange, ...programData } = data;
    const existing = await programsRepository.getById(id);
    const imageId = await applyProfileImageChange(
      'program',
      id,
      profileImageChange,
      existing?.profile_image_id ?? null,
    );
    await programsRepository.update(id, { ...programData, profile_image_id: imageId });
    await load();
  }, [load]);

  const deleteProgram = useCallback(async (id) => {
    await deleteProgramCascade(id);
    await load();
  }, [load]);

  const toggleStatus = useCallback(async (id, current) => {
    await programsRepository.update(id, { status: current === 'active' ? 'inactive' : 'active' });
    await load();
  }, [load]);

  return { programs, loading, error, reload: load, createProgram, updateProgram, deleteProgram, toggleStatus };
}
