import { findScheduleConflict, findNextAvailableStart, conflictMessage } from '../src/utils/scheduleConflict.js';
import { parseBackupFile, validateBackup } from '../src/utils/backupUtils.js';
import { formatFileSize } from '../src/utils/imageUtils.js';
import { buildScheduleHtml, escapeHtml } from '../src/utils/scheduleHtmlExport.js';

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
assert(message.includes('Zone 5'), 'banner names the other zone');
assert(message.includes('Next available: 6:15 AM'), 'banner includes next available');

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
assert(html.includes('Court'), 'zone short name');
assert(html.includes('M-W'), 'compact days');
assert(html.includes('size: landscape'), 'print stylesheet is landscape');
assert(html.includes('&lt;b&gt;soak&lt;/b&gt;'), 'HTML notes cannot inject markup');
assert(!html.includes('<b>soak</b>'), 'raw HTML notes are not kept');
assert(html.includes('cannot restore') || html.includes('not a restore backup'), 'HTML labeled as non-restore');
assert(buildScheduleHtml([]).includes('No active schedules.'), 'empty schedule message');

console.log('');
if (failed) {
  console.error(`${passed} passed, ${failed} failed`);
  process.exit(1);
}
console.log(`${passed} passed`);
