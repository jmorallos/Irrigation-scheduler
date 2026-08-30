import { contrastBadgeText } from './programColors';

const NAVY = 'FF0A2540';
const WHITE = 'FFFFFFFF';
const SKY = 'FF38BDF8';

/** `#rrggbb` or `rrggbb` → Excel ARGB `FFRRGGBB`. */
export function hexToArgb(hex, fallback = 'FFFFFFFF') {
  if (!hex) return fallback;
  const raw = String(hex).replace('#', '').trim();
  if (raw.length === 3) {
    const expanded = raw.split('').map(ch => ch + ch).join('');
    return `FF${expanded.toUpperCase()}`;
  }
  if (raw.length === 6) return `FF${raw.toUpperCase()}`;
  return fallback;
}

export function headerFill() {
  return {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: NAVY },
  };
}

export function solidFill(hex) {
  return {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: hexToArgb(hex) },
  };
}

export function headerFont() {
  return {
    bold: true,
    color: { argb: WHITE },
    size: 11,
  };
}

export function badgeFont(hex) {
  return {
    bold: true,
    color: { argb: hexToArgb(contrastBadgeText(hex), NAVY) },
    size: 11,
  };
}

export function monoFont(bold = false) {
  return {
    bold,
    name: 'Consolas',
    size: 11,
  };
}

export function applyHeaderRow(row) {
  row.eachCell(cell => {
    cell.fill = headerFill();
    cell.font = headerFont();
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
  row.height = 22;
}

export function applyDataRowStyle(row, { rowHex, badgeHex, monoCols = [] }) {
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    if (colNumber === 1 && badgeHex) {
      cell.fill = solidFill(badgeHex);
      cell.font = badgeFont(badgeHex);
    } else {
      cell.fill = solidFill(rowHex || '#ffffff');
      cell.font = monoCols.includes(colNumber) ? monoFont() : { size: 11 };
    }
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  });
}

export function todayBottomBorder() {
  return {
    bottom: { style: 'medium', color: { argb: SKY } },
  };
}

export const SCHEDULE_SHEET = 'Schedule';
export const RUNTIME_SHEET = 'Runtime by valve';
export const MINUTES_SHEET = 'Minutes by day';
export const WEEK_SHEET = 'By week';
export const MAX_SCHEDULE_ROW = 500;

/** Schedule sheet column indices (1-based). */
export const SC = {
  program: 1,
  programName: 2,
  valveNum: 3,
  valveName: 4,
  gph: 5,
  start: 6,
  duration: 7,
  end: 8,
  gallons: 9,
  mon: 10,
  tue: 11,
  wed: 12,
  thu: 13,
  fri: 14,
  sat: 15,
  sun: 16,
  days: 17,
  weekGallons: 18,
  soak: 19,
  dailyRuntime: 20,
  notes: 21,
  valveKey: 22,
};

export const DAY_COL_INDEX = {
  mon: SC.mon,
  tue: SC.tue,
  wed: SC.wed,
  thu: SC.thu,
  fri: SC.fri,
  sat: SC.sat,
  sun: SC.sun,
};

export function colLetter(index) {
  let n = index;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export function scheduleRef(col, row) {
  return `${SCHEDULE_SHEET}!$${colLetter(col)}$${row}`;
}

export function scheduleRange(col, startRow = 2, endRow = MAX_SCHEDULE_ROW) {
  return `${SCHEDULE_SHEET}!$${colLetter(col)}$${startRow}:$${colLetter(col)}$${endRow}`;
}
