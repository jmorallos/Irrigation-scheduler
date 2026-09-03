import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Shared week range header with previous / next controls. */
export default function WeekNav({ label, onPrev, onNext, onToday, showToday = false }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xs font-semibold text-white uppercase tracking-wider min-w-0 truncate">
        {label}
      </h2>
      <div className="flex items-center gap-1 flex-shrink-0">
        {showToday && (
          <button
            type="button"
            onClick={onToday}
            className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-100 hover:text-white rounded-md hover:bg-white/10 transition-colors"
          >
            Today
          </button>
        )}
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous week"
          className="p-1.5 rounded-md text-white hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next week"
          className="p-1.5 rounded-md text-white hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
