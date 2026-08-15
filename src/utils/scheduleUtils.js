export function withCycleNumbers(schedules) {
  const sorted = [...schedules].sort((a, b) => a.start_time.localeCompare(b.start_time));
  return sorted.map((schedule, index) => ({
    ...schedule,
    cycle: schedule.cycle ?? index + 1,
  }));
}

export function formatCycleLabel(cycle) {
  if (!cycle || cycle <= 1) return "Cycle 1";
  return `Cycle ${cycle}`;
}

export function parseZoneName(name) {
  const match = (name ?? '').match(/^Zone (\d+) · (.+)$/);
  if (!match) return { number: null, label: name ?? '' };
  return { number: parseInt(match[1], 10), label: match[2] };
}

export function formatZoneName(number, label) {
  const loc = (label ?? '').trim();
  return loc ? `Zone ${number} · ${loc}` : `Zone ${number}`;
}

export function getZoneNumber(zone) {
  if (Number.isFinite(zone?.zone_number)) return zone.zone_number;
  return parseZoneName(zone?.name).number;
}

export function getZoneShortName(zone) {
  return parseZoneName(zone?.name).label || zone?.name || '';
}

export function getZoneDisplayName(zone, programName) {
  const match = zone.name.match(/^Zone (\d+) · (.+)$/);
  if (match && match[2].toLowerCase() === programName?.toLowerCase()) {
    return `Zone ${match[1]}`;
  }
  return zone.name;
}

export function dedupeProgramsByName(programs) {
  const seen = new Map();
  for (const program of programs) {
    const key = program.name.trim().toLowerCase();
    if (!seen.has(key)) seen.set(key, program);
  }
  return Array.from(seen.values());
}
