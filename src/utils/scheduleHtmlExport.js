import { loadScheduleExportData, normalizeExportData, summarizeRows, dayKeyFromDate, programBadgeHex } from './scheduleExportData';
import { DAY_ORDER, DAY_LABELS, formatDaysCompact, formatTime24, getEndTime } from './dateUtils';
import { getZoneDisplayName, getZoneShortName } from './scheduleUtils';
import { formatSoak, soakMinutesFromHours, withDailyRuntimeOnce, scheduleTableTotals } from './scheduleStats';
import { getProgramTheme, getZoneTheme, contrastBadgeText, badgeEdgeColor } from './programColors';
import { effectiveScheduleDays, isIntervalProgram } from './wateringCalendar';

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

function badgeHtml(code, color) {
  const bg = color || '#0a2540';
  const text = contrastBadgeText(bg);
  const edge = badgeEdgeColor(bg);
  const edgeStyle = edge ? `;box-shadow:inset 0 0 0 1px ${edge}` : '';
  return `<span class="badge" style="background:${bg};color:${text}${edgeStyle}">${escapeHtml(code || '—')}</span>`;
}

function renderOverview(summary) {
  const stats = [
    ['Programs', summary.programCount],
    ['Valves', summary.zoneCount],
    ['Cycles', summary.cycleCount],
    ['Daily minutes', summary.dailyMinutes],
    ['Weekly minutes', summary.weekMinutes],
  ];
  return `<div class="stats">
    ${stats.map(([label, value]) => `
      <div class="stat">
        <div class="label">${label}</div>
        <div class="value mono">${escapeHtml(value)}</div>
      </div>`).join('')}
  </div>`;
}

function renderMainTable(rows) {
  const displayRows = withDailyRuntimeOnce(rows);
  const totals = scheduleTableTotals(displayRows);
  const body = displayRows.length === 0
    ? '<tr><td colspan="10" class="empty">No active schedules.</td></tr>'
    : displayRows.map(row => {
      const bg = row.theme?.rowHex || '#ffffff';
      const border = row.theme?.borderHex || '#e2e8f0';
      const badge = programBadgeHex(row.program, row.programTheme);
      const code = row.program?.controller_program || '';
      const name = escapeHtml(row.program?.name || '');
      const notes = escapeHtml(row.schedule?.notes || '—');
      const days = escapeHtml(formatDaysCompact(
        isIntervalProgram(row.program)
          ? effectiveScheduleDays(row.program, row.schedule)
          : (row.schedule?.days_of_week ?? []),
      ));
      const zoneName = escapeHtml(getZoneShortName(row.zone) || '—');
      const start = escapeHtml(formatTime24(row.schedule?.start_time));
      const duration = Number(row.schedule?.duration_minutes || 0);
      const end = escapeHtml(formatTime24(getEndTime(row.schedule?.start_time, duration)));
      const soakMin = row.soakHours == null ? '—' : soakMinutesFromHours(row.soakHours);
      const runtime = row.showDailyRuntime && row.dailyRuntime != null ? row.dailyRuntime : '—';
      const zoneNum = row.zoneNumber ?? '—';
      return `<tr style="background:${bg};border-bottom:1px solid ${border}">
          <td>${badgeHtml(code, badge)} ${name}</td>
          <td class="mono">${escapeHtml(zoneNum)}</td>
          <td>${zoneName}</td>
          <td class="mono start">${start}</td>
          <td class="mono">${end}</td>
          <td class="mono">${escapeHtml(duration)}</td>
          <td class="mono">${escapeHtml(soakMin)}</td>
          <td class="mono">${escapeHtml(runtime)}</td>
          <td class="mono">${days || '—'}</td>
          <td>${notes}</td>
        </tr>`;
    }).join('');

  const footer = displayRows.length === 0
    ? ''
    : `<tfoot>
      <tr>
        <td colspan="5"><strong>Total</strong></td>
        <td class="mono"><strong>${escapeHtml(totals.durationTotal)}</strong></td>
        <td class="mono">—</td>
        <td class="mono"><strong>${escapeHtml(totals.dailyRuntimeTotal)}</strong></td>
        <td colspan="2"></td>
      </tr>
    </tfoot>`;

  return `<table>
    <thead>
      <tr>
        <th>Program</th>
        <th>Valve #</th>
        <th>Valve Name</th>
        <th>Start</th>
        <th>End</th>
        <th>Duration (Min)</th>
        <th>Soak (Min)</th>
        <th>Daily runtime (Min)</th>
        <th>Days</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
    ${footer}
  </table>`;
}

function renderZoneRuntime(zoneRows) {
  if (zoneRows.length === 0) return '';
  const body = zoneRows.map(item => {
    const bg = item.theme?.rowHex || '#ffffff';
    const border = item.theme?.borderHex || '#e2e8f0';
    const badge = programBadgeHex(item.program, item.programTheme);
    const days = formatDaysCompact([...item.days]);
    return `<tr style="background:${bg};border-bottom:1px solid ${border}">
      <td>${badgeHtml(item.program?.controller_program || '', badge)} ${escapeHtml(item.program?.name || '')}</td>
      <td class="mono">${escapeHtml(item.zoneNumber ?? '—')}</td>
      <td>${escapeHtml(getZoneShortName(item.zone) || '—')}</td>
      <td class="mono">${escapeHtml(days || '—')}</td>
      <td class="mono">${escapeHtml(item.cycles)}</td>
      <td class="mono">${escapeHtml(item.dailyRuntime ?? '—')}</td>
      <td class="mono">${escapeHtml(item.weekMinutes)}</td>
      <td class="mono">${escapeHtml(formatSoak(item.soakHours))}</td>
    </tr>`;
  }).join('');

  return `<section>
    <h2>Runtime by valve</h2>
    <p class="note">Daily minutes are the cycle total on a watering day. Weekly minutes multiply each cycle by the days it runs.</p>
    <table>
      <thead>
        <tr>
          <th>Program</th>
          <th>Valve #</th>
          <th>Valve Name</th>
          <th>Days</th>
          <th>Cycles</th>
          <th>Daily min</th>
          <th>Weekly min</th>
          <th>Soak (hrs)</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </section>`;
}

function renderMinutesByDay(minutesByDay, todayKey) {
  const total = DAY_ORDER.reduce((sum, day) => sum + (minutesByDay[day] || 0), 0);
  if (total === 0) return '';
  return `<section>
    <h2>Minutes by day</h2>
    <table>
      <thead>
        <tr>
          ${DAY_ORDER.map(day => `<th class="center${day === todayKey ? ' today' : ''}">${DAY_LABELS[day]}</th>`).join('')}
          <th class="center">Week</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          ${DAY_ORDER.map(day => `<td class="mono center${day === todayKey ? ' today' : ''}">${minutesByDay[day] || 0}</td>`).join('')}
          <td class="mono center start">${total}</td>
        </tr>
      </tbody>
    </table>
  </section>`;
}

function renderWeeklyGrid(groups, todayKey) {
  if (!groups.length) return '';

  const body = groups.map((group, gi) => {
    const theme = getProgramTheme(group.program);
    const header = `<tr class="${gi > 0 ? 'program-gap' : ''}">
      <td class="zone" style="background:${theme.headerHex}">
        ${badgeHtml(group.program?.controller_program || '', theme.badgeHex)} ${escapeHtml(group.program?.name || '')}
      </td>
      ${DAY_ORDER.map(day => `<td style="background:${day === todayKey ? theme.todayHex : theme.headerHex}"></td>`).join('')}
    </tr>`;

    const zoneRows = group.rows.map((row, ri) => {
      const zoneTheme = getZoneTheme(row.zone, group.program);
      const rowHex = ri % 2 === 1 ? zoneTheme.rowAltHex : zoneTheme.rowHex;
      const todayHex = ri % 2 === 1 ? zoneTheme.todayAltHex : zoneTheme.todayHex;
      const name = getZoneDisplayName(row.zone, group.program?.name);
      const off = row.zone?.status === 'inactive' ? ' <span class="off">(off)</span>' : '';
      const cells = DAY_ORDER.map(day => {
        const cycles = row.days?.[day] ?? [];
        const bg = day === todayKey ? todayHex : rowHex;
        if (cycles.length === 0) {
          return `<td class="center" style="background:${bg}"><span class="blank">—</span></td>`;
        }
        const list = cycles.map(sched => {
          const duration = Number(sched.duration_minutes || 0);
          const start = formatTime24(sched.start_time);
          const end = formatTime24(getEndTime(sched.start_time, duration));
          return `<div class="cycle">
            <span class="start mono">${escapeHtml(start)}</span>
            <span class="end mono">${escapeHtml(end)}</span>
          </div>`;
        }).join('');
        return `<td class="center" style="background:${bg}">${list}</td>`;
      }).join('');

      return `<tr>
        <td class="zone" style="background:${rowHex}">${escapeHtml(name)}${off}</td>
        ${cells}
      </tr>`;
    }).join('');

    return header + zoneRows;
  }).join('');

  return `<section>
    <h2>By week</h2>
    <table class="week">
      <thead>
        <tr>
          <th>Valve</th>
          ${DAY_ORDER.map(day => `<th class="center${day === todayKey ? ' today' : ''}">${DAY_LABELS[day]}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </section>`;
}

export function buildScheduleHtml(rowsOrData, options = {}) {
  const { rows, groups, exportedAt, catalogValveCount } = normalizeExportData(rowsOrData, options);
  const dateLabel = exportedAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const todayKey = dayKeyFromDate(exportedAt);
  const summary = summarizeRows(rows);
  if (catalogValveCount != null) summary.zoneCount = catalogValveCount;
  const count = rows.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Irrigation Schedule</title>
  <style>
    * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }
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
    h2 { margin: 28px 0 10px; font-size: 16px; }
    .meta { margin: 6px 0 16px; color: #000; font-size: 13px; }
    .note { margin: 0 0 10px; color: #000; font-size: 12px; }
    .stats { display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 18px; }
    .stat {
      min-width: 108px;
      padding: 10px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .stat .label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: #000;
    }
    .stat .value { margin-top: 4px; font-size: 20px; font-weight: 700; }
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
    .center { text-align: center; }
    .today { box-shadow: inset 0 -3px 0 #38bdf8; }
    .badge {
      display: inline-block;
      min-width: 1.6em;
      padding: 2px 7px;
      margin-right: 6px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      text-align: center;
    }
    .empty { text-align: center; color: #000; padding: 28px 8px; }
    .week td { vertical-align: top; }
    .week .zone { text-align: left; font-weight: 600; white-space: nowrap; }
    .week .blank { color: #000; }
    .week .off { color: #000; font-weight: 500; }
    .cycle + .cycle { margin-top: 8px; }
    .cycle .end { display: block; font-size: 11px; color: #000; font-weight: 500; }
    .program-gap td { border-top: 8px solid #fff; }
    .keep { break-inside: avoid; }
    @page { size: landscape; margin: 10mm; }
    @media print {
      body { padding: 0; }
      h1 { font-size: 18px; }
      table { font-size: 12px; }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <h1>Irrigation Schedule</h1>
  <p class="meta">${escapeHtml(dateLabel)} · ${count} cycle${count === 1 ? '' : 's'} · printable sheet (not a restore backup)</p>
  <div class="keep">
    ${renderOverview(summary)}
  </div>
  <h2>Schedule</h2>
  ${renderMainTable(rows)}
  <div class="keep">
    ${renderZoneRuntime(summary.zoneRows)}
  </div>
  <div class="keep">
    ${renderMinutesByDay(summary.minutesByDay, todayKey)}
  </div>
  ${renderWeeklyGrid(groups, todayKey)}
</body>
</html>`;
}

export function downloadScheduleHtml(html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, `irrigation-schedule-${new Date().toISOString().slice(0, 10)}.html`);
}

export function openScheduleHtml(html, previewWindow) {
  const win = previewWindow && !previewWindow.closed
    ? previewWindow
    : window.open('', '_blank');
  if (!win) {
    throw new Error('Pop-up blocked. Use Export printable schedule instead, then open the file.');
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

export async function exportPrintableSchedule({ open = false, previewWindow = null } = {}) {
  const data = await loadScheduleExportData();
  const html = buildScheduleHtml({
    rows: data.rows,
    groups: data.groups,
    catalogValveCount: data.catalogValveCount,
    exportedAt: data.exportedAt,
  });
  if (open) openScheduleHtml(html, previewWindow);
  else downloadScheduleHtml(html);
  return data.rows.length;
}
