import { useEffect, useState } from 'react';
import { formatDays, formatTime, getEndTime, endsNextDay } from '../utils/dateUtils';
import {
  getAllSchedulesForConflict,
  findScheduleConflict,
  conflictMessage,
} from '../utils/scheduleConflict';

const EMPTY_DAYS = [];

export default function ScheduleForm({ initial, programName, zoneId, onSubmit, onCancel }) {
  const startTime = initial?.start_time ?? '';
  const durationMins = Number(initial?.duration_minutes);
  const days = initial?.days_of_week ?? EMPTY_DAYS;
  const [status, setStatus] = useState(initial?.status ?? 'active');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState(null);

  const hasDuration = Number.isFinite(durationMins) && durationMins > 0;
  const endTime = hasDuration ? getEndTime(startTime, durationMins) : '';
  const wrapsNextDay = hasDuration && endsNextDay(startTime, durationMins);
  const hasConflict = Boolean(errors.conflict);

  useEffect(() => {
    let cancelled = false;
    getAllSchedulesForConflict().then(list => {
      if (!cancelled) setExisting(list);
    }).catch(() => {
      if (!cancelled) setExisting([]);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!existing) return undefined;

    const canCheck = startTime
      && hasDuration
      && durationMins <= 480
      && days.length > 0;

    if (!canCheck || status === 'inactive') {
      const timer = setTimeout(() => {
        setErrors(prev => (prev.conflict ? { ...prev, conflict: undefined } : prev));
      }, 200);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      const candidate = {
        id: initial?.id,
        zone_id: zoneId,
        start_time: startTime,
        duration_minutes: durationMins,
        days_of_week: days,
        status,
      };
      const conflict = findScheduleConflict(candidate, existing);
      if (!conflict) {
        setErrors(prev => (prev.conflict ? { ...prev, conflict: undefined } : prev));
        return;
      }
      const message = conflictMessage(conflict, programName);
      setErrors(prev => (prev.conflict === message ? prev : { ...prev, conflict: message }));
    }, 200);

    return () => clearTimeout(timer);
  }, [existing, startTime, durationMins, hasDuration, days, status, initial?.id, zoneId, programName]);

  const validate = () => {
    const errs = {};
    if (notes.trim().length > 200) errs.notes = 'Notes cannot exceed 200 characters.';
    setErrors(prev => ({ ...errs, conflict: prev.conflict }));
    return Object.keys(errs).length === 0 && !hasConflict;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit({
        status,
        notes: notes.trim(),
      });
    } catch (err) {
      setErrors(prev => ({ ...prev, conflict: err.message }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-4">
        {errors.conflict && (
          <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <p>{errors.conflict}</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <span className="block text-sm font-medium text-black mb-1.5">Start Time</span>
            <input
              type="text"
              readOnly
              value={startTime ? formatTime(startTime) : '—'}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg outline-none font-mono bg-slate-50 text-black"
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-black mb-1.5">End Time</span>
            <input
              type="text"
              readOnly
              value={endTime ? `${formatTime(endTime)}${wrapsNextDay ? ' next day' : ''}` : '—'}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg outline-none font-mono bg-slate-50 text-black"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="block text-sm font-medium text-black mb-1.5">Duration (min)</span>
            <input
              type="text"
              readOnly
              value={hasDuration ? String(durationMins) : '—'}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg outline-none font-mono bg-slate-50 text-black"
            />
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-black mb-1.5">Days of Week</span>
          <input
            type="text"
            readOnly
            value={days.length > 0 ? formatDays(days) : '—'}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50 text-black"
          />
          <p className="mt-1.5 text-[11px] text-black">Start, duration, and days come from the program.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-black mb-1.5" htmlFor="sched-notes">
            Notes <span className="text-black font-normal">(optional)</span>
          </label>
          <textarea
            id="sched-notes"
            rows={2}
            maxLength={200}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. 2nd event – soak"
            className={`w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none resize-none transition-colors ${errors.notes ? 'border-red-400' : 'border-slate-200 focus:border-brand-600'}`}
          />
          {errors.notes && <p className="mt-1 text-xs text-red-500">{errors.notes}</p>}
        </div>
        <div>
          <span className="block text-sm font-medium text-black mb-1.5">Status</span>
          <div className="flex gap-2">
            {['active', 'inactive'].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors capitalize ${
                  status === s
                    ? s === 'active' ? 'bg-brand-600 border-brand-600 text-white' : 'bg-slate-600 border-slate-600 text-white'
                    : 'bg-white border-slate-200 text-black hover:border-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-6 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm font-medium text-black bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving || hasConflict} className="px-5 py-2.5 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors">
          {saving ? 'Saving…' : 'Save Event'}
        </button>
      </div>
    </form>
  );
}
