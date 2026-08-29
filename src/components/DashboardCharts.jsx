import { maxValue } from '../utils/chartData';
import { formatMinutes } from '../utils/formatMinutes';
import { formatGallons, gallonLabel } from '../utils/waterUsage';
import ProgramBadge from './ProgramBadge';

function ChartEmpty({ message }) {
  return (
    <p className="py-8 text-center text-sm text-slate-400">{message}</p>
  );
}

function ChartTooltip({ label, value, className = '' }) {
  return (
    <div
      className={`pointer-events-none absolute z-10 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100 transition-all duration-150 ${className}`}
    >
      <div className="bg-navy-900 text-white text-xs rounded-md px-2.5 py-1.5 shadow-lg whitespace-nowrap">
        <span className="font-medium">{label}</span>
        <span className="text-blue-200 mx-1.5">·</span>
        <span className="font-mono tabular-nums">{value}</span>
      </div>
    </div>
  );
}

function minuteLabel(value, period, dayPhrase) {
  const unit = formatMinutes(value);
  if (period === 'week') return `${unit} / week`;
  if (period === 'day') return `${unit} / day`;
  if (dayPhrase && dayPhrase !== 'today') return `${unit} ${dayPhrase}`;
  return `${unit} today`;
}

function metricDisplayValue(item, metric, period, dayPhrase, includeGallons = false) {
  const value = item[metric];
  const isMinutes = metric === 'minutes';
  const primary = isMinutes ? formatMinutes(value) : `${value} cycle${value !== 1 ? 's' : ''}`;
  if (!includeGallons) return primary;
  const gallons = period === 'week' ? item.weekGallons ?? item.gallons : item.gallons;
  const gallonsText = gallonLabel(gallons, period, dayPhrase);
  if (!gallonsText) return primary;
  return `${primary} · ${gallonsText}`;
}

function metricTooltipValue(item, metric, period, dayPhrase, includeGallons = false) {
  const value = item[metric];
  const isMinutes = metric === 'minutes';
  const primary = isMinutes
    ? minuteLabel(value, period, dayPhrase)
    : `${value} cycle${value !== 1 ? 's' : ''} ${dayPhrase}`;
  if (!includeGallons) return primary;
  const gallons = period === 'week' ? item.weekGallons ?? item.gallons : item.gallons;
  const gallonsText = gallonLabel(gallons, period, dayPhrase);
  if (!gallonsText) return primary;
  return `${primary} · ${gallonsText}`;
}

function ProgramMetricChart({
  data,
  metric,
  emptyMessage,
  period = 'today',
  dayPhrase = 'today',
  includeGallons = false,
}) {
  if (data.length === 0) {
    return <ChartEmpty message={emptyMessage} />;
  }

  const max = maxValue(data, metric);

  return (
    <div className="space-y-3.5">
      {data.map(item => {
        const value = item[metric];
        const displayValue = metricDisplayValue(item, metric, period, dayPhrase, includeGallons);
        const tooltipValue = metricTooltipValue(item, metric, period, dayPhrase, includeGallons);
        const tooltipLabel = item.prefix
          ? `${item.prefix} · ${item.name}`
          : item.name;

        return (
          <div key={item.id} className="group relative">
            <ChartTooltip
              label={tooltipLabel}
              value={tooltipValue}
              className="bottom-full left-0 mb-1"
            />
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                {item.prefix && (
                  <ProgramBadge code={item.prefix} color={item.programColor} size="sm" />
                )}
                <span className="text-sm font-medium text-navy-900 truncate group-hover:text-brand-700 transition-colors">
                  {item.name}
                </span>
              </div>
              <span className="text-xs font-mono text-navy-900 tabular-nums flex-shrink-0 text-right">
                {displayValue}
              </span>
            </div>
            <div
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: item.track || '#e2e8f0' }}
              role="img"
              aria-label={`${tooltipLabel}: ${tooltipValue}`}
            >
              <div
                className="h-full rounded-full min-w-0.5 transition-[width] duration-200 ease-out"
                style={{
                  width: `${(value / max) * 100}%`,
                  backgroundColor: item.color || '#2563eb',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WaterMetricChart({ data, emptyMessage, dayPhrase = 'today' }) {
  const withWater = data.filter(item => item.gallons != null && item.gallons > 0);
  if (withWater.length === 0) {
    return <ChartEmpty message={emptyMessage} />;
  }

  const max = maxValue(withWater, 'gallons');

  return (
    <div className="space-y-3.5">
      {withWater.map(item => {
        const dayText = gallonLabel(item.gallons, 'day', dayPhrase);
        const weekText = item.weekGallons ? gallonLabel(item.weekGallons, 'week') : null;
        const tooltipValue = weekText ? `${dayText} · ${weekText}` : dayText;
        const tooltipLabel = item.prefix
          ? `${item.prefix} · ${item.name}`
          : item.name;

        return (
          <div key={item.id} className="group relative">
            <ChartTooltip
              label={tooltipLabel}
              value={tooltipValue}
              className="bottom-full left-0 mb-1"
            />
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                {item.prefix && (
                  <ProgramBadge code={item.prefix} color={item.programColor} size="sm" />
                )}
                <span className="text-sm font-medium text-navy-900 truncate group-hover:text-brand-700 transition-colors">
                  {item.name}
                </span>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="text-xs font-mono text-navy-900 tabular-nums block">{dayText}</span>
                {weekText && (
                  <span className="text-[11px] font-mono text-navy-900 tabular-nums block mt-0.5">{weekText}</span>
                )}
              </div>
            </div>
            <div
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: item.track || '#e2e8f0' }}
              role="img"
              aria-label={`${tooltipLabel}: ${tooltipValue}`}
            >
              <div
                className="h-full rounded-full min-w-0.5 transition-[width] duration-200 ease-out"
                style={{
                  width: `${(item.gallons / max) * 100}%`,
                  backgroundColor: item.color || '#2563eb',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MinutesByDayChart({ data, selectedDay, clockToday, onSelectDay }) {
  const total = data.reduce((sum, item) => sum + item.minutes, 0);
  if (total === 0) {
    return <ChartEmpty message="No active cycles this week." />;
  }

  const max = maxValue(data, 'minutes');

  return (
    <div className="min-w-0 w-full px-0.5">
      <div className="flex w-full items-end gap-1 sm:gap-2">
        {data.map(item => {
          const isSelected = item.key === selectedDay;
          const isClockToday = item.key === clockToday;
          const height = Math.max(item.minutes > 0 ? 6 : 0, (item.minutes / max) * 100);
          const minutesLabel = item.minutes ? formatMinutes(item.minutes) : '';
          const gallonsLabel = item.gallons ? formatGallons(item.gallons) : '';
          const tooltipValue = gallonsLabel
            ? `${minutesLabel || '0 Min'} · ${gallonsLabel}`
            : (minutesLabel || '0 Min');
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectDay?.(item.key)}
              className="group relative flex min-w-0 flex-1 flex-col items-center gap-1 sm:gap-1.5 rounded-sm [-webkit-tap-highlight-color:transparent]"
              aria-pressed={isSelected}
              aria-label={`${item.label}: ${tooltipValue}. Show ${item.label} schedule.`}
            >
              <ChartTooltip
                label={item.label}
                value={tooltipValue}
                className="bottom-full left-1/2 -translate-x-1/2 mb-1"
              />
              <span className="h-3 max-w-full truncate text-[9px] sm:text-[11px] font-mono tabular-nums leading-none text-slate-500">
                {item.minutes ? (
                  <>
                    <span className="sm:hidden">{item.minutes}</span>
                    <span className="hidden sm:inline">{minutesLabel}</span>
                  </>
                ) : (
                  '\u00a0'
                )}
              </span>
              <div
                className={`flex h-20 sm:h-24 w-full items-end overflow-hidden rounded-sm transition-colors duration-200 ease-out ${
                  isClockToday ? 'bg-blue-100 ring-2 ring-brand-600 ring-offset-1' : 'bg-slate-100'
                }`}
              >
                <div
                  className="w-full rounded-sm transition-[background-color,height] duration-200 ease-out"
                  style={{
                    height: `${height}%`,
                    backgroundColor: isSelected ? '#2563eb' : isClockToday ? '#3b82f6' : '#0a2540',
                  }}
                />
              </div>
              <span className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide transition-colors duration-200 ease-out ${
                isClockToday ? 'text-brand-600' : isSelected ? 'text-navy-900' : 'text-slate-400'
              }`}>
                {item.label}
              </span>
              <span
                className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider leading-none transition-opacity duration-200 ease-out ${
                  isClockToday
                    ? 'text-brand-600 opacity-100'
                    : isSelected
                      ? 'text-navy-700 opacity-100'
                      : 'opacity-0'
                }`}
                aria-hidden={!isClockToday && !isSelected}
              >
                {isClockToday ? 'Today' : 'Viewing'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProgramTodayMinutesChart({ data, emptyMessage, dayPhrase }) {
  return (
    <ProgramMetricChart
      data={data}
      metric="minutes"
      emptyMessage={emptyMessage ?? 'No programs scheduled today.'}
      dayPhrase={dayPhrase}
    />
  );
}

export function ProgramTodayStartsChart({ data, emptyMessage, dayPhrase }) {
  return (
    <ProgramMetricChart
      data={data}
      metric="starts"
      emptyMessage={emptyMessage ?? 'No programs scheduled today.'}
      dayPhrase={dayPhrase}
    />
  );
}

export function ProgramWeekMinutesChart({ data }) {
  return (
    <ProgramMetricChart
      data={data}
      metric="minutes"
      period="week"
      emptyMessage="No active programs this week."
    />
  );
}

export function ZoneMinutesChart({ data, emptyMessage, dayPhrase }) {
  return (
    <ProgramMetricChart
      data={data}
      metric="minutes"
      emptyMessage={emptyMessage ?? 'No valves scheduled today.'}
      dayPhrase={dayPhrase}
    />
  );
}

export function ProgramWaterChart({ data, emptyMessage, dayPhrase }) {
  return (
    <WaterMetricChart
      data={data}
      emptyMessage={emptyMessage ?? 'No water estimates — set Emitter Total G.P.H. on valves.'}
      dayPhrase={dayPhrase}
    />
  );
}

export function ZoneWaterChart({ data, emptyMessage, dayPhrase }) {
  return (
    <WaterMetricChart
      data={data}
      emptyMessage={emptyMessage ?? 'No water estimates — set Emitter Total G.P.H. on valves.'}
      dayPhrase={dayPhrase}
    />
  );
}
