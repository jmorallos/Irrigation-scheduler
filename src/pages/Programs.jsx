import { Fragment, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, Power, List, Bookmark } from 'lucide-react';
import { useProgramCatalog, usePrograms } from '../hooks/usePrograms';
import { attachValveToProgram, createValveCatalog } from '../hooks/useZones';
import { programsRepository } from '../db/programsRepository';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ProgramForm from '../components/ProgramForm';
import ZoneForm from '../components/ZoneForm';
import AddValveToProgram from '../components/AddValveToProgram';
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
import { nextValveNumber, takenValveNumbers } from '../utils/zoneIdentity';

async function resolveCreatedProgramId(name) {
  const all = await programsRepository.getAll();
  const matches = all.filter(program => program.name === name);
  matches.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return matches[0]?.id ?? null;
}

function programDetailRows(summary) {
  if (!summary) return [];
  const rows = [
    { key: 'last', label: 'Last Water', value: summary.lastWaterLabel },
    { key: 'next', label: 'Next Water', value: summary.nextWaterLabel },
    { key: 'days', label: 'Days', value: summary.daysLabel },
  ];
  const windows = summary.valveWindowRows ?? [];
  if (windows.length === 0) {
    rows.push({ key: 'valves', label: 'Valves', value: '—' });
  } else {
    windows.forEach((window, index) => {
      rows.push({
        key: `valve-${window.valveNumber}-${index}`,
        label: `Valve ${window.valveNumber}`,
        value: window.timeRangeLabel,
        minutes: window.minutes,
      });
    });
  }
  rows.push({ key: 'start', label: 'Start Date', value: summary.startLabel });
  rows.push({ key: 'end', label: 'End Date', value: summary.endLabel });
  const totalMinutes = Number(summary.progTotalMinutes) || 0;
  rows.push({
    key: 'total',
    label: 'Prog Total',
    value: '',
    minutes: totalMinutes > 0 ? totalMinutes : null,
  });
  return rows;
}

const PROGRAMS_ALIGN = {
  prefix: 'left',
  name: 'left',
  minutes: 'right',
  status: 'left',
};

const TH_PROGRAMS =
  'sticky top-0 z-20 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-navy-900 select-none [-webkit-tap-highlight-color:transparent]';

export default function Programs() {
  const navigate = useNavigate();
  const { programs, loading, error, reload, createProgram, updateProgram, deleteProgram, toggleStatus } = usePrograms();
  const { memberships, valves, schedules, reload: reloadCatalog } = useProgramCatalog();
  const { saveProgram } = useSaves();
  const { cycle, cellClass, flexClass } = useColumnAlign('programs-align', PROGRAMS_ALIGN);
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState(null);
  const [createError, setCreateError] = useState(null);
  const [createBusy, setCreateBusy] = useState(false);
  const createLockRef = useRef(false);
  const createDraftRef = useRef(null);
  createDraftRef.current = createDraft;
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteCounts, setDeleteCounts] = useState({ zones: 0, schedules: 0 });
  const [savedNotice, setSavedNotice] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const summaries = useMemo(
    () => programListSummariesById(programs, { memberships, valves, schedules }),
    [programs, memberships, valves, schedules],
  );
  const valveCountByProgramId = useMemo(() => {
    const counts = {};
    for (const membership of memberships) {
      counts[membership.program_id] = (counts[membership.program_id] ?? 0) + 1;
    }
    return counts;
  }, [memberships]);

  const openCreate = () => {
    setCreateDraft(null);
    setCreateError(null);
    setShowCreate(true);
  };

  const closeCreate = () => {
    if (createLockRef.current) return;
    setShowCreate(false);
    setCreateDraft(null);
    setCreateError(null);
  };

  const finishCreateWithValve = async ({ existingValveId, newValveData }) => {
    const draft = createDraftRef.current;
    if (createLockRef.current || !draft) {
      throw new Error('Add at least one valve to create this program.');
    }
    createLockRef.current = true;
    setCreateBusy(true);
    setCreateError(null);
    let programId = null;
    let attached = false;
    try {
      await createProgram(draft);
      programId = await resolveCreatedProgramId(draft.name);
      if (!programId) throw new Error('Program was not created.');
      let valveId = existingValveId;
      if (newValveData) {
        const valve = await createValveCatalog(newValveData);
        valveId = valve.id;
      }
      if (!valveId) throw new Error('Add at least one valve to create this program.');
      await attachValveToProgram(valveId, programId);
      attached = true;
      await reloadCatalog();
      setShowCreate(false);
      setCreateDraft(null);
    } catch (err) {
      if (programId && !attached) {
        try {
          await deleteProgram(programId);
        } catch {
          /* keep the valve-step error */
        }
      }
      setCreateError(err.message || 'Add at least one valve to create this program.');
      throw err;
    } finally {
      createLockRef.current = false;
      setCreateBusy(false);
    }
  };

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
    <div className="min-w-0 w-full">
      {programs.length === 0 ? (
        <>
          <div className="flex items-start sm:items-center justify-between gap-3 mb-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-navy-900">Programs</h1>
            </div>
            <button
              onClick={openCreate}
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
              action={{ label: 'Add Program', onClick: openCreate }}
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
              onClick={openCreate}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add Program</span>
            </button>
          </div>

          {savedNotice && (
            <div className="mb-4 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              {`Saved "${savedNotice}" with its valves and events.`}
            </div>
          )}

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="table-h-scroll">
            <table className="w-full text-sm border-collapse table-fixed">
              <colgroup>
                <col className="w-36" />
                <col className="w-14" />
                <col className="w-52" />
                <col className="w-20" />
                <col className="w-24" />
                <col className="w-14" />
                <col />
              </colgroup>
              <thead>
                <tr className="text-white">
                  <th className={TH_PROGRAMS} aria-label="Program photo"></th>
                  <th onClick={() => cycle('prefix')} className={TH_PROGRAMS}>
                    <span className="block leading-4">Prog</span>
                    <span className="block leading-4">Prefix</span>
                  </th>
                  <th onClick={() => cycle('name')} className={TH_PROGRAMS}>
                    <span className="block leading-4">Program</span>
                    <span className="block leading-4">Name</span>
                  </th>
                  <th onClick={() => cycle('minutes')} className={TH_PROGRAMS}>Minutes</th>
                  <th onClick={() => cycle('status')} className={TH_PROGRAMS}>Status</th>
                  <th className={TH_PROGRAMS}></th>
                  <th className={TH_PROGRAMS} aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {programs.map((program) => {
                  const theme = getProgramTheme(program);
                  const summary = summaries.get(program.id);
                  const detailRows = programDetailRows(summary);
                  const menuSpan = 1 + detailRows.length;
                  const openProgram = () => navigate(`/programs/${program.id}`, { state: { program } });
                  const rowClass = `cursor-pointer transition-colors duration-200 ease-in-out ${theme.row} ${theme.hover}`;
                  const rowStyle = { backgroundColor: theme.rowHex };
                  return (
                  <Fragment key={program.id}>
                  <tr
                    role="link"
                    tabIndex={0}
                    onClick={openProgram}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openProgram();
                      }
                    }}
                    className={rowClass}
                    style={rowStyle}
                  >
                    <td className="px-3 pt-4 pb-2 align-middle" style={rowStyle}>
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
                          className="flex items-center justify-center w-16 h-16 leading-none flex-shrink-0 [-webkit-tap-highlight-color:transparent] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
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
                        <div className="flex items-center justify-center w-16 h-16 leading-none flex-shrink-0">
                          <ProgramLogo
                            name={program.name}
                            profileImageId={program.profile_image_id}
                            size="fill"
                            square
                          />
                        </div>
                      )}
                    </td>
                    <td className={`px-3 pt-4 pb-2 align-middle ${cellClass('prefix')}`} style={rowStyle}>
                      <div className={`flex items-center ${flexClass('prefix')}`}>
                        <ProgramBadge code={program.controller_program} color={program.color} size="lg" />
                      </div>
                    </td>
                    <td className={`px-3 pt-4 pb-2 align-middle ${cellClass('name')}`} style={rowStyle}>
                      <p className="font-semibold text-navy-900 leading-none whitespace-nowrap">{program.name}</p>
                    </td>
                    <td className={`px-3 pt-4 pb-2 align-top tabular-nums ${cellClass('minutes')}`} style={rowStyle}></td>
                    <td className={`px-3 pt-4 pb-2 align-middle ${cellClass('status')}`} style={rowStyle}>
                      <Badge status={program.status} size="sm" />
                    </td>
                    <td
                      rowSpan={menuSpan}
                      className="px-3 py-4 text-right align-top"
                      style={rowStyle}
                      onClick={(e) => e.stopPropagation()}
                    >
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
                    <td rowSpan={menuSpan} style={rowStyle} aria-hidden="true"></td>
                  </tr>
                  {detailRows.map((row, index) => {
                    const isLast = index === detailRows.length - 1;
                    const pad = isLast ? 'pb-4' : '';
                    return (
                      <tr
                        key={row.key}
                        onClick={openProgram}
                        className={`${rowClass} ${isLast ? `border-b ${theme.border}` : ''}`}
                        style={{ ...rowStyle, borderColor: theme.borderHex }}
                      >
                        <td className={`px-3 py-0.5 whitespace-nowrap align-top ${pad}`} style={rowStyle}>
                          <span className="font-semibold text-navy-900">{row.label}:</span>
                        </td>
                        <td
                          colSpan={2}
                          className={`px-3 py-0.5 whitespace-nowrap align-top ${pad} ${cellClass('name')}`}
                          style={rowStyle}
                        >
                          {row.value}
                        </td>
                        <td className={`px-3 py-0.5 whitespace-nowrap tabular-nums align-top ${pad} ${cellClass('minutes')}`} style={rowStyle}>
                          {row.minutes != null ? row.minutes : ''}
                        </td>
                        <td className={pad} style={rowStyle}></td>
                      </tr>
                    );
                  })}
                  </Fragment>
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
        <Modal title={createDraft ? 'Add Valve' : 'Create Program'} onClose={closeCreate}>
          <div className={createDraft ? 'hidden' : undefined} aria-hidden={Boolean(createDraft)}>
            <ProgramForm
              existingNames={programs.map(p => p.name)}
              existingPrefixes={programs.map(p => p.controller_program).filter(Boolean)}
              onSubmit={async data => {
                setCreateError(null);
                setCreateDraft(data);
              }}
              onCancel={closeCreate}
            />
          </div>
          {createDraft && (
            <>
              {createError && (
                <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {createError}
                </div>
              )}
              <AddValveToProgram
                catalogValves={valves}
                programValveCounts={{}}
                busy={createBusy}
                cancelLabel="Back"
                intro="A program needs at least one valve. Create a new valve or add an existing one."
                onAddExisting={async valveId => {
                  try {
                    await finishCreateWithValve({ existingValveId: valveId });
                  } catch {
                    /* createError is shown above */
                  }
                }}
                onCreateNew={({ onDone }) => (
                  <ZoneForm
                    suggestedNumber={nextValveNumber(valves)}
                    existingNumbers={takenValveNumbers(valves)}
                    defaultColor={createDraft.color}
                    showStatus={false}
                    onSubmit={async data => {
                      await finishCreateWithValve({ newValveData: data });
                      onDone();
                    }}
                    onCancel={onDone}
                  />
                )}
                onCancel={() => {
                  if (createLockRef.current) return;
                  setCreateDraft(null);
                  setCreateError(null);
                }}
              />
            </>
          )}
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Program" onClose={() => setEditing(null)}>
          <ProgramForm
            initial={editing}
            valveCount={valveCountByProgramId[editing.id] ?? 0}
            existingNames={programs.filter(p => p.id !== editing.id).map(p => p.name)}
            existingPrefixes={programs.filter(p => p.id !== editing.id).map(p => p.controller_program).filter(Boolean)}
            onSubmit={async data => { await updateProgram(editing.id, data); await reloadCatalog(); setEditing(null); }}
            onCancel={() => setEditing(null)}
          />
          {(valveCountByProgramId[editing.id] ?? 0) < 1 && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <AddValveToProgram
                catalogValves={valves}
                programValveCounts={{}}
                showCancel={false}
                intro="Add at least one valve before saving. Create a new valve or add an existing one."
                onAddExisting={async valveId => {
                  await attachValveToProgram(valveId, editing.id);
                  await reloadCatalog();
                }}
                onCreateNew={({ onDone }) => (
                  <ZoneForm
                    suggestedNumber={nextValveNumber(valves)}
                    existingNumbers={takenValveNumbers(valves)}
                    defaultColor={editing.color}
                    showStatus={false}
                    onSubmit={async data => {
                      const valve = await createValveCatalog(data);
                      await attachValveToProgram(valve.id, editing.id);
                      await reloadCatalog();
                      onDone();
                    }}
                    onCancel={onDone}
                  />
                )}
                onCancel={() => setEditing(null)}
              />
            </div>
          )}
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
