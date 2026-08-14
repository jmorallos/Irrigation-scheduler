import { useState } from 'react';
import { DAY_ORDER, DAY_LABELS } from '../utils/dateUtils';

export default function ScheduleForm({ initial, onSubmit, onCancel }) {
  const [startTime, setStartTime] = useState(initial?.start_time ?? '06:00');
  const [duration, setDuration] = useState(String(initial?.duration_minutes ?? 15));
  const [days, setDays] = useState(initial?.days_of_week ?? []);
  const [status, setStatus] = useState(initial?.status ?? 'active');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

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
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit({ start_time: startTime, duration_minutes: parseInt(duration, 10), days_of_week: days, status });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="sched-time">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              id="sched-time"
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className={`w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none font-mono transition-colors ${errors.start_time ? 'border-red-400' : 'border-slate-200 focus:border-brand-600'}`}
            />
            {errors.start_time && <p className="mt-1 text-xs text-red-500">{errors.start_time}</p>}
          </div>
          <div>
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
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
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
        <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors">
          {saving ? 'Saving…' : initial?.id ? 'Save Schedule' : 'Add Schedule'}
        </button>
      </div>
    </form>
  );
}
