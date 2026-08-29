import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useWeeklySchedule } from '../hooks/useWeeklySchedule';
import { useMainSchedule } from '../hooks/useMainSchedule';
import { DAY_ORDER, DAY_LABELS, formatTime, formatTime24, formatDaysCompact, getEndTime, dayScopeLabel, formatClockTodayLine } from '../utils/dateUtils';
import { getZoneDisplayName, getZoneShortName } from '../utils/scheduleUtils';
import { soakMinutesFromHours, withDailyRuntimeOnce, scheduleTableTotals } from '../utils/scheduleStats';
import { formatScheduleRowGallons, formatScheduleRowWeekGallons, scheduleRowGallons, scheduleRowWeekGallons } from '../utils/waterUsage';
import { getProgramTheme, getZoneTheme } from '../utils/programColors';
import ProgramBadge from '../components/ProgramBadge';
import EmptyState from '../components/EmptyState';
import { useSelectedDay } from '../context/SelectedDayContext';

const ZONE_COL =
  'sticky left-0 z-20 w-32 min-w-32 max-w-32 sm:w-44 sm:min-w-44 sm:max-w-44 px-3 sm:px-4';

const TH_MAIN =
  'sticky top-0 z-20 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap bg-navy-900';

const TH_SORT =
  `${TH_MAIN} select-none cursor-pointer [-webkit-tap-highlight-color:transparent]`;

function programSortKey(row) {
  return `${(row.program.controller_program ?? '').toUpperCase()}\0${(row.program.name ?? '').toLowerCase()}`;
}

function valveNameSortKey(row) {
  return (getZoneShortName(row.zone) || '').toLowerCase();
}

function endTimeSortKey(row) {
  return getEndTime(row.schedule.start_time, row.schedule.duration_minutes);
}

function daysSortKey(row) {
  const days = row.schedule.days_of_week ?? [];
  return DAY_ORDER.map(day => (days.includes(day) ? '1' : '0')).join('');
}

function notesSortKey(row) {
  return (row.schedule.notes || '').toLowerCase();
}

function compareNullableNumber(a, b) {
  const aNull = a == null || Number.isNaN(a);
  const bNull = b == null || Number.isNaN(b);
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  return a - b;
}

function compareRows(a, b, key) {
  switch (key) {
    case 'program':
      return programSortKey(a).localeCompare(programSortKey(b));
    case 'valveNumber':
      return compareNullableNumber(
        a.zoneNumber == null ? null : Number(a.zoneNumber),
        b.zoneNumber == null ? null : Number(b.zoneNumber),
      );
    case 'zoneName':
      return valveNameSortKey(a).localeCompare(valveNameSortKey(b));
    case 'start':
      return a.schedule.start_time.localeCompare(b.schedule.start_time);
    case 'end':
      return endTimeSortKey(a).localeCompare(endTimeSortKey(b));
    case 'duration':
      return compareNullableNumber(
        Number(a.schedule.duration_minutes),
        Number(b.schedule.duration_minutes),
      );
    case 'gallons':
      return compareNullableNumber(
        scheduleRowGallons(a.zone, a.schedule),
        scheduleRowGallons(b.zone, b.schedule),
      );
    case 'weekGallons':
      return compareNullableNumber(
        scheduleRowWeekGallons(a.zone, a.schedule),
        scheduleRowWeekGallons(b.zone, b.schedule),
      );
    case 'soak':
      return compareNullableNumber(
        a.soakHours == null ? null : soakMinutesFromHours(a.soakHours),
        b.soakHours == null ? null : soakMinutesFromHours(b.soakHours),
      );
    case 'dailyRuntime':
      return compareNullableNumber(
        a.dailyRuntime == null ? null : Number(a.dailyRuntime),
        b.dailyRuntime == null ? null : Number(b.dailyRuntime),
      );
    case 'days':
      return daysSortKey(a).localeCompare(daysSortKey(b));
    case 'notes':
      return notesSortKey(a).localeCompare(notesSortKey(b));
    default:
      return 0;
  }
}

function sortMark(sort, key) {
  if (sort.key !== key) return '';
  return sort.dir === 'asc' ? ' ↑' : ' ↓';
}

export default function WeeklySchedule() {
  const { groups, loading: weekLoading } = useWeeklySchedule();
  const { rows, loading: tableLoading } = useMainSchedule();
  const { selectedDay, setSelectedDay, clockToday, isClockToday } = useSelectedDay();
  const scope = dayScopeLabel(selectedDay, clockToday);
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const loading = weekLoading || tableLoading;

  const displayRows = useMemo(() => {
    let list = rows;
    if (sort.key) {
      const sorted = [...rows].sort((a, b) => {
        let cmp = compareRows(a, b, sort.key);
        if (cmp === 0) cmp = a.schedule.start_time.localeCompare(b.schedule.start_time);
        return sort.dir === 'desc' ? -cmp : cmp;
      });
      list = sorted;
    }
    return withDailyRuntimeOnce(list);
  }, [rows, sort]);

  const totals = useMemo(() => scheduleTableTotals(displayRows), [displayRows]);

  const toggleSort = (key) => {
    setSort(prev => (
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    ));
  };

  if (loading) return <div className="py-16 text-center text-sm text-slate-400">Loading schedule…</div>;

  return (
    <div className="min-w-0 w-full">
      {rows.length === 0 ? (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-navy-900">Schedule</h1>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <EmptyState
              icon={CalendarDays}
              title="No schedules yet"
              description="Create programs and valves with schedules to see them here."
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-navy-900">Schedule</h1>
              <p className="mt-1 text-sm text-slate-500">{scope.heading}</p>
              {!isClockToday && (
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-brand-600">
                  {formatClockTodayLine()}
                </p>
              )}
            </div>
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-8">
              <div className="table-h-scroll">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="text-white">
                    <th onClick={() => toggleSort('program')} className={TH_SORT}>
                      Program{sortMark(sort, 'program')}
                    </th>
                    <th onClick={() => toggleSort('valveNumber')} className={TH_SORT}>
                      Valve #{sortMark(sort, 'valveNumber')}
                    </th>
                    <th onClick={() => toggleSort('zoneName')} className={TH_SORT}>
                      Valve Name{sortMark(sort, 'zoneName')}
                    </th>
                    <th onClick={() => toggleSort('start')} className={TH_SORT}>
                      Start{sortMark(sort, 'start')}
                    </th>
                    <th onClick={() => toggleSort('end')} className={TH_SORT}>
                      End{sortMark(sort, 'end')}
                    </th>
                    <th onClick={() => toggleSort('duration')} className={TH_SORT}>
                      Duration (Min){sortMark(sort, 'duration')}
                    </th>
                    <th onClick={() => toggleSort('gallons')} className={TH_SORT}>
                      Gallons{sortMark(sort, 'gallons')}
                    </th>
                    <th onClick={() => toggleSort('weekGallons')} className={TH_SORT}>
                      Gal / Week{sortMark(sort, 'weekGallons')}
                    </th>
                    <th onClick={() => toggleSort('soak')} className={TH_SORT}>
                      Soak (Min){sortMark(sort, 'soak')}
                    </th>
                    <th onClick={() => toggleSort('dailyRuntime')} className={TH_SORT}>
                      Daily runtime (Min){sortMark(sort, 'dailyRuntime')}
                    </th>
                    <th onClick={() => toggleSort('days')} className={TH_SORT}>
                      Days{sortMark(sort, 'days')}
                    </th>
                    <th onClick={() => toggleSort('notes')} className={TH_SORT}>
                      Notes{sortMark(sort, 'notes')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map(row => (
                    <tr
                      key={row.id}
                      className={`border-t ${row.theme.border}`}
                      style={{ backgroundColor: row.theme.rowHex, borderColor: row.theme.borderHex }}
                    >
                      <td className="px-3 py-3 whitespace-nowrap text-left">
                        <Link
                          to={`/programs/${row.program.id}`}
                          className="inline-flex items-center hover:opacity-80"
                          title={row.program.name || row.program.controller_program}
                          aria-label={row.program.name || row.program.controller_program || 'Program'}
                        >
                          <ProgramBadge code={row.program.controller_program} color={row.program.color} size="sm" />
                        </Link>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-left font-mono font-semibold text-navy-900">
                        {row.zoneNumber ?? '—'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-left text-navy-900">
                        {getZoneShortName(row.zone)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-left font-mono font-semibold text-navy-900">
                        {formatTime24(row.schedule.start_time)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-left font-mono text-navy-900">
                        {formatTime24(getEndTime(row.schedule.start_time, row.schedule.duration_minutes))}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-left font-mono text-navy-900">
                        {row.schedule.duration_minutes}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-left font-mono text-navy-900">
                        {formatScheduleRowGallons(row.zone, row.schedule) ?? '—'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-left font-mono text-navy-900">
                        {formatScheduleRowWeekGallons(row.zone, row.schedule) ?? '—'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-left font-mono text-navy-900">
                        {row.soakHours == null ? '—' : soakMinutesFromHours(row.soakHours)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-left font-mono text-navy-900">
                        {row.showDailyRuntime && row.dailyRuntime != null ? row.dailyRuntime : '—'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-left font-mono text-navy-900">
                        {formatDaysCompact(row.schedule.days_of_week)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-left text-slate-600">
                        {row.schedule.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {displayRows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-navy-900 bg-slate-50">
                      <td className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy-900" colSpan={5}>
                        Total
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-left font-mono font-semibold text-navy-900">
                        {totals.durationTotal}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-left font-mono text-slate-400">—</td>
                      <td className="px-3 py-3 whitespace-nowrap text-left font-mono font-semibold text-navy-900">
                        {totals.weekGallonsTotal ?? '—'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-left font-mono text-slate-400">—</td>
                      <td className="px-3 py-3 whitespace-nowrap text-left font-mono font-semibold text-navy-900">
                        {totals.dailyRuntimeTotal}
                      </td>
                      <td className="px-3 py-3" colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
              </div>
            </div>
          </div>

          {groups.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-navy-900 mb-3">By week</h2>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="table-h-scroll">
            <table className="w-full text-sm border-separate border-spacing-0 table-fixed" style={{ minWidth: '800px' }}>
              <colgroup>
                <col className="w-32 sm:w-44" />
                {DAY_ORDER.map(day => (
                  <col key={day} className="w-24 sm:w-28" />
                ))}
              </colgroup>
              <thead>
                <tr className="text-white text-sm sm:text-base">
                  <th
                    className={`${ZONE_COL} sticky top-0 z-30 text-left py-3.5 font-bold uppercase tracking-wider shadow-[4px_0_8px_-4px_rgba(0,0,0,0.25)]`}
                    style={{ backgroundColor: '#0a2540' }}
                  >
                    Valve
                  </th>
                  {DAY_ORDER.map(day => {
                    const isSelected = day === selectedDay;
                    const isToday = day === clockToday;
                    return (
                    <th
                      key={day}
                      className={`sticky top-0 z-20 px-0 py-0 text-left font-bold uppercase tracking-wider ${
                        isSelected ? 'bg-navy-800' : 'bg-navy-900'
                      } ${isToday ? 'shadow-[inset_0_-3px_0_0_#38bdf8]' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className="w-full px-2 py-3.5 text-left font-bold uppercase tracking-wider [-webkit-tap-highlight-color:transparent]"
                        aria-pressed={isSelected}
                        aria-label={isToday ? `${DAY_LABELS[day]}, today` : `Show ${DAY_LABELS[day]}`}
                      >
                        <span className="inline-flex flex-col items-start gap-0.5">
                          <span className={isToday ? 'text-sky-300' : 'text-white'}>{DAY_LABELS[day]}</span>
                          {isToday ? (
                            <span className="text-[9px] font-bold tracking-wider text-sky-300">Today</span>
                          ) : isSelected ? (
                            <span className="text-[9px] font-bold tracking-wider text-blue-200">Viewing</span>
                          ) : (
                            <span className="text-[9px] font-bold tracking-wider invisible">Today</span>
                          )}
                        </span>
                      </button>
                    </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {groups.map((group, gi) => {
                  const theme = getProgramTheme(group.program);

                  return (
                  <Fragment key={group.program.id}>
                    <tr className={gi > 0 ? 'border-t-2 border-slate-200' : ''}>
                      <td
                        className={`${ZONE_COL} py-2.5 text-left shadow-[4px_0_8px_-4px_rgba(0,0,0,0.12)]`}
                        style={{ backgroundColor: theme.headerHex }}
                      >
                        <Link
                          to={`/programs/${group.program.id}`}
                          className="flex items-center justify-start gap-2 min-w-0 text-sm font-semibold text-navy-900 hover:opacity-80 transition-opacity"
                          title={group.program.name}
                        >
                          {group.program.controller_program && (
                            <ProgramBadge code={group.program.controller_program} color={group.program.color} size="sm" />
                          )}
                          <span className="truncate">{group.program.name}</span>
                        </Link>
                      </td>
                      {DAY_ORDER.map(day => (
                        <td
                          key={day}
                          className={`${day === selectedDay ? theme.today : theme.header} ${
                            day === clockToday ? 'shadow-[inset_0_3px_0_0_#38bdf8]' : ''
                          }`}
                          style={{ backgroundColor: day === selectedDay ? theme.todayHex : theme.headerHex }}
                        />
                      ))}
                    </tr>
                    {group.rows.map((row, ri) => {
                      const zoneTheme = getZoneTheme(row.zone, group.program);
                      const rowBg = ri % 2 === 1 ? zoneTheme.rowAlt : zoneTheme.row;
                      const rowHex = ri % 2 === 1 ? zoneTheme.rowAltHex : zoneTheme.rowHex;
                      const todayCellBg = ri % 2 === 1 ? zoneTheme.todayAlt : zoneTheme.today;
                      const todayCellBgHex = ri % 2 === 1 ? zoneTheme.todayAltHex : zoneTheme.todayHex;

                      return (
                        <tr key={row.zone.id} className={`border-t ${zoneTheme.border} ${rowBg}`} style={{ borderColor: zoneTheme.borderHex }}>
                          <td
                            className={`${ZONE_COL} py-3.5 text-left text-sm text-slate-700 font-medium shadow-[4px_0_8px_-4px_rgba(0,0,0,0.12)]`}
                            style={{ backgroundColor: rowHex }}
                            title={row.zone.name}
                          >
                            <span className="block truncate">
                              {getZoneDisplayName(row.zone, group.program.name)}
                              {row.zone.status === 'inactive' && (
                                <span className="ml-1 text-slate-300">(off)</span>
                              )}
                            </span>
                          </td>
                          {DAY_ORDER.map(day => {
                            const daySchedules = row.days[day] ?? [];
                            return (
                              <td
                                key={day}
                                className={`px-2 py-3.5 whitespace-nowrap text-left ${
                                  day === selectedDay ? todayCellBg : rowBg
                                } ${day === clockToday ? 'shadow-[inset_0_3px_0_0_#38bdf8]' : ''}`}
                                style={{ backgroundColor: day === selectedDay ? todayCellBgHex : rowHex }}
                              >
                                {daySchedules.length > 0 ? (
                                  <div className="flex flex-col gap-2.5">
                                    {daySchedules.map(sched => (
                                      <div key={sched.id} className="leading-tight">
                                        <span className={`block font-mono text-base font-bold ${day === selectedDay ? 'text-brand-600' : 'text-navy-900'}`}>
                                          {formatTime(sched.start_time)}
                                        </span>
                                        <span className="block font-mono text-xs font-medium text-slate-500">
                                          {formatTime(getEndTime(sched.start_time, sched.duration_minutes))}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-200 text-sm">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </section>
          )}
        </>
      )}
    </div>
  );
}
