import { useState, useRef, useEffect } from 'react';
import { Download, Upload, Trash2, Sprout, X, FileText, ExternalLink } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { programsRepository } from '../db/programsRepository';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { mediaRepository } from '../db/mediaRepository';
import { resetDBInstance } from '../db/database';
import { cleanupDuplicatePrograms } from '../db/cleanupDuplicates';
import { loadSampleData } from '../db/seedData';
import { blobToBase64 } from '../utils/imageUtils';
import {
  parseBackupFile,
  validateBackup,
  snapshotAllData,
  restoreSnapshot,
  applyBackup,
  serializeSaves,
  clearLiveData,
} from '../utils/backupUtils';
import { exportPrintableSchedule } from '../utils/scheduleHtmlExport';

const BACKUP_VERSION = 3;
const IMPORT_NOTICE_KEY = 'irrigation-import-notice';

function missingPhotoMessage(count) {
  if (count === 1) {
    return "Your schedule imported. One photo wasn't in this backup, so that item will show a letter until you add a photo again.";
  }
  return `Your schedule imported. ${count} photos weren't in this backup, so those items will show a letter until you add a photo again.`;
}

export default function Settings() {
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [htmlSuccess, setHtmlSuccess] = useState(null);
  const [htmlError, setHtmlError] = useState(null);
  const [sampleError, setSampleError] = useState(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [importNotice, setImportNotice] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(IMPORT_NOTICE_KEY);
    if (!raw) return;
    sessionStorage.removeItem(IMPORT_NOTICE_KEY);
    const count = Number(raw);
    if (count > 0) setImportNotice(count);
  }, []);

  const exportData = async () => {
    const programs = await programsRepository.getAll();
    const zones = await zonesRepository.getAll();
    const schedules = await schedulesRepository.getAll();
    const mediaRecords = await mediaRepository.getAll();
    const saves = await serializeSaves((await snapshotAllData()).saves);
    const media = await Promise.all(
      mediaRecords.map(async record => ({
        id: record.id,
        owner_type: record.owner_type,
        owner_id: record.owner_id,
        mime_type: record.mime_type,
        size_bytes: record.size_bytes,
        updated_at: record.updated_at,
        data_base64: await blobToBase64(record.blob),
      })),
    );
    const data = {
      version: BACKUP_VERSION,
      exported_at: new Date().toISOString(),
      programs,
      zones,
      schedules,
      media,
      saves,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `irrigation-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const handleFileSelect = async (file) => {
    setImportError(null);
    try {
      if (/\.html?$/i.test(file.name) || file.type === 'text/html') {
        throw new Error('This is a printable schedule, not a backup. Import only accepts JSON backups.');
      }
      const text = await file.text();
      const data = validateBackup(parseBackupFile(text));
      setPendingImport({ data, fileName: file.name });
    } catch (err) {
      setImportError(err.message);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const confirmImport = async () => {
    if (!pendingImport || importing) return;
    setImporting(true);
    setImportError(null);
    const snapshot = await snapshotAllData();

    try {
      const result = await applyBackup(pendingImport.data);
      await cleanupDuplicatePrograms();
      if (result.missingPhotos > 0) {
        sessionStorage.setItem(IMPORT_NOTICE_KEY, String(result.missingPhotos));
      }
      resetDBInstance();
      setPendingImport(null);
      window.location.reload();
    } catch (err) {
      try {
        await restoreSnapshot(snapshot);
        resetDBInstance();
      } catch {
        setImportError(`${err.message}. Could not restore previous data — try refreshing the page.`);
        setPendingImport(null);
        setImporting(false);
        return;
      }
      setImportError(err.message);
      setPendingImport(null);
    } finally {
      setImporting(false);
    }
  };

  const clearAll = async () => {
    try {
      await clearLiveData();
      resetDBInstance();
      setConfirmClear(false);
      window.location.reload();
    } catch (err) {
      setImportError(err.message);
      setConfirmClear(false);
    }
  };

  const handleLoadSample = async () => {
    setSampleError(null);
    setSampleLoading(true);
    try {
      await loadSampleData();
      window.location.reload();
    } catch (err) {
      setSampleError(err.message);
    } finally {
      setSampleLoading(false);
    }
  };

  const handleHtmlExport = async (open) => {
    setHtmlError(null);
    setHtmlSuccess(null);
    const previewWindow = open ? window.open('', '_blank') : null;
    if (open && !previewWindow) {
      setHtmlError('Pop-up blocked. Use Export printable schedule instead, then open the file.');
      return;
    }
    try {
      await exportPrintableSchedule({ open, previewWindow });
      setHtmlSuccess(open ? 'Opened in a new tab.' : 'Printable schedule downloaded.');
      setTimeout(() => setHtmlSuccess(null), 3000);
    } catch (err) {
      if (previewWindow && !previewWindow.closed) previewWindow.close();
      setHtmlError(err.message);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Settings</h1>
      </div>

      <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Data</h2>
        <div className="space-y-3">
          {sampleError && (
            <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {sampleError}
            </div>
          )}
          {importNotice > 0 && (
            <div className="flex items-start gap-3 px-4 py-2.5 bg-sky-50 border border-sky-200 rounded-lg text-sm text-navy-900">
              <p className="flex-1">{missingPhotoMessage(importNotice)}</p>
              <button
                type="button"
                onClick={() => setImportNotice(null)}
                className="p-0.5 text-slate-400 hover:text-navy-900 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {exportSuccess && (
            <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              Backup downloaded. Import that JSON file later to restore this app.
            </div>
          )}
          {htmlSuccess && (
            <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              {htmlSuccess}
            </div>
          )}
          {htmlError && (
            <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {htmlError}
            </div>
          )}
          {importError && (
            <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              Import failed: {importError}
            </div>
          )}
          <p className="text-sm text-slate-500">
            How to use: Export Data → file in Downloads → Import that file later. HTML is a printable sheet only and cannot restore the app.
          </p>
          <button
            onClick={exportData}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface-alt hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-navy-900 transition-colors text-left"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            Export Data
            <span className="ml-auto text-xs text-slate-400">Save as JSON</span>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface-alt hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-navy-900 transition-colors text-left"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Import Data
            <span className="ml-auto text-xs text-slate-400">Restore from JSON</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
          />
          <button
            onClick={() => handleHtmlExport(false)}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface-alt hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-navy-900 transition-colors text-left"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            Export printable schedule
            <span className="ml-auto text-xs text-slate-400">HTML · cannot restore</span>
          </button>
          <button
            onClick={() => handleHtmlExport(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface-alt hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-navy-900 transition-colors text-left"
          >
            <ExternalLink className="w-4 h-4 text-slate-500" />
            Open printable schedule
            <span className="ml-auto text-xs text-slate-400">New tab</span>
          </button>
          <button
            onClick={handleLoadSample}
            disabled={sampleLoading}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface-alt hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-navy-900 transition-colors text-left disabled:opacity-60"
          >
            <Sprout className="w-4 h-4 text-slate-500" />
            Load Sample Data
            <span className="ml-auto text-xs text-slate-400">Empty app only</span>
          </button>
          <button
            onClick={() => setConfirmClear(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium text-red-600 transition-colors text-left"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Data
            <span className="ml-auto text-xs text-red-400">Cannot be undone</span>
          </button>
        </div>
      </section>

      {pendingImport && (
        <ConfirmDialog
          title="Import backup?"
          message={`This will replace all current programs, zones, schedules, and photos with the data from "${pendingImport.fileName}".`}
          detail={`Backup contains ${pendingImport.data.programs.length} program(s), ${pendingImport.data.zones.length} zone(s), ${pendingImport.data.schedules.length} schedule(s)${Array.isArray(pendingImport.data.saves) ? `, and ${pendingImport.data.saves.length} save(s)` : ''}.`}
          confirmLabel={importing ? 'Importing…' : 'Import'}
          onConfirm={confirmImport}
          onCancel={() => !importing && setPendingImport(null)}
        />
      )}

      {confirmClear && (
        <ConfirmDialog
          title="Clear all data?"
          message="This will permanently delete all programs, zones, schedules, and profile photos stored in this browser. Saved copies in Saves are kept."
          confirmLabel="Clear All Data"
          onConfirm={clearAll}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}
