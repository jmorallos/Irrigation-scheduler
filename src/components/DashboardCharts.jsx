import { formatDuration } from '../utils/dateUtils';
import { maxMinutes } from '../utils/chartData';

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

export function MinutesByDayChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.minutes, 0);
  if (total === 0) {
    return <ChartEmpty message="No active schedules yet." />;
  }

  const max = maxMinutes(data);

  return (
    <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-44">
      {data.map(item => (
        <div key={item.day} className="group flex-1 flex flex-col items-center gap-1.5 min-w-0 h-full">
          <span className="text-[10px] font-mono text-slate-500 tabular-nums leading-none h-3 group-hover:text-navy-900 transition-colors">
            {item.minutes > 0 ? item.minutes : ''}
          </span>
          <div className="relative flex-1 w-full flex items-end justify-center min-h-0">
            <ChartTooltip
              label={item.label}
              value={formatDuration(item.minutes)}
              className="bottom-full left-1/2 -translate-x-1/2 mb-2"
            />
            <button
              type="button"
              className="w-full max-w-10 h-full flex items-end justify-center rounded-t-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 cursor-pointer"
              aria-label={`${item.label}: ${formatDuration(item.minutes)} scheduled`}
            >
              <div
                className="w-full max-w-8 bg-brand-600 rounded-t-sm min-h-0.5 transition-colors duration-150 group-hover:bg-brand-700 group-focus-within:bg-brand-700"
                style={{ height: `${Math.max((item.minutes / max) * 100, item.minutes > 0 ? 2 : 0)}%` }}
              />
            </button>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 group-hover:text-navy-900 transition-colors">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function ProgramWeeklyChart({ data }) {
  if (data.length === 0) {
    return <ChartEmpty message="No active programs with schedules." />;
  }

  const max = maxMinutes(data);

  return (
    <div className="space-y-3.5">
      {data.map(item => (
        <div key={item.id} className="group relative">
          <ChartTooltip
            label={item.name}
            value={`${formatDuration(item.minutes)} / week`}
            className="bottom-full left-0 mb-1"
          />
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <span className="text-sm font-medium text-navy-900 truncate group-hover:text-brand-700 transition-colors">
              {item.name}
            </span>
            <span className="text-xs font-mono text-slate-500 flex-shrink-0 tabular-nums">
              {formatDuration(item.minutes)}
            </span>
          </div>
          <button
            type="button"
            className="block w-full h-2 bg-slate-100 rounded-full overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            aria-label={`${item.name}: ${formatDuration(item.minutes)} per week`}
          >
            <div
              className="h-full bg-brand-600 rounded-full min-w-0.5 transition-colors duration-150 group-hover:bg-brand-700 group-focus-within:bg-brand-700"
              style={{ width: `${(item.minutes / max) * 100}%` }}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
