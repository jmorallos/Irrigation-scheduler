import { useState, useRef } from 'react';
import { Download, Upload, Trash2, Sprout } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { programsRepository } from '../db/programsRepository';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { mediaRepository } from '../db/mediaRepository';
import { resetDBInstance, deleteDatabase } from '../db/database';
import { cleanupDuplicatePrograms } from '../db/cleanupDuplicates';
import { loadSampleData } from '../db/seedData';
import { blobToBase64 } from '../utils/imageUtils';
import {
  parseBackupFile,
  validateBackup,
  snapshotAllData,
  restoreSnapshot,
  applyBackup,
} from '../utils/backupUtils';

const BACKUP_VERSION = 2;

export default function Settings() {
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [sampleError, setSampleError] = useState(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const fileRef = useRef(null);

  const exportData = async () => {
    const programs = await programsRepository.getAll();
    const zones = await zonesRepository.getAll();
    const schedules = await schedulesRepository.getAll();
    const mediaRecords = await mediaRepository.getAll();
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
      await applyBackup(pendingImport.data);
      await cleanupDuplicatePrograms();
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
      await deleteDatabase();
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Settings</h1>
      </div>

      <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Data</h2>
        <p className="text-xs text-slate-500 mb-4">
          All schedules are stored locally in this browser. Deploying an update does not reset your data.
        </p>
        <div className="space-y-3">
          {sampleError && (
            <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {sampleError}
            </div>
          )}
          {exportSuccess && (
            <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              Data exported successfully.
            </div>
          )}
          {importError && (
            <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              Import failed: {importError}
            </div>
          )}
          <button
            onClick={exportData}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface-alt hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-navy-900 transition-colors text-left"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export Data
            <span className="ml-auto text-xs text-slate-400">Save as JSON</span>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface-alt hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-navy-900 transition-colors text-left"
          >
            <Upload className="w-4 h-4 text-slate-500" />
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
          detail={`Backup contains ${pendingImport.data.programs.length} program(s), ${pendingImport.data.zones.length} zone(s), and ${pendingImport.data.schedules.length} schedule(s).`}
          confirmLabel={importing ? 'Importing…' : 'Import'}
          onConfirm={confirmImport}
          onCancel={() => !importing && setPendingImport(null)}
        />
      )}

      {confirmClear && (
        <ConfirmDialog
          title="Clear all data?"
          message="This will permanently delete all programs, zones, schedules, and profile photos stored in this browser. The app will stay empty after reload."
          confirmLabel="Clear All Data"
          onConfirm={clearAll}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}
