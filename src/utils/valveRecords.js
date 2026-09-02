import { getZoneNumber } from './scheduleUtils';
import { zonesRepository } from '../db/zonesRepository';
import { valvesRepository } from '../db/valvesRepository';

export function hydrateZone(membership, valve) {
  if (!membership) return null;
  if (!valve) return { ...membership };
  return {
    ...membership,
    valve_id: valve.id,
    zone_number: valve.zone_number,
    name: valve.name,
    color: valve.color,
    gph: valve.gph ?? null,
    last_water_date: valve.last_water_date ?? null,
    last_water_time: valve.last_water_time ?? null,
    last_water_duration_minutes: valve.last_water_duration_minutes ?? null,
    profile_image_id: valve.profile_image_id ?? null,
  };
}

export function hydrateZones(memberships, valves) {
  const byId = new Map(valves.map(valve => [valve.id, valve]));
  return memberships.map(membership => hydrateZone(membership, byId.get(membership.valve_id)));
}

export function valveMap(valves) {
  return new Map(valves.map(valve => [valve.id, valve]));
}

export function membershipUsesValve(membership, valveId) {
  return membership?.valve_id === valveId;
}

export function programHasValve(memberships, programId, valveId) {
  return memberships.some(
    membership => membership.program_id === programId && membership.valve_id === valveId,
  );
}

export async function loadAllHydratedZones() {
  const [memberships, valves] = await Promise.all([
    zonesRepository.getAll(),
    valvesRepository.getAll(),
  ]);
  return hydrateZones(memberships, valves);
}

export async function loadProgramHydratedZones(programId) {
  const [memberships, valves] = await Promise.all([
    zonesRepository.getByProgramId(programId),
    valvesRepository.getAll(),
  ]);
  return hydrateZones(memberships, valves);
}

export async function hydrateMembershipById(membershipId) {
  const membership = await zonesRepository.getById(membershipId);
  if (!membership) return null;
  if (!membership.valve_id) return membership;
  const valve = await valvesRepository.getById(membership.valve_id);
  return hydrateZone(membership, valve);
}

export function legacyZoneNumber(zone) {
  if (Number.isFinite(zone?.zone_number)) return zone.zone_number;
  return getZoneNumber(zone);
}
