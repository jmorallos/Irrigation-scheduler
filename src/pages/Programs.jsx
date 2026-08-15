import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, Power, List } from 'lucide-react';
import { usePrograms } from '../hooks/usePrograms';
import { useZones } from '../hooks/useZones';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ProgramForm from '../components/ProgramForm';
import ProgramLogo from '../components/ProgramLogo';
import ProgramBadge from '../components/ProgramBadge';
import { getProgramTheme } from '../utils/programColors';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import PageError from '../components/PageError';
import ActionMenu from '../components/ActionMenu';

function ZoneCount({ programId }) {
  const { zones } = useZones(programId);
  return <span>{zones.length}</span>;
}

export default function Programs() {
  const navigate = useNavigate();
  const { programs, loading, error, reload, createProgram, updateProgram, deleteProgram, toggleStatus } = usePrograms();
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
  if (error) return <PageError message={`Could not load programs: ${error}`} onRetry={reload} />;

  return (
    <div className="min-w-0 w-full overflow-x-hidden">
      <div className="flex items-start sm:items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-navy-900">Programs</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="sm:hidden">Add</span>
          <span className="hidden sm:inline">Add Program</span>
        </button>
      </div>

      {programs.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <EmptyState
            icon={List}
            title="No programs yet"
            description="Create your first irrigation program to get started."
            action={{ label: 'Add Program', onClick: () => setShowCreate(true) }}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-navy-900 text-white">
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider w-10" aria-label="Controller program"></th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Program Name</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">Zones</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider w-14"></th>
                </tr>
              </thead>
              <tbody>
                {programs.map((program) => {
                  const theme = getProgramTheme(program.controller_program);
                  return (
                  <tr
                    key={program.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/programs/${program.id}`, { state: { program } })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/programs/${program.id}`, { state: { program } });
                      }
                    }}
                    className={`border-b ${theme.border} last:border-0 cursor-pointer transition-colors duration-200 ease-in-out ${theme.row} ${theme.hover}`}
                  >
                    <td className="px-4 py-4">
                      <ProgramBadge code={program.controller_program} size="md" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 flex-shrink-0">
                          <ProgramLogo
                            name={program.name}
                            profileImageId={program.profile_image_id}
                            size="fill"
                            square
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-navy-900 truncate">{program.name}</p>
                          {program.description ? (
                            <p className="text-xs text-slate-400 truncate mt-0.5">{program.description}</p>
                          ) : (
                            <p className="text-xs text-slate-400 mt-0.5 sm:hidden">
                              <ZoneCount programId={program.id} /> zone(s)
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600 hidden sm:table-cell">
                      <ZoneCount programId={program.id} />
                    </td>
                    <td className="px-4 py-4">
                      <Badge status={program.status} size="sm" />
                    </td>
                    <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        items={[
                          { label: 'View', icon: Eye, to: `/programs/${program.id}` },
                          { label: 'Edit', icon: Pencil, onClick: () => setEditing(program) },
                          {
                            label: program.status === 'active' ? 'Deactivate' : 'Activate',
                            icon: Power,
                            onClick: () => toggleStatus(program.id, program.status),
                          },
                          { label: 'Delete', icon: Trash2, onClick: () => openDelete(program), danger: true },
                        ]}
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 bg-surface-alt/40 text-xs text-slate-500 text-center">
            {programs.length} program{programs.length !== 1 ? 's' : ''}
          </div>
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
