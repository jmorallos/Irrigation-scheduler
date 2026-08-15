import { Fragment } from 'react';
import { useWeeklySchedule } from '../hooks/useWeeklySchedule';
import { DAY_ORDER, DAY_LABELS, getTodayKey, formatTime, getEndTime } from '../utils/dateUtils';
import { getZoneDisplayName } from '../utils/scheduleUtils';
import { CalendarDays } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { Link } from 'react-router-dom';

const ZONE_COL =
  'sticky left-0 z-10 w-32 min-w-32 max-w-32 sm:w-44 sm:min-w-44 sm:max-w-44 px-3 sm:px-4';

export default function WeeklySchedule() {
  const { groups, loading } = useWeeklySchedule();
  const today = getTodayKey();

  if (loading) return <div className="py-16 text-center text-sm text-slate-400">Loading schedule…</div>;

  return (
    <div className="min-w-0 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Weekly Schedule</h1>
        <p className="mt-1 text-sm text-slate-500">Overview of all active zone schedules</p>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <EmptyState
            icon={CalendarDays}
            title="No schedules yet"
            description="Create programs and zones with schedules to see them here."
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full text-sm border-collapse table-fixed" style={{ minWidth: '680px' }}>
              <colgroup>
                <col className="w-32 sm:w-44" />
                {DAY_ORDER.map(day => (
                  <col key={day} className="w-[4.75rem] sm:w-24" />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-navy-900 text-white text-xs sm:text-sm">
                  <th className={`${ZONE_COL} text-left py-3.5 font-semibold uppercase tracking-wider bg-navy-900 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.2)]`}>
                    Zone
                  </th>
                  {DAY_ORDER.map(day => (
                    <th
                      key={day}
                      className={`px-2 py-3.5 text-center font-semibold uppercase tracking-wider ${
                        day === today ? 'bg-navy-800' : ''
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
                {groups.map((group, gi) => (
                  <Fragment key={group.program.id}>
                    <tr className={gi > 0 ? 'border-t-2 border-slate-200' : ''}>
                      <td className={`${ZONE_COL} py-2.5 bg-surface-alt shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]`}>
                        <Link
                          to={`/programs/${group.program.id}`}
                          className="block truncate text-sm font-semibold text-navy-900 hover:text-brand-600 transition-colors"
                          title={group.program.name}
                        >
                          {group.program.name}
                        </Link>
                      </td>
                      {DAY_ORDER.map(day => (
                        <td
                          key={day}
                          className={`bg-surface-alt ${day === today ? 'bg-blue-50' : ''}`}
                        />
                      ))}
                    </tr>
                    {group.rows.map((row, ri) => {
                      const rowBg = ri % 2 === 1 ? 'bg-surface-alt' : 'bg-white';
                      const todayCellBg = ri % 2 === 1 ? 'bg-blue-100' : 'bg-blue-50';

                      return (
                        <tr key={row.zone.id} className={`border-t border-slate-100 ${rowBg}`}>
                          <td
                            className={`${ZONE_COL} py-3.5 text-sm text-slate-600 font-medium ${rowBg} shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]`}
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
                              >
                                {daySchedules.length > 0 ? (
                                  <div className="flex flex-col gap-1.5">
                                    {daySchedules.map(sched => (
                                      <div key={sched.id} className="leading-snug">
                                        <span className={`font-mono text-sm font-semibold ${day === today ? 'text-brand-600' : 'text-navy-900'}`}>
                                          {formatTime(sched.start_time)}
                                          {daySchedules.length > 1 && (
                                            <span className="ml-1 text-xs text-slate-400 font-sans font-medium">
                                              C{sched.cycle ?? 1}
                                            </span>
                                          )}
                                        </span>
                                        <span className="block font-mono text-[11px] text-slate-500">
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
