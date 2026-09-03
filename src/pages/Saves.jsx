import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Trash2, RotateCcw } from 'lucide-react';
import { useSaves } from '../hooks/useSaves';
import { usePrograms } from '../hooks/usePrograms';
import EmptyState from '../components/EmptyState';
import PageError from '../components/PageError';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import NestedScroll from '../components/NestedScroll';
import ProgramBadge from '../components/ProgramBadge';

function formatSavedAt(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function SaveSummary({ save }) {
  if (save.type === 'program') {
    const zones = save.summary?.zones ?? 0;
    const cycles = save.summary?.cycles ?? 0;
    return `${zones} valve${zones !== 1 ? 's' : ''} · ${cycles} cycle${cycles !== 1 ? 's' : ''}`;
  }
  const cycles = save.summary?.cycles ?? 0;
  const from = save.summary?.programName;
  return from
    ? `${cycles} cycle${cycles !== 1 ? 's' : ''} · from ${from}`
    : `${cycles} cycle${cycles !== 1 ? 's' : ''}`;
}

export default function Saves() {
  const navigate = useNavigate();
  const { saves, loading, error, reload, restoreProgram, restoreZone, deleteSave } = useSaves();
  const { programs } = usePrograms();
  const [deleting, setDeleting] = useState(null);
  const [restoringZone, setRestoringZone] = useState(null);
  const [restoreError, setRestoreError] = useState(null);
  const [restoreNotice, setRestoreNotice] = useState(null);

  const programsSaves = saves.filter(save => save.type === 'program');
  const zoneSaves = saves.filter(save => save.type === 'zone');

  const handleRestoreProgram = async (save) => {
    setRestoreError(null);
    setRestoreNotice(null);
    try {
      const { program, identical } = await restoreProgram(save);
      if (identical) {
        setRestoreNotice(`"${save.name}" is already on the live list.`);
        return;
      }
      navigate(`/programs/${program.id}`, { state: { program } });
    } catch (err) {
      setRestoreError(err.message);
    }
  };

  const handleRestoreZone = async (programId) => {
    if (!restoringZone) return;
    setRestoreError(null);
    setRestoreNotice(null);
    try {
      const { identical } = await restoreZone(restoringZone, programId);
      setRestoringZone(null);
      if (identical) {
        setRestoreNotice(`"${restoringZone.name}" is already in that program.`);
        return;
      }
      navigate(`/programs/${programId}`);
    } catch (err) {
      setRestoreError(err.message);
    }
  };

  if (loading) return <div className="py-16 text-center text-sm text-black">Loading saves…</div>;
  if (error) return <PageError message={`Could not load saves: ${error}`} onRetry={reload} />;

  return (
    <div className="min-w-0 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Saves</h1>
        <p className="text-sm text-black mt-1">Copies of programs and valves you can restore later.</p>
      </div>

      {restoreNotice && (
        <div className="mb-4 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          {restoreNotice}
        </div>
      )}

      {restoreError && (
        <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {restoreError}
        </div>
      )}

      {saves.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <EmptyState
            icon={Bookmark}
            title="No saves yet"
            description="Use Save on a program or valve to keep a copy, including valves, cycles, and photos."
          />
        </div>
      ) : (
        <div className="space-y-8">
          {programsSaves.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-navy-900 mb-3">Programs</h2>
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <NestedScroll className="overflow-auto max-h-[70dvh]">
                  <ul className="divide-y divide-slate-100">
                    {programsSaves.map(save => (
                      <SaveRow
                        key={save.id}
                        save={save}
                        onRestore={() => handleRestoreProgram(save)}
                        onDelete={() => setDeleting(save)}
                      />
                    ))}
                  </ul>
                </NestedScroll>
              </div>
            </section>
          )}

          {zoneSaves.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-navy-900 mb-3">Valves</h2>
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <NestedScroll className="overflow-auto max-h-[70dvh]">
                  <ul className="divide-y divide-slate-100">
                    {zoneSaves.map(save => (
                      <SaveRow
                        key={save.id}
                        save={save}
                        onRestore={() => setRestoringZone(save)}
                        onDelete={() => setDeleting(save)}
                      />
                    ))}
                  </ul>
                </NestedScroll>
              </div>
            </section>
          )}
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete save "${deleting.name}"?`}
          message="This only removes the saved copy. Your live programs are unchanged."
          confirmLabel="Delete save"
          onConfirm={async () => { await deleteSave(deleting.id); setDeleting(null); }}
          onCancel={() => setDeleting(null)}
        />
      )}

      {restoringZone && (
        <Modal title="Restore valve" onClose={() => setRestoringZone(null)} size="sm">
          {programs.length === 0 ? (
            <p className="text-sm text-black">Add a program first, then restore this valve into it.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-black mb-3">
                Add <span className="font-semibold text-navy-900">{restoringZone.name}</span> to which program?
              </p>
              {programs.map(program => (
                <button
                  key={program.id}
                  type="button"
                  onClick={() => handleRestoreZone(program.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 hover:border-brand-600 hover:bg-blue-50 text-left transition-colors"
                >
                  {program.controller_program && (
                    <ProgramBadge code={program.controller_program} color={program.color} size="sm" />
                  )}
                  <span className="text-sm font-medium text-navy-900">{program.name}</span>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function SaveRow({ save, onRestore, onDelete }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-navy-900 truncate">{save.name}</p>
        <p className="text-xs text-black mt-0.5">
          <SaveSummary save={save} />
          {save.saved_at && ` · ${formatSavedAt(save.saved_at)}`}
        </p>
      </div>
      <button
        type="button"
        onClick={onRestore}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Restore
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="p-2 rounded-lg text-black hover:text-red-600 hover:bg-red-50 transition-colors"
        aria-label={`Delete ${save.name}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );
}
