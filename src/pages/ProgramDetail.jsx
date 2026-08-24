import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Power, Clock, Bookmark, ChevronDown } from 'lucide-react';
import { programsRepository } from '../db/programsRepository';
import { useZones } from '../hooks/useZones';
import { useSchedules } from '../hooks/useSchedules';
import { useTodaySchedule } from '../hooks/useTodaySchedule';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ProgramForm from '../components/ProgramForm';
import ZoneForm from '../components/ZoneForm';
import ScheduleForm from '../components/ScheduleForm';
import ProgramLogo from '../components/ProgramLogo';
import PhotoPreview from '../components/PhotoPreview';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import ActionMenu from '../components/ActionMenu';
import { formatTime, formatDuration, formatDays, formatTimeRange, getEndTime, dayScopeLabel, formatClockTodayLine } from '../utils/dateUtils';
import { formatCycleLabel, getZoneDisplayName, getZoneNumber } from '../utils/scheduleUtils';
import AddValveToProgram from '../components/AddValveToProgram';
import { valvesRepository } from '../db/valvesRepository';
import { nextValveNumber, takenValveNumbers } from '../utils/zoneIdentity';
import { applyProfileImageChange } from '../utils/profileImageService';
import { usePrograms } from '../hooks/usePrograms';
import { useSaves } from '../hooks/useSaves';
import { getProgramTheme, getZoneTheme } from '../utils/programColors';
import ProgramBadge from '../components/ProgramBadge';
import { useColumnAlign } from '../hooks/useColumnAlign';
import { useSelectedDay } from '../context/SelectedDayContext';

function ZoneIdentity({ zone, programName, avatarSize = 'w-10 h-10' }) {
  const displayName = getZoneDisplayName(zone, programName);
  return (
    <div className="flex items-center gap-2.5 min-w-0 flex-1">
      <div className={`${avatarSize} flex-shrink-0`}>
        <ProgramLogo name={displayName} profileImageId={zone.profile_image_id} size="fill" square />
      </div>
      <div className="min-w-0 flex flex-col justify-center">
        <p className="text-base font-semibold text-navy-900 leading-snug">{displayName}</p>
        {zone.status === 'inactive' && <Badge status="inactive" size="sm" />}
      </div>
    </div>
  );
}

function useZoneCycles(zone, { program, onEditZone, onDeleteZone, onToggleZone, onSaveZone }) {
  const { schedules, createSchedule, updateSchedule, deleteSchedule, toggleStatus: toggleSched } = useSchedules(zone.id);
  const [addSched, setAddSched] = useState(false);
  const [editSched, setEditSched] = useState(null);
  const [deleteSched, setDeleteSched] = useState(null);
  const [conflictError, setConflictError] = useState(null);

  const handleToggleSched = async (schedule) => {
    setConflictError(null);
    try {
      await toggleSched(schedule.id, schedule.status);
    } catch (err) {
      setConflictError(err.message);
    }
  };

  const zoneMenuItems = [
    { label: 'Add cycle', icon: Plus, onClick: () => setAddSched(true) },
    { label: 'Edit valve', icon: Pencil, onClick: onEditZone },
    { label: 'Save valve', icon: Bookmark, onClick: onSaveZone },
    { label: zone.status === 'active' ? 'Deactivate valve' : 'Activate valve', icon: Power, onClick: onToggleZone },
    { label: 'Remove from program', icon: Trash2, onClick: onDeleteZone, danger: true },
  ];

  const scheduleMenuItems = schedule => [
    { label: 'Edit', icon: Pencil, onClick: () => setEditSched(schedule) },
    {
      label: schedule.status === 'active' ? 'Deactivate' : 'Activate',
      icon: Power,
      onClick: () => handleToggleSched(schedule),
    },
    { label: 'Delete', icon: Trash2, onClick: () => setDeleteSched(schedule), danger: true },
  ];

  const modals = (
    <>
      {addSched && (
        <Modal title="Add Cycle" onClose={() => setAddSched(false)}>
          <ScheduleForm
            programId={program.id}
            programName={program.name}
            zoneId={zone.id}
            onSubmit={async data => { await createSchedule(data); setAddSched(false); }}
            onCancel={() => setAddSched(false)}
          />
        </Modal>
      )}
      {editSched && (
        <Modal title="Edit Cycle" onClose={() => setEditSched(null)}>
          <ScheduleForm
            initial={editSched}
            programId={program.id}
            programName={program.name}
            zoneId={zone.id}
            onSubmit={async data => { await updateSchedule(editSched.id, data); setEditSched(null); }}
            onCancel={() => setEditSched(null)}
          />
        </Modal>
      )}
      {deleteSched && (
        <ConfirmDialog
          title="Delete cycle?"
          message="This will permanently remove this watering cycle."
          confirmLabel="Delete"
          onConfirm={async () => { await deleteSchedule(deleteSched.id); setDeleteSched(null); }}
          onCancel={() => setDeleteSched(null)}
        />
      )}
    </>
  );

  return { schedules, zoneMenuItems, scheduleMenuItems, modals, setAddSched, conflictError };
}

function ZoneCard({ zone, program, onEditZone, onDeleteZone, onToggleZone, onSaveZone }) {
  const { schedules, zoneMenuItems, scheduleMenuItems, modals, setAddSched, conflictError } = useZoneCycles(zone, {
    program,
    onEditZone,
    onDeleteZone,
    onToggleZone,
    onSaveZone,
  });
  const [open, setOpen] = useState(false);
  const theme = getZoneTheme(zone, program);
  const programName = program.name;

  return (
    <div
      className={`${theme.row} rounded-lg border ${theme.border} shadow-sm overflow-hidden ${zone.status === 'inactive' ? 'opacity-75' : ''}`}
      style={{ backgroundColor: theme.rowHex, borderColor: theme.borderHex }}
    >
      <div className="flex items-center gap-1 px-2 py-2">
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          aria-expanded={open}
          className="flex items-center gap-3 min-w-0 flex-1 px-2 py-1.5 text-left rounded-lg hover:bg-black/5"
        >
          <div className="w-12 h-12 flex-shrink-0">
            <ProgramLogo
              name={getZoneDisplayName(zone, programName)}
              profileImageId={zone.profile_image_id}
              size="fill"
              square
            />
          </div>
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <p className="text-base font-semibold text-navy-900 leading-snug">{getZoneDisplayName(zone, programName)}</p>
            <p className="text-sm text-slate-500 mt-0.5">
              {schedules.length} cycle{schedules.length !== 1 ? 's' : ''}
            </p>
            {zone.status === 'inactive' && (
              <div className="mt-1">
                <Badge status="inactive" size="sm" />
              </div>
            )}
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-300 ease-out ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        <div className="flex-shrink-0" onClick={event => event.stopPropagation()}>
          <ActionMenu items={zoneMenuItems} label="Valve actions" />
        </div>
      </div>

      {conflictError && (
        <div className="mx-4 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {conflictError}
        </div>
      )}

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="min-h-0 overflow-hidden" inert={!open} aria-hidden={!open}>
          {schedules.length === 0 ? (
            <div className={`border-t ${theme.border} px-4 py-3.5 text-sm text-slate-600`}>
              No cycles.{' '}
              <button type="button" onClick={() => setAddSched(true)} className="text-brand-600 hover:underline">
                Add one
              </button>
            </div>
          ) : (
            <div className={`border-t ${theme.border} divide-y ${theme.border}`}>
              {schedules.map(schedule => (
                <div
                  key={schedule.id}
                  className={`flex items-start justify-between gap-3 px-4 py-3.5 ${schedule.status === 'inactive' ? 'opacity-60' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        {formatCycleLabel(schedule.cycle)}
                      </span>
                      <span className="font-mono text-lg font-semibold text-navy-900">
                        {formatTimeRange(schedule.start_time, schedule.duration_minutes)}
                      </span>
                      <span className="font-mono text-sm text-slate-600">{formatDuration(schedule.duration_minutes)}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{formatDays(schedule.days_of_week)}</p>
                    {schedule.notes && (
                      <p className="text-sm text-slate-500 mt-1">{schedule.notes}</p>
                    )}
                  </div>
                  <ActionMenu items={scheduleMenuItems(schedule)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modals}
    </div>
  );
}

function ZoneTableRows({ zone, program, onEditZone, onDeleteZone, onToggleZone, onSaveZone, isFirstZone, zoneIndex, cellClass }) {
  const { schedules, zoneMenuItems, scheduleMenuItems, modals, setAddSched, conflictError } = useZoneCycles(zone, {
    program,
    onEditZone,
    onDeleteZone,
    onToggleZone,
    onSaveZone,
  });
  const theme = getZoneTheme(zone, program);
  const programName = program.name;
  const rowBg = zoneIndex % 2 === 1 ? theme.rowAlt : theme.row;
  const rowHex = zoneIndex % 2 === 1 ? theme.rowAltHex : theme.rowHex;

  const rows = schedules.length === 0
    ? [{ id: `${zone.id}-empty`, empty: true }]
    : schedules;

  return (
    <>
      {rows.map((schedule, index) => {
        const isFirstRow = index === 0;
        const rowBorder = isFirstRow && !isFirstZone ? `border-t-2 ${theme.border}` : `border-t ${theme.border}`;

        if (schedule.empty) {
          return (
            <tr key={schedule.id} className={`${rowBorder} ${rowBg}`} style={{ backgroundColor: rowHex, borderColor: theme.borderHex }}>
              <td className={`px-4 py-3 align-middle ${cellClass('zone')}`}>
                <div className="flex items-center justify-between gap-2">
                  <ZoneIdentity zone={zone} programName={programName} avatarSize="w-10 h-10" />
                  <ActionMenu items={zoneMenuItems} label="Valve actions" />
                </div>
              </td>
              <td colSpan={6} className="px-4 py-3 text-sm text-slate-500">
                No cycles.{' '}
                <button type="button" onClick={() => setAddSched(true)} className="text-brand-600 hover:underline">
                  Add one
                </button>
              </td>
              <td className="px-4 py-3" />
            </tr>
          );
        }

        return (
          <tr
            key={schedule.id}
            className={`${rowBorder} ${rowBg} ${schedule.status === 'inactive' ? 'opacity-60' : ''}`}
            style={{ backgroundColor: rowHex, borderColor: theme.borderHex }}
          >
            <td className={`px-4 py-3 align-middle ${cellClass('zone')}`}>
              {index === 0 ? (
                <div className="flex items-center justify-between gap-2">
                  <ZoneIdentity zone={zone} programName={programName} avatarSize="w-10 h-10" />
                  <ActionMenu items={zoneMenuItems} label="Valve actions" />
                </div>
              ) : null}
            </td>
            <td className={`px-4 py-3 whitespace-nowrap ${cellClass('cycle')}`}>
              <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {formatCycleLabel(schedule.cycle)}
              </span>
            </td>
            <td className={`px-4 py-3 whitespace-nowrap ${cellClass('start')}`}>
              <span className="font-mono text-base font-semibold text-navy-900">{formatTime(schedule.start_time)}</span>
            </td>
            <td className={`px-4 py-3 whitespace-nowrap ${cellClass('end')}`}>
              <span className="font-mono text-base text-slate-700">{formatTime(getEndTime(schedule.start_time, schedule.duration_minutes))}</span>
            </td>
            <td className={`px-4 py-3 whitespace-nowrap ${cellClass('duration')}`}>
              <span className="font-mono text-sm text-slate-600">{formatDuration(schedule.duration_minutes)}</span>
            </td>
            <td className={`px-4 py-3 ${cellClass('days')}`}>
              <span className="text-sm text-slate-600">{formatDays(schedule.days_of_week)}</span>
            </td>
            <td className={`px-4 py-3 ${cellClass('notes')}`}>
              <span className="text-sm text-slate-500">{schedule.notes || '—'}</span>
            </td>
            <td className="px-4 py-3 text-right whitespace-nowrap">
              <ActionMenu items={scheduleMenuItems(schedule)} />
            </td>
          </tr>
        );
      })}

      {conflictError && (
        <tr>
          <td colSpan={8} className="px-4 py-2 bg-red-50 text-xs text-red-700">
            {conflictError}
          </td>
        </tr>
      )}

      {modals}
    </>
  );
}

const DETAIL_ALIGN = {
  zone: 'left',
  cycle: 'left',
  start: 'left',
  end: 'left',
  duration: 'left',
  days: 'left',
  notes: 'left',
};

const TH_DETAIL =
  'sticky top-0 z-20 px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider bg-navy-900 select-none [-webkit-tap-highlight-color:transparent]';

export default function ProgramDetail() {
  const { programId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const prefetchedProgram = location.state?.program?.id === programId ? location.state.program : null;
  const [program, setProgram] = useState(prefetchedProgram);
  const [loadingProg, setLoadingProg] = useState(!prefetchedProgram);
  const [editProg, setEditProg] = useState(false);
  const [addZone, setAddZone] = useState(false);
  const [editZone, setEditZone] = useState(null);
  const [deleteZone, setDeleteZone] = useState(null);
  const { zones, createZone, addExistingValve, updateZone, deleteZone: removeZone, toggleStatus: toggleZone } = useZones(programId);
  const { programs: allPrograms } = usePrograms();
  const { saveProgram, saveZone } = useSaves();
  const { cycle, cellClass } = useColumnAlign('program-detail-align', DETAIL_ALIGN);
  const [savedNotice, setSavedNotice] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [catalogValves, setCatalogValves] = useState([]);
  const { selectedDay, clockToday, isClockToday } = useSelectedDay();
  const scope = dayScopeLabel(selectedDay, clockToday);
  const { items: todayItems } = useTodaySchedule(selectedDay);
  const todayForProgram = todayItems.filter(i => i.program.id === programId);

  useEffect(() => {
    if (!programId) return;
    let cancelled = false;
    programsRepository.getById(programId).then(p => {
      if (cancelled) return;
      if (!p) navigate('/programs');
      else setProgram(p);
      setLoadingProg(false);
    });
    return () => { cancelled = true; };
  }, [programId, navigate]);

  useEffect(() => {
    let cancelled = false;
    valvesRepository.getAll().then(list => {
      if (!cancelled) setCatalogValves(list);
    });
    return () => { cancelled = true; };
  }, [zones]);

  const handleUpdateProgram = async (data) => {
    if (!programId) return;
    const { profileImageChange, ...programData } = data;
    const imageId = await applyProfileImageChange(
      'program',
      programId,
      profileImageChange,
      program.profile_image_id ?? null,
    );
    const updated = await programsRepository.update(programId, {
      ...programData,
      profile_image_id: imageId,
    });
    setProgram(updated);
    setEditProg(false);
  };

  const showSaved = (label) => {
    setSavedNotice(label);
    window.setTimeout(() => setSavedNotice(null), 3000);
  };

  if (loadingProg) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-4 w-24 bg-slate-200 rounded" />
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="flex min-h-[6.5rem]">
            <div className="w-[6.5rem] bg-slate-200 flex-shrink-0" />
            <div className="flex-1 p-4 sm:p-6 space-y-2 flex flex-col justify-center">
              <div className="h-6 w-48 bg-slate-200 rounded" />
              <div className="h-4 w-64 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!program) return null;

  const theme = getProgramTheme(program);
  const existingNumbers = takenValveNumbers(catalogValves);
  const suggestedNumber = nextValveNumber(catalogValves);
  const programValveCounts = zones.reduce((counts, zone) => {
    if (!zone.valve_id) return counts;
    counts[zone.valve_id] = (counts[zone.valve_id] ?? 0) + 1;
    return counts;
  }, {});
  const editExcludeIds = editZone?.valve_id ? [editZone.valve_id] : [];

  return (
    <div>
      <Link to="/programs" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-900 mb-6">
        <ArrowLeft className="w-4 h-4" /> Programs
      </Link>

      <div
        className={`${theme.row} rounded-lg border ${theme.border} shadow-sm overflow-hidden mb-6`}
        style={{ backgroundColor: theme.rowHex, borderColor: theme.borderHex }}
      >
        <div className="flex min-h-[6.5rem]">
          {program.profile_image_id ? (
            <button
              type="button"
              onClick={() => setPhotoPreview({
                profileImageId: program.profile_image_id,
                name: program.name,
              })}
              className="w-[6.5rem] sm:w-28 self-stretch flex-shrink-0 [-webkit-tap-highlight-color:transparent] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600"
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
            <div className="w-[6.5rem] sm:w-28 self-stretch flex-shrink-0">
              <ProgramLogo
                name={program.name}
                profileImageId={program.profile_image_id}
                size="fill"
                square
              />
            </div>
          )}
          <div className="flex-1 min-w-0 px-4 py-3.5 sm:px-5 sm:py-4 flex flex-col justify-center gap-1.5">
            <div className="flex items-center gap-2">
              {program.controller_program && (
                <ProgramBadge code={program.controller_program} color={program.color} size="md" />
              )}
              <div className="flex-1 min-w-0" />
              <div className="flex items-center gap-0.5 flex-shrink-0 -mr-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    await saveProgram(program.id);
                    showSaved(`Saved "${program.name}" with its valves and cycles.`);
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-blue-50 transition-colors"
                  title="Save program"
                >
                  <Bookmark className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditProg(true)}
                  className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-blue-50 transition-colors"
                  title="Edit program"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h1 className="text-xl font-bold text-navy-900 leading-tight truncate">{program.name}</h1>
            <div>
              <Badge status={program.status} />
            </div>
            {program.description && (
              <p className="text-sm text-slate-500 leading-snug line-clamp-2" title={program.description}>
                {program.description}
              </p>
            )}
            <p className="text-xs text-slate-400">
              {zones.length} valve{zones.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {savedNotice && (
        <div className="mb-4 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          {savedNotice}
        </div>
      )}

      {todayForProgram.length > 0 && (
        <div
          className={`${theme.row} border ${theme.border} rounded-lg p-5 mb-6`}
          style={{ backgroundColor: theme.rowHex, borderColor: theme.borderHex }}
        >
          <h2 className={`text-sm font-semibold text-navy-900 uppercase tracking-wider ${isClockToday ? 'mb-3' : 'mb-1'}`}>
            {`${scope.possessive} Schedule`}
          </h2>
          {!isClockToday && (
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-brand-600">
              {formatClockTodayLine()}
            </p>
          )}
          <div className="space-y-2">
            {todayForProgram.map(item => (
              <div
                key={item.schedule.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:flex-nowrap sm:items-center"
              >
                <span className="text-sm font-semibold uppercase tracking-wide text-slate-500 w-16 flex-shrink-0">
                  {formatCycleLabel(item.schedule.cycle)}
                </span>
                <span className="font-mono text-sm sm:text-base font-semibold text-navy-900 whitespace-nowrap flex-shrink-0">
                  {formatTimeRange(item.schedule.start_time, item.schedule.duration_minutes)}
                </span>
                <span className="text-sm sm:text-base text-slate-700 min-w-0 flex-1 basis-[12rem] truncate">
                  {getZoneDisplayName(item.zone, program.name)}
                </span>
                <span className="text-sm font-mono text-slate-600 flex-shrink-0 sm:ml-auto">
                  {formatDuration(item.schedule.duration_minutes)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-navy-900">Valves</h2>
        <button
          onClick={() => setAddZone(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Valve
        </button>
      </div>

      {zones.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No valves yet"
          description="Add a valve to start creating schedules."
          action={{ label: 'Add Valve', onClick: () => setAddZone(true) }}
        />
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {zones.map(zone => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                program={program}
                onEditZone={() => setEditZone(zone)}
                onDeleteZone={() => setDeleteZone(zone)}
                onToggleZone={() => toggleZone(zone.id, zone.status)}
                onSaveZone={async () => {
                  await saveZone(zone.id);
                  showSaved(`Saved "${zone.name}" with its cycles.`);
                }}
              />
            ))}
          </div>

          <div className="hidden md:block bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="table-h-scroll">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="text-white">
                  <th onClick={() => cycle('zone')} className={TH_DETAIL}>Valve</th>
                  <th onClick={() => cycle('cycle')} className={TH_DETAIL}>Cycle</th>
                  <th onClick={() => cycle('start')} className={TH_DETAIL}>Start</th>
                  <th onClick={() => cycle('end')} className={TH_DETAIL}>End</th>
                  <th onClick={() => cycle('duration')} className={TH_DETAIL}>Duration</th>
                  <th onClick={() => cycle('days')} className={TH_DETAIL}>Days</th>
                  <th onClick={() => cycle('notes')} className={TH_DETAIL}>Notes</th>
                  <th className="sticky top-0 z-20 px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider w-12 bg-navy-900" />
                </tr>
              </thead>
              <tbody>
                {zones.map((zone, zoneIndex) => (
                  <ZoneTableRows
                    key={zone.id}
                    zone={zone}
                    program={program}
                    isFirstZone={zoneIndex === 0}
                    zoneIndex={zoneIndex}
                    onEditZone={() => setEditZone(zone)}
                    onDeleteZone={() => setDeleteZone(zone)}
                    onToggleZone={() => toggleZone(zone.id, zone.status)}
                    cellClass={cellClass}
                    onSaveZone={async () => {
                      await saveZone(zone.id);
                      showSaved(`Saved "${zone.name}" with its cycles.`);
                    }}
                  />
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}

      {editProg && (
        <Modal title="Edit Program" onClose={() => setEditProg(false)}>
          <ProgramForm
            initial={program}
            existingNames={allPrograms.filter(p => p.id !== program.id).map(p => p.name)}
            onSubmit={handleUpdateProgram}
            onCancel={() => setEditProg(false)}
          />
        </Modal>
      )}

      {addZone && (
        <Modal title="Add Valve" onClose={() => setAddZone(false)} size="sm">
          <AddValveToProgram
            catalogValves={catalogValves}
            programValveCounts={programValveCounts}
            onAddExisting={async (valveId) => {
              await addExistingValve(valveId);
              setAddZone(false);
            }}
            onCreateNew={({ onDone }) => (
              <ZoneForm
                suggestedNumber={suggestedNumber}
                existingNumbers={existingNumbers}
                defaultColor={theme.id}
                showStatus={false}
                onSubmit={async data => {
                  await createZone(data);
                  onDone();
                  setAddZone(false);
                }}
                onCancel={onDone}
              />
            )}
            onCancel={() => setAddZone(false)}
          />
        </Modal>
      )}

      {editZone && (
        <Modal title="Edit Valve" onClose={() => setEditZone(null)} size="sm">
          <ZoneForm
            initial={editZone}
            existingNumbers={takenValveNumbers(catalogValves, editExcludeIds)}
            defaultColor={theme.id}
            onSubmit={async data => { await updateZone(editZone.id, data); setEditZone(null); }}
            onCancel={() => setEditZone(null)}
          />
        </Modal>
      )}

      {deleteZone && (
        <ConfirmDialog
          title={`Remove "${getZoneDisplayName(deleteZone, program.name)}"?`}
          message="This removes the valve from this program and deletes its cycles here. The catalog valve stays on the Valves page."
          confirmLabel="Remove from Program"
          onConfirm={async () => { await removeZone(deleteZone.id); setDeleteZone(null); }}
          onCancel={() => setDeleteZone(null)}
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
