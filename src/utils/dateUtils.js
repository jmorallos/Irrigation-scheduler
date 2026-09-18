const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};
const DAY_FULL = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Monday of the Mon–Sun week containing `date`. */
export function startOfWeekMonday(date = new Date()) {
  const day = startOfDay(date);
  const weekday = day.getDay(); // 0 = Sun
  const offset = weekday === 0 ? -6 : 1 - weekday;
  day.setDate(day.getDate() + offset);
  return day;
}

export function addWeeks(date, count) {
  const next = startOfDay(date);
  next.setDate(next.getDate() + (Number(count) || 0) * 7);
  return next;
}

function addDaysLocal(date, count) {
  const next = startOfDay(date);
  next.setDate(next.getDate() + count);
  return next;
}

export function isSameCalendarDay(a, b) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

export function isSameWeekMonday(a, b = new Date()) {
  return isSameCalendarDay(startOfWeekMonday(a), startOfWeekMonday(b));
}

export function getTodayKey(from = new Date()) {
  const keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return keys[from.getDay()];
}

/** Date for a weekday key within the Mon–Sun week of `from`. */
export function getDateForDayKey(dayKey, from = new Date()) {
  const weekStart = startOfWeekMonday(from);
  const toIndex = DAY_ORDER.indexOf(dayKey);
  if (toIndex < 0) return startOfDay(from);
  return addDaysLocal(weekStart, toIndex);
}

export function weekDatesFrom(referenceDate = new Date()) {
  const weekStart = startOfWeekMonday(referenceDate);
  return DAY_ORDER.map((_, index) => addDaysLocal(weekStart, index));
}

export function formatDayDateNumber(date) {
  return String(date.getDate()).padStart(2, '0');
}

export function formatWeekRange(weekStart) {
  const start = startOfWeekMonday(weekStart);
  const end = addDaysLocal(start, 6);
  const opts = { month: 'short', day: 'numeric' };
  const startLabel = start.toLocaleDateString('en-US', opts);
  const endLabel = end.toLocaleDateString('en-US', opts);
  return `${startLabel} – ${endLabel}`;
}

export function formatDayHeading(dayKey, from = new Date(), clockDate = new Date()) {
  const date = getDateForDayKey(dayKey, from);
  const long = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  if (isSameCalendarDay(date, clockDate)) return `Today · ${long}`;
  return `Viewing ${long}`;
}

export function formatClockTodayLine(from = new Date()) {
  const long = from.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  return `Today is ${long}`;
}

export function dayScopeLabel(
  dayKey,
  clockToday = getTodayKey(),
  referenceDate = new Date(),
  clockDate = new Date(),
) {
  const name = DAY_FULL[dayKey] ?? dayKey;
  const viewDate = getDateForDayKey(dayKey, referenceDate);
  const isToday = isSameCalendarDay(viewDate, clockDate);
  if (isToday) {
    return {
      short: 'today',
      adjective: 'today',
      possessive: "Today's",
      heading: formatDayHeading(dayKey, referenceDate, clockDate),
    };
  }
  void clockToday;
  return {
    short: name,
    adjective: `on ${name}`,
    possessive: `${name}'s`,
    heading: formatDayHeading(dayKey, referenceDate, clockDate),
  };
}

const MINUTES_PER_DAY = 1440;
const CLOCK_TIME = /^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/;

/** Parse `04:00`, `4:00 AM`, or `10:00 PM` into 24-hour `HH:MM`. */
export function parseClockTime(value) {
  if (value == null || value === '') return null;
  const match = String(value).trim().match(CLOCK_TIME);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3];
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes < 0 || minutes > 59) {
    return null;
  }
  if (period) {
    if (hours < 1 || hours > 12) return null;
    const isPm = period.toUpperCase() === 'PM';
    if (isPm && hours !== 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
  } else if (hours < 0 || hours > 23) {
    return null;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Split multi-line or comma-separated start times into 24-hour `HH:MM` values. */
export function parseStartTimes(value) {
  if (value == null) return [];
  const parts = Array.isArray(value) ? value : String(value).split(/[\n,]+/);
  const times = [];
  for (const part of parts) {
    const parsed = parseClockTime(part);
    if (parsed) times.push(parsed);
  }
  return times;
}

function occupiedTimeWindows(startTime, durationMinutes) {
  const start = timeToMinutes(startTime);
  const duration = Number(durationMinutes);
  const end = start + duration;
  if (!Number.isFinite(duration) || duration <= 0) return [];
  if (end <= MINUTES_PER_DAY) return [{ start, end }];
  return [
    { start, end: MINUTES_PER_DAY },
    { start: 0, end: end - MINUTES_PER_DAY },
  ];
}

function timeWindowsOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

/** True overlap of start + Minutes Watered windows on the same watering day. */
export function findStartTimeOverlap(startTimes, durationMinutes) {
  const times = Array.isArray(startTimes) ? startTimes.map(parseClockTime).filter(Boolean) : parseStartTimes(startTimes);
  const duration = Number(durationMinutes);
  if (times.length < 2 || !Number.isFinite(duration) || duration <= 0) return null;

  const windows = times.map(time => occupiedTimeWindows(time, duration));
  for (let i = 0; i < windows.length; i += 1) {
    for (let j = i + 1; j < windows.length; j += 1) {
      const overlaps = windows[i].some(left =>
        windows[j].some(right => timeWindowsOverlap(left, right)),
      );
      if (overlaps) return { a: times[i], b: times[j] };
    }
  }
  return null;
}

export function timeToMinutes(time) {
  const parsed = parseClockTime(time);
  if (!parsed) return 0;
  const [h, m] = parsed.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(totalMinutes) {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getEndTime(startTime, durationMinutes) {
  return minutesToTime(timeToMinutes(startTime) + Number(durationMinutes || 0));
}

export function endsNextDay(startTime, durationMinutes) {
  return timeToMinutes(startTime) + Number(durationMinutes || 0) > 1440;
}

export function formatTime24(time) {
  if (!time) return '—';
  const [h, m] = time.split(':').map(Number);
  return `${String(h || 0).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}

export function formatTime(time) {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

export function formatTimeRange(startTime, durationMinutes) {
  const endTime = getEndTime(startTime, durationMinutes);
  const start = formatTime(startTime);
  const end = formatTime(endTime);
  const suffix = endsNextDay(startTime, durationMinutes) ? ' next day' : '';
  const startPeriod = start.slice(-2);
  const endPeriod = end.slice(-2);
  if (startPeriod === endPeriod && !suffix) {
    return `${start.slice(0, -3)} – ${end}`;
  }
  return `${start} – ${end}${suffix}`;
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatDays(days) {
  return days
    .slice()
    .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
    .map(d => DAY_LABELS[d])
    .join(', ');
}

export function formatDaysCompact(days) {
  return formatDays(days);
}

export { DAY_ORDER, DAY_LABELS, DAY_FULL };
