import { useState } from 'react';

export default function ProgramForm({ initial, onSubmit, onCancel, existingNames = [] }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [controllerProgram, setControllerProgram] = useState(initial?.controller_program ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState(initial?.status ?? 'active');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Program name is required.';
    else if (existingNames.map(n => n.toLowerCase()).includes(name.trim().toLowerCase())) {
      errs.name = 'A program with this name already exists.';
    }
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
        controller_program: controllerProgram.trim().toUpperCase() || null,
        description: description.trim(),
        status,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-4">
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
            Controller Program <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="prog-controller"
            type="text"
            value={controllerProgram}
            onChange={e => setControllerProgram(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="e.g. A"
            className="w-24 px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-brand-600 transition-colors font-mono uppercase"
          />
        </div>
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
