import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Droplets, ArrowRight } from 'lucide-react';
import { programsRepository } from '../db/programsRepository';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { useTodaySchedule } from '../hooks/useTodaySchedule';
import { buildScheduleChartData } from '../utils/chartData';
import { countOverviewStats } from '../utils/overviewStats';
import { ProgramTodayMinutesChart, ProgramTodayStartsChart, MinutesByDayChart, ProgramWeekMinutesChart, ZoneMinutesChart } from '../components/DashboardCharts';
import PageError from '../components/PageError';
import { formatDuration, formatTimeRange } from '../utils/dateUtils';
import { formatCycleLabel, getZoneDisplayName } from '../utils/scheduleUtils';
import { getZoneTheme } from '../utils/programColors';
import ProgramBadge from '../components/ProgramBadge';

const STAT_COLUMNS = [
  { key: 'total', label: 'Programs' },
  { key: 'active', label: 'Active' },
  { key: 'zones', label: 'Valves' },
  { key: 'minutes', label: 'Minutes' },
];

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, active: 0, zones: 0, minutes: 0 });
  const [chartData, setChartData] = useState({
    minutesByDay: [],
    byProgramToday: [],
    byProgramWeek: [],
    zoneTotals: [],
  });
  const [chartsLoading, setChartsLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const { items, loading, error: todayError, reload: reloadToday } = useTodaySchedule();

  const loadDashboard = useCallback(async () => {
    setChartsLoading(true);
    setPageError(null);
    try {
      const overview = await countOverviewStats(programsRepository);
      const charts = await buildScheduleChartData({
        programsRepository,
        zonesRepository,
        schedulesRepository,
      });
      setStats(overview);
      setChartData(charts);
    } catch (err) {
      setPageError(err.message);
    } finally {
      setChartsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const retryAll = () => {
    loadDashboard();
    reloadToday();
  };

  const displayError = pageError || todayError;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Summary</h1>
        <p className="mt-1 text-sm text-slate-500">Today · {today}</p>
      </div>

      {displayError && (
        <div className="mb-6">
          <PageError message={`Could not load summary: ${displayError}`} onRetry={retryAll} />
        </div>
      )}

      {!displayError && (
      <>
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-3.5 bg-navy-900">
          <h2 className="text-xs font-semibold text-white uppercase tracking-wider">Overview</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100">
          {STAT_COLUMNS.map(({ key, label }) => (
            <div key={key} className="px-5 py-4 text-center sm:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
              <p className="mt-1 text-2xl font-bold font-mono text-navy-900 tabular-nums">{stats[key]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-3.5 bg-navy-900">
          <h2 className="text-xs font-semibold text-white uppercase tracking-wider">Weekly Load</h2>
        </div>
        {chartsLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading charts…</div>
        ) : (
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="p-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-4">
                Minutes by Day
              </h3>
              <MinutesByDayChart data={chartData.minutesByDay} />
              <p className="mt-3 text-[11px] text-slate-400">
                Scheduled cycle minutes on each weekday. Today is highlighted.
              </p>
            </div>
            <div className="p-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-4">
                Minutes by Program
              </h3>
              <ProgramWeekMinutesChart data={chartData.byProgramWeek} />
              <p className="mt-3 text-[11px] text-slate-400">
                Duration × watering days for the week.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-3.5 bg-navy-900">
          <h2 className="text-xs font-semibold text-white uppercase tracking-wider">{"Today's Load"}</h2>
        </div>
        {chartsLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading charts…</div>
        ) : (
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="p-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-4">
                Run Time by Program
              </h3>
              <ProgramTodayMinutesChart data={chartData.byProgramToday} />
              <p className="mt-3 text-[11px] text-slate-400">
                Total cycle minutes for programs running today.
              </p>
            </div>
            <div className="p-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-4">
                Cycles by Program
              </h3>
              <ProgramTodayStartsChart data={chartData.byProgramToday} />
              <p className="mt-3 text-[11px] text-slate-400">
                Number of cycles for programs running today.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-3.5 bg-navy-900">
          <h2 className="text-xs font-semibold text-white uppercase tracking-wider">Minutes by Valve</h2>
        </div>
        {chartsLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading charts…</div>
        ) : (
          <div className="p-5">
            <ZoneMinutesChart data={chartData.zoneTotals} />
            <p className="mt-3 text-[11px] text-slate-400">
              Cycle minutes per valve for today only.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 bg-navy-900">
          <h2 className="text-xs font-semibold text-white uppercase tracking-wider">{"Today's Irrigation"}</h2>
          <Link to="/schedule" className="text-xs text-blue-200 hover:text-white font-medium flex items-center gap-1 transition-colors">
            Schedule <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <Droplets className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">No irrigation scheduled today</p>
            <p className="text-xs text-slate-400 mt-1">Add schedules to your valves to see them here.</p>
          </div>
        ) : (
          <div>
            {items.map(item => {
              const theme = getZoneTheme(item.zone, item.program);
              return (
              <div
                key={item.schedule.id}
                className={`flex items-center gap-4 px-5 py-4 border-b last:border-0 ${theme.row} ${theme.border}`}
                style={{ backgroundColor: theme.rowHex, borderColor: theme.borderHex }}
              >
                <ProgramBadge code={item.program.controller_program} color={item.zone.color || item.program.color} size="sm" />
                <div className="flex-shrink-0 w-16 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {formatCycleLabel(item.schedule.cycle)}
                </div>
                <div className="flex-shrink-0 min-w-[8.5rem]">
                  <span className="font-mono text-sm font-semibold text-navy-900">
                    {formatTimeRange(item.schedule.start_time, item.schedule.duration_minutes)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-900 truncate">{item.program.name}</p>
                  <p className="text-xs text-slate-500">{getZoneDisplayName(item.zone, item.program.name)}</p>
                </div>
                <div className="text-xs font-mono text-slate-600 flex-shrink-0">
                  {formatDuration(item.schedule.duration_minutes)}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
