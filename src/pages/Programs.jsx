import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, Power, List } from 'lucide-react';
import { usePrograms } from '../hooks/usePrograms';
import { useZones } from '../hooks/useZones';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ProgramForm from '../components/ProgramForm';
import ProgramLogo from '../components/ProgramLogo';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';

function ZoneCount({ programId }) {
  const { zones } = useZones(programId);
  return <span>{zones.length} {zones.length === 1 ? 'zone' : 'zones'}</span>;
}

export default function Programs() {
  const { programs, loading, createProgram, updateProgram, deleteProgram, toggleStatus } = usePrograms();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteCounts, setDeleteCounts] = useState({ zones: 0, schedules: 0 });

  const openDelete = async (program) => {
    const zones = await zonesRepository.getByProgramId(program.id);
    let schedCount = 0;
    for (const z of zones) {
      const scheds = await schedulesRepository.getByZoneId(z.id);
      schedCount += scheds.length;
    }
    setDeleteCounts({ zones: zones.length, schedules: schedCount });
    setDeleting(program);
  };

  if (loading) return <div className="py-16 text-center text-sm text-slate-400">Loading programs…</div>;

  return (
    <div className="min-w-0 w-full overflow-x-hidden">
      <div className="flex items-start sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Programs</h1>
          <p className="mt-1 text-sm text-slate-500">{programs.length} program{programs.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="sm:hidden">Add</span>
          <span className="hidden sm:inline">Add Program</span>
        </button>
      </div>

      {programs.length === 0 ? (
        <EmptyState
          icon={List}
          title="No programs yet"
          description="Create your first irrigation program to get started."
          action={{ label: 'Add Program', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="space-y-3">
          {programs.map(program => (
            <div key={program.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 overflow-hidden">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="hidden sm:block flex-shrink-0">
                    <ProgramLogo name={program.name} size="lg" />
                  </div>
                  <div className="sm:hidden flex-shrink-0">
                    <ProgramLogo name={program.name} size="md" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-900 break-words">{program.name}</h3>
                      <Badge status={program.status} size="sm" />
                    </div>
                    {program.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 sm:truncate">{program.description}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      <ZoneCount programId={program.id} />
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-1 border-t border-gray-50 pt-3 sm:border-0 sm:pt-0 flex-shrink-0">
                  <Link
                    to={`/programs/${program.id}`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 p-2.5 sm:p-2 rounded-lg text-slate-500 hover:text-green-600 hover:bg-green-50 transition-colors"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-xs font-medium sm:hidden">View</span>
                  </Link>
                  <button
                    onClick={() => setEditing(program)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 p-2.5 sm:p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                    <span className="text-xs font-medium sm:hidden">Edit</span>
                  </button>
                  <button
                    onClick={() => toggleStatus(program.id, program.status)}
                    className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 p-2.5 sm:p-2 rounded-lg transition-colors ${
                      program.status === 'active'
                        ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                        : 'text-slate-500 hover:text-green-600 hover:bg-green-50'
                    }`}
                    title={program.status === 'active' ? 'Deactivate' : 'Activate'}
                  >
                    <Power className="w-4 h-4" />
                    <span className="text-xs font-medium sm:hidden">{program.status === 'active' ? 'Off' : 'On'}</span>
                  </button>
                  <button
                    onClick={() => openDelete(program)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 p-2.5 sm:p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-xs font-medium sm:hidden">Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="Create Program" onClose={() => setShowCreate(false)}>
          <ProgramForm
            existingNames={programs.map(p => p.name)}
            onSubmit={async data => { await createProgram(data); setShowCreate(false); }}
            onCancel={() => setShowCreate(false)}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Program" onClose={() => setEditing(null)}>
          <ProgramForm
            initial={editing}
            existingNames={programs.filter(p => p.id !== editing.id).map(p => p.name)}
            onSubmit={async data => { await updateProgram(editing.id, data); setEditing(null); }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete "${deleting.name}"?`}
          message="This action cannot be undone."
          detail={`This will also delete:\n• ${deleteCounts.zones} zone${deleteCounts.zones !== 1 ? 's' : ''}\n• ${deleteCounts.schedules} schedule${deleteCounts.schedules !== 1 ? 's' : ''}`}
          confirmLabel="Delete"
          onConfirm={async () => { await deleteProgram(deleting.id); setDeleting(null); }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
