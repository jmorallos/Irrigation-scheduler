import { useState, useRef } from 'react';
import { Download, Upload, Trash2, Monitor, Sun, Moon } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { programsRepository } from '../db/programsRepository';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { resetDBInstance } from '../db/database';

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  if (theme === 'system') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.matches) root.classList.add('dark');
    else root.classList.remove('dark');
  }
  localStorage.setItem('theme', theme);
}

export default function Settings() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') ?? 'system');
  const [confirmClear, setConfirmClear] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const fileRef = useRef(null);

  const handleTheme = (t) => { setTheme(t); applyTheme(t); };

  const exportData = async () => {
    const programs = await programsRepository.getAll();
    const zones = await zonesRepository.getAll();
    const schedules = await schedulesRepository.getAll();
    const data = { version: 1, exported_at: new Date().toISOString(), programs, zones, schedules };
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

  const importData = async (file) => {
    setImportError(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version || !Array.isArray(data.programs) || !Array.isArray(data.zones) || !Array.isArray(data.schedules)) {
        throw new Error('Invalid backup file format.');
      }
      await programsRepository.clear();
      await zonesRepository.clear();
      await schedulesRepository.clear();
      for (const p of data.programs) await programsRepository.putRaw(p);
      for (const z of data.zones) await zonesRepository.putRaw(z);
      for (const s of data.schedules) await schedulesRepository.putRaw(s);
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
    } catch (err) {
      setImportError(err.message);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const clearAll = async () => {
    await schedulesRepository.clear();
    await zonesRepository.clear();
    await programsRepository.clear();
    resetDBInstance();
    setConfirmClear(false);
  };

  const THEMES = [
    { value: 'system', label: 'System', icon: Monitor },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      </div>

      <div className="space-y-4">
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Application</h2>
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-2.5">Theme</span>
            <div className="flex gap-2">
              {THEMES.map(t => (
                <button
                  key={t.value}
                  onClick={() => handleTheme(t.value)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${
                    theme === t.value
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-gray-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Data</h2>
          <div className="space-y-3">
            {importSuccess && (
              <div className="px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                Data imported successfully.
              </div>
            )}
            {exportSuccess && (
              <div className="px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                Data exported successfully.
              </div>
            )}
            {importError && (
              <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                Import failed: {importError}
              </div>
            )}
            <button
              onClick={exportData}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-slate-50 hover:bg-slate-100 border border-gray-200 rounded-xl text-sm font-medium text-slate-700 transition-colors text-left"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Export Data
              <span className="ml-auto text-xs text-slate-400">Save as JSON</span>
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-slate-50 hover:bg-slate-100 border border-gray-200 rounded-xl text-sm font-medium text-slate-700 transition-colors text-left"
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
              onChange={e => { const f = e.target.files?.[0]; if (f) importData(f); }}
            />
            <button
              onClick={() => setConfirmClear(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-sm font-medium text-red-600 transition-colors text-left"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Data
              <span className="ml-auto text-xs text-red-400">Cannot be undone</span>
            </button>
          </div>
        </section>
      </div>

      {confirmClear && (
        <ConfirmDialog
          title="Clear all data?"
          message="This will permanently delete all programs, zones, and schedules. This action cannot be undone."
          confirmLabel="Clear All Data"
          onConfirm={clearAll}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}
