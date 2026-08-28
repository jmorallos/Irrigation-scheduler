import { useState, useEffect, useCallback } from 'react';
import { valvesRepository } from '../db/valvesRepository';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { mediaRepository } from '../db/mediaRepository';
import { applyProfileImageChange } from '../utils/profileImageService';
import { normalizeGph } from '../utils/waterUsage';
import {
  isValveNumberTaken,
  valveNumberConflictMessage,
} from '../utils/zoneIdentity';
import { hydrateZones } from '../utils/valveRecords';

export async function updateValveCatalog(valveId, data) {
  const { profileImageChange, ...valveData } = data;
  const existing = await valvesRepository.getById(valveId);
  if (!existing) throw new Error('Valve not found.');

  const allValves = await valvesRepository.getAll();
  const nextNumber = valveData.zone_number ?? existing.zone_number;
  if (isValveNumberTaken(allValves, nextNumber, valveId)) {
    throw new Error(valveNumberConflictMessage(nextNumber));
  }

  const imageId = await applyProfileImageChange(
    'valve',
    valveId,
    profileImageChange,
    existing.profile_image_id ?? null,
  );

  return valvesRepository.update(valveId, {
    ...valveData,
    gph: normalizeGph(valveData.gph),
    profile_image_id: imageId,
  });
}

export async function createValveCatalog(data) {
  const { profileImageChange, status: _status, ...valveData } = data;
  const allValves = await valvesRepository.getAll();
  if (isValveNumberTaken(allValves, valveData.zone_number)) {
    throw new Error(valveNumberConflictMessage(valveData.zone_number));
  }

  const valve = await valvesRepository.create({
    ...valveData,
    gph: normalizeGph(valveData.gph),
    profile_image_id: null,
  });
  const imageId = await applyProfileImageChange('valve', valve.id, profileImageChange, null);
  if (imageId !== valve.profile_image_id) {
    await valvesRepository.update(valve.id, { profile_image_id: imageId });
  }
  return valvesRepository.getById(valve.id);
}

export async function deleteValveCatalog(valveId) {
  const memberships = await zonesRepository.getByValveId(valveId);
  if (memberships.length > 0) {
    throw new Error('Remove this valve from all programs before deleting it.');
  }
  const valve = await valvesRepository.getById(valveId);
  if (valve?.profile_image_id) {
    await mediaRepository.deleteById(valve.profile_image_id);
  }
  await valvesRepository.delete(valveId);
}

export async function attachValveToProgram(valveId, programId) {
  return zonesRepository.create({
    program_id: programId,
    valve_id: valveId,
    status: 'active',
  });
}

async function loadHydratedProgramZones(programId) {
  const [memberships, valves] = await Promise.all([
    zonesRepository.getByProgramId(programId),
    valvesRepository.getAll(),
  ]);
  const hydrated = hydrateZones(memberships, valves);
  hydrated.sort((a, b) => {
    const numA = a.zone_number ?? 999;
    const numB = b.zone_number ?? 999;
    if (numA !== numB) return numA - numB;
    const byName = (a.name ?? '').localeCompare(b.name ?? '');
    if (byName !== 0) return byName;
    return (a.created_at ?? '').localeCompare(b.created_at ?? '');
  });
  return hydrated;
}

/** @deprecated use updateValveCatalog */
export async function applyZoneIdentityUpdate(id, data) {
  const membership = await zonesRepository.getById(id);
  if (!membership?.valve_id) throw new Error('Valve not found.');
  await updateValveCatalog(membership.valve_id, data);
  if (data.status != null) {
    await zonesRepository.update(id, { status: data.status });
  }
  return zonesRepository.getById(id);
}

export function useZones(programId) {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!programId) { setLoading(false); return; }
    try {
      setZones(await loadHydratedProgramZones(programId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => { load(); }, [load]);

  const createZone = useCallback(async (data) => {
    const valve = await createValveCatalog(data);
    await attachValveToProgram(valve.id, programId);
    await load();
  }, [programId, load]);

  const addExistingValve = useCallback(async (valveId) => {
    await attachValveToProgram(valveId, programId);
    await load();
  }, [programId, load]);

  const updateZone = useCallback(async (id, data) => {
    const membership = await zonesRepository.getById(id);
    if (!membership) throw new Error('Valve not found.');
    if (membership.valve_id) {
      await updateValveCatalog(membership.valve_id, data);
    }
    if (data.status != null) {
      await zonesRepository.update(id, { status: data.status });
    }
    await load();
  }, [load]);

  const deleteZone = useCallback(async (id) => {
    const schedules = await schedulesRepository.getByZoneId(id);
    for (const schedule of schedules) await schedulesRepository.delete(schedule.id);
    await zonesRepository.delete(id);
    await load();
  }, [load]);

  const toggleStatus = useCallback(async (id, current) => {
    await zonesRepository.update(id, { status: current === 'active' ? 'inactive' : 'active' });
    await load();
  }, [load]);

  return {
    zones,
    loading,
    error,
    reload: load,
    createZone,
    addExistingValve,
    updateZone,
    deleteZone,
    toggleStatus,
  };
}

export function useAllZones() {
  const [zones, setZones] = useState([]);
  const [valves, setValves] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [rawMemberships, catalog] = await Promise.all([
        zonesRepository.getAll(),
        valvesRepository.getAll(),
      ]);
      setMemberships(rawMemberships);
      setValves(catalog);
      setZones(hydrateZones(rawMemberships, catalog));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createValve = useCallback(async (data) => {
    await createValveCatalog(data);
    await load();
  }, [load]);

  const updateValve = useCallback(async (valveId, data) => {
    await updateValveCatalog(valveId, data);
    await load();
  }, [load]);

  const deleteValve = useCallback(async (valveId) => {
    await deleteValveCatalog(valveId);
    await load();
  }, [load]);

  return {
    zones,
    valves,
    memberships,
    loading,
    error,
    reload: load,
    createValve,
    updateValve,
    deleteValve,
    updateZone: async (membershipId, data) => {
      const membership = await zonesRepository.getById(membershipId);
      if (membership?.valve_id) await updateValveCatalog(membership.valve_id, data);
      await load();
    },
  };
}
