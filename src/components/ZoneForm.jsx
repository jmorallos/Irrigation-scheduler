import { useState } from 'react';
import ProfileImagePicker from './ProfileImagePicker';

export default function ZoneForm({ initial, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [status, setStatus] = useState(initial?.status ?? 'active');
  const [profileImageChange, setProfileImageChange] = useState({ action: 'none' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setErrors({ name: 'Zone name is required.' }); return; }
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), status, profileImageChange });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-4">
        <ProfileImagePicker
          key={initial?.id ?? 'new'}
          name={name || 'Zone'}
          profileImageId={initial?.profile_image_id}
          onChange={setProfileImageChange}
          label="Zone photo"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="zone-name">
            Zone Name <span className="text-red-500">*</span>
          </label>
          <input
            id="zone-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Front Lawn"
            className={`w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none transition-colors ${errors.name ? 'border-red-400' : 'border-slate-200 focus:border-brand-600'}`}
          />
          {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name}</p>}
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
          {saving ? 'Saving…' : initial?.id ? 'Save Zone' : 'Add Zone'}
        </button>
      </div>
    </form>
  );
}
