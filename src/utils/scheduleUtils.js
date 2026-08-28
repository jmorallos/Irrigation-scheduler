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
  const match = (name ?? '').match(/^(?:Zone|Valve) (\d+)(?: · (.+))?$/i);
  if (!match) return { number: null, label: name ?? '' };
  return { number: parseInt(match[1], 10), label: match[2] ?? '' };
}

export function formatZoneName(number, label) {
  const loc = (label ?? '').trim();
  return loc ? `Valve ${number} · ${loc}` : `Valve ${number}`;
}

export function getZoneNumber(zone) {
  if (Number.isFinite(zone?.zone_number)) return zone.zone_number;
  return parseZoneName(zone?.name).number;
}

export function getZoneShortName(zone) {
  return parseZoneName(zone?.name).label || zone?.name || '';
}

export function getZoneDisplayName(zone, programName) {
  const parsed = parseZoneName(zone?.name);
  if (parsed.number == null) return zone?.name ?? '';
  if (parsed.label && parsed.label.toLowerCase() === programName?.toLowerCase()) {
    return `Valve ${parsed.number}`;
  }
  return formatZoneName(parsed.number, parsed.label);
}

/** Summary irrigation rows: "Valve 3 - Lauris Nobilis" */
export function formatValveSubtitle(zone) {
  const number = getZoneNumber(zone);
  const label = getZoneShortName(zone);
  if (number == null) return zone?.name ?? '';
  return label ? `Valve ${number} - ${label}` : `Valve ${number}`;
}

export function dedupeProgramsByName(programs) {
  const seen = new Map();
  for (const program of programs) {
    const key = program.name.trim().toLowerCase();
    if (!seen.has(key)) seen.set(key, program);
  }
  return Array.from(seen.values());
}
