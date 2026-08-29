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

export function sumGallons(values) {
  let total = 0;
  let count = 0;
  for (const value of values) {
    if (value == null || !Number.isFinite(value)) continue;
    total += value;
    count += 1;
  }
  return count > 0 ? total : null;
}

/** Gallons for one cycle across each scheduled weekday in the week. */
export function gallonsForWeek(gph, durationMinutes, daysOfWeek = []) {
  const perRun = gallonsForRun(gph, durationMinutes);
  if (perRun == null || daysOfWeek.length === 0) return null;
  return perRun * daysOfWeek.length;
}

export function gallonLabel(value, period = 'day', dayPhrase = 'today') {
  const formatted = formatGallons(value);
  if (!formatted) return null;
  if (period === 'week') return `${formatted} / week`;
  if (dayPhrase && dayPhrase !== 'today') return `${formatted} ${dayPhrase}`;
  return `${formatted} today`;
}
