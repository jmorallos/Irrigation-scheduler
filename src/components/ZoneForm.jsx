import { useState } from 'react';
import ProfileImagePicker from './ProfileImagePicker';
import { parseZoneName, formatZoneName } from '../utils/scheduleUtils';
import ColorPresetPicker from './ColorPresetPicker';

export default function ZoneForm({
  initial,
  onSubmit,
  onCancel,
  existingNumbers = [],
  suggestedNumber = 1,
  defaultColor = 'emerald',
  showStatus = true,
}) {
  const parsed = parseZoneName(initial?.name);
  const [zoneNumber, setZoneNumber] = useState(
    String(initial?.zone_number ?? parsed.number ?? suggestedNumber),
  );
  const [name, setName] = useState(parsed.number != null ? parsed.label : (initial?.name ?? ''));
  const [color, setColor] = useState(initial?.color ?? defaultColor);
  const [gph, setGph] = useState(initial?.gph != null ? String(initial.gph) : '');
  const [status, setStatus] = useState(initial?.status ?? 'active');
  const [profileImageChange, setProfileImageChange] = useState({ action: 'none' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const previewName = formatZoneName(zoneNumber || '—', name);

  const validate = () => {
    const errs = {};
    const num = parseInt(zoneNumber, 10);
    if (!zoneNumber || isNaN(num) || num < 1) errs.zoneNumber = 'Enter a valve number of 1 or higher.';
    else if (num > 99) errs.zoneNumber = 'Valve number cannot exceed 99.';
    else if (existingNumbers.includes(num)) errs.zoneNumber = `Valve ${num} already exists.`;
    if (!name.trim()) errs.name = 'Valve name is required.';
    if (gph.trim()) {
      const rate = Number(gph);
      if (!Number.isFinite(rate) || rate < 0) errs.gph = 'Enter a valid flow rate (0 or higher).';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const num = parseInt(zoneNumber, 10);
      await onSubmit({
        zone_number: num,
        name: formatZoneName(num, name),
        color,
        gph: gph.trim() ? Number(gph) : null,
        status,
        profileImageChange,
      });
    } catch (err) {
      setErrors({ zoneNumber: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-4">
        <ProfileImagePicker
          key={initial?.id ?? 'new'}
          name={previewName || 'Valve'}
          profileImageId={initial?.profile_image_id}
          onChange={setProfileImageChange}
          label="Valve photo"
        />
        <div className="grid grid-cols-[6.5rem_1fr] gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="zone-number">
              Valve # <span className="text-red-500">*</span>
            </label>
            <input
              id="zone-number"
              type="number"
              min="1"
              max="99"
              value={zoneNumber}
              onChange={e => setZoneNumber(e.target.value)}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none font-mono transition-colors ${errors.zoneNumber ? 'border-red-400' : 'border-slate-200 focus:border-brand-600'}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="zone-name">
              Valve Name <span className="text-red-500">*</span>
            </label>
            <input
              id="zone-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Court"
              className={`w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none transition-colors ${errors.name ? 'border-red-400' : 'border-slate-200 focus:border-brand-600'}`}
            />
          </div>
        </div>
        {(errors.zoneNumber || errors.name) && (
          <p className="text-xs text-red-500 -mt-2">{errors.zoneNumber || errors.name}</p>
        )}
        <ColorPresetPicker value={color} onChange={setColor} label="Color" />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="zone-gph">
            Flow rate (GPH) <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="zone-gph"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={gph}
            onChange={e => setGph(e.target.value)}
            placeholder="e.g. 210"
            className={`w-full max-w-xs px-3.5 py-2.5 text-sm border rounded-lg outline-none font-mono transition-colors ${errors.gph ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-brand-600'}`}
          />
          {errors.gph ? (
            <p className="mt-1.5 text-xs text-red-500">{errors.gph}</p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-500">
              Gallons per hour for this valve.
            </p>
          )}
        </div>
        {showStatus && (
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
        )}
      </div>
      <div className="flex gap-3 mt-6 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors">
          {saving ? 'Saving…' : initial?.id ? 'Save Valve' : 'Add Valve'}
        </button>
      </div>
    </form>
  );
}
