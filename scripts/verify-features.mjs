import { findScheduleConflict, findNextAvailableStart, defaultStartForNewCycle, conflictMessage } from '../src/utils/scheduleConflict.js';
import { parseBackupFile, validateBackup } from '../src/utils/backupUtils.js';
import { formatFileSize } from '../src/utils/imageUtils.js';
import { formatMinutes } from '../src/utils/formatMinutes.js';
import { buildScheduleHtml, escapeHtml } from '../src/utils/scheduleHtmlExport.js';
import { hsvToHex, hexToHsv } from '../src/utils/hsvColor.js';
import { isValveNumberTaken, nextValveNumber, takenValveNumbers } from '../src/utils/zoneIdentity.js';
import { getDateForDayKey, dayScopeLabel, formatDayHeading } from '../src/utils/dateUtils.js';

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
assert(html.includes('06:00'), '24-hour start time');
assert(html.includes('06:15'), '24-hour end time');
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

console.log('HSV color');
const roundtrip = hsvToHex(hexToHsv('#2563eb'));
assert(roundtrip === '#2563eb', `hex roundtrip (got ${roundtrip})`);
assert(hsvToHex({ h: 0, s: 0, v: 1 }) === '#ffffff', 'white');
assert(hsvToHex({ h: 0, s: 0, v: 0 }) === '#000000', 'black');

console.log('Selected weekday');
const wed = new Date(2026, 7, 19);
assert(getDateForDayKey('fri', wed).getDate() === 21, 'Friday is later this week');
assert(getDateForDayKey('mon', wed).getDate() === 17, 'Monday is earlier this week');
assert(getDateForDayKey('sun', wed).getDate() === 23, 'Sunday is end of Mon-Sun week');
assert(dayScopeLabel('wed', 'wed').possessive === "Today's", 'clock today uses Today');
assert(dayScopeLabel('fri', 'wed').possessive === "Friday's", 'other day uses weekday name');
assert(
  formatDayHeading('fri', new Date(2026, 7, 19)).startsWith('Viewing Friday'),
  'other day heading says Viewing',
);

console.log('');
if (failed) {
  console.error(`${passed} passed, ${failed} failed`);
  process.exit(1);
}
console.log(`${passed} passed`);
