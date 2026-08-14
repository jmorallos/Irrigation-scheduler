import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Power, Clock } from 'lucide-react';
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
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import ActionMenu from '../components/ActionMenu';
import { formatTime, formatDuration, formatDays } from '../utils/dateUtils';
import { formatCycleLabel, getZoneDisplayName } from '../utils/scheduleUtils';
import { applyProfileImageChange } from '../utils/profileImageService';
import { usePrograms } from '../hooks/usePrograms';

function ZoneIdentity({ zone, programName, avatarSize = 'w-10 h-10' }) {
  const displayName = getZoneDisplayName(zone, programName);
  return (
    <div className="flex items-center gap-2.5 min-w-0 flex-1">
      <div className={`${avatarSize} flex-shrink-0`}>
        <ProgramLogo name={displayName} profileImageId={zone.profile_image_id} size="fill" square />
      </div>
      <div className="min-w-0 flex flex-col justify-center">
        <p className="text-sm font-semibold text-navy-900 leading-snug">{displayName}</p>
        {zone.status === 'inactive' && <Badge status="inactive" size="sm" />}
      </div>
    </div>
  );
}

function useZoneCycles(zone, { onEditZone, onDeleteZone, onToggleZone }) {
  const { schedules, createSchedule, updateSchedule, deleteSchedule, toggleStatus: toggleSched } = useSchedules(zone.id);
  const [addSched, setAddSched] = useState(false);
  const [editSched, setEditSched] = useState(null);
  const [deleteSched, setDeleteSched] = useState(null);

  const zoneMenuItems = [
    { label: 'Add cycle', icon: Plus, onClick: () => setAddSched(true) },
    { label: 'Edit zone', icon: Pencil, onClick: onEditZone },
    { label: zone.status === 'active' ? 'Deactivate zone' : 'Activate zone', icon: Power, onClick: onToggleZone },
    { label: 'Delete zone', icon: Trash2, onClick: onDeleteZone, danger: true },
  ];

  const scheduleMenuItems = schedule => [
    { label: 'Edit', icon: Pencil, onClick: () => setEditSched(schedule) },
    {
      label: schedule.status === 'active' ? 'Deactivate' : 'Activate',
      icon: Power,
      onClick: () => toggleSched(schedule.id, schedule.status),
    },
    { label: 'Delete', icon: Trash2, onClick: () => setDeleteSched(schedule), danger: true },
  ];

  const modals = (
    <>
      {addSched && (
        <Modal title="Add Cycle" onClose={() => setAddSched(false)}>
          <ScheduleForm
            onSubmit={async data => { await createSchedule(data); setAddSched(false); }}
            onCancel={() => setAddSched(false)}
          />
        </Modal>
      )}
      {editSched && (
        <Modal title="Edit Cycle" onClose={() => setEditSched(null)}>
          <ScheduleForm
            initial={editSched}
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

  return { schedules, zoneMenuItems, scheduleMenuItems, modals, setAddSched };
}

function ZoneCard({ zone, programName, onEditZone, onDeleteZone, onToggleZone }) {
  const { schedules, zoneMenuItems, scheduleMenuItems, modals, setAddSched } = useZoneCycles(zone, {
    onEditZone,
    onDeleteZone,
    onToggleZone,
  });

  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden ${zone.status === 'inactive' ? 'opacity-75' : ''}`}>
      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 flex-shrink-0">
            <ProgramLogo
              name={getZoneDisplayName(zone, programName)}
              profileImageId={zone.profile_image_id}
              size="fill"
              square
            />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <p className="text-sm font-semibold text-navy-900 leading-snug">{getZoneDisplayName(zone, programName)}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {schedules.length} cycle{schedules.length !== 1 ? 's' : ''}
            </p>
            {zone.status === 'inactive' && (
              <div className="mt-1">
                <Badge status="inactive" size="sm" />
              </div>
            )}
          </div>
        </div>
        <ActionMenu items={zoneMenuItems} label="Zone actions" />
      </div>

      {schedules.length === 0 ? (
        <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400">
          No cycles.{' '}
          <button type="button" onClick={() => setAddSched(true)} className="text-brand-600 hover:underline">
            Add one
          </button>
        </div>
      ) : (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {schedules.map(schedule => (
            <div
              key={schedule.id}
              className={`flex items-start justify-between gap-3 px-4 py-3 ${schedule.status === 'inactive' ? 'opacity-60' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {formatCycleLabel(schedule.cycle)}
                  </span>
                  <span className="font-mono text-sm font-semibold text-navy-900">{formatTime(schedule.start_time)}</span>
                  <span className="font-mono text-xs text-slate-600">{formatDuration(schedule.duration_minutes)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{formatDays(schedule.days_of_week)}</p>
              </div>
              <ActionMenu items={scheduleMenuItems(schedule)} />
            </div>
          ))}
        </div>
      )}

      {modals}
    </div>
  );
}

function ZoneTableRows({ zone, programName, onEditZone, onDeleteZone, onToggleZone, isFirstZone }) {
  const { schedules, zoneMenuItems, scheduleMenuItems, modals, setAddSched } = useZoneCycles(zone, {
    onEditZone,
    onDeleteZone,
    onToggleZone,
  });

  const rows = schedules.length === 0
    ? [{ id: `${zone.id}-empty`, empty: true }]
    : schedules;

  return (
    <>
      {rows.map((schedule, index) => {
        const isFirstRow = index === 0;
        const rowBorder = isFirstRow && !isFirstZone ? 'border-t-2 border-slate-200' : 'border-t border-slate-100';

        if (schedule.empty) {
          return (
            <tr key={schedule.id} className={`${rowBorder} bg-white`}>
              <td className="px-4 py-3 align-middle">
                <div className="flex items-center justify-between gap-2">
                  <ZoneIdentity zone={zone} programName={programName} avatarSize="w-10 h-10" />
                  <ActionMenu items={zoneMenuItems} label="Zone actions" />
                </div>
              </td>
              <td colSpan={4} className="px-4 py-3 text-xs text-slate-400">
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
            className={`${rowBorder} bg-white ${schedule.status === 'inactive' ? 'opacity-60' : ''}`}
          >
            <td className="px-4 py-3 align-middle">
              {index === 0 ? (
                <div className="flex items-center justify-between gap-2">
                  <ZoneIdentity zone={zone} programName={programName} avatarSize="w-10 h-10" />
                  <ActionMenu items={zoneMenuItems} label="Zone actions" />
                </div>
              ) : null}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {formatCycleLabel(schedule.cycle)}
              </span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <span className="font-mono text-sm font-semibold text-navy-900">{formatTime(schedule.start_time)}</span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <span className="font-mono text-xs text-slate-600">{formatDuration(schedule.duration_minutes)}</span>
            </td>
            <td className="px-4 py-3">
              <span className="text-xs text-slate-500">{formatDays(schedule.days_of_week)}</span>
            </td>
            <td className="px-4 py-3 text-right whitespace-nowrap">
              <ActionMenu items={scheduleMenuItems(schedule)} />
            </td>
          </tr>
        );
      })}

      {modals}
    </>
  );
}

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
  const { zones, createZone, updateZone, deleteZone: removeZone, toggleStatus: toggleZone } = useZones(programId);
  const { programs: allPrograms } = usePrograms();
  const { items: todayItems } = useTodaySchedule();
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

  return (
    <div>
      <Link to="/programs" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-900 mb-6">
        <ArrowLeft className="w-4 h-4" /> Programs
      </Link>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="flex min-h-[6.5rem]">
          <div className="w-[6.5rem] sm:w-28 flex-shrink-0">
            <ProgramLogo
              name={program.name}
              profileImageId={program.profile_image_id}
              size="fill"
              square
            />
          </div>
          <div className="flex-1 min-w-0 px-4 py-4 sm:px-6 flex flex-col justify-center">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-navy-900">{program.name}</h1>
              <Badge status={program.status} />
            </div>
            {program.description && <p className="text-sm text-slate-500 mt-1">{program.description}</p>}
            <p className="text-xs text-slate-400 mt-1">{zones.length} zone{zones.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setEditProg(true)}
            className="self-start m-3 sm:m-4 p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-blue-50 transition-colors flex-shrink-0"
            title="Edit program"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </div>

      {todayForProgram.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 mb-6">
          <h2 className="text-xs font-semibold text-navy-900 uppercase tracking-wider mb-3">{"Today's Schedule"}</h2>
          <div className="space-y-2">
            {todayForProgram.map(item => (
              <div key={item.schedule.id} className="flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-14">
                  {formatCycleLabel(item.schedule.cycle)}
                </span>
                <span className="font-mono text-sm font-semibold text-navy-900">{formatTime(item.schedule.start_time)}</span>
                <span className="text-sm text-slate-600">{getZoneDisplayName(item.zone, program.name)}</span>
                <span className="text-xs font-mono text-slate-500 ml-auto">{formatDuration(item.schedule.duration_minutes)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-navy-900">Zones</h2>
        <button
          onClick={() => setAddZone(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Zone
        </button>
      </div>

      {zones.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No zones yet"
          description="Add a zone to start creating schedules."
          action={{ label: 'Add Zone', onClick: () => setAddZone(true) }}
        />
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {zones.map(zone => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                programName={program.name}
                onEditZone={() => setEditZone(zone)}
                onDeleteZone={() => setDeleteZone(zone)}
                onToggleZone={() => toggleZone(zone.id, zone.status)}
              />
            ))}
          </div>

          <div className="hidden md:block bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-navy-900 text-white">
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Zone</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Cycle</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Start</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Duration</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Days</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider w-12" />
                </tr>
              </thead>
              <tbody>
                {zones.map((zone, zoneIndex) => (
                  <ZoneTableRows
                    key={zone.id}
                    zone={zone}
                    programName={program.name}
                    isFirstZone={zoneIndex === 0}
                    onEditZone={() => setEditZone(zone)}
                    onDeleteZone={() => setDeleteZone(zone)}
                    onToggleZone={() => toggleZone(zone.id, zone.status)}
                  />
                ))}
              </tbody>
            </table>
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
        <Modal title="Add Zone" onClose={() => setAddZone(false)} size="sm">
          <ZoneForm
            onSubmit={async data => { await createZone(data); setAddZone(false); }}
            onCancel={() => setAddZone(false)}
          />
        </Modal>
      )}

      {editZone && (
        <Modal title="Edit Zone" onClose={() => setEditZone(null)} size="sm">
          <ZoneForm
            initial={editZone}
            onSubmit={async data => { await updateZone(editZone.id, data); setEditZone(null); }}
            onCancel={() => setEditZone(null)}
          />
        </Modal>
      )}

      {deleteZone && (
        <ConfirmDialog
          title={`Delete "${getZoneDisplayName(deleteZone, program.name)}"?`}
          message="This will also delete all schedules for this zone."
          confirmLabel="Delete Zone"
          onConfirm={async () => { await removeZone(deleteZone.id); setDeleteZone(null); }}
          onCancel={() => setDeleteZone(null)}
        />
      )}
    </div>
  );
}
