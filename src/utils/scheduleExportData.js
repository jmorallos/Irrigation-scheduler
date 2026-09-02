import { loadMainScheduleRows } from './mainScheduleData';
import { loadWeeklyScheduleGroups } from './weeklyScheduleData';
import { DAY_ORDER } from './dateUtils';
import { getProgramTheme } from './programColors';
import { valvesRepository } from '../db/valvesRepository';
import { effectiveScheduleDays, isIntervalProgram, weekDates, scheduleRunsOnDate } from './wateringCalendar';

export function dayKeyFromDate(date) {
  const keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return keys[date.getDay()];
}

export function programBadgeHex(program, programTheme) {
  if (programTheme?.badgeHex) return programTheme.badgeHex;
  return getProgramTheme(program).badgeHex;
}

export function catalogValveKey(row) {
  return row.zone?.valve_id
    ?? row.zoneNumber
    ?? row.zone?.zone_number
    ?? row.zone?.id
    ?? null;
}

export function normalizeExportData(rowsOrData, options = {}) {
  if (Array.isArray(rowsOrData)) {
    return {
      rows: rowsOrData,
      groups: options.groups ?? [],
      exportedAt: options.exportedAt ?? new Date(),
      catalogValveCount: options.catalogValveCount,
    };
  }
  return {
    rows: rowsOrData?.rows ?? [],
    groups: rowsOrData?.groups ?? [],
    exportedAt: rowsOrData?.exportedAt ?? options.exportedAt ?? new Date(),
    catalogValveCount: rowsOrData?.catalogValveCount ?? options.catalogValveCount,
  };
}

export function summarizeRows(rows) {
  const programs = new Map();
  const zones = new Map();
  const catalogValves = new Set();
  const minutesByDay = Object.fromEntries(DAY_ORDER.map(day => [day, 0]));
  let weekMinutes = 0;
  const referenceDate = new Date();
  const calendarWeek = weekDates(referenceDate);

  for (const row of rows) {
    const programId = row.program?.id ?? row.program?.controller_program ?? row.program?.name;
    const zoneId = row.zone?.id ?? `${programId}-${row.zoneNumber}-${row.zone?.name}`;
    const valveKey = catalogValveKey(row);
    if (programId != null && !programs.has(programId)) programs.set(programId, row.program);
    if (valveKey != null) catalogValves.add(String(valveKey));
    if (zoneId != null && !zones.has(zoneId)) {
      const wateringDays = new Set();
      zones.set(zoneId, {
        id: zoneId,
        program: row.program,
        zone: row.zone,
        zoneNumber: row.zoneNumber,
        theme: row.theme,
        programTheme: row.programTheme,
        dailyRuntime: row.dailyRuntime ?? 0,
        weekMinutes: 0,
        cycles: 0,
        days: wateringDays,
        soakHours: row.soakHours,
        valveKey: `${row.program?.controller_program ?? ''}|${row.zoneNumber ?? ''}`,
      });
    }

    const zone = zones.get(zoneId);
    const duration = Number(row.schedule?.duration_minutes || 0);
    const days = effectiveScheduleDays(row.program, row.schedule, referenceDate);
    zone.cycles += 1;
    zone.weekMinutes += duration * days.length;
    zone.dailyRuntime = row.dailyRuntime ?? zone.dailyRuntime;
    if (row.soakHours != null) zone.soakHours = row.soakHours;
    if (isIntervalProgram(row.program)) {
      calendarWeek.forEach((date, index) => {
        if (scheduleRunsOnDate(row.program, row.schedule, date)) {
          const day = DAY_ORDER[index];
          zone.days.add(day);
          if (minutesByDay[day] != null) minutesByDay[day] += duration;
        }
      });
    } else {
      for (const day of days) {
        zone.days.add(day);
        if (minutesByDay[day] != null) minutesByDay[day] += duration;
      }
    }
    weekMinutes += duration * days.length;
  }

  const zoneRows = [...zones.values()].sort((a, b) => {
    const codeA = (a.program?.controller_program ?? 'ZZ').toUpperCase();
    const codeB = (b.program?.controller_program ?? 'ZZ').toUpperCase();
    if (codeA !== codeB) return codeA.localeCompare(codeB);
    return (a.zoneNumber ?? 999) - (b.zoneNumber ?? 999);
  });

  const dailyMinutes = zoneRows.reduce((sum, zone) => sum + Number(zone.dailyRuntime || 0), 0);

  return {
    programCount: programs.size,
    zoneCount: catalogValves.size || zoneRows.length,
    cycleCount: rows.length,
    dailyMinutes,
    weekMinutes,
    minutesByDay,
    zoneRows,
  };
}

export async function loadScheduleExportData() {
  const [rows, groups, catalogValves] = await Promise.all([
    loadMainScheduleRows(),
    loadWeeklyScheduleGroups(),
    valvesRepository.getAll(),
  ]);
  const exportedAt = new Date();
  const summary = summarizeRows(rows);
  summary.zoneCount = catalogValves.length;
  return {
    rows,
    groups,
    exportedAt,
    catalogValveCount: catalogValves.length,
    summary,
    todayKey: dayKeyFromDate(exportedAt),
  };
}
