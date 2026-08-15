const PRESETS = [
  {
    id: 'emerald',
    label: 'Green',
    swatch: '#059669',
    row: 'bg-emerald-50',
    rowAlt: 'bg-emerald-100',
    header: 'bg-emerald-100',
    today: 'bg-emerald-100',
    todayAlt: 'bg-emerald-200',
    border: 'border-emerald-200',
    badge: 'bg-emerald-600',
    badgeText: 'text-white',
    hover: 'hover:bg-emerald-100',
    rowHex: '#ecfdf5',
    rowAltHex: '#d1fae5',
    headerHex: '#d1fae5',
  },
  {
    id: 'amber',
    label: 'Yellow',
    swatch: '#d97706',
    row: 'bg-amber-50',
    rowAlt: 'bg-amber-100',
    header: 'bg-amber-100',
    today: 'bg-amber-100',
    todayAlt: 'bg-amber-200',
    border: 'border-amber-200',
    badge: 'bg-amber-500',
    badgeText: 'text-white',
    hover: 'hover:bg-amber-100',
    rowHex: '#fffbeb',
    rowAltHex: '#fef3c7',
    headerHex: '#fef3c7',
  },
  {
    id: 'sky',
    label: 'Blue',
    swatch: '#0284c7',
    row: 'bg-sky-50',
    rowAlt: 'bg-sky-100',
    header: 'bg-sky-100',
    today: 'bg-sky-100',
    todayAlt: 'bg-sky-200',
    border: 'border-sky-200',
    badge: 'bg-sky-600',
    badgeText: 'text-white',
    hover: 'hover:bg-sky-100',
    rowHex: '#f0f9ff',
    rowAltHex: '#e0f2fe',
    headerHex: '#e0f2fe',
  },
  {
    id: 'orange',
    label: 'Orange',
    swatch: '#ea580c',
    row: 'bg-orange-50',
    rowAlt: 'bg-orange-100',
    header: 'bg-orange-100',
    today: 'bg-orange-100',
    todayAlt: 'bg-orange-200',
    border: 'border-orange-200',
    badge: 'bg-orange-500',
    badgeText: 'text-white',
    hover: 'hover:bg-orange-100',
    rowHex: '#fff7ed',
    rowAltHex: '#ffedd5',
    headerHex: '#ffedd5',
  },
  {
    id: 'violet',
    label: 'Purple',
    swatch: '#7c3aed',
    row: 'bg-violet-50',
    rowAlt: 'bg-violet-100',
    header: 'bg-violet-100',
    today: 'bg-violet-100',
    todayAlt: 'bg-violet-200',
    border: 'border-violet-200',
    badge: 'bg-violet-600',
    badgeText: 'text-white',
    hover: 'hover:bg-violet-100',
    rowHex: '#f5f3ff',
    rowAltHex: '#ede9fe',
    headerHex: '#ede9fe',
  },
  {
    id: 'teal',
    label: 'Teal',
    swatch: '#0d9488',
    row: 'bg-teal-50',
    rowAlt: 'bg-teal-100',
    header: 'bg-teal-100',
    today: 'bg-teal-100',
    todayAlt: 'bg-teal-200',
    border: 'border-teal-200',
    badge: 'bg-teal-600',
    badgeText: 'text-white',
    hover: 'hover:bg-teal-100',
    rowHex: '#f0fdfa',
    rowAltHex: '#ccfbf1',
    headerHex: '#ccfbf1',
  },
  {
    id: 'rose',
    label: 'Rose',
    swatch: '#e11d48',
    row: 'bg-rose-50',
    rowAlt: 'bg-rose-100',
    header: 'bg-rose-100',
    today: 'bg-rose-100',
    todayAlt: 'bg-rose-200',
    border: 'border-rose-200',
    badge: 'bg-rose-500',
    badgeText: 'text-white',
    hover: 'hover:bg-rose-100',
    rowHex: '#fff1f2',
    rowAltHex: '#ffe4e6',
    headerHex: '#ffe4e6',
  },
  {
    id: 'lime',
    label: 'Lime',
    swatch: '#65a30d',
    row: 'bg-lime-50',
    rowAlt: 'bg-lime-100',
    header: 'bg-lime-100',
    today: 'bg-lime-100',
    todayAlt: 'bg-lime-200',
    border: 'border-lime-200',
    badge: 'bg-lime-600',
    badgeText: 'text-white',
    hover: 'hover:bg-lime-100',
    rowHex: '#f7fee7',
    rowAltHex: '#ecfccb',
    headerHex: '#ecfccb',
  },
];

const FALLBACK = {
  id: 'slate',
  label: 'Gray',
  swatch: '#64748b',
  row: 'bg-slate-50',
  rowAlt: 'bg-slate-100',
  header: 'bg-slate-100',
  today: 'bg-slate-100',
  todayAlt: 'bg-slate-200',
  border: 'border-slate-200',
  badge: 'bg-slate-500',
  badgeText: 'text-white',
  hover: 'hover:bg-slate-100',
  rowHex: '#f8fafc',
  rowAltHex: '#f1f5f9',
  headerHex: '#f1f5f9',
};

const LETTER_TO_COLOR = {
  A: 'emerald',
  B: 'amber',
  C: 'sky',
  D: 'orange',
  E: 'violet',
  F: 'teal',
  G: 'rose',
  H: 'lime',
};

const PRESET_BY_ID = Object.fromEntries(PRESETS.map(preset => [preset.id, preset]));

export const COLOR_PRESETS = PRESETS;

export function isHexColor(value) {
  return typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function normalizeHex(hex) {
  const raw = hex.trim().replace('#', '');
  const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
  return `#${full.toLowerCase()}`;
}

function hexToRgb(hex) {
  const n = normalizeHex(hex).slice(1);
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
}

function mix(hex, other, amount) {
  const a = hexToRgb(hex);
  const b = hexToRgb(other);
  return rgbToHex({
    r: Math.round(a.r + (b.r - a.r) * amount),
    g: Math.round(a.g + (b.g - a.g) * amount),
    b: Math.round(a.b + (b.b - a.b) * amount),
  });
}

function themeFromHex(hex, letter = '') {
  const color = normalizeHex(hex);
  return {
    id: color,
    isCustom: true,
    label: 'Custom',
    swatch: color,
    row: '',
    rowAlt: '',
    header: '',
    today: '',
    todayAlt: '',
    border: '',
    badge: '',
    badgeText: 'text-white',
    hover: '',
    rowHex: mix(color, '#ffffff', 0.88),
    rowAltHex: mix(color, '#ffffff', 0.78),
    headerHex: mix(color, '#ffffff', 0.80),
    todayHex: mix(color, '#ffffff', 0.80),
    todayAltHex: mix(color, '#ffffff', 0.68),
    borderHex: mix(color, '#ffffff', 0.62),
    badgeHex: color,
    letter,
  };
}

function withSurfaceHexes(preset, letter = '') {
  return {
    ...preset,
    letter,
    badgeHex: preset.badgeHex ?? preset.swatch,
    borderHex: preset.borderHex ?? mix(preset.swatch, '#ffffff', 0.72),
    todayHex: preset.todayHex ?? preset.headerHex,
    todayAltHex: preset.todayAltHex ?? mix(preset.swatch, '#ffffff', 0.62),
  };
}

export function colorFromLetter(controllerProgram) {
  const letter = (controllerProgram ?? '').toString().trim().toUpperCase()[0];
  return LETTER_TO_COLOR[letter] ?? null;
}

export function getThemeByColor(colorId, letter = '') {
  const code = (letter ?? '').toString().trim().toUpperCase().slice(0, 2);
  if (isHexColor(colorId)) return themeFromHex(colorId, code);
  const preset = PRESET_BY_ID[colorId] ?? FALLBACK;
  return withSurfaceHexes(preset, code);
}

export function getProgramTheme(program) {
  if (program == null || typeof program === 'string') {
    const letter = program;
    return getThemeByColor(colorFromLetter(letter), letter);
  }
  const letter = program.controller_program;
  return getThemeByColor(program.color || colorFromLetter(letter), letter);
}

export function getZoneTheme(zone, program) {
  const letter = program?.controller_program;
  const colorId = zone?.color || program?.color || colorFromLetter(letter);
  return getThemeByColor(colorId, letter);
}
