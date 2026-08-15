import { loadMainScheduleRows } from './mainScheduleData';
import { formatDaysCompact, formatTime24, getEndTime } from './dateUtils';
import { getZoneShortName } from './scheduleUtils';
import { formatSoak } from './scheduleStats';

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildScheduleHtml(rows, { exportedAt = new Date() } = {}) {
  const dateLabel = exportedAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const count = rows.length;
  const body = count === 0
    ? '<tr><td colspan="10" class="empty">No active schedules.</td></tr>'
    : rows.map(row => {
      const bg = row.theme?.rowHex || '#ffffff';
      const border = row.theme?.borderHex || '#e2e8f0';
      const badge = row.programTheme?.badgeHex || row.theme?.badgeHex || '#0a2540';
      const code = escapeHtml(row.program?.controller_program || '');
      const name = escapeHtml(row.program?.name || '');
      const notes = escapeHtml(row.schedule?.notes || '—');
      const days = escapeHtml(formatDaysCompact(row.schedule?.days_of_week ?? []));
      const zoneName = escapeHtml(getZoneShortName(row.zone) || '—');
      const start = escapeHtml(formatTime24(row.schedule?.start_time));
      const duration = Number(row.schedule?.duration_minutes || 0);
      const end = escapeHtml(formatTime24(getEndTime(row.schedule?.start_time, duration)));
      const soak = escapeHtml(formatSoak(row.soakHours));
      const runtime = row.dailyRuntime ?? '—';
      const zoneNum = row.zoneNumber ?? '—';
      return `<tr style="background:${bg};border-bottom:1px solid ${border}">
          <td><span class="badge" style="background:${badge}">${code || '—'}</span> ${name}</td>
          <td class="mono">${days || '—'}</td>
          <td class="mono">${escapeHtml(zoneNum)}</td>
          <td>${zoneName}</td>
          <td class="mono start">${start}</td>
          <td class="mono">${escapeHtml(duration)}</td>
          <td class="mono">${end}</td>
          <td class="mono">${soak}</td>
          <td>${notes}</td>
          <td class="mono">${escapeHtml(runtime)}</td>
        </tr>`;
    }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Irrigation Schedule</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: "Segoe UI", system-ui, sans-serif;
      color: #0a2540;
      background: #fff;
    }
    h1 { margin: 0; font-size: 22px; }
    .meta { margin: 6px 0 18px; color: #64748b; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th {
      background: #0a2540;
      color: #fff;
      text-align: left;
      font-size: 11px;
      letter-spacing: .06em;
      text-transform: uppercase;
      padding: 10px 8px;
      white-space: nowrap;
    }
    td { padding: 9px 8px; vertical-align: middle; }
    .mono { font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; }
    .start { font-weight: 700; }
    .badge {
      display: inline-block;
      min-width: 1.6em;
      padding: 2px 7px;
      margin-right: 6px;
      border-radius: 6px;
      color: #fff;
      font-weight: 700;
      font-size: 12px;
      text-align: center;
    }
    .empty { text-align: center; color: #64748b; padding: 28px 8px; }
    @page { size: landscape; margin: 10mm; }
    @media print {
      body { padding: 0; }
      h1 { font-size: 18px; }
      table { font-size: 12px; }
    }
  </style>
</head>
<body>
  <h1>Irrigation Schedule</h1>
  <p class="meta">${escapeHtml(dateLabel)} · ${count} cycle${count === 1 ? '' : 's'} · printable sheet (not a restore backup)</p>
  <table>
    <thead>
      <tr>
        <th>Program</th>
        <th>Days</th>
        <th>Zone #</th>
        <th>Zone Name</th>
        <th>Start</th>
        <th>Duration</th>
        <th>End</th>
        <th>Soak (hrs)</th>
        <th>Notes</th>
        <th>Daily runtime</th>
      </tr>
    </thead>
    <tbody>
      ${body}
    </tbody>
  </table>
</body>
</html>`;
}

export function downloadScheduleHtml(html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, `irrigation-schedule-${new Date().toISOString().slice(0, 10)}.html`);
}

export function openScheduleHtml(html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank', 'noopener');
  if (!win) {
    URL.revokeObjectURL(url);
    throw new Error('Pop-up blocked. Use Download HTML instead, then open the file.');
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function exportPrintableSchedule({ open = false } = {}) {
  const rows = await loadMainScheduleRows();
  const html = buildScheduleHtml(rows);
  if (open) openScheduleHtml(html);
  else downloadScheduleHtml(html);
  return rows.length;
}
