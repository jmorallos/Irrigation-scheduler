import { useState } from 'react';
import ProfileImagePicker from './ProfileImagePicker';
import ColorPresetPicker from './ColorPresetPicker';
import { colorFromLetter, suggestColorForPrefix } from '../utils/programColors';
import {
  WATERING_MODE_WEEKDAY,
  WATERING_MODE_INTERVAL,
  validateProgramScheduleFields,
  programSchedulePayload,
  initialProgramScheduleFields,
  DAY_ORDER,
  DAY_LABELS,
} from '../utils/programSchedule';

export default function ProgramForm({ initial, onSubmit, onCancel, existingNames = [], existingPrefixes = [] }) {
  const scheduleDefaults = initialProgramScheduleFields(initial);
  const [name, setName] = useState(initial?.name ?? '');
  const [controllerProgram, setControllerProgram] = useState(initial?.controller_program ?? '');
  const [color, setColor] = useState(initial?.color ?? colorFromLetter(initial?.controller_program) ?? 'emerald');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState(initial?.status ?? 'active');
  const [wateringMode, setWateringMode] = useState(scheduleDefaults.watering_mode);
  const [intervalDays, setIntervalDays] = useState(scheduleDefaults.interval_days);
  const [programStartDate, setProgramStartDate] = useState(scheduleDefaults.program_start_date);
  const [programEndMode, setProgramEndMode] = useState(scheduleDefaults.program_end_mode);
  const [programEndDate, setProgramEndDate] = useState(scheduleDefaults.program_end_date);
  const [neverOnDays, setNeverOnDays] = useState(scheduleDefaults.never_on_days);
  const [profileImageChange, setProfileImageChange] = useState({ action: 'none' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

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
    Object.assign(errs, validateProgramScheduleFields({
      watering_mode: wateringMode,
      interval_days: intervalDays,
      program_start_date: programStartDate,
      program_end_mode: programEndMode,
      program_end_date: programEndDate,
    }));
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
        ...programSchedulePayload({
          watering_mode: wateringMode,
          interval_days: intervalDays,
          program_start_date: programStartDate,
          program_end_mode: programEndMode,
          program_end_date: programEndDate,
          never_on_days: neverOnDays,
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  const adjustInterval = (delta) => {
    setIntervalDays(prev => Math.min(365, Math.max(1, Number(prev || 1) + delta)));
  };

  const toggleNeverOnDay = (day) => {
    setNeverOnDays(prev => (
      prev.includes(day) ? prev.filter(item => item !== day) : [...prev, day]
    ));
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-4">
        <ProfileImagePicker
          key={initial?.id ?? 'new'}
          name={name || 'Program'}
          profileImageId={initial?.profile_image_id}
          onChange={setProfileImageChange}
          label="Program photo"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="prog-name">
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="prog-controller">
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
            className={`w-24 px-3.5 py-2.5 text-sm border rounded-lg outline-none transition-colors font-mono uppercase ${
              errors.controllerProgram ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-brand-600'
            }`}
          />
          {errors.controllerProgram && (
            <p className="mt-1.5 text-xs text-red-500">{errors.controllerProgram}</p>
          )}
        </div>
        <ColorPresetPicker value={color} onChange={setColor} label="Color" />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="prog-desc">
            Description <span className="text-gray-400 font-normal">(optional)</span>
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
          <span className="block text-sm font-medium text-gray-700 mb-1.5">Status</span>
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
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <span className="block text-sm font-medium text-gray-700 mb-3">Watering schedule</span>
          <div className="flex gap-2 mb-4">
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
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {wateringMode === WATERING_MODE_INTERVAL && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="prog-interval">
                  Every
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
                  <span className="text-sm text-slate-600">days</span>
                </div>
                {errors.interval_days && <p className="mt-1.5 text-xs text-red-500">{errors.interval_days}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="prog-start-date">
                  Start date
                </label>
                <input
                  id="prog-start-date"
                  type="date"
                  value={programStartDate}
                  onChange={e => setProgramStartDate(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none ${
                    errors.program_start_date ? 'border-red-400' : 'border-slate-200 focus:border-brand-600'
                  }`}
                />
                {errors.program_start_date && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.program_start_date}</p>
                )}
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-700 mb-1.5">End date</span>
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
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
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
                <span className="block text-sm font-medium text-gray-700 mb-1.5">Never on</span>
                <div className="flex flex-wrap gap-2">
                  {DAY_ORDER.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleNeverOnDay(day)}
                      className={`px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors ${
                        neverOnDays.includes(day)
                          ? 'bg-brand-600 border-brand-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-brand-400'
                      }`}
                      aria-pressed={neverOnDays.includes(day)}
                    >
                      {DAY_LABELS[day]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-3 mt-6 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors">
          {saving ? 'Saving…' : initial?.id ? 'Save Changes' : 'Create Program'}
        </button>
      </div>
    </form>
  );
}
