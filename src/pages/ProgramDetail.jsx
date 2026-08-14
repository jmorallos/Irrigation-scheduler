import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Power, Clock, ChevronDown, ChevronRight } from 'lucide-react';
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

function ScheduleRow({ schedule, onEdit, onDelete, onToggle }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${schedule.status === 'inactive' ? 'opacity-60' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {formatCycleLabel(schedule.cycle)}
          </span>
          <span className="font-mono text-sm font-semibold text-slate-700">{formatTime(schedule.start_time)}</span>
          <span className="text-xs text-slate-500">·</span>
          <span className="font-mono text-xs text-slate-500">{formatDuration(schedule.duration_minutes)}</span>
          {schedule.status === 'inactive' && <Badge status="inactive" size="sm" />}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{formatDays(schedule.days_of_week)}</p>
      </div>
      <ActionMenu
        items={[
          { label: 'Edit', icon: Pencil, onClick: onEdit },
          { label: schedule.status === 'active' ? 'Deactivate' : 'Activate', icon: Power, onClick: onToggle },
          { label: 'Delete', icon: Trash2, onClick: onDelete, danger: true },
        ]}
      />
    </div>
  );
}

function ZoneSection({ zone, programName, onEdit, onDelete, onToggle }) {
  const { schedules, createSchedule, updateSchedule, deleteSchedule, toggleStatus: toggleSched } = useSchedules(zone.id);
  const [addSched, setAddSched] = useState(false);
  const [editSched, setEditSched] = useState(null);
  const [deleteSched, setDeleteSched] = useState(null);
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={`bg-white rounded-lg border shadow-sm overflow-hidden ${zone.status === 'inactive' ? 'border-slate-200 opacity-75' : 'border-slate-200'}`}>
      <div className="flex items-center gap-3 px-5 py-4">
        <button onClick={() => setExpanded(!expanded)} className="p-0.5 text-slate-300 hover:text-slate-500">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-navy-900">{getZoneDisplayName(zone, programName)}</span>
            {zone.status === 'inactive' && <Badge status="inactive" size="sm" />}
          </div>
          <span className="text-xs text-slate-400">
            {schedules.length === 0
              ? 'No cycles'
              : schedules.length === 1
                ? '1 cycle'
                : `${schedules.length} cycles`}
          </span>
        </div>
        <ActionMenu
          items={[
            { label: 'Add cycle', icon: Plus, onClick: () => setAddSched(true) },
            { label: 'Edit zone', icon: Pencil, onClick: onEdit },
            { label: zone.status === 'active' ? 'Deactivate' : 'Activate', icon: Power, onClick: onToggle },
            { label: 'Delete zone', icon: Trash2, onClick: onDelete, danger: true },
          ]}
        />
      </div>

      {expanded && (
        <div className="border-t border-slate-100">
          {schedules.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-slate-400">No cycles. <button onClick={() => setAddSched(true)} className="text-brand-600 hover:underline">Add one</button></p>
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {schedules.map(s => (
                <ScheduleRow
                  key={s.id}
                  schedule={s}
                  onEdit={() => setEditSched(s)}
                  onDelete={() => setDeleteSched(s)}
                  onToggle={() => toggleSched(s.id, s.status)}
                />
              ))}
            </div>
          )}
        </div>
      )}

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
    </div>
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
    const updated = await programsRepository.update(programId, data);
    setProgram(updated);
    setEditProg(false);
  };

  if (loadingProg) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-4 w-24 bg-slate-200 rounded" />
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-slate-200 rounded-xl" />
            <div className="flex-1 space-y-2">
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

      {/* Program header */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-start gap-4">
          <ProgramLogo name={program.name} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-navy-900">{program.name}</h1>
              <Badge status={program.status} />
            </div>
            {program.description && <p className="text-sm text-slate-500 mt-1">{program.description}</p>}
            <p className="text-xs text-slate-400 mt-1">{zones.length} zone{zones.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setEditProg(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-blue-50 transition-colors"
            title="Edit program"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Today's schedule for this program */}
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

      {/* Zones */}
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
        <div className="space-y-3">
          {zones.map(zone => (
            <ZoneSection
              key={zone.id}
              zone={zone}
              programName={program.name}
              onEdit={() => setEditZone(zone)}
              onDelete={() => setDeleteZone(zone)}
              onToggle={() => toggleZone(zone.id, zone.status)}
            />
          ))}
        </div>
      )}

      {editProg && (
        <Modal title="Edit Program" onClose={() => setEditProg(false)}>
          <ProgramForm
            initial={program}
            onSubmit={handleUpdateProgram}
            onCancel={() => setEditProg(false)}
          />
        </Modal>
      )}

      {addZone && (
        <Modal title="Add Zone" onClose={() => setAddZone(false)} size="sm">
          <ZoneForm
            onSubmit={async data => { await createZone(data.name, data.status); setAddZone(false); }}
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
          title={`Delete "${deleteZone.name}"?`}
          message="This will also delete all schedules for this zone."
          confirmLabel="Delete Zone"
          onConfirm={async () => { await removeZone(deleteZone.id); setDeleteZone(null); }}
          onCancel={() => setDeleteZone(null)}
        />
      )}
    </div>
  );
}
