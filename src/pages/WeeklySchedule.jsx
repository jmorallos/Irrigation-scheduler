import { Fragment } from 'react';
import { useWeeklySchedule } from '../hooks/useWeeklySchedule';
import { DAY_ORDER, DAY_LABELS, getTodayKey, formatTime } from '../utils/dateUtils';
import { CalendarDays } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { Link } from 'react-router-dom';

const ZONE_COL =
  'sticky left-0 z-10 w-28 min-w-28 max-w-28 sm:w-40 sm:min-w-40 sm:max-w-40 px-3 sm:px-4';

export default function WeeklySchedule() {
  const { groups, loading } = useWeeklySchedule();
  const today = getTodayKey();

  if (loading) return <div className="py-16 text-center text-sm text-slate-400">Loading schedule…</div>;

  return (
    <div className="min-w-0 w-full">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Weekly Schedule</h1>
        <p className="mt-1 text-sm text-slate-500">Overview of all active zone schedules</p>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No schedules yet"
          description="Create programs and zones with schedules to see them here."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full text-xs border-collapse table-fixed" style={{ minWidth: '560px' }}>
              <colgroup>
                <col className="w-28 sm:w-40" />
                {DAY_ORDER.map(day => (
                  <col key={day} className="w-16 sm:w-20" />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className={`${ZONE_COL} text-left py-3.5 font-semibold text-slate-500 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]`}>
                    Zone
                  </th>
                  {DAY_ORDER.map(day => (
                    <th
                      key={day}
                      className={`px-2 py-3.5 text-center font-semibold uppercase tracking-wider ${
                        day === today ? 'text-green-600 bg-green-50/50' : 'text-slate-400'
                      }`}
                    >
                      <span className="inline-flex flex-col items-center">
                        {DAY_LABELS[day]}
                        {day === today && <span className="w-1 h-1 rounded-full bg-green-500 mt-1 block" />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((group, gi) => (
                  <Fragment key={group.program.id}>
                    <tr className={gi > 0 ? 'border-t-2 border-slate-100' : ''}>
                      <td className={`${ZONE_COL} py-2.5 bg-slate-50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]`}>
                        <Link
                          to={`/programs/${group.program.id}`}
                          className="block truncate text-xs font-semibold text-slate-600 hover:text-green-600 transition-colors"
                          title={group.program.name}
                        >
                          {group.program.name}
                        </Link>
                      </td>
                      {DAY_ORDER.map(day => (
                        <td
                          key={day}
                          className={`bg-slate-50 ${day === today ? 'bg-green-50/40' : ''}`}
                        />
                      ))}
                    </tr>
                    {group.rows.map(row => (
                      <tr key={row.zone.id} className="border-t border-gray-50 group">
                        <td
                          className={`${ZONE_COL} py-3 text-slate-600 font-medium bg-white group-hover:bg-slate-50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]`}
                          title={row.zone.name}
                        >
                          <span className="block truncate">
                            {row.zone.name}
                            {row.zone.status === 'inactive' && (
                              <span className="ml-1 text-slate-300">(off)</span>
                            )}
                          </span>
                        </td>
                        {DAY_ORDER.map(day => {
                          const sched = row.days[day];
                          return (
                            <td
                              key={day}
                              className={`px-2 py-3 text-center whitespace-nowrap group-hover:bg-slate-50/50 ${
                                day === today ? 'bg-green-50/50' : ''
                              }`}
                            >
                              {sched ? (
                                <span className={`font-mono font-semibold ${day === today ? 'text-green-700' : 'text-slate-600'}`}>
                                  {formatTime(sched.start_time)}
                                </span>
                              ) : (
                                <span className="text-slate-200">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
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
