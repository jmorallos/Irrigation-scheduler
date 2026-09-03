import { useEffect, useRef, useState } from 'react';
import { hexToHsv, hsvToHex } from '../utils/hsvColor';

const WIDTH = 220;
const SV_HEIGHT = 124;
const HUE_HEIGHT = 16;

function useHsv(hex) {
  const [hsv, setHsv] = useState(() => hexToHsv(hex));
  const lastHex = useRef(hsvToHex(hsv));

  useEffect(() => {
    if (hex.toLowerCase() === lastHex.current) return;
    setHsv(hexToHsv(hex));
    lastHex.current = hex.toLowerCase();
  }, [hex]);

  const update = (next) => {
    const merged = {
      h: (({ ...hsv, ...next }.h % 360) + 360) % 360,
      s: Math.min(1, Math.max(0, { ...hsv, ...next }.s)),
      v: Math.min(1, Math.max(0, { ...hsv, ...next }.v)),
    };
    setHsv(merged);
    const out = hsvToHex(merged);
    lastHex.current = out;
    return out;
  };

  return [hsv, update];
}

function dragOn(el, event, map) {
  const rect = el.getBoundingClientRect();
  map(
    Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
  );
}

export default function HsvColorPicker({ value, onChange }) {
  const [hsv, update] = useHsv(value);
  const hueColor = hsvToHex({ h: hsv.h, s: 1, v: 1 });

  const bindDrag = (map) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragOn(e.currentTarget, e, map);
    },
    onPointerMove: (e) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      dragOn(e.currentTarget, e, map);
    },
  });

  return (
    <div className="mt-2 select-none" style={{ width: WIDTH, maxWidth: '100%' }}>
      <div
        role="slider"
        aria-label="Saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.s * 100)}
        tabIndex={0}
        className="relative rounded-md overflow-hidden border border-slate-200 cursor-crosshair touch-none"
        style={{
          width: '100%',
          height: SV_HEIGHT,
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.08 : 0.03;
          if (e.key === 'ArrowLeft') { e.preventDefault(); onChange(update({ s: hsv.s - step })); }
          if (e.key === 'ArrowRight') { e.preventDefault(); onChange(update({ s: hsv.s + step })); }
          if (e.key === 'ArrowUp') { e.preventDefault(); onChange(update({ v: hsv.v + step })); }
          if (e.key === 'ArrowDown') { e.preventDefault(); onChange(update({ v: hsv.v - step })); }
        }}
        {...bindDrag((x, y) => onChange(update({ s: x, v: 1 - y })))}
      >
        <span
          className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: value }}
        />
      </div>
      <div
        role="slider"
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        tabIndex={0}
        className="relative mt-2 rounded-full overflow-hidden border border-slate-200 cursor-ew-resize touch-none"
        style={{
          width: '100%',
          height: HUE_HEIGHT,
          background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 12 : 4;
          if (e.key === 'ArrowLeft') { e.preventDefault(); onChange(update({ h: hsv.h - step })); }
          if (e.key === 'ArrowRight') { e.preventDefault(); onChange(update({ h: hsv.h + step })); }
        }}
        {...bindDrag((x) => onChange(update({ h: x * 360 })))}
      >
        <span
          className="absolute top-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: hueColor }}
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span
          className="w-6 h-6 rounded-md border border-slate-200 flex-shrink-0"
          style={{ backgroundColor: value }}
          aria-hidden="true"
        />
        <span className="font-mono text-xs text-black uppercase">{value}</span>
      </div>
    </div>
  );
}
