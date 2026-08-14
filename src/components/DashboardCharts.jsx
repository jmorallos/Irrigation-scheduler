import { formatDuration } from '../utils/dateUtils';
import { maxValue } from '../utils/chartData';

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

function ProgramMetricChart({ data, metric, emptyMessage }) {
  if (data.length === 0) {
    return <ChartEmpty message={emptyMessage} />;
  }

  const max = maxValue(data, metric);
  const isMinutes = metric === 'minutes';

  return (
    <div className="space-y-3.5">
      {data.map(item => {
        const value = item[metric];
        const displayValue = isMinutes ? formatDuration(value) : `${value} start${value !== 1 ? 's' : ''}`;
        const tooltipValue = isMinutes
          ? `${formatDuration(value)} today`
          : `${value} start${value !== 1 ? 's' : ''} today`;

        return (
          <div key={item.id} className="group relative">
            <ChartTooltip
              label={item.name}
              value={tooltipValue}
              className="bottom-full left-0 mb-1"
            />
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="text-sm font-medium text-navy-900 truncate group-hover:text-brand-700 transition-colors">
                {item.name}
              </span>
              <span className="text-xs font-mono text-slate-500 flex-shrink-0 tabular-nums">
                {displayValue}
              </span>
            </div>
            <div
              className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"
              role="img"
              aria-label={`${item.name}: ${displayValue} today`}
            >
              <div
                className="h-full bg-brand-600 rounded-full min-w-0.5 transition-colors duration-150 group-hover:bg-brand-700"
                style={{ width: `${(value / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ProgramTodayMinutesChart({ data }) {
  return (
    <ProgramMetricChart
      data={data}
      metric="minutes"
      emptyMessage="No programs scheduled today."
    />
  );
}

export function ProgramTodayStartsChart({ data }) {
  return (
    <ProgramMetricChart
      data={data}
      metric="starts"
      emptyMessage="No programs scheduled today."
    />
  );
}
