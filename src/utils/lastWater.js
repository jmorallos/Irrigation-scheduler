import { formatTime, formatDuration } from './dateUtils';
import { parseDateOnly, formatDisplayDate } from './programSchedule';

export function normalizeLastWaterDuration(value) {
  if (value == null || value === '') return null;
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes < 0) return null;
  return Math.round(minutes);
}

export function parseLastWaterTime(value) {
  if (value == null || value === '') return null;
  const text = String(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function normalizeLastWaterRecord(valve = {}) {
  const date = parseDateOnly(valve.last_water_date);
  const time = parseLastWaterTime(valve.last_water_time);
  const duration = normalizeLastWaterDuration(valve.last_water_duration_minutes);
  return {
    last_water_date: date,
    last_water_time: date ? time : null,
    last_water_duration_minutes: date ? duration : null,
  };
}

export function validateLastWaterFields(fields) {
  const errors = {};
  const date = parseDateOnly(fields.last_water_date);
  const time = parseLastWaterTime(fields.last_water_time);
  const durationRaw = fields.last_water_duration_minutes;
  const hasDuration = durationRaw != null && String(durationRaw).trim() !== '';
  const hasTime = fields.last_water_time != null && String(fields.last_water_time).trim() !== '';
  const hasDate = fields.last_water_date != null && String(fields.last_water_date).trim() !== '';

  if ((hasTime || hasDuration) && !hasDate) {
    errors.last_water_date = 'Date is required when time or duration is set.';
  }
  if (hasDate && !date) {
    errors.last_water_date = 'Enter a valid date.';
  }
  if (hasTime && !time) {
    errors.last_water_time = 'Enter a valid time.';
  }
  if (hasDuration) {
    const duration = normalizeLastWaterDuration(durationRaw);
    if (duration == null) errors.last_water_duration_minutes = 'Enter valid minutes (0 or higher).';
  }

  return errors;
}

export function lastWaterPayload(fields) {
  return normalizeLastWaterRecord({
    last_water_date: fields.last_water_date,
    last_water_time: fields.last_water_time,
    last_water_duration_minutes: fields.last_water_duration_minutes,
  });
}

export function initialLastWaterFields(valve) {
  const record = normalizeLastWaterRecord(valve ?? {});
  return {
    last_water_date: record.last_water_date ?? '',
    last_water_time: record.last_water_time ?? '',
    last_water_duration_minutes: record.last_water_duration_minutes ?? '',
  };
}

export function hasLastWater(valve) {
  return Boolean(normalizeLastWaterRecord(valve).last_water_date);
}

export function formatLastWater(valve) {
  const record = normalizeLastWaterRecord(valve);
  if (!record.last_water_date) return null;

  const parts = [formatDisplayDate(record.last_water_date)];
  if (record.last_water_time) parts.push(formatTime(record.last_water_time));
  if (record.last_water_duration_minutes != null) {
    parts.push(formatDuration(record.last_water_duration_minutes));
  }
  return parts.join(' · ');
}
