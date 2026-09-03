import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Droplets, ArrowRight } from 'lucide-react';
import { programsRepository } from '../db/programsRepository';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { useTodaySchedule } from '../hooks/useTodaySchedule';
import { buildScheduleChartData } from '../utils/chartData';
import { ProgramTodayMinutesChart, MinutesByDayChart, ProgramWeekMinutesChart, ZoneMinutesChart, ProgramWaterChart, ZoneWaterChart } from '../components/DashboardCharts';
import PageError from '../components/PageError';
import { formatTimeRange, dayScopeLabel, formatClockTodayLine } from '../utils/dateUtils';
import { formatMinutes } from '../utils/formatMinutes';
import { formatRunGallons, formatGallons, sumGallons, gallonsForRun } from '../utils/waterUsage';
import { formatCycleLabel, formatValveSubtitle } from '../utils/scheduleUtils';
import { getZoneTheme } from '../utils/programColors';
import ProgramBadge from '../components/ProgramBadge';
import { useSelectedDay } from '../context/SelectedDayContext';
import { SUMMARY_SECTION_TITLES, SUMMARY_OVERVIEW_COLUMNS, buildTodayOverviewStats } from '../utils/summaryLabels';
import WeekNav from '../components/WeekNav';

export default function Dashboard() {
  const {
    selectedDay,
    setSelectedDay,
    weekStart,
    shiftWeek,
    goToCurrentWeek,
    weekRangeLabel,
    todayKeyInView,
    isClockToday,
    viewingCurrentWeek,
  } = useSelectedDay();
  const scope = dayScopeLabel(selectedDay, todayKeyInView ?? selectedDay, weekStart);
  const [chartData, setChartData] = useState({
    minutesByDay: [],
    byProgramToday: [],
    byProgramWeek: [],
    zoneTotals: [],
    dayGallonsTotal: null,
    weekGallonsTotal: null,
  });
  const [chartsLoading, setChartsLoading] = useState(true);
  const [chartsRefreshing, setChartsRefreshing] = useState(false);
  const [pageError, setPageError] = useState(null);
  const chartsReady = useRef(false);
  const { items, loading, error: todayError, reload: reloadToday } = useTodaySchedule(selectedDay, weekStart);

  const loadDashboard = useCallback(async () => {
    const initial = !chartsReady.current;
    if (initial) {
      setChartsLoading(true);
    } else {
      setChartsRefreshing(true);
    }
    setPageError(null);
    try {
      const charts = await buildScheduleChartData({
        programsRepository,
        zonesRepository,
        schedulesRepository,
        dayKey: selectedDay,
        referenceDate: weekStart,
      });
      setChartData(charts);
      chartsReady.current = true;
    } catch (err) {
      setPageError(err.message);
    } finally {
      setChartsLoading(false);
      setChartsRefreshing(false);
    }
  }, [selectedDay, weekStart]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const retryAll = () => {
    chartsReady.current = false;
    loadDashboard();
    reloadToday();
  };

  const displayError = pageError || todayError;
  const dayPanelsClass = `transition-opacity duration-200 ease-out ${
    chartsRefreshing ? 'opacity-70' : 'opacity-100'
  }`;
  const irrigationDayGallons = chartData.dayGallonsTotal
    ?? sumGallons(items.map(item => gallonsForRun(item.zone.gph, item.schedule.duration_minutes)));
  const programWaterData = chartData.byProgramToday.map(item => ({
    ...item,
    weekGallons: chartData.byProgramWeek.find(row => row.id === item.id)?.gallons ?? null,
  }));
  const overviewStats = buildTodayOverviewStats({
    byProgramToday: chartData.byProgramToday,
    zoneTotals: chartData.zoneTotals,
    dayItems: items,
    dayGallons: irrigationDayGallons,
  });

  return (
    <div className="min-w-0 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Summary</h1>
        <p className="mt-1 text-sm text-black">{scope.heading}</p>
        {!isClockToday && (
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-brand-600">
            {formatClockTodayLine()}
          </p>
        )}
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
          <WeekNav
            label={`${SUMMARY_SECTION_TITLES.week} · ${weekRangeLabel}`}
            onPrev={() => shiftWeek(-1)}
            onNext={() => shiftWeek(1)}
            onToday={goToCurrentWeek}
            showToday={!viewingCurrentWeek || !isClockToday}
          />
        </div>
        {chartsLoading ? (
          <div className="p-8 text-center text-sm text-black">Loading charts…</div>
        ) : (
          <div className="grid min-w-0 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="min-w-0 p-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-black mb-4">
                Minutes by Day
              </h3>
              <MinutesByDayChart
                data={chartData.minutesByDay}
                selectedDay={selectedDay}
                todayKeyInView={todayKeyInView}
                onSelectDay={setSelectedDay}
              />
            </div>
            <div className="min-w-0 p-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-black mb-4">
                Minutes by Week
              </h3>
              <ProgramWeekMinutesChart data={chartData.byProgramWeek} />
            </div>
          </div>
        )}
      </div>

      <div className={`bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6 ${dayPanelsClass}`}>
        <div className="px-5 py-3.5 bg-navy-900">
          <h2 className="text-xs font-semibold text-white uppercase tracking-wider">{SUMMARY_SECTION_TITLES.valves}</h2>
        </div>
        {chartsLoading ? (
          <div className="p-8 text-center text-sm text-black">Loading charts…</div>
        ) : (
          <div className="p-5">
            <ZoneMinutesChart
              data={chartData.zoneTotals}
              dayPhrase={scope.adjective}
              emptyMessage={`No valves scheduled ${scope.adjective}.`}
            />
            <p className="mt-3 text-[11px] text-black">
              {`Cycle minutes per valve for ${scope.short} only.`}
            </p>
          </div>
        )}
      </div>

      <div className={`bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6 ${dayPanelsClass}`}>
        <div className="px-5 py-3.5 bg-navy-900">
          <h2 className="text-xs font-semibold text-white uppercase tracking-wider">{SUMMARY_SECTION_TITLES.valveWater}</h2>
        </div>
        {chartsLoading ? (
          <div className="p-8 text-center text-sm text-black">Loading charts…</div>
        ) : (
          <div className="p-5">
            <ZoneWaterChart
              data={chartData.zoneTotals}
              dayPhrase={scope.adjective}
              emptyMessage={`No water estimates for valves running ${scope.adjective}. Set Emitter Total G.P.H. on valves.`}
            />
            <p className="mt-3 text-[11px] text-black">
              {`Estimated gallons per valve for ${scope.short} and the week.`}
            </p>
          </div>
        )}
      </div>

      <div className={`bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6 ${dayPanelsClass}`}>
        <div className="px-5 py-3.5 bg-navy-900">
          <h2 className="text-xs font-semibold text-white uppercase tracking-wider">{SUMMARY_SECTION_TITLES.programTime}</h2>
        </div>
        {chartsLoading ? (
          <div className="p-8 text-center text-sm text-black">Loading charts…</div>
        ) : (
          <div className="p-5">
            <ProgramTodayMinutesChart
              data={chartData.byProgramToday}
              dayPhrase={scope.adjective}
              emptyMessage={`No programs scheduled ${scope.adjective}.`}
            />
            <p className="mt-3 text-[11px] text-black">
              {`Total cycle minutes for programs running ${scope.adjective}.`}
            </p>
          </div>
        )}
      </div>

      <div className={`bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6 ${dayPanelsClass}`}>
        <div className="px-5 py-3.5 bg-navy-900">
          <h2 className="text-xs font-semibold text-white uppercase tracking-wider">{SUMMARY_SECTION_TITLES.programWater}</h2>
        </div>
        {chartsLoading ? (
          <div className="p-8 text-center text-sm text-black">Loading charts…</div>
        ) : (
          <div className="p-5">
            <ProgramWaterChart
              data={programWaterData}
              dayPhrase={scope.adjective}
              emptyMessage={`No water estimates for programs running ${scope.adjective}. Set Emitter Total G.P.H. on valves.`}
            />
            <p className="mt-3 text-[11px] text-black">
              {`Estimated gallons per program for ${scope.short} and the week.`}
            </p>
          </div>
        )}
      </div>

      <div className={`bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6 ${dayPanelsClass}`}>
        <div className="flex items-center justify-between px-5 py-3.5 bg-navy-900">
          <h2 className="text-xs font-semibold text-white uppercase tracking-wider">{`${scope.possessive} Irrigation`}</h2>
          <Link to="/schedule" className="text-xs text-blue-200 hover:text-white font-medium flex items-center gap-1 transition-colors">
            Schedule <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-black">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <Droplets className="w-8 h-8 text-black mx-auto mb-3" />
            <p className="text-sm font-medium text-black">{`No irrigation scheduled ${scope.adjective}`}</p>
            <p className="text-xs text-black mt-1">Add schedules to your valves to see them here.</p>
          </div>
        ) : (
          <div>
            {items.map(item => {
              const theme = getZoneTheme(item.zone, item.program);
              const runGallons = formatRunGallons(item.zone.gph, item.schedule.duration_minutes);
              return (
              <div
                key={item.schedule.id}
                className={`flex items-start gap-3 px-4 sm:px-5 py-4 border-b ${theme.row} ${theme.border}`}
                style={{ backgroundColor: theme.rowHex, borderColor: theme.borderHex }}
              >
                <div className="flex-shrink-0 pt-0.5">
                  <ProgramBadge code={item.program.controller_program} color={item.program.color} size="sm" />
                </div>
                <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                  <p className="text-sm font-semibold text-navy-900 truncate">{item.program.name}</p>
                  <p className="text-sm text-navy-900 truncate">{formatValveSubtitle(item.zone)}</p>
                  <p className="text-sm font-mono text-navy-900 tabular-nums">
                    {formatMinutes(item.schedule.duration_minutes)}
                  </p>
                  {runGallons && (
                    <p className="text-sm font-mono text-navy-900 tabular-nums">{runGallons}</p>
                  )}
                  <p className="text-sm text-navy-900">
                    {formatCycleLabel(item.schedule.cycle)}
                    {' - '}
                    {formatTimeRange(item.schedule.start_time, item.schedule.duration_minutes)}
                  </p>
                </div>
              </div>
              );
            })}
            {(irrigationDayGallons != null) && (
              <div className="flex items-center justify-between gap-4 px-4 sm:px-5 py-3.5 border-t border-slate-200 bg-white/80">
                <span className="text-sm font-semibold text-navy-900">
                  {`${scope.possessive} water total`}
                </span>
                <span className="text-sm font-mono font-semibold text-navy-900 tabular-nums">
                  {formatGallons(irrigationDayGallons)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-navy-900">
          <h2 className="text-xs font-semibold text-white uppercase tracking-wider">{SUMMARY_SECTION_TITLES.overview}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-slate-100">
          {SUMMARY_OVERVIEW_COLUMNS.map(({ key, label }) => (
            <div key={key} className="px-5 py-4 text-center sm:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-black">{label}</p>
              <p className="mt-1 text-2xl font-bold font-mono text-navy-900 tabular-nums">{overviewStats[key]}</p>
            </div>
          ))}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
