import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useWeeklySchedule } from '../hooks/useWeeklySchedule';
import { useMainSchedule } from '../hooks/useMainSchedule';
import { DAY_ORDER, DAY_LABELS, getTodayKey, formatTime, formatTime24, formatDaysCompact, getEndTime } from '../utils/dateUtils';
import { getZoneDisplayName, getZoneShortName } from '../utils/scheduleUtils';
import { formatSoak } from '../utils/scheduleStats';
import { getProgramTheme, getZoneTheme } from '../utils/programColors';
import ProgramBadge from '../components/ProgramBadge';
import EmptyState from '../components/EmptyState';
import NestedScroll from '../components/NestedScroll';

const ZONE_COL =
  'sticky left-0 z-20 w-32 min-w-32 max-w-32 sm:w-44 sm:min-w-44 sm:max-w-44 px-3 sm:px-4';

export default function WeeklySchedule() {
  const { groups, loading: weekLoading } = useWeeklySchedule();
  const { rows, loading: tableLoading } = useMainSchedule();
  const today = getTodayKey();
  const loading = weekLoading || tableLoading;

  if (loading) return <div className="py-16 text-center text-sm text-slate-400">Loading schedule…</div>;

  return (
    <div className="min-w-0 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Schedule</h1>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <EmptyState
            icon={CalendarDays}
            title="No schedules yet"
            description="Create programs and zones with schedules to see them here."
          />
        </div>
      ) : (
        <>
          <div data-table-snap className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-8">
            <NestedScroll className="overflow-auto max-h-[70dvh]">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="text-white">
                    <th className="sticky top-0 z-20 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap bg-navy-900">Program</th>
                    <th className="sticky top-0 z-20 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap bg-navy-900">Days</th>
                    <th className="sticky top-0 z-20 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap bg-navy-900">Zone #</th>
                    <th className="sticky top-0 z-20 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap bg-navy-900">Zone Name</th>
                    <th className="sticky top-0 z-20 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap bg-navy-900">Start</th>
                    <th className="sticky top-0 z-20 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap bg-navy-900">Duration</th>
                    <th className="sticky top-0 z-20 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap bg-navy-900">End</th>
                    <th className="sticky top-0 z-20 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap bg-navy-900">Soak (hrs)</th>
                    <th className="sticky top-0 z-20 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap bg-navy-900">Notes</th>
                    <th className="sticky top-0 z-20 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap bg-navy-900">Daily runtime</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr
                      key={row.id}
                      className={`border-t ${row.theme.border}`}
                      style={{ backgroundColor: row.theme.rowHex, borderColor: row.theme.borderHex }}
                    >
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Link
                          to={`/programs/${row.program.id}`}
                          className="inline-flex items-center gap-2 font-semibold text-navy-900 hover:opacity-80"
                        >
                          <ProgramBadge code={row.program.controller_program} color={row.program.color} size="sm" />
                          <span>{row.program.controller_program || row.program.name}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap font-mono text-navy-900">
                        {formatDaysCompact(row.schedule.days_of_week)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap font-mono font-semibold text-navy-900">
                        {row.zoneNumber ?? '—'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-navy-900">
                        {getZoneShortName(row.zone)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap font-mono font-semibold text-navy-900">
                        {formatTime24(row.schedule.start_time)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap font-mono text-navy-900">
                        {row.schedule.duration_minutes}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap font-mono text-navy-900">
                        {formatTime24(getEndTime(row.schedule.start_time, row.schedule.duration_minutes))}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap font-mono text-navy-900">
                        {formatSoak(row.soakHours)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                        {row.schedule.notes || '—'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap font-mono text-navy-900">
                        {row.dailyRuntime}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </NestedScroll>
          </div>

          {groups.length > 0 && (
        <section data-table-snap>
          <h2 className="text-lg font-bold text-navy-900 mb-3">By week</h2>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <NestedScroll className="overflow-auto max-h-[70dvh] max-md:landscape:max-h-[calc(100dvh-3.25rem)]">
            <table className="w-full text-sm border-separate border-spacing-0 table-fixed" style={{ minWidth: '800px' }}>
              <colgroup>
                <col className="w-32 sm:w-44" />
                {DAY_ORDER.map(day => (
                  <col key={day} className="w-24 sm:w-28" />
                ))}
              </colgroup>
              <thead>
                <tr className="text-white text-sm sm:text-base">
                  <th className={`${ZONE_COL} sticky top-0 z-30 text-left py-3.5 font-bold uppercase tracking-wider shadow-[4px_0_8px_-4px_rgba(0,0,0,0.25)]`} style={{ backgroundColor: '#0a2540' }}>
                    Zone
                  </th>
                  {DAY_ORDER.map(day => (
                    <th
                      key={day}
                      className={`sticky top-0 z-20 px-2 py-3.5 text-center font-bold uppercase tracking-wider ${
                        day === today ? 'bg-navy-800' : 'bg-navy-900'
                      }`}
                    >
                      <span className="inline-flex flex-col items-center">
                        {DAY_LABELS[day]}
                        {day === today && <span className="w-1 h-1 rounded-full bg-blue-300 mt-1 block" />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((group, gi) => {
                  const theme = getProgramTheme(group.program);

                  return (
                  <Fragment key={group.program.id}>
                    <tr className={gi > 0 ? 'border-t-2 border-slate-200' : ''}>
                      <td
                        className={`${ZONE_COL} py-2.5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.12)]`}
                        style={{ backgroundColor: theme.headerHex }}
                      >
                        <Link
                          to={`/programs/${group.program.id}`}
                          className="flex items-center gap-2 min-w-0 text-sm font-semibold text-navy-900 hover:opacity-80 transition-opacity"
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
                          className={day === today ? theme.today : theme.header}
                          style={{ backgroundColor: day === today ? theme.todayHex : theme.headerHex }}
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
                            className={`${ZONE_COL} py-3.5 text-sm text-slate-700 font-medium shadow-[4px_0_8px_-4px_rgba(0,0,0,0.12)]`}
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
                                className={`px-2 py-3.5 text-center whitespace-nowrap ${
                                  day === today ? todayCellBg : rowBg
                                }`}
                                style={{ backgroundColor: day === today ? todayCellBgHex : rowHex }}
                              >
                                {daySchedules.length > 0 ? (
                                  <div className="flex flex-col gap-2.5">
                                    {daySchedules.map(sched => (
                                      <div key={sched.id} className="leading-tight">
                                        <span className={`block font-mono text-base font-bold ${day === today ? 'text-brand-600' : 'text-navy-900'}`}>
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
          </NestedScroll>
        </div>
        </section>
          )}
        </>
      )}
    </div>
  );
}
