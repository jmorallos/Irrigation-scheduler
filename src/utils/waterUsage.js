/** Optional catalog valve flow rate (gallons per hour). */
export function normalizeGph(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Gallons used for one run: GPH ÷ 60 × duration (minutes). */
export function gallonsForRun(gph, durationMinutes) {
  const rate = normalizeGph(gph);
  const minutes = Number(durationMinutes);
  if (rate == null || !Number.isFinite(minutes) || minutes <= 0) return null;
  return (rate / 60) * minutes;
}

export function formatGallons(gallons) {
  if (gallons == null || !Number.isFinite(gallons)) return null;
  const rounded = Math.round(gallons * 10) / 10;
  if (Number.isInteger(rounded)) return `${rounded} gal`;
  return `${rounded.toFixed(1)} gal`;
}

export function formatRunGallons(gph, durationMinutes) {
  return formatGallons(gallonsForRun(gph, durationMinutes));
}
