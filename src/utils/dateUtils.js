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

export function timeToMinutes(time) {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
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

export function formatDaysCompact(days) {
  const short = { mon: 'M', tue: 'T', wed: 'W', thu: 'Th', fri: 'F', sat: 'Sa', sun: 'Su' };
  return days
    .slice()
    .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
    .map(d => short[d] ?? d)
    .join('-');
}

export function formatDays(days) {
  return days
    .slice()
    .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
    .map(d => DAY_LABELS[d])
    .join(' · ');
}

export { DAY_ORDER, DAY_LABELS, DAY_FULL };
