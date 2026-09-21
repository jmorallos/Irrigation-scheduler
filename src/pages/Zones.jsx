import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToggleLeft, Pencil, Eye, Plus, Trash2 } from 'lucide-react';
import { useAllZones } from '../hooks/useZones';
import { usePrograms } from '../hooks/usePrograms';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ZoneForm from '../components/ZoneForm';
import ProgramLogo from '../components/ProgramLogo';
import PhotoPreview from '../components/PhotoPreview';
import ProgramBadge from '../components/ProgramBadge';
import EmptyState from '../components/EmptyState';
import PageError from '../components/PageError';
import ActionMenu from '../components/ActionMenu';
import { getZoneDisplayName, getZoneShortName } from '../utils/scheduleUtils';
import { groupValvesCatalog, nextValveNumber, takenValveNumbers, programsForMemberships } from '../utils/zoneIdentity';
import { getZoneTheme } from '../utils/programColors';
import { computeLatestLastWater, formatRunAt, formatRunTime, groupSchedulesByZoneId } from '../utils/valveRuns';

const TH_ZONES =
  'sticky top-0 z-20 px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider bg-navy-900 select-none cursor-pointer [-webkit-tap-highlight-color:transparent]';

function compareNullableNumber(a, b) {
  const aNull = a == null || Number.isNaN(a);
  const bNull = b == null || Number.isNaN(b);
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  return a - b;
}

function compareNullableText(a, b) {
  const aEmpty = a == null || a === '';
  const bEmpty = b == null || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  return String(a).localeCompare(String(b));
}

function compareRows(a, b, key) {
  switch (key) {
    case 'number':
      return compareNullableNumber(
        a.number == null ? null : Number(a.number),
        b.number == null ? null : Number(b.number),
      );
    case 'name':
      return compareNullableText(a.nameKey, b.nameKey);
    case 'program':
      return compareNullableText(a.programKey, b.programKey);
    case 'lastWater':
      return compareNullableText(
        a.lastWater ? `${a.lastWater.date}T${a.lastWater.startTime ?? ''}` : null,
        b.lastWater ? `${b.lastWater.date}T${b.lastWater.startTime ?? ''}` : null,
      );
    case 'time':
      return compareNullableText(a.lastWater?.startTime, b.lastWater?.startTime);
    case 'minutes':
      return compareNullableNumber(a.lastWater?.durationMinutes, b.lastWater?.durationMinutes);
    default:
      return 0;
  }
}

function sortMark(sort, key) {
  if (sort.key !== key) return '';
  return sort.dir === 'asc' ? ' ↑' : ' ↓';
}

export default function Zones() {
  const navigate = useNavigate();
  const { valves, memberships, schedules, loading, error, reload, createValve, updateValve, deleteValve } = useAllZones();
  const { programs } = usePrograms();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [sort, setSort] = useState({ key: null, dir: 'asc' });

  const programsById = useMemo(
    () => new Map(programs.map(program => [program.id, program])),
    [programs],
  );

  const groups = useMemo(() => groupValvesCatalog(valves, memberships), [valves, memberships]);
  const suggestedNumber = useMemo(() => nextValveNumber(valves), [valves]);
  const schedulesByMembershipId = useMemo(() => groupSchedulesByZoneId(schedules), [schedules]);

  const rows = useMemo(() => {
    const list = groups.map((group) => {
      const valve = group.valve;
      const displayName = getZoneDisplayName(valve);
      const shortName = getZoneShortName(valve) || displayName;
      const memberPrograms = programsForMemberships(group.memberships, programsById);
      const programPrefixes = memberPrograms.map(program => program.controller_program).filter(Boolean);
      const lastWater = computeLatestLastWater({
        memberships: group.memberships,
        programsById,
        schedulesByMembershipId,
      });
      return {
        group,
        valve,
        displayName,
        shortName,
        memberPrograms,
        firstProgram: memberPrograms[0] ?? null,
        lastWater,
        number: group.number,
        nameKey: shortName.toLowerCase(),
        programKey: programPrefixes.join(', ').toLowerCase(),
      };
    });
    if (!sort.key) return list;
    return [...list].sort((a, b) => {
      let cmp = compareRows(a, b, sort.key);
      if (cmp === 0) cmp = compareNullableNumber(Number(a.number), Number(b.number));
      return sort.dir === 'desc' ? -cmp : cmp;
    });
  }, [groups, programsById, schedulesByMembershipId, sort]);

  const toggleSort = (key) => {
    setSort(prev => (
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    ));
  };

  if (loading) return <div className="py-16 text-center text-sm text-black">Loading valves…</div>;
  if (error) return <PageError message={`Could not load valves: ${error}`} onRetry={reload} />;

  return (
    <div className="min-w-0 w-full">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Valves</h1>
          <p className="mt-1 text-sm text-black">
            Create numbered valves here, then add them to programs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Valve
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <EmptyState
            icon={ToggleLeft}
            title="No valves yet"
            description="Create valves here first, then add them to programs from the program page."
            action={{ label: 'Add Valve', onClick: () => setCreating(true) }}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="table-h-scroll">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="text-white">
                  <th className="sticky top-0 z-20 w-[4.5rem] min-w-[4.5rem] p-0 bg-navy-900" aria-hidden="true"></th>
                  <th onClick={() => toggleSort('number')} className={TH_ZONES}>
                    Valve #{sortMark(sort, 'number')}
                  </th>
                  <th onClick={() => toggleSort('name')} className={TH_ZONES}>
                    Valve Name{sortMark(sort, 'name')}
                  </th>
                  <th onClick={() => toggleSort('program')} className={TH_ZONES}>
                    Program{sortMark(sort, 'program')}
                  </th>
                  <th onClick={() => toggleSort('lastWater')} className={TH_ZONES}>
                    Last Water{sortMark(sort, 'lastWater')}
                  </th>
                  <th onClick={() => toggleSort('time')} className={TH_ZONES}>
                    Time{sortMark(sort, 'time')}
                  </th>
                  <th onClick={() => toggleSort('minutes')} className={TH_ZONES}>
                    Minutes{sortMark(sort, 'minutes')}
                  </th>
                  <th className="sticky top-0 z-20 px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider w-14 bg-navy-900"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const { group, valve, displayName, shortName, memberPrograms, firstProgram, lastWater } = row;
                  const theme = getZoneTheme(valve, null);

                  return (
                    <tr
                      key={valve.id}
                      className={`border-b ${theme.border} last:border-0 ${theme.row} ${theme.hover}`}
                      style={{ backgroundColor: theme.rowHex, borderColor: theme.borderHex }}
                    >
                      <td className="p-0 w-[4.5rem] min-w-[4.5rem] h-px">
                        {valve.profile_image_id ? (
                          <button
                            type="button"
                            onClick={() => setPhotoPreview({
                              profileImageId: valve.profile_image_id,
                              name: shortName,
                            })}
                            className="block h-full min-h-[4.5rem] w-full text-left [-webkit-tap-highlight-color:transparent] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600"
                            aria-label={`View photo of ${shortName}`}
                          >
                            <ProgramLogo
                              name={displayName}
                              profileImageId={valve.profile_image_id}
                              size="fill"
                              square
                            />
                          </button>
                        ) : (
                          <div className="h-full min-h-[4.5rem] w-full">
                            <ProgramLogo
                              name={displayName}
                              profileImageId={valve.profile_image_id}
                              size="fill"
                              square
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 font-mono font-semibold text-navy-900 text-left">
                        {group.number ?? '—'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-navy-900 font-medium text-left">
                        {shortName || '—'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-left">
                        {memberPrograms.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {memberPrograms.map(program => (
                              <ProgramBadge
                                key={program.id}
                                code={program.controller_program}
                                color={program.color}
                                size="sm"
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-black">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-black text-left">
                        {lastWater ? formatRunAt(lastWater.date, null) : '—'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-black text-left">
                        {lastWater?.startTime ? formatRunTime(lastWater.startTime) : '—'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-black text-left font-mono">
                        {lastWater?.durationMinutes != null ? lastWater.durationMinutes : '—'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <ActionMenu
                          items={[
                            firstProgram && {
                              label: 'View program',
                              icon: Eye,
                              onClick: () => navigate(`/programs/${firstProgram.id}`, { state: { program: firstProgram } }),
                            },
                            { label: 'Edit', icon: Pencil, onClick: () => setEditing(valve) },
                            {
                              label: 'Delete',
                              icon: Trash2,
                              onClick: () => setDeleting(valve),
                              danger: true,
                            },
                          ].filter(Boolean)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 bg-surface-alt/40 text-xs text-black text-center">
            {groups.length} valve{groups.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {creating && (
        <Modal title="Add Valve" onClose={() => setCreating(false)}>
          <ZoneForm
            suggestedNumber={suggestedNumber}
            existingNumbers={takenValveNumbers(valves)}
            showStatus={false}
            onSubmit={async data => {
              await createValve(data);
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Valve" onClose={() => setEditing(null)}>
          <ZoneForm
            initial={editing}
            existingNumbers={takenValveNumbers(valves, editing.id)}
            showStatus={false}
            onSubmit={async data => {
              await updateValve(editing.id, data);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete Valve ${deleting.zone_number}?`}
          message="This removes the valve from your catalog. It must not be used in any program."
          confirmLabel="Delete Valve"
          onConfirm={async () => {
            await deleteValve(deleting.id);
            setDeleting(null);
          }}
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
