import { useCallback, useState } from 'react';

const ORDER = ['left', 'center', 'right'];

export const ALIGN_TEXT = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export const ALIGN_FLEX = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

function readStored(key, defaults) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function useColumnAlign(storageKey, defaults) {
  const [aligns, setAligns] = useState(() => readStored(storageKey, defaults));

  const cycle = useCallback((id) => {
    setAligns((prev) => {
      const current = prev[id] ?? defaults[id] ?? 'left';
      const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
      const updated = { ...prev, [id]: next };
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        /* ignore quota / private mode */
      }
      return updated;
    });
  }, [storageKey, defaults]);

  const cellClass = useCallback((id) => ALIGN_TEXT[aligns[id] ?? defaults[id] ?? 'left'], [aligns, defaults]);
  const flexClass = useCallback((id) => ALIGN_FLEX[aligns[id] ?? defaults[id] ?? 'left'], [aligns, defaults]);

  return { cycle, cellClass, flexClass };
}
