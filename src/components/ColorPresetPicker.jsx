import { COLOR_PRESETS, isHexColor } from '../utils/programColors';

const DEFAULT_CUSTOM = '#2563eb';

export default function ColorPresetPicker({ value, onChange, label = 'Color' }) {
  const customSelected = isHexColor(value);

  return (
    <div>
      <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
      <div className="flex flex-wrap gap-2 items-center">
        {COLOR_PRESETS.map(preset => {
          const selected = value === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(preset.id)}
              title={preset.label}
              aria-label={preset.label}
              aria-pressed={selected}
              className={`w-8 h-8 rounded-full flex-shrink-0 transition-shadow ${preset.badge} ${
                selected ? 'ring-2 ring-offset-2 ring-navy-900' : 'hover:ring-2 hover:ring-offset-2 hover:ring-slate-300'
              }`}
            />
          );
        })}
        <label
          className={`relative w-8 h-8 rounded-full flex-shrink-0 cursor-pointer overflow-hidden border border-slate-200 ${
            customSelected ? 'ring-2 ring-offset-2 ring-navy-900' : 'hover:ring-2 hover:ring-offset-2 hover:ring-slate-300'
          }`}
          title="Custom color"
          aria-label="Custom color"
          style={customSelected ? { backgroundColor: value } : {
            background: 'conic-gradient(#ef4444, #eab308, #22c55e, #3b82f6, #8b5cf6, #ef4444)',
          }}
        >
          <input
            type="color"
            value={customSelected ? value : DEFAULT_CUSTOM}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}
