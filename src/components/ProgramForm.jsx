import { useState } from 'react';
import ProfileImagePicker from './ProfileImagePicker';
import ColorPresetPicker from './ColorPresetPicker';
import { colorFromLetter, suggestColorForPrefix } from '../utils/programColors';
import { formatTime } from '../utils/dateUtils';
import {
  WATERING_MODE_WEEKDAY,
  WATERING_MODE_INTERVAL,
  validateProgramScheduleFields,
  programSchedulePayload,
  initialProgramScheduleFields,
} from '../utils/programSchedule';

/** Sunday-first buttons; stored keys stay Mon–Sun (`mon`…`sun`). */
const WEEKDAY_BUTTONS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const WEEKDAY_SHORT = {
  sun: 'Su',
  mon: 'Mo',
  tue: 'Tu',
  wed: 'We',
  thu: 'Th',
  fri: 'Fr',
  sat: 'Sa',
};

function startTimesToText(times) {
  if (!Array.isArray(times) || times.length === 0) return '';
  return times.map(time => formatTime(time)).join('\n');
}

function WeekdayButtons({ selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {WEEKDAY_BUTTONS.map(day => (
        <button
          key={day}
          type="button"
          onClick={() => onToggle(day)}
          className={`px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors ${
            selected.includes(day)
              ? 'bg-brand-600 border-brand-600 text-white'
              : 'bg-white border-slate-200 text-black hover:border-brand-400'
          }`}
          aria-pressed={selected.includes(day)}
        >
          {WEEKDAY_SHORT[day]}
        </button>
      ))}
    </div>
  );
}

export default function ProgramForm({
  initial,
  onSubmit,
  onCancel,
  existingNames = [],
  existingPrefixes = [],
  valveCount = null,
}) {
  const scheduleDefaults = initialProgramScheduleFields(initial);
  const [name, setName] = useState(initial?.name ?? '');
  const [controllerProgram, setControllerProgram] = useState(initial?.controller_program ?? '');
  const [color, setColor] = useState(initial?.color ?? colorFromLetter(initial?.controller_program) ?? 'emerald');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [startTimesText, setStartTimesText] = useState(startTimesToText(scheduleDefaults.start_times));
  const [durationMinutes, setDurationMinutes] = useState(
    scheduleDefaults.duration_minutes != null ? String(scheduleDefaults.duration_minutes) : '15',
  );
  const [status, setStatus] = useState(initial?.status ?? 'active');
  const [wateringMode, setWateringMode] = useState(scheduleDefaults.watering_mode);
  const [intervalDays, setIntervalDays] = useState(scheduleDefaults.interval_days);
  const [daysOfWeek, setDaysOfWeek] = useState(scheduleDefaults.days_of_week);
  const [programStartDate, setProgramStartDate] = useState(scheduleDefaults.program_start_date);
  const [programEndMode, setProgramEndMode] = useState(scheduleDefaults.program_end_mode);
  const [programEndDate, setProgramEndDate] = useState(scheduleDefaults.program_end_date);
  const [neverOnDays, setNeverOnDays] = useState(scheduleDefaults.never_on_days);
  const [profileImageChange, setProfileImageChange] = useState({ action: 'none' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);
  const missingValve = isEdit && valveCount != null && valveCount < 1;

  const scheduleFields = () => ({
    watering_mode: wateringMode,
    interval_days: intervalDays,
    program_start_date: programStartDate,
    program_end_mode: programEndMode,
    program_end_date: programEndDate,
    never_on_days: neverOnDays,
    start_times: startTimesText,
    duration_minutes: durationMinutes,
    days_of_week: daysOfWeek,
  });

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Program name is required.';
    else if (existingNames.map(n => n.toLowerCase()).includes(name.trim().toLowerCase())) {
      errs.name = 'A program with this name already exists.';
    }
    const prefix = controllerProgram.trim().toUpperCase();
    if (!prefix) errs.controllerProgram = 'Program prefix is required.';
    else if (existingPrefixes.map(p => String(p).toUpperCase()).includes(prefix)) {
      errs.controllerProgram = 'Another program already uses this prefix.';
    }
    if (String(durationMinutes).trim() === '') {
      errs.duration_minutes = 'Enter minutes watered (1 or higher).';
    }
    Object.assign(errs, validateProgramScheduleFields(scheduleFields()));
    if (missingValve) errs.valves = 'Add at least one valve before saving.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        controller_program: controllerProgram.trim().toUpperCase(),
        color,
        description: description.trim(),
        status,
        profileImageChange,
        ...programSchedulePayload(scheduleFields()),
      });
    } finally {
      setSaving(false);
    }
  };

  const adjustInterval = (delta) => {
    setIntervalDays(prev => Math.min(365, Math.max(1, Number(prev || 1) + delta)));
  };

  const toggleDay = (setList, day) => {
    setList(prev => (prev.includes(day) ? prev.filter(item => item !== day) : [...prev, day]));
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-4 text-left">
        <ProfileImagePicker
          key={initial?.id ?? 'new'}
          name={name || 'Program'}
          profileImageId={initial?.profile_image_id}
          onChange={setProfileImageChange}
          label="Program photo"
        />
        <div>
          <label className="block text-sm font-medium text-black mb-1.5" htmlFor="prog-name">
            Program Name <span className="text-red-500">*</span>
          </label>
          <input
            id="prog-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Front Garden"
            className={`w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none transition-colors ${errors.name ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-brand-600'}`}
          />
          {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-black mb-1.5" htmlFor="prog-controller">
            Program Prefix <span className="text-red-500">*</span>
          </label>
          <input
            id="prog-controller"
            type="text"
            value={controllerProgram}
            onChange={e => {
              const next = e.target.value.toUpperCase().slice(0, 2);
              setControllerProgram(next);
              setColor(prev => suggestColorForPrefix(next, { isEditing: Boolean(initial), currentColor: prev }));
            }}
            placeholder="e.g. A"
            required
            aria-required="true"
            className={`w-24 px-3.5 py-2.5 text-sm border rounded-lg outline-none transition-colors font-mono uppercase placeholder:normal-case ${
              errors.controllerProgram ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-brand-600'
            }`}
          />
          {errors.controllerProgram && (
            <p className="mt-1.5 text-xs text-red-500">{errors.controllerProgram}</p>
          )}
        </div>
        <ColorPresetPicker value={color} onChange={setColor} label="Color" required />
        <div>
          <label className="block text-sm font-medium text-black mb-1.5" htmlFor="prog-desc">
            Description <span className="text-black font-normal">(optional)</span>
          </label>
          <textarea
            id="prog-desc"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Short description of this program"
            rows={2}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-brand-600 transition-colors resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-black mb-1.5" htmlFor="prog-start-times">
            Start Time <span className="text-red-500">*</span>
          </label>
          <textarea
            id="prog-start-times"
            value={startTimesText}
            onChange={e => setStartTimesText(e.target.value)}
            placeholder="04:00 AM, 10:00 AM"
            rows={3}
            aria-required="true"
            className={`w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none font-mono transition-colors resize-none ${
              errors.start_times ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-brand-600'
            }`}
          />
          <p className="mt-1.5 text-[11px] text-black">
            One time per line (one event per line), e.g. 04:00 AM, 10:00 AM
          </p>
          {errors.start_times && <p className="mt-1.5 text-xs text-red-500">{errors.start_times}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-black mb-1.5" htmlFor="prog-duration">
            Minutes Watered <span className="text-red-500">*</span>
          </label>
          <input
            id="prog-duration"
            type="number"
            min={1}
            value={durationMinutes}
            onChange={e => setDurationMinutes(e.target.value)}
            aria-required="true"
            className={`w-28 px-3.5 py-2.5 text-sm border rounded-lg outline-none font-mono transition-colors ${
              errors.duration_minutes ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-brand-600'
            }`}
          />
          {errors.duration_minutes && (
            <p className="mt-1.5 text-xs text-red-500">{errors.duration_minutes}</p>
          )}
        </div>
        <div>
          <span className="block text-sm font-medium text-black mb-1.5">Watering Schedule</span>
          <div className="flex gap-2">
            {[
              { id: WATERING_MODE_WEEKDAY, label: 'Weekdays' },
              { id: WATERING_MODE_INTERVAL, label: 'Interval' },
            ].map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setWateringMode(option.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  wateringMode === option.id
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'bg-white border-slate-200 text-black hover:border-slate-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {wateringMode === WATERING_MODE_INTERVAL && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-black mb-1.5" htmlFor="prog-interval">
                Every <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustInterval(-1)}
                  className="w-10 h-10 rounded-lg border border-slate-200 bg-white text-lg font-semibold text-navy-900 hover:bg-slate-50"
                  aria-label="Decrease interval days"
                >
                  −
                </button>
                <input
                  id="prog-interval"
                  type="number"
                  min={1}
                  max={365}
                  value={intervalDays}
                  onChange={e => setIntervalDays(Number(e.target.value))}
                  className={`w-20 px-3 py-2 text-sm text-center border rounded-lg outline-none font-mono ${
                    errors.interval_days ? 'border-red-400' : 'border-slate-200 focus:border-brand-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => adjustInterval(1)}
                  className="w-10 h-10 rounded-lg border border-slate-200 bg-white text-lg font-semibold text-navy-900 hover:bg-slate-50"
                  aria-label="Increase interval days"
                >
                  +
                </button>
                <span className="text-sm text-black">days</span>
              </div>
              {errors.interval_days && <p className="mt-1.5 text-xs text-red-500">{errors.interval_days}</p>}
            </div>
          )}
        </div>
        <div>
          <span className="block text-sm font-medium text-black mb-1.5">
            Days of Week
            {wateringMode === WATERING_MODE_WEEKDAY ? <span className="text-red-500"> *</span> : null}
          </span>
          <WeekdayButtons
            selected={daysOfWeek}
            onToggle={day => toggleDay(setDaysOfWeek, day)}
          />
          {errors.days_of_week && <p className="mt-1.5 text-xs text-red-500">{errors.days_of_week}</p>}
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
                    ? s === 'active'
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'bg-slate-600 border-slate-600 text-white'
                    : 'bg-white border-slate-200 text-black hover:border-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-black mb-1.5" htmlFor="prog-start-date">
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            id="prog-start-date"
            type="date"
            value={programStartDate}
            onChange={e => setProgramStartDate(e.target.value)}
            aria-required="true"
            className={`w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none ${
              errors.program_start_date ? 'border-red-400' : 'border-slate-200 focus:border-brand-600'
            }`}
          />
          {errors.program_start_date && (
            <p className="mt-1.5 text-xs text-red-500">{errors.program_start_date}</p>
          )}
        </div>
        <div>
          <span className="block text-sm font-medium text-black mb-1.5">End Date</span>
          <div className="flex gap-2 mb-3">
            {[
              { id: 'never', label: 'Never' },
              { id: 'date', label: 'On date' },
            ].map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setProgramEndMode(option.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  programEndMode === option.id
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'bg-white border-slate-200 text-black hover:border-slate-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {programEndMode === 'date' && (
            <>
              <input
                id="prog-end-date"
                type="date"
                value={programEndDate}
                onChange={e => setProgramEndDate(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none ${
                  errors.program_end_date ? 'border-red-400' : 'border-slate-200 focus:border-brand-600'
                }`}
              />
              {errors.program_end_date && (
                <p className="mt-1.5 text-xs text-red-500">{errors.program_end_date}</p>
              )}
            </>
          )}
        </div>
        <div>
          <span className="block text-sm font-medium text-black mb-1.5">Never On</span>
          <p className="mb-1.5 text-[11px] text-black">Weekdays that are always skipped (Weekdays and Interval).</p>
          <WeekdayButtons
            selected={neverOnDays}
            onToggle={day => toggleDay(setNeverOnDays, day)}
          />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {missingValve && (
          <p className="text-xs text-red-500" role="alert">
            {errors.valves || 'Add at least one valve before saving. Use Create New Valve or Add Existing Valve.'}
          </p>
        )}
        {!isEdit && (
          <p className="text-[11px] text-black">
            Next: add at least one valve (Create New Valve or Add Existing Valve).
          </p>
        )}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm font-medium text-black bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || missingValve}
            className="px-5 py-2.5 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Program'}
          </button>
        </div>
      </div>
    </form>
  );
}
