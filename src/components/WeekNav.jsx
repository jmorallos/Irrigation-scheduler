import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { DAY_LABELS, DAY_ORDER, isSameCalendarDay, startOfDay, startOfWeekMonday } from '../utils/dateUtils';

const CAL_WIDTH = 280;
const GAP = 6;
const VIEW_PAD = 8;

function dateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function monthTitle(year, month) {
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function monthFromDate(date) {
  const day = date && !Number.isNaN(date.getTime()) ? date : new Date();
  return { year: day.getFullYear(), month: day.getMonth() };
}

function monthCells(year, month) {
  const start = startOfWeekMonday(new Date(year, month, 1));
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return startOfDay(date);
  });
}

/** Week header: << >> weeks, < > days, click the date to open a calendar. */
export default function WeekNav({
  label,
  viewDate,
  onPrevWeek,
  onNextWeek,
  onPrevDay,
  onNextDay,
  onPickDate,
  onToday,
  showToday = false,
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => monthFromDate(viewDate));
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const calendarRef = useRef(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const height = calendarRef.current?.offsetHeight || 320;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = rect.bottom + GAP;
    if (top + height > vh - VIEW_PAD && rect.top - GAP - height > VIEW_PAD) {
      top = rect.top - GAP - height;
    }
    let left = rect.left + (rect.width / 2) - (CAL_WIDTH / 2);
    left = Math.min(Math.max(VIEW_PAD, left), Math.max(VIEW_PAD, vw - CAL_WIDTH - VIEW_PAD));
    setPosition({ top, left });
  };

  const toggleCalendar = () => {
    if (!open) {
      setCursor(monthFromDate(viewDate));
      updatePosition();
    }
    setOpen(prev => !prev);
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, cursor.year, cursor.month]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event) => {
      if (
        !triggerRef.current?.contains(event.target)
        && !calendarRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  const shiftMonth = (delta) => {
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const selected = viewDate && !Number.isNaN(viewDate.getTime()) ? startOfDay(viewDate) : null;
  const today = startOfDay(new Date());
  const cells = monthCells(cursor.year, cursor.month);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-0.5 min-w-0">
        <button
          type="button"
          onClick={() => { setOpen(false); onPrevWeek?.(); }}
          aria-label="Previous week"
          className="p-1.5 rounded-md text-white hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); onPrevDay?.(); }}
          aria-label="Previous day"
          className="p-1.5 rounded-md text-white hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          ref={triggerRef}
          type="button"
          onClick={toggleCalendar}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Choose date, currently ${label}`}
          className={`min-w-0 max-w-full px-2 py-1 rounded-md text-xs font-semibold text-white uppercase tracking-wider truncate transition-colors ${
            open ? 'bg-white/15' : 'hover:bg-white/10'
          }`}
        >
          {label}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); onNextDay?.(); }}
          aria-label="Next day"
          className="p-1.5 rounded-md text-white hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); onNextWeek?.(); }}
          aria-label="Next week"
          className="p-1.5 rounded-md text-white hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
      {showToday && (
        <button
          type="button"
          onClick={() => { setOpen(false); onToday?.(); }}
          className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-100 hover:text-white rounded-md hover:bg-white/10 transition-colors flex-shrink-0"
        >
          Today
        </button>
      )}
      {open && createPortal(
        <div
          ref={calendarRef}
          role="dialog"
          aria-label="Choose date"
          className="fixed z-50 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
          style={{ top: position.top, left: position.left, width: CAL_WIDTH }}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="p-1 rounded-md text-navy-900 hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="text-sm font-semibold text-navy-900">
              {monthTitle(cursor.year, cursor.month)}
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="p-1 rounded-md text-navy-900 hover:bg-slate-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {DAY_ORDER.map(key => (
              <div
                key={key}
                className="py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500"
              >
                {DAY_LABELS[key]}
              </div>
            ))}
            {cells.map((date) => {
              const inMonth = date.getMonth() === cursor.month;
              const isSelected = selected && isSameCalendarDay(date, selected);
              const isToday = isSameCalendarDay(date, today);
              return (
                <button
                  key={dateKey(date)}
                  type="button"
                  onClick={() => {
                    onPickDate?.(date);
                    setOpen(false);
                  }}
                  className={[
                    'h-8 rounded-md text-xs font-medium transition-colors',
                    isSelected
                      ? 'bg-navy-900 text-white'
                      : isToday
                        ? 'text-brand-700 ring-1 ring-inset ring-brand-600'
                        : inMonth
                          ? 'text-navy-900 hover:bg-slate-100'
                          : 'text-slate-400 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
