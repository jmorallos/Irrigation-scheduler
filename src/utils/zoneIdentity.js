import { getZoneNumber } from './scheduleUtils';

export function isValveNumberTaken(valves, number, excludeIds = []) {
  const num = Number(number);
  const skip = new Set(Array.isArray(excludeIds) ? excludeIds : [excludeIds]);
  return valves.some(valve => {
    if (skip.has(valve.id)) return false;
    return valve.zone_number === num;
  });
}

export function takenValveNumbers(valves, excludeIds = []) {
  const skip = new Set(Array.isArray(excludeIds) ? excludeIds : [excludeIds]);
  return valves
    .filter(valve => !skip.has(valve.id))
    .map(valve => valve.zone_number)
    .filter(n => n != null);
}

export function nextValveNumber(valves) {
  const taken = new Set(takenValveNumbers(valves));
  let n = 1;
  while (taken.has(n)) n += 1;
  return n;
}

export function valveNumberConflictMessage(number) {
  return `Valve ${number} already exists.`;
}

export function groupValvesCatalog(valves, memberships = []) {
  const programsByValve = new Map();
  for (const membership of memberships) {
    if (!membership.valve_id) continue;
    if (!programsByValve.has(membership.valve_id)) programsByValve.set(membership.valve_id, []);
    programsByValve.get(membership.valve_id).push(membership);
  }

  return [...valves]
    .sort((a, b) => (a.zone_number ?? 999) - (b.zone_number ?? 999))
    .map(valve => ({
      valve,
      number: valve.zone_number,
      memberships: programsByValve.get(valve.id) ?? [],
    }));
}

/** @deprecated use isValveNumberTaken on catalog valves */
export function isZoneNumberTaken(zones, number, excludeIds = []) {
  const num = Number(number);
  const skip = new Set(Array.isArray(excludeIds) ? excludeIds : [excludeIds]);
  return zones.some(zone => {
    if (skip.has(zone.id)) return false;
    return getZoneNumber(zone) === num;
  });
}

/** @deprecated use takenValveNumbers */
export function takenZoneNumbers(zones, excludeIds = []) {
  return takenValveNumbers(
    zones.map(zone => ({ id: zone.id, zone_number: getZoneNumber(zone) })),
    excludeIds,
  );
}

/** @deprecated use nextValveNumber */
export function nextZoneNumber(zones) {
  return nextValveNumber(zones.map(zone => ({ id: zone.id, zone_number: getZoneNumber(zone) })));
}

export function zoneNumberConflictMessage(number) {
  return valveNumberConflictMessage(number);
}

/** @deprecated use groupValvesCatalog */
export function groupZonesByNumber(zones) {
  const groups = new Map();
  for (const zone of zones) {
    const number = getZoneNumber(zone);
    if (number == null) continue;
    if (!groups.has(number)) groups.set(number, []);
    groups.get(number).push(zone);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([number, members]) => ({ number, members, zone: members[0] }));
}
