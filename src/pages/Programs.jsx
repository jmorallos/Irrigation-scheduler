import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, Power, List, Bookmark } from 'lucide-react';
import { useProgramCatalog, usePrograms } from '../hooks/usePrograms';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ProgramForm from '../components/ProgramForm';
import ProgramLogo from '../components/ProgramLogo';
import PhotoPreview from '../components/PhotoPreview';
import ProgramBadge from '../components/ProgramBadge';
import { getProgramTheme } from '../utils/programColors';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import PageError from '../components/PageError';
import ActionMenu from '../components/ActionMenu';
import { useSaves } from '../hooks/useSaves';
import { useColumnAlign } from '../hooks/useColumnAlign';
import { programListSummariesById } from '../utils/programListSummary';

function SummaryLine({ label, value, wrap = false }) {
  return (
    <p className={wrap ? 'whitespace-normal break-words' : 'truncate'}>
      <span className="font-semibold text-navy-900">{label}:</span>{' '}
      <span>{value}</span>
    </p>
  );
}

function ProgramScheduleSummary({ summary }) {
  if (!summary) return null;
  return (
    <div className="mt-1.5 space-y-0.5 text-sm text-black">
      <SummaryLine label="Days" value={summary.daysLabel} />
      <SummaryLine label="Cycles" value={summary.cyclesLabel} wrap />
      <SummaryLine label="Valves" value={summary.valvesLabel} />
      <SummaryLine label="Start" value={summary.startLabel} />
      <SummaryLine label="End" value={summary.endLabel} />
    </div>
  );
}

const PROGRAMS_ALIGN = {
  letter: 'left',
  name: 'left',
  status: 'left',
};

const TH_PROGRAMS =
  'sticky top-0 z-20 px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider bg-navy-900 select-none [-webkit-tap-highlight-color:transparent]';

export default function Programs() {
  const navigate = useNavigate();
  const { programs, loading, error, reload, createProgram, updateProgram, deleteProgram, toggleStatus } = usePrograms();
  const { memberships, valves, schedules, reload: reloadCatalog } = useProgramCatalog();
  const { saveProgram } = useSaves();
  const { cycle, cellClass, flexClass } = useColumnAlign('programs-align', PROGRAMS_ALIGN);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteCounts, setDeleteCounts] = useState({ zones: 0, schedules: 0 });
  const [savedNotice, setSavedNotice] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const summaries = useMemo(
    () => programListSummariesById(programs, { memberships, valves, schedules }),
    [programs, memberships, valves, schedules],
  );

  const refreshAll = async () => {
    await reload();
    await reloadCatalog();
  };

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

  const handleSave = async (program) => {
    await saveProgram(program.id);
    setSavedNotice(program.name);
    window.setTimeout(() => setSavedNotice(null), 3000);
  };

  if (loading) return <div className="py-16 text-center text-sm text-black">Loading programs…</div>;
  if (error) return <PageError message={`Could not load programs: ${error}`} onRetry={refreshAll} />;

  return (
    <div className="min-w-0 w-full overflow-x-hidden">
      {programs.length === 0 ? (
        <>
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
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <EmptyState
              icon={List}
              title="No programs yet"
              description="Create your first irrigation program to get started."
              action={{ label: 'Add Program', onClick: () => setShowCreate(true) }}
            />
          </div>
        </>
      ) : (
        <div>
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

          {savedNotice && (
            <div className="mb-4 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              {`Saved "${savedNotice}" with its valves and cycles.`}
            </div>
          )}

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="table-h-scroll">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="text-white">
                  <th onClick={() => cycle('letter')} className={`${TH_PROGRAMS} w-10`} aria-label="Controller program"></th>
                  <th onClick={() => cycle('name')} className={TH_PROGRAMS}>Program Name</th>
                  <th onClick={() => cycle('status')} className={TH_PROGRAMS}>Status</th>
                  <th className="sticky top-0 z-20 px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider w-14 bg-navy-900"></th>
                </tr>
              </thead>
              <tbody>
                {programs.map((program) => {
                  const theme = getProgramTheme(program);
                  const summary = summaries.get(program.id);
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
                    style={{ backgroundColor: theme.rowHex, borderColor: theme.borderHex }}
                  >
                    <td className={`px-4 py-4 align-top ${cellClass('letter')}`}>
                      <ProgramBadge code={program.controller_program} color={program.color} size="md" />
                    </td>
                    <td className={`px-4 py-4 ${cellClass('name')}`}>
                      <div className={`flex items-start gap-3 min-w-0 ${flexClass('name')}`}>
                        {program.profile_image_id ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoPreview({
                                profileImageId: program.profile_image_id,
                                name: program.name,
                              });
                            }}
                            className="w-10 h-10 flex-shrink-0 [-webkit-tap-highlight-color:transparent] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                            aria-label={`View photo of ${program.name}`}
                          >
                            <ProgramLogo
                              name={program.name}
                              profileImageId={program.profile_image_id}
                              size="fill"
                              square
                            />
                          </button>
                        ) : (
                          <div className="w-10 h-10 flex-shrink-0">
                            <ProgramLogo
                              name={program.name}
                              profileImageId={program.profile_image_id}
                              size="fill"
                              square
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-navy-900 truncate">{program.name}</p>
                          <ProgramScheduleSummary summary={summary} />
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-4 align-top ${cellClass('status')}`}>
                      <Badge status={program.status} size="sm" />
                    </td>
                    <td className="px-4 py-4 text-right align-top" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        items={[
                          { label: 'View', icon: Eye, to: `/programs/${program.id}` },
                          { label: 'Edit', icon: Pencil, onClick: () => setEditing(program) },
                          { label: 'Save', icon: Bookmark, onClick: () => handleSave(program) },
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
          <div className="px-4 py-3 border-t border-slate-100 bg-surface-alt/40 text-xs text-black text-center">
            {programs.length} program{programs.length !== 1 ? 's' : ''}
          </div>
          </div>
        </div>
      )}

      {showCreate && (
        <Modal title="Create Program" onClose={() => setShowCreate(false)}>
          <ProgramForm
            existingNames={programs.map(p => p.name)}
            existingPrefixes={programs.map(p => p.controller_program).filter(Boolean)}
            onSubmit={async data => { await createProgram(data); await reloadCatalog(); setShowCreate(false); }}
            onCancel={() => setShowCreate(false)}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Program" onClose={() => setEditing(null)}>
          <ProgramForm
            initial={editing}
            existingNames={programs.filter(p => p.id !== editing.id).map(p => p.name)}
            existingPrefixes={programs.filter(p => p.id !== editing.id).map(p => p.controller_program).filter(Boolean)}
            onSubmit={async data => { await updateProgram(editing.id, data); await reloadCatalog(); setEditing(null); }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete "${deleting.name}"?`}
          message="This action cannot be undone."
          detail={`This will also delete:\n• ${deleteCounts.zones} valve${deleteCounts.zones !== 1 ? 's' : ''}\n• ${deleteCounts.schedules} schedule${deleteCounts.schedules !== 1 ? 's' : ''}`}
          confirmLabel="Delete"
          onConfirm={async () => { await deleteProgram(deleting.id); await reloadCatalog(); setDeleting(null); }}
          onCancel={() => setDeleting(null)}
        />
      )}

      {photoPreview && (
        <PhotoPreview
          name={photoPreview.name}
          profileImageId={photoPreview.profileImageId}
          onClose={() => setPhotoPreview(null)}
        />
      )}
    </div>
  );
}
