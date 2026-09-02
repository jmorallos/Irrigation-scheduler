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
import { formatLastWater } from '../utils/lastWater';
import { useColumnAlign } from '../hooks/useColumnAlign';

const ZONES_ALIGN = {
  number: 'left',
  name: 'left',
  color: 'left',
  program: 'left',
  lastWater: 'left',
};

const TH_ZONES =
  'sticky top-0 z-20 px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider bg-navy-900 select-none [-webkit-tap-highlight-color:transparent]';

export default function Zones() {
  const navigate = useNavigate();
  const { valves, memberships, loading, error, reload, createValve, updateValve, deleteValve } = useAllZones();
  const { programs } = usePrograms();
  const { cycle, cellClass, flexClass } = useColumnAlign('zones-align', ZONES_ALIGN);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const programsById = useMemo(
    () => new Map(programs.map(program => [program.id, program])),
    [programs],
  );

  const groups = useMemo(() => groupValvesCatalog(valves, memberships), [valves, memberships]);
  const suggestedNumber = useMemo(() => nextValveNumber(valves), [valves]);

  if (loading) return <div className="py-16 text-center text-sm text-slate-400">Loading valves…</div>;
  if (error) return <PageError message={`Could not load valves: ${error}`} onRetry={reload} />;

  return (
    <div className="min-w-0 w-full overflow-x-hidden">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Valves</h1>
          <p className="mt-1 text-sm text-slate-500">
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
                  <th onClick={() => cycle('number')} className={TH_ZONES}>Valve #</th>
                  <th onClick={() => cycle('name')} className={TH_ZONES}>Valve Name</th>
                  <th onClick={() => cycle('color')} className={`${TH_ZONES} hidden sm:table-cell`}>Color</th>
                  <th onClick={() => cycle('program')} className={TH_ZONES}>Programs</th>
                  <th onClick={() => cycle('lastWater')} className={`${TH_ZONES} hidden lg:table-cell`}>Last water</th>
                  <th className="sticky top-0 z-20 px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider w-14 bg-navy-900"></th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const valve = group.valve;
                  const theme = getZoneTheme(valve, null);
                  const displayName = getZoneDisplayName(valve);
                  const shortName = getZoneShortName(valve) || displayName;
                  const memberPrograms = programsForMemberships(group.memberships, programsById);
                  const programNames = memberPrograms.map(program => program.name);
                  const firstProgram = memberPrograms[0] ?? null;

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
                      <td className={`px-4 py-4 font-mono font-semibold text-navy-900 ${cellClass('number')}`}>
                        {group.number}
                      </td>
                      <td className={`px-4 py-4 text-navy-900 font-medium ${cellClass('name')}`}>
                        {shortName}
                      </td>
                      <td className={`px-4 py-4 hidden sm:table-cell ${cellClass('color')}`}>
                        <span
                          className="inline-block w-5 h-5 rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: theme.badgeHex }}
                          title={theme.label}
                          aria-label={theme.label}
                        />
                      </td>
                      <td className={`px-4 py-4 ${cellClass('program')}`}>
                        <div className={`flex items-center gap-2 min-w-0 ${flexClass('program')}`}>
                          {memberPrograms.length > 0 && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {memberPrograms.map(program => (
                                <ProgramBadge
                                  key={program.id}
                                  code={program.controller_program}
                                  color={program.color}
                                  size="sm"
                                />
                              ))}
                            </div>
                          )}
                          <span className="truncate text-slate-700">{programNames.join(', ') || '—'}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-4 hidden lg:table-cell text-sm text-slate-600 ${cellClass('lastWater')}`}>
                        {formatLastWater(valve) ?? '—'}
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
          <div className="px-4 py-3 border-t border-slate-100 bg-surface-alt/40 text-xs text-slate-500 text-center">
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
