import { DAY_ORDER, DAY_LABELS, formatDaysCompact, getEndTime } from './dateUtils';
import { getZoneDisplayName, getZoneShortName, getZoneNumber } from './scheduleUtils';
import { loadScheduleExportData, programBadgeHex } from './scheduleExportData';
import { getProgramTheme, getZoneTheme } from './programColors';
import {
  SC,
  SCHEDULE_SHEET,
  RUNTIME_SHEET,
  MINUTES_SHEET,
  WEEK_SHEET,
  MAX_SCHEDULE_ROW,
  DAY_COL_INDEX,
  colLetter,
  scheduleRange,
  applyHeaderRow,
  applyDataRowStyle,
  headerFont,
  headerFill,
  solidFill,
  monoFont,
  todayBottomBorder,
} from './xlsxTheme';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function timeStringToFraction(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return ((h || 0) * 60 + (m || 0)) / 1440;
}

function buildDaysFormula(row) {
  const specs = [
    ['J', 'M'],
    ['K', 'T'],
    ['L', 'W'],
    ['M', 'Th'],
    ['N', 'F'],
    ['O', 'Sa'],
    ['P', 'Su'],
  ];
  return specs.map(([col, label], index) => {
    if (index === 0) return `IF(${col}${row}=1,"${label}","")`;
    const prev = specs.slice(0, index).map(([c]) => `${c}${row}=1`).join(',');
    return `IF(${col}${row}=1,IF(OR(${prev}),"-${label}","${label}"),"")`;
  }).join('&');
}

function buildSoakFormula(row) {
  if (row <= 2) {
    return `IF(OR(V${row}<>V${row - 1},SUMPRODUCT(J${row}:P${row},J${row - 1}:P${row - 1})=0),"",IF(AND(H${row - 1}<>"",F${row}<>""),IF((F${row}-H${row - 1})*1440<0,(F${row}-H${row - 1})*1440+1440,(F${row}-H${row - 1})*1440),""))`;
  }
  return `IF(OR(V${row}<>V${row - 1},SUMPRODUCT(J${row}:P${row},J${row - 1}:P${row - 1})=0),"",IF(AND(H${row - 1}<>"",F${row}<>""),IF((F${row}-H${row - 1})*1440<0,(F${row}-H${row - 1})*1440+1440,(F${row}-H${row - 1})*1440),""))`;
}

function buildDailyRuntimeFormula(row, lastDataRow) {
  return `IF(OR(V${row}<>V${row + 1},ROW()=${lastDataRow}),SUMIF($V$2:$V$${lastDataRow},V${row},$G$2:$G$${lastDataRow}),"")`;
}

function buildWeekCellFormula(scheduleRows, dayKey) {
  const dayCol = colLetter(DAY_COL_INDEX[dayKey]);
  if (scheduleRows.length === 0) return null;
  const parts = scheduleRows.map(r => (
    `IF(${SCHEDULE_SHEET}!$${dayCol}$${r}=1,TEXT(${SCHEDULE_SHEET}!$F$${r},"h:mm AM/PM")&CHAR(10)&TEXT(${SCHEDULE_SHEET}!$H$${r},"h:mm AM/PM"),"")`
  ));
  return parts.join('&');
}

const SCHEDULE_HEADERS = [
  'Program',
  'Program Name',
  'Valve #',
  'Valve Name',
  'GPH',
  'Start',
  'Duration (Min)',
  'End',
  'Gallons',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
  'Days',
  'Gal / Week',
  'Soak (Min)',
  'Daily runtime (Min)',
  'Notes',
  'ValveKey',
];

function buildScheduleSheet(workbook, rows) {
  const sheet = workbook.addWorksheet(SCHEDULE_SHEET);
  const headerRow = sheet.addRow(SCHEDULE_HEADERS);
  applyHeaderRow(headerRow);

  const scheduleRowIndex = new Map();
  const lastDataRow = rows.length > 0 ? rows.length + 1 : 1;

  rows.forEach((row, index) => {
    const excelRow = index + 2;
    const days = row.schedule?.days_of_week ?? [];
    const valveKey = `${row.program?.controller_program ?? ''}|${row.zoneNumber ?? ''}`;
    scheduleRowIndex.set(row.id ?? row.schedule?.id ?? `row-${excelRow}`, excelRow);

    const dataRow = sheet.addRow([
      row.program?.controller_program ?? '',
      row.program?.name ?? '',
      row.zoneNumber ?? '',
      getZoneShortName(row.zone) ?? '',
      row.zone?.gph ?? '',
      timeStringToFraction(row.schedule?.start_time),
      Number(row.schedule?.duration_minutes) || 0,
      null,
      null,
      days.includes('mon') ? 1 : 0,
      days.includes('tue') ? 1 : 0,
      days.includes('wed') ? 1 : 0,
      days.includes('thu') ? 1 : 0,
      days.includes('fri') ? 1 : 0,
      days.includes('sat') ? 1 : 0,
      days.includes('sun') ? 1 : 0,
      null,
      null,
      null,
      null,
      row.schedule?.notes ?? '',
      null,
    ]);

    const badge = programBadgeHex(row.program, row.programTheme);
    applyDataRowStyle(dataRow, {
      rowHex: row.theme?.rowHex || '#ffffff',
      badgeHex: badge,
      monoCols: [SC.valveNum, SC.start, SC.duration, SC.end, SC.gallons, SC.weekGallons, SC.soak, SC.dailyRuntime],
    });

    dataRow.getCell(SC.start).numFmt = 'hh:mm';
    dataRow.getCell(SC.end).numFmt = 'hh:mm';

    dataRow.getCell(SC.end).value = { formula: `IF(F${excelRow}="","",MOD(F${excelRow}+G${excelRow}/1440,1))` };
    dataRow.getCell(SC.gallons).value = { formula: `IF(E${excelRow}="","",E${excelRow}/60*G${excelRow})` };
    dataRow.getCell(SC.days).value = { formula: buildDaysFormula(excelRow) };
    dataRow.getCell(SC.weekGallons).value = { formula: `IF(E${excelRow}="","",I${excelRow}*SUM(J${excelRow}:P${excelRow}))` };
    dataRow.getCell(SC.soak).value = { formula: buildSoakFormula(excelRow) };
    dataRow.getCell(SC.dailyRuntime).value = { formula: buildDailyRuntimeFormula(excelRow, lastDataRow) };
    dataRow.getCell(SC.valveKey).value = { formula: `A${excelRow}&"|"&C${excelRow}` };
  });

  if (rows.length > 0) {
    const totalRowNum = lastDataRow + 1;
    const totalRow = sheet.addRow([
      'Total', '', '', '', '', '',
      { formula: `SUM(G2:G${lastDataRow})` },
      '',
      { formula: `SUM(I2:I${lastDataRow})` },
      '', '', '', '', '', '', '',
      '',
      { formula: `SUM(R2:R${lastDataRow})` },
      '',
      { formula: `SUM(T2:T${lastDataRow})` },
      '',
      '',
    ]);
    totalRow.font = monoFont(true);
    totalRow.eachCell(cell => {
      cell.fill = solidFill('#f8fafc');
    });
  }

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: 'A1', to: `U${Math.max(lastDataRow, 1)}` };
  sheet.getColumn(SC.valveKey).hidden = true;

  const widths = [8, 18, 8, 16, 8, 10, 14, 10, 10, 5, 5, 5, 5, 5, 5, 5, 12, 12, 12, 18, 24, 10];
  widths.forEach((width, i) => {
    sheet.getColumn(i + 1).width = width;
  });

  return { sheet, scheduleRowIndex, lastDataRow };
}

function buildRuntimeSheet(workbook, zoneRows, lastDataRow) {
  const sheet = workbook.addWorksheet(RUNTIME_SHEET);
  const headers = ['Program', 'Program Name', 'Valve #', 'Valve Name', 'ValveKey', 'Days', 'Cycles', 'Daily min', 'Weekly min', 'Soak (hrs)'];
  applyHeaderRow(sheet.addRow(headers));

  const vRange = scheduleRange(SC.valveKey, 2, lastDataRow);
  const gRange = scheduleRange(SC.duration, 2, lastDataRow);
  const daySum = DAY_ORDER.map(day => scheduleRange(DAY_COL_INDEX[day], 2, lastDataRow)).join('+');

  zoneRows.forEach(item => {
    const badge = programBadgeHex(item.program, item.programTheme);
    const valveKey = item.valveKey ?? `${item.program?.controller_program ?? ''}|${item.zoneNumber ?? ''}`;
    const rowNum = sheet.lastRow.number + 1;
    const days = formatDaysCompact([...item.days]);

    const dataRow = sheet.addRow([
      item.program?.controller_program ?? '',
      item.program?.name ?? '',
      item.zoneNumber ?? '',
      getZoneShortName(item.zone) ?? '',
      valveKey,
      days,
      { formula: `COUNTIF(${vRange},E${rowNum})` },
      { formula: `SUMIF(${vRange},E${rowNum},${gRange})` },
      { formula: `SUMPRODUCT((${vRange}=E${rowNum})*${gRange}*(${daySum}))` },
      { formula: `IFERROR(MAXIFS(${scheduleRange(SC.soak, 2, lastDataRow)},${vRange},E${rowNum})/60,"")` },
    ]);

    applyDataRowStyle(dataRow, {
      rowHex: item.theme?.rowHex || '#ffffff',
      badgeHex: badge,
      monoCols: [3, 7, 8, 9, 10],
    });
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  [8, 18, 8, 16, 12, 12, 8, 10, 12, 10].forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });
}

function buildMinutesByDaySheet(workbook, todayKey, lastDataRow) {
  const sheet = workbook.addWorksheet(MINUTES_SHEET);
  const headers = [...DAY_ORDER.map(day => DAY_LABELS[day]), 'Week'];
  const header = sheet.addRow(headers);
  applyHeaderRow(header);

  header.eachCell((cell, colNumber) => {
    const day = DAY_ORDER[colNumber - 1];
    if (day === todayKey) cell.border = todayBottomBorder();
  });

  const dayFormulas = DAY_ORDER.map(day => {
    const dayCol = scheduleRange(DAY_COL_INDEX[day], 2, lastDataRow);
    const gRange = scheduleRange(SC.duration, 2, lastDataRow);
    return { formula: `SUMPRODUCT(${gRange},${dayCol})` };
  });
  const weekFormula = { formula: `SUM(A2:${colLetter(DAY_ORDER.length)}2)` };

  const dataRow = sheet.addRow([...dayFormulas, weekFormula]);
  dataRow.font = monoFont(true);
  dataRow.eachCell((cell, colNumber) => {
    cell.fill = solidFill('#f8fafc');
    const day = DAY_ORDER[colNumber - 1];
    if (day === todayKey) cell.border = todayBottomBorder();
  });

  sheet.getColumn(DAY_ORDER.length + 1).width = 10;
  DAY_ORDER.forEach((_, i) => {
    sheet.getColumn(i + 1).width = 10;
  });
}

function buildByWeekSheet(workbook, groups, scheduleRowIndex, rows, todayKey) {
  const sheet = workbook.addWorksheet(WEEK_SHEET);
  const headers = ['Valve', ...DAY_ORDER.map(day => DAY_LABELS[day])];
  applyHeaderRow(sheet.addRow(headers));

  const headerRow = sheet.getRow(1);
  DAY_ORDER.forEach((day, i) => {
    if (day === todayKey) {
      headerRow.getCell(i + 2).border = todayBottomBorder();
    }
  });

  const rowsByValveDay = new Map();
  for (const row of rows) {
    const excelRow = scheduleRowIndex.get(row.id ?? row.schedule?.id ?? '');
    if (!excelRow) continue;
    const valveKey = `${row.program?.controller_program ?? ''}|${row.zoneNumber ?? ''}`;
    for (const day of row.schedule?.days_of_week ?? []) {
      const key = `${valveKey}|${day}`;
      if (!rowsByValveDay.has(key)) rowsByValveDay.set(key, []);
      rowsByValveDay.get(key).push(excelRow);
    }
  }

  groups.forEach((group, gi) => {
    const theme = getProgramTheme(group.program);
    const programRow = sheet.addRow([
      `${group.program?.controller_program ?? ''} ${group.program?.name ?? ''}`,
      ...DAY_ORDER.map(() => ''),
    ]);
    programRow.font = { bold: true, size: 11 };
    programRow.eachCell((cell, colNumber) => {
      const day = DAY_ORDER[colNumber - 2];
      const bg = day === todayKey ? theme.todayHex : theme.headerHex;
      cell.fill = solidFill(bg || '#f1f5f9');
      if (day === todayKey) cell.border = todayBottomBorder();
    });
    if (gi > 0) programRow.height = 24;

    group.rows.forEach((row, ri) => {
      const zoneTheme = getZoneTheme(row.zone, group.program);
      const rowHex = ri % 2 === 1 ? zoneTheme.rowAltHex : zoneTheme.rowHex;
      const todayHex = ri % 2 === 1 ? zoneTheme.todayAltHex : zoneTheme.todayHex;
      const valveKey = `${group.program?.controller_program ?? ''}|${getZoneNumber(row.zone) ?? ''}`;
      const name = getZoneDisplayName(row.zone, group.program?.name);

      const dataRow = sheet.addRow([name, ...DAY_ORDER.map(() => '')]);
      dataRow.getCell(1).value = row.zone?.status === 'inactive' ? `${name} (off)` : name;

      DAY_ORDER.forEach((day, dayIndex) => {
        const key = `${valveKey}|${day}`;
        const scheduleRows = rowsByValveDay.get(key) ?? [];
        const cell = dataRow.getCell(dayIndex + 2);
        const bg = day === todayKey ? todayHex : rowHex;
        cell.fill = solidFill(bg || '#ffffff');
        if (day === todayKey) cell.border = todayBottomBorder();
        cell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
        const formula = buildWeekCellFormula(scheduleRows, day);
        if (formula) cell.value = { formula: `=${formula}` };
      });

      dataRow.getCell(1).fill = solidFill(rowHex || '#ffffff');
      dataRow.getCell(1).font = { size: 11 };
    });
  });

  sheet.getColumn(1).width = 28;
  DAY_ORDER.forEach((_, i) => {
    sheet.getColumn(i + 2).width = 14;
  });
  sheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 1 }];
}

export function buildScheduleWorkbook(ExcelJS, data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Irrigation Scheduler';
  workbook.created = data.exportedAt;

  const { sheet: _sheet, scheduleRowIndex, lastDataRow } = buildScheduleSheet(workbook, data.rows);
  buildRuntimeSheet(workbook, data.summary.zoneRows, lastDataRow);
  buildMinutesByDaySheet(workbook, data.todayKey, lastDataRow);
  buildByWeekSheet(workbook, data.groups, scheduleRowIndex, data.rows, data.todayKey);

  return workbook;
}

export async function exportScheduleXlsx() {
  const ExcelJS = (await import('exceljs')).default;
  const data = await loadScheduleExportData();
  const workbook = buildScheduleWorkbook(ExcelJS, data);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `irrigation-schedule-${data.exportedAt.toISOString().slice(0, 10)}.xlsx`);
  return data.rows.length;
}

export { buildScheduleWorkbook as buildScheduleWorkbookForTest };
