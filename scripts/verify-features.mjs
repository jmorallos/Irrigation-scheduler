import { findScheduleConflict, findNextAvailableStart, defaultStartForNewCycle, listAvailableStarts, conflictMessage } from '../src/utils/scheduleConflict.js';
import { parseBackupFile, validateBackup } from '../src/utils/backupUtils.js';
import { formatFileSize } from '../src/utils/imageUtils.js';
import { formatMinutes } from '../src/utils/formatMinutes.js';
import { withDailyRuntimeOnce, scheduleTableTotals } from '../src/utils/scheduleStats.js';
import { buildScheduleHtml, escapeHtml } from '../src/utils/scheduleHtmlExport.js';
import { hsvToHex, hexToHsv } from '../src/utils/hsvColor.js';
import { getThemeByColor, contrastBadgeText, relativeLuminance, suggestColorForPrefix, badgeEdgeColor } from '../src/utils/programColors.js';
import { isValveNumberTaken, nextValveNumber, takenValveNumbers, programsForMemberships } from '../src/utils/zoneIdentity.js';
import { programHasValve } from '../src/utils/valveRecords.js';
import { getDateForDayKey, dayScopeLabel, formatDayHeading } from '../src/utils/dateUtils.js';
import { formatValveSubtitle } from '../src/utils/scheduleUtils.js';
import { gallonsForRun, formatGallons, formatRunGallons, normalizeGph, sumGallons, gallonsForWeek, gallonLabel } from '../src/utils/waterUsage.js';
import ExcelJS from 'exceljs';
import { buildScheduleWorkbookForTest } from '../src/utils/scheduleXlsxExport.js';
import { summarizeRows } from '../src/utils/scheduleExportData.js';
import { hexToArgb } from '../src/utils/xlsxTheme.js';
import {
  normalizeProgramSchedule,
  isIntervalWateringDay,
  isWithinProgramDateRange,
  validateProgramScheduleFields,
  programSchedulePayload,
  formatIntervalSummary,
  WATERING_MODE_WEEKDAY,
  WATERING_MODE_INTERVAL,
  slideIntervalDate,
  formatNeverOnSummary,
} from '../src/utils/programSchedule.js';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    passed += 1;
    console.log(`  ok  ${name}`);
    return;
  }
  failed += 1;
  console.error(`  FAIL  ${name}`);
}

function expectThrow(fn, match, name) {
  try {
    fn();
    failed += 1;
    console.error(`  FAIL  ${name} (no throw)`);
  } catch (err) {
    const ok = match.test(err.message);
    if (ok) {
      passed += 1;
      console.log(`  ok  ${name}`);
    } else {
      failed += 1;
      console.error(`  FAIL  ${name} (got: ${err.message})`);
    }
  }
}

const zoneA = { id: 'z1', name: 'Zone 5 · Court' };
const existing = [
  {
    id: 's1',
    start_time: '06:00',
    duration_minutes: 15,
    days_of_week: ['mon', 'wed'],
    status: 'active',
    cycle: 1,
    zone: zoneA,
  },
];

console.log('Overlap');
assert(
  Boolean(findScheduleConflict({
    id: 'new',
    start_time: '06:10',
    duration_minutes: 15,
    days_of_week: ['mon'],
    status: 'active',
  }, existing)),
  'overlapping start is a conflict',
);
assert(
  findScheduleConflict({
    id: 'new',
    start_time: '06:15',
    duration_minutes: 15,
    days_of_week: ['mon'],
    status: 'active',
  }, existing) == null,
  'back-to-back 06:15 after 06:00–06:15 is allowed',
);
assert(
  findScheduleConflict({
    id: 'new',
    start_time: '06:10',
    duration_minutes: 15,
    days_of_week: ['tue'],
    status: 'active',
  }, existing) == null,
  'same clock on a free day is allowed',
);
assert(
  findScheduleConflict({
    id: 'new',
    start_time: '06:10',
    duration_minutes: 15,
    days_of_week: ['mon'],
    status: 'inactive',
  }, existing) == null,
  'inactive candidate is ignored',
);
assert(
  findScheduleConflict({
    id: 's1',
    start_time: '06:00',
    duration_minutes: 15,
    days_of_week: ['mon'],
    status: 'active',
  }, existing) == null,
  'editing the same cycle is not a self-conflict',
);

const wrapExisting = [{
  id: 'night',
  start_time: '23:50',
  duration_minutes: 20,
  days_of_week: ['sun'],
  status: 'active',
  cycle: 2,
  zone: zoneA,
}];
assert(
  Boolean(findScheduleConflict({
    id: 'new',
    start_time: '00:05',
    duration_minutes: 10,
    days_of_week: ['mon'],
    status: 'active',
  }, wrapExisting)),
  'overnight wrap overlaps next morning',
);

const next = findNextAvailableStart({
  id: 'new',
  start_time: '06:10',
  duration_minutes: 15,
  days_of_week: ['mon'],
  status: 'active',
}, existing);
assert(next === '06:15', `next available is 06:15 (got ${next})`);

const conflict = findScheduleConflict({
  id: 'new',
  start_time: '06:10',
  duration_minutes: 15,
  days_of_week: ['mon'],
  status: 'active',
}, existing);
const message = conflictMessage(conflict, 'Courts', '06:15');
assert(message.includes('Cycle 1'), 'banner names the other cycle');
assert(message.includes('Valve 5'), 'banner names the other valve');
assert(message.includes('Courts'), 'banner names the other program');
assert(message.includes('Next available: 6:15 AM'), 'banner includes next available');

const otherProgramExisting = [{
  id: 's2',
  start_time: '06:00',
  duration_minutes: 15,
  days_of_week: ['mon', 'wed'],
  status: 'active',
  cycle: 1,
  zone: { id: 'z2', name: 'Zone 1 · Front' },
  program: { id: 'p2', name: 'Lawns' },
}];
assert(
  Boolean(findScheduleConflict({
    id: 'new',
    start_time: '06:00',
    duration_minutes: 15,
    days_of_week: ['mon'],
    status: 'active',
  }, otherProgramExisting)),
  'same clock in another program is a conflict',
);
assert(
  findScheduleConflict({
    id: 'new',
    start_time: '06:15',
    duration_minutes: 15,
    days_of_week: ['mon'],
    status: 'active',
  }, otherProgramExisting) == null,
  'back-to-back across programs is allowed',
);
const crossMessage = conflictMessage(otherProgramExisting[0], 'Courts');
assert(
  crossMessage.includes('Valve 1') && crossMessage.includes('Lawns'),
  'banner names other valve and program',
);
assert(
  defaultStartForNewCycle({
    durationMinutes: 15,
    existingSchedules: [{
      id: 'hour',
      start_time: '04:00',
      duration_minutes: 60,
      days_of_week: ['mon'],
      status: 'active',
    }],
  }) === '05:00',
  'new cycle start follows a 04:00 1-hour run',
);
assert(
  defaultStartForNewCycle({ durationMinutes: 15, existingSchedules: [] }) === '06:00',
  'empty calendar keeps 06:00',
);
assert(
  defaultStartForNewCycle({ durationMinutes: 15, existingSchedules: existing }) === '06:15',
  'new cycle start follows 06:00–06:15',
);
const slots = listAvailableStarts({
  durationMinutes: 15,
  daysOfWeek: ['mon'],
  existingSchedules: existing,
  limit: 3,
});
assert(slots[0] === '06:00' || slots.includes('06:15'), 'available starts include a free slot');
assert(slots.includes('06:15'), 'available starts skip into 06:15 after busy window');
assert(slots.every((t, i) => i === 0 || t > slots[i - 1]), 'available starts are ordered');

console.log('Backup JSON vs HTML');
expectThrow(
  () => parseBackupFile('<!DOCTYPE html><html></html>'),
  /printable schedule/,
  'HTML file is rejected on import',
);
expectThrow(
  () => parseBackupFile('not-json'),
  /not a backup file/i,
  'plain text is rejected on import',
);
assert(
  validateBackup({ version: 3, programs: [], zones: [], schedules: [] }).version === 3,
  'empty JSON backup validates',
);

console.log('Photos');
assert(formatFileSize(86 * 1024) === '86 KB', '86 KB label');
assert(formatFileSize(512) === '512 B', 'byte label');
assert(formatFileSize(1.5 * 1024 * 1024) === '1.5 MB', 'MB label');

console.log('Labels');
assert(formatMinutes(1) === '1 Min', '1 Min');
assert(formatMinutes(15) === '15 Min', '15 Min');
assert(
  formatValveSubtitle({ zone_number: 3, name: 'Valve 3 · Lauris Nobilis' }) === 'Valve 3 - Lauris Nobilis',
  'summary valve subtitle uses hyphen',
);

console.log('Water usage');
assert(normalizeGph('') === null, 'empty GPH is null');
assert(normalizeGph(210) === 210, 'numeric GPH kept');
assert(gallonsForRun(210, 45) === 157.5, '210 GPH for 45 min');
assert(gallonsForRun(200, 45) === 150, '200 GPH for 45 min');
assert(gallonsForRun(210, 60) === 210, '210 GPH for 60 min');
assert(gallonsForRun(null, 60) === null, 'missing GPH returns null');
assert(formatGallons(150) === '150 gal', 'whole gallons');
assert(formatGallons(157.5) === '157.5 gal', 'fractional gallons');
assert(formatRunGallons(210, 60) === '210 gal', 'formatted run gallons');
assert(gallonsForWeek(210, 60, ['mon', 'wed', 'fri']) === 630, 'weekly gallons count each run day');
assert(sumGallons([210, 157.5]) === 367.5, 'sum gallons');
assert(sumGallons([null, undefined]) === null, 'empty gallon sum');
assert(gallonLabel(210, 'day', 'today') === '210 gal today', 'day gallon label');
assert(gallonLabel(630, 'week') === '630 gal / week', 'week gallon label');

console.log('Program interval schedule');
const legacyProgram = normalizeProgramSchedule({ name: 'Legacy' });
assert(legacyProgram.watering_mode === WATERING_MODE_WEEKDAY, 'legacy program defaults to weekdays');
assert(legacyProgram.interval_days === null, 'legacy program has no interval');

const intervalProgram = {
  watering_mode: WATERING_MODE_INTERVAL,
  interval_days: 3,
  program_start_date: '2026-09-02',
  program_end_date: null,
};
assert(formatIntervalSummary(intervalProgram) === 'Every 3 days', 'interval summary text');
assert(
  isIntervalWateringDay(intervalProgram, new Date(2026, 8, 2)),
  'interval waters on start date',
);
assert(
  !isIntervalWateringDay(intervalProgram, new Date(2026, 8, 3)),
  'interval skips between runs',
);
assert(
  isIntervalWateringDay(intervalProgram, new Date(2026, 8, 5)),
  'interval waters every third day',
);
const boundedProgram = {
  ...intervalProgram,
  program_end_date: '2026-09-08',
};
assert(
  !isIntervalWateringDay(boundedProgram, new Date(2026, 8, 11)),
  'interval stops after end date',
);
assert(
  isWithinProgramDateRange(boundedProgram, new Date(2026, 8, 8)),
  'interval active on end date',
);
const intervalErrors = validateProgramScheduleFields({
  watering_mode: WATERING_MODE_INTERVAL,
  interval_days: 0,
  program_start_date: '',
  program_end_mode: 'date',
  program_end_date: '',
});
assert(intervalErrors.interval_days && intervalErrors.program_start_date, 'interval validation catches missing fields');
const payload = programSchedulePayload({
  watering_mode: WATERING_MODE_INTERVAL,
  interval_days: 3,
  program_start_date: '2026-09-02',
  program_end_mode: 'never',
  program_end_date: '',
});
assert(payload.program_end_date === null && payload.interval_days === 3, 'interval payload stores never end');
const weekdayPayload = programSchedulePayload({
  watering_mode: WATERING_MODE_WEEKDAY,
  interval_days: 3,
  program_start_date: '2026-09-02',
  program_end_mode: 'never',
});
assert(weekdayPayload.watering_mode === WATERING_MODE_WEEKDAY, 'weekday payload clears interval fields');
assert(weekdayPayload.never_on_days.length === 0, 'weekday payload clears never-on days');

const sundaySlideProgram = {
  watering_mode: WATERING_MODE_INTERVAL,
  interval_days: 3,
  program_start_date: '2026-08-27',
  program_end_date: null,
  never_on_days: ['sun'],
};
assert(
  slideIntervalDate(new Date(2026, 7, 30), ['sun']).getDate() === 31
  && slideIntervalDate(new Date(2026, 7, 30), ['sun']).getMonth() === 7,
  'never-on Sunday slides to Monday',
);
assert(
  !isIntervalWateringDay(sundaySlideProgram, new Date(2026, 7, 30)),
  'interval does not water on blocked Sunday',
);
assert(
  isIntervalWateringDay(sundaySlideProgram, new Date(2026, 7, 31)),
  'interval waters on slid Monday',
);
assert(formatNeverOnSummary(sundaySlideProgram) === 'Sun', 'never-on summary text');

console.log('XLSX export');
const xlsxRows = [{
  id: 'sch-x1',
  program: { name: 'Bay', controller_program: 'C', color: 'sky' },
  zone: { name: 'Bay Laurel', gph: 200 },
  schedule: {
    id: 'sch-x1',
    start_time: '04:00',
    duration_minutes: 60,
    days_of_week: ['mon', 'wed', 'fri'],
    notes: '',
  },
  soakHours: null,
  dailyRuntime: 60,
  theme: { rowHex: '#f0f9ff', borderHex: '#bae6fd' },
  programTheme: { badgeHex: '#0284c7' },
  zoneNumber: 3,
}];
const xlsxSummary = summarizeRows(xlsxRows);
const xlsxWorkbook = buildScheduleWorkbookForTest(ExcelJS, {
  rows: xlsxRows,
  groups: [],
  exportedAt: new Date('2026-08-15T00:00:00'),
  todayKey: 'sat',
  summary: xlsxSummary,
});
const sheetNames = xlsxWorkbook.worksheets.map(sheet => sheet.name);
assert(sheetNames.includes('Schedule'), 'xlsx schedule sheet');
assert(sheetNames.includes('Runtime by valve'), 'xlsx runtime sheet');
assert(sheetNames.includes('Minutes by day'), 'xlsx minutes sheet');
assert(sheetNames.includes('By week'), 'xlsx week sheet');
const scheduleSheet = xlsxWorkbook.getWorksheet('Schedule');
const endFormula = scheduleSheet.getCell('H2').value;
assert(typeof endFormula === 'object' && endFormula.formula.includes('MOD'), 'xlsx end time formula');
const gallonsFormula = scheduleSheet.getCell('I2').value;
assert(typeof gallonsFormula === 'object' && gallonsFormula.formula.includes('/60*'), 'xlsx gallons formula');
const weekGallonsFormula = scheduleSheet.getCell('R2').value;
assert(typeof weekGallonsFormula === 'object' && weekGallonsFormula.formula.includes('SUM(J2:P2)'), 'xlsx week gallons formula');
assert(hexToArgb('#0284c7') === 'FF0284C7', 'xlsx hex to argb');
const badgeFill = scheduleSheet.getCell('A2').fill?.fgColor?.argb;
assert(badgeFill === 'FF0284C7', 'xlsx badge fill color');
const footerDuration = scheduleSheet.getCell('G3').value;
assert(typeof footerDuration === 'object' && footerDuration.formula.includes('SUM(G2:G2)'), 'xlsx footer duration total');

console.log('HTML export');
assert(escapeHtml('<script>') === '&lt;script&gt;', 'notes are escaped');
const html = buildScheduleHtml([{
  id: 'r1',
  program: { name: 'Courts', controller_program: 'A', color: 'emerald' },
  zone: { name: 'Zone 5 · Court' },
  schedule: {
    start_time: '06:00',
    duration_minutes: 15,
    days_of_week: ['mon', 'wed'],
    notes: '<b>soak</b>',
  },
  soakHours: 2,
  dailyRuntime: 15,
  theme: { rowHex: '#ecfdf5', borderHex: '#a7f3d0' },
  programTheme: { badgeHex: '#059669' },
  zoneNumber: 5,
}], { exportedAt: new Date('2026-08-15T00:00:00') });
assert(html.includes('background:#059669;color:#ffffff'), 'dark export badge uses white letter');
const paleExport = buildScheduleHtml([{
  id: 'pale1',
  program: { name: 'Pale', controller_program: 'B', color: '#f5e6a3' },
  zone: { name: 'Valve 1' },
  schedule: {
    start_time: '07:00',
    duration_minutes: 10,
    days_of_week: ['mon'],
    notes: '',
  },
  soakHours: null,
  dailyRuntime: 10,
  theme: { rowHex: '#fff', borderHex: '#eee', badgeHex: '#ea580c' },
  programTheme: { badgeHex: '#f5e6a3' },
  zoneNumber: 1,
}], { exportedAt: new Date('2026-08-15T00:00:00') });
assert(paleExport.includes('background:#f5e6a3;color:#0a2540'), 'pale export badge uses navy letter');
assert(!/\.badge\s*\{[^}]*color:\s*#fff/.test(paleExport), 'export CSS does not force white badge text');
const valveLeakExport = buildScheduleHtml([{
  id: 'leak1',
  program: { name: 'Front', controller_program: 'B', color: 'violet' },
  zone: { name: 'Valve 2', color: 'orange' },
  schedule: {
    start_time: '08:00',
    duration_minutes: 10,
    days_of_week: ['tue'],
    notes: '',
  },
  soakHours: null,
  dailyRuntime: 10,
  theme: { rowHex: '#fff7ed', borderHex: '#fed7aa', badgeHex: '#ea580c' },
  zoneNumber: 2,
}], { exportedAt: new Date('2026-08-15T00:00:00') });
assert(valveLeakExport.includes('background:#7c3aed'), 'export badge uses program color when programTheme missing');
assert(!valveLeakExport.includes('background:#ea580c'), 'export badge does not use valve color');
assert(html.includes('<th>Duration (Min)</th>'), 'duration unit is in the header');
assert(html.includes('<th>Daily runtime (Min)</th>'), 'daily runtime unit is in the header');
assert(!html.includes('15 Min'), 'cells do not repeat Min');
assert(html.includes('Court'), 'valve short name');
assert(html.includes('M-W'), 'compact days');
const zoneIdx = html.indexOf('<th>Valve #</th>');
const startIdx = html.indexOf('<th>Start</th>');
const endIdx = html.indexOf('<th>End</th>');
const daysIdx = html.indexOf('<th>Days</th>');
const programIdx = html.indexOf('<th>Program</th>');
const soakMinIdx = html.indexOf('<th>Soak (Min)</th>');
const runtimeIdx = html.indexOf('<th>Daily runtime (Min)</th>');
assert(programIdx > -1 && programIdx < zoneIdx && zoneIdx < startIdx && startIdx < endIdx && endIdx < daysIdx, 'schedule column order');
assert(soakMinIdx > -1 && soakMinIdx < runtimeIdx && runtimeIdx < daysIdx, 'soak min then daily runtime');
assert(html.includes('size: landscape'), 'print stylesheet is landscape');
assert(html.includes('print-color-adjust: exact'), 'print keeps row colors');
assert(html.includes('&lt;b&gt;soak&lt;/b&gt;'), 'HTML notes cannot inject markup');
assert(!html.includes('<b>soak</b>'), 'raw HTML notes are not kept');
assert(html.includes('cannot restore') || html.includes('not a restore backup'), 'HTML labeled as non-restore');
assert(html.includes('<strong>Total</strong>') || html.includes('>Total<'), 'schedule table has total row');

const multiMembershipHtml = buildScheduleHtml([
  {
    id: 'r1',
    program: { id: 'p1', name: 'Front', controller_program: 'B' },
    zone: { id: 'm1', valve_id: 'v1', name: 'Front' },
    schedule: { start_time: '06:00', duration_minutes: 10, days_of_week: ['mon'] },
    dailyRuntime: 10,
    zoneNumber: 1,
  },
  {
    id: 'r2',
    program: { id: 'p2', name: 'Extra', controller_program: 'C' },
    zone: { id: 'm2', valve_id: 'v1', name: 'Front' },
    schedule: { start_time: '07:00', duration_minutes: 10, days_of_week: ['tue'] },
    dailyRuntime: 10,
    zoneNumber: 1,
  },
  {
    id: 'r3',
    program: { id: 'p1', name: 'Front', controller_program: 'B' },
    zone: { id: 'm3', valve_id: 'v2', name: 'Back' },
    schedule: { start_time: '08:00', duration_minutes: 10, days_of_week: ['wed'] },
    dailyRuntime: 10,
    zoneNumber: 2,
  },
]);
assert(
  /<div class="label">Valves<\/div>\s*<div class="value mono">2<\/div>/.test(multiMembershipHtml),
  'export valves counts catalog once',
);
assert(
  /<div class="label">Valves<\/div>\s*<div class="value mono">6<\/div>/.test(
    buildScheduleHtml([], { catalogValveCount: 6 }),
  ),
  'catalogValveCount overrides overview valves',
);

console.log('Daily runtime once');
const vineRows = withDailyRuntimeOnce([
  { id: 'c1', zone: { id: 'z1' }, schedule: { duration_minutes: 10 }, dailyRuntime: 30 },
  { id: 'c2', zone: { id: 'z1' }, schedule: { duration_minutes: 10 }, dailyRuntime: 30 },
  { id: 'c3', zone: { id: 'z1' }, schedule: { duration_minutes: 10 }, dailyRuntime: 30 },
]);
assert(vineRows.filter(r => r.showDailyRuntime).length === 1, 'daily runtime shown once per valve');
assert(vineRows[2].showDailyRuntime === true, 'daily runtime on last cycle of valve');
const vineTotals = scheduleTableTotals(vineRows);
assert(vineTotals.durationTotal === 30, 'duration total is 30 for three 10-min cycles');
assert(vineTotals.dailyRuntimeTotal === 30, 'daily runtime total counts valve once');
const gallonTotals = scheduleTableTotals([
  { zone: { gph: 210 }, schedule: { duration_minutes: 60, days_of_week: ['mon', 'wed', 'fri'] } },
  { zone: { gph: 200 }, schedule: { duration_minutes: 45, days_of_week: ['tue'] } },
]);
assert(gallonTotals.weekGallonsTotal === 780, 'schedule week gallons total');
assert(gallonTotals.gallonsTotal === 360, 'schedule run gallons total');

assert(html.includes('Runtime by valve'), 'valve runtime section');
assert(html.includes('Daily min'), 'daily minutes per valve');
assert(html.includes('Weekly min'), 'weekly minutes per valve');
assert(html.includes('Minutes by day'), 'minutes by day section');
assert(html.includes('>30<'), 'weekly minutes total 15 x 2 days');
assert(buildScheduleHtml([]).includes('No active schedules.'), 'empty schedule message');

const weeklyHtml = buildScheduleHtml({
  rows: [],
  groups: [{
    program: { name: 'Courts', controller_program: 'A', color: 'emerald' },
    rows: [{
      zone: { name: 'Zone 5 · Court', status: 'active' },
      days: {
        mon: [{ id: 's1', start_time: '06:00', duration_minutes: 15 }],
      },
    }],
  }],
  exportedAt: new Date('2026-08-15T00:00:00'),
});
assert(weeklyHtml.includes('By week'), 'weekly grid section');
assert(weeklyHtml.includes('06:00'), 'weekly grid 24-hour start');
assert(weeklyHtml.includes('06:15'), 'weekly grid 24-hour end');
assert(weeklyHtml.includes('Valve 5 · Court'), 'weekly grid valve name');

console.log('Valve numbers');
const catalogValves = [
  { id: 'v1', zone_number: 1, name: 'Valve 1 · Front' },
  { id: 'v3', zone_number: 3, name: 'Valve 3 · Lawn' },
];
assert(isValveNumberTaken(catalogValves, 1), 'catalog number 1 is taken');
assert(!isValveNumberTaken(catalogValves, 1, 'v1'), 'not taken when editing self');
assert(!isValveNumberTaken(catalogValves, 2), 'unused catalog number is free');
assert(nextValveNumber(catalogValves) === 2, 'next unused catalog number is 2');
assert(
  takenValveNumbers(catalogValves).includes(1) && takenValveNumbers(catalogValves).includes(3),
  'taken catalog numbers list',
);

const memberships = [
  { id: 'm1', program_id: 'p1', valve_id: 'v1' },
  { id: 'm2', program_id: 'p1', valve_id: 'v1' },
];
assert(programHasValve(memberships, 'p1', 'v1'), 'program already has valve');
assert(!programHasValve(memberships, 'p1', 'v2'), 'valve not in program yet');

console.log('Valve program badges');
const progA = { id: 'pa', name: 'Bay', controller_program: 'A', color: 'emerald' };
const progB = { id: 'pb', name: 'Front', controller_program: 'B', color: 'violet' };
const progE = { id: 'pe', name: 'Extra', controller_program: 'E', color: 'teal' };
const byId = new Map([['pa', progA], ['pb', progB], ['pe', progE]]);
const multi = programsForMemberships(
  [{ program_id: 'pb' }, { program_id: 'pe' }, { program_id: 'pa' }, { program_id: 'pb' }],
  byId,
);
assert(multi.map(p => p.controller_program).join('') === 'ABE', 'badges sorted A then B then E');
assert(multi.length === 3, 'duplicate membership does not duplicate badge');
assert(programsForMemberships([], byId).length === 0, 'no memberships means no badges');

console.log('HSV color');
const roundtrip = hsvToHex(hexToHsv('#2563eb'));
assert(roundtrip === '#2563eb', `hex roundtrip (got ${roundtrip})`);
assert(hsvToHex({ h: 0, s: 0, v: 1 }) === '#ffffff', 'white');
assert(hsvToHex({ h: 0, s: 0, v: 0 }) === '#000000', 'black');

console.log('Badge contrast');
const pale = getThemeByColor('#f5e6a3', 'B');
assert(pale.badgeHex === '#f5e6a3', 'custom badge keeps chosen color');
assert(pale.badgeTextHex === '#0a2540', 'pale badge uses navy letter');
assert(contrastBadgeText('#0a2540') === '#ffffff', 'dark badge uses white text');
assert(contrastBadgeText('#fef3c7') === '#0a2540', 'light badge uses navy text');
assert(relativeLuminance('#f5e6a3') > 0.45, 'pale yellow is treated as light for letter contrast');
const whiteBadge = getThemeByColor('#ffffff', 'A');
assert(whiteBadge.badgeHex === '#ffffff', 'white badge keeps white fill');
assert(whiteBadge.badgeTextHex === '#0a2540', 'white badge uses navy letter');
assert(whiteBadge.badgeEdgeHex === '#94a3b8', 'white badge gets hairline edge');
assert(badgeEdgeColor('#059669') == null, 'dark badge has no edge');
assert(badgeEdgeColor('#f5e6a3') == null, 'mid pale badge has no edge');

console.log('Prefix color suggest');
assert(suggestColorForPrefix('B', { isEditing: false, currentColor: 'emerald' }) === 'amber', 'new program maps B to amber');
assert(suggestColorForPrefix('B', { isEditing: true, currentColor: 'violet' }) === 'violet', 'edit keeps custom color');
assert(suggestColorForPrefix('C', { isEditing: true, currentColor: '#aabbcc' }) === '#aabbcc', 'edit keeps custom hex');
assert(suggestColorForPrefix('Z', { isEditing: false, currentColor: 'emerald' }) === 'emerald', 'unknown letter keeps current');

console.log('Selected weekday');
const wed = new Date(2026, 7, 19);
assert(getDateForDayKey('fri', wed).getDate() === 21, 'Friday is later this week');
assert(getDateForDayKey('mon', wed).getDate() === 17, 'Monday is earlier this week');
assert(getDateForDayKey('sun', wed).getDate() === 23, 'Sunday is end of Mon-Sun week');
assert(dayScopeLabel('wed', 'wed').possessive === "Today's", 'clock today uses Today');
assert(dayScopeLabel('fri', 'wed').possessive === "Friday's", 'other day uses weekday name');
assert(
  formatDayHeading('mon', new Date(2026, 7, 19)).startsWith('Viewing Monday'),
  'other day heading says Viewing',
);

console.log('');
if (failed) {
  console.error(`${passed} passed, ${failed} failed`);
  process.exit(1);
}
console.log(`${passed} passed`);
