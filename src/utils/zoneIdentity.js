import { getZoneNumber } from './scheduleUtils';

export function isZoneNumberTaken(zones, number, excludeIds = []) {
  const num = Number(number);
  const skip = new Set(Array.isArray(excludeIds) ? excludeIds : [excludeIds]);
  return zones.some(zone => {
    if (skip.has(zone.id)) return false;
    return getZoneNumber(zone) === num;
  });
}

export function takenZoneNumbers(zones, excludeIds = []) {
  const skip = new Set(Array.isArray(excludeIds) ? excludeIds : [excludeIds]);
  return zones
    .filter(zone => !skip.has(zone.id))
    .map(zone => getZoneNumber(zone))
    .filter(n => n != null);
}

export function nextZoneNumber(zones) {
  const taken = new Set(takenZoneNumbers(zones));
  let n = 1;
  while (taken.has(n)) n += 1;
  return n;
}

export function zoneNumberConflictMessage(number) {
  return `Valve ${number} already exists.`;
}

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
