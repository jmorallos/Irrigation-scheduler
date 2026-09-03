import { useState } from 'react';
import { COLOR_PRESETS, isHexColor } from '../utils/programColors';
import { hsvToHex } from '../utils/hsvColor';
import HsvColorPicker from './HsvColorPicker';

const SWATCH_PX = 28;
const COLS = 5;
const GAP_PX = 6;
const GRID_WIDTH = COLS * SWATCH_PX + (COLS - 1) * GAP_PX;
const DEFAULT_CUSTOM = hsvToHex({ h: 221, s: 0.83, v: 0.92 });

const swatchStyle = {
  width: SWATCH_PX,
  height: SWATCH_PX,
};

function presetHex(id) {
  return COLOR_PRESETS.find(preset => preset.id === id)?.swatch ?? DEFAULT_CUSTOM;
}

export default function ColorPresetPicker({ value, onChange, label = 'Color' }) {
  const customSelected = isHexColor(value);
  const [pickerOpen, setPickerOpen] = useState(customSelected);
  const pickerValue = customSelected ? value : presetHex(value);

  const openCustom = () => {
    setPickerOpen(true);
    if (!customSelected) onChange(pickerValue);
  };

  return (
    <div>
      <span className="block text-sm font-medium text-black mb-1.5">{label}</span>
      <div
        className="grid"
        style={{
          width: GRID_WIDTH,
          maxWidth: '100%',
          gridTemplateColumns: `repeat(${COLS}, ${SWATCH_PX}px)`,
          gap: GAP_PX,
        }}
      >
        {COLOR_PRESETS.map(preset => {
          const selected = value === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setPickerOpen(false);
                onChange(preset.id);
              }}
              title={preset.label}
              aria-label={preset.label}
              aria-pressed={selected}
              style={swatchStyle}
              className={`rounded-full flex-shrink-0 transition-shadow ${preset.badge} ${
                selected ? 'ring-2 ring-offset-1 ring-navy-900' : 'hover:ring-2 hover:ring-offset-1 hover:ring-slate-300'
              }`}
            />
          );
        })}
        <button
          type="button"
          title="Custom color"
          aria-label="Custom color"
          aria-pressed={customSelected}
          onClick={openCustom}
          className={`rounded-full flex-shrink-0 overflow-hidden border border-slate-200 ${
            customSelected ? 'ring-2 ring-offset-1 ring-navy-900' : 'hover:ring-2 hover:ring-offset-1 hover:ring-slate-300'
          }`}
          style={{
            ...swatchStyle,
            background: customSelected
              ? value
              : 'conic-gradient(#ef4444, #eab308, #22c55e, #3b82f6, #8b5cf6, #ef4444)',
          }}
        />
      </div>
      {pickerOpen && (
        <HsvColorPicker value={pickerValue} onChange={onChange} />
      )}
    </div>
  );
}
