import { formatGallons } from './waterUsage';
import { getDateForDayKey } from './dateUtils';
import { formatMinutes } from './formatMinutes';

/** Summary page section titles (Otoy brief / Sum rename). */
export const SUMMARY_SECTION_TITLES = {
  week: 'Week',
  valves: 'Valves - Minutes',
  valveWater: 'Valves - Gallons',
  programTime: 'Program - Minutes',
  programWater: 'Program - Gallons',
  overview: 'Overview',
};

/** Selected-day header date, e.g. "Mon, Sep 14". */
export function summaryHeaderDate(dayKey, weekStart) {
  const date = getDateForDayKey(dayKey, weekStart);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function datedSummaryTitle(title, headerDate) {
  return `${title} ${headerDate}`;
}

/** Week strip / first Sum block: selected date plus the week range. */
export function summaryWeekNavLabel(headerDate, weekRangeLabel) {
  return `${headerDate} · ${weekRangeLabel}`;
}

/** Compact week total on Program - Minutes (replaces Minutes By Week chart). */
export function formatWeekMinutesLine(minutes) {
  if (minutes == null || !Number.isFinite(Number(minutes))) return null;
  return `${formatMinutes(minutes)} / Week`;
}

/** Card title for the Overview section — "Today's Overview" or "Friday's Overview". */
export function overviewSectionTitle(possessive = "Today's") {
  return `${possessive} ${SUMMARY_SECTION_TITLES.overview}`;
}

/** Overview tiles — values are for the selected day only. */
export const SUMMARY_OVERVIEW_COLUMNS = [
  { key: 'total', label: 'Programs' },
  { key: 'active', label: 'Active events' },
  { key: 'zones', label: 'Valves' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'water', label: 'Total Gallons' },
];

/** Section removed per client request. */
export const SUMMARY_OMITTED_SECTIONS = ['Cycles by Program'];

/**
 * Build Today's Overview numbers from the selected day's chart/list data.
 * Programs / Valves / Minutes / Total Gallons = that day only.
 * Active = active cycles (starts) on that day.
 */
export function buildTodayOverviewStats({
  byProgramToday = [],
  zoneTotals = [],
  dayItems = [],
  dayGallons = null,
} = {}) {
  const programs = byProgramToday.length;
  const startsFromCharts = byProgramToday.reduce((sum, row) => sum + (Number(row.starts) || 0), 0);
  const activeCycles = dayItems.length > 0 ? dayItems.length : startsFromCharts;
  const minutes = byProgramToday.reduce((sum, row) => sum + (Number(row.minutes) || 0), 0);

  return {
    total: programs,
    active: activeCycles,
    zones: zoneTotals.length,
    minutes,
    water: formatGallons(dayGallons) ?? '—',
  };
}
