import { useEffect, useRef, useState } from 'react';
import { DAY_ORDER, DAY_LABELS, getEndTime, formatTime, endsNextDay } from '../utils/dateUtils';
import {
  getAllSchedulesForConflict,
  findScheduleConflict,
  findNextAvailableStart,
  defaultStartForNewCycle,
  conflictMessage,
} from '../utils/scheduleConflict';

export default function ScheduleForm({ initial, programId, programName, zoneId, onSubmit, onCancel }) {
  const isNew = !initial?.id;
  const startTouched = useRef(false);
  const [startTime, setStartTime] = useState(initial?.start_time ?? '06:00');
  const [duration, setDuration] = useState(String(initial?.duration_minutes ?? 15));
  const [days, setDays] = useState(initial?.days_of_week ?? []);
  const [status, setStatus] = useState(initial?.status ?? 'active');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState(null);

  const durationMins = parseInt(duration, 10);
  const endTime = Number.isFinite(durationMins) && durationMins > 0
    ? getEndTime(startTime, durationMins)
    : '';
  const wrapsNextDay = Number.isFinite(durationMins) && durationMins > 0 && endsNextDay(startTime, durationMins);
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
    if (!isNew || !existing || startTouched.current) return;
    const suggested = defaultStartForNewCycle({
      durationMinutes: parseInt(duration, 10),
      daysOfWeek: days,
      existingSchedules: existing,
    });
    setStartTime(prev => (prev === suggested ? prev : suggested));
  }, [existing, isNew]);

  useEffect(() => {
    if (!existing) return undefined;

    const mins = parseInt(duration, 10);
    const canCheck = startTime
      && Number.isFinite(mins)
      && mins > 0
      && mins <= 480
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
        duration_minutes: mins,
        days_of_week: days,
        status,
      };
      const conflict = findScheduleConflict(candidate, existing);
      if (!conflict) {
        setErrors(prev => (prev.conflict ? { ...prev, conflict: undefined } : prev));
        return;
      }
      const nextAvailable = findNextAvailableStart(candidate, existing);
      const message = conflictMessage(conflict, programName, nextAvailable);
      setErrors(prev => (prev.conflict === message ? prev : { ...prev, conflict: message }));
    }, 200);

    return () => clearTimeout(timer);
  }, [existing, startTime, duration, days, status, initial?.id, zoneId, programName]);

  const toggleDay = (day) => {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const validate = () => {
    const errs = {};
    if (!startTime) errs.start_time = 'Start time is required.';
    const mins = parseInt(duration, 10);
    if (!duration || isNaN(mins) || mins <= 0) errs.duration = 'Duration must be greater than 0.';
    else if (mins > 480) errs.duration = 'Duration cannot exceed 480 minutes (8 hours).';
    if (days.length === 0) errs.days = 'Select at least one day.';
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
        start_time: startTime,
        duration_minutes: parseInt(duration, 10),
        days_of_week: days,
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
            {errors.conflict}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="sched-time">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              id="sched-time"
              type="time"
              value={startTime}
              onChange={e => {
                startTouched.current = true;
                setStartTime(e.target.value);
              }}
              className={`w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none font-mono transition-colors ${errors.start_time ? 'border-red-400' : 'border-slate-200 focus:border-brand-600'}`}
            />
            {errors.start_time && <p className="mt-1 text-xs text-red-500">{errors.start_time}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="sched-end">
              End Time
            </label>
            <input
              id="sched-end"
              type="text"
              readOnly
              value={endTime ? `${formatTime(endTime)}${wrapsNextDay ? ' next day' : ''}` : '—'}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg outline-none font-mono bg-slate-50 text-slate-600"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="sched-dur">
              Duration (min) <span className="text-red-500">*</span>
            </label>
            <input
              id="sched-dur"
              type="number"
              min="1"
              max="480"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className={`w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none font-mono transition-colors ${errors.duration ? 'border-red-400' : 'border-slate-200 focus:border-brand-600'}`}
            />
            {errors.duration && <p className="mt-1 text-xs text-red-500">{errors.duration}</p>}
          </div>
        </div>
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1.5">
            Days of Week <span className="text-red-500">*</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {DAY_ORDER.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors ${
                  days.includes(day)
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-brand-400'
                }`}
                aria-pressed={days.includes(day)}
              >
                {DAY_LABELS[day]}
              </button>
            ))}
          </div>
          {errors.days && <p className="mt-1.5 text-xs text-red-500">{errors.days}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="sched-notes">
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="sched-notes"
            rows={2}
            maxLength={200}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. 2nd cycle – soak"
            className={`w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none resize-none transition-colors ${errors.notes ? 'border-red-400' : 'border-slate-200 focus:border-brand-600'}`}
          />
          {errors.notes && <p className="mt-1 text-xs text-red-500">{errors.notes}</p>}
        </div>
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1.5">Status</span>
          <div className="flex gap-2">
            {['active', 'inactive'].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors capitalize ${
                  status === s
                    ? s === 'active' ? 'bg-brand-600 border-brand-600 text-white' : 'bg-slate-600 border-slate-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-6 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving || hasConflict} className="px-5 py-2.5 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors">
          {saving ? 'Saving…' : initial?.id ? 'Save Cycle' : 'Add Cycle'}
        </button>
      </div>
    </form>
  );
}
