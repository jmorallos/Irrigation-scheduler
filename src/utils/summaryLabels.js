import { formatGallons } from './waterUsage';

/** Summary page section titles (newlist2 / third_edit). */
export const SUMMARY_SECTION_TITLES = {
  week: 'Week',
  valves: 'Valves',
  valveWater: 'Water',
  programTime: 'Program Time',
  programWater: 'Program Water',
  overview: "Today's Overview",
};

/** Today's Overview tiles — values are for the selected day only. */
export const SUMMARY_OVERVIEW_COLUMNS = [
  { key: 'total', label: 'Programs' },
  { key: 'active', label: 'Active cycles' },
  { key: 'zones', label: 'Valves' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'water', label: 'Total water' },
];

/** Section removed per client request. */
export const SUMMARY_OMITTED_SECTIONS = ['Cycles by Program'];

/**
 * Build Today's Overview numbers from the selected day's chart/list data.
 * Programs / Valves / Minutes / Total water = that day only.
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
