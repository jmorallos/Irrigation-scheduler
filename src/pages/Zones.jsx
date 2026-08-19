import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Pencil, Eye } from 'lucide-react';
import { useAllZones } from '../hooks/useZones';
import { usePrograms } from '../hooks/usePrograms';
import Modal from '../components/Modal';
import ZoneForm from '../components/ZoneForm';
import ProgramLogo from '../components/ProgramLogo';
import ProgramBadge from '../components/ProgramBadge';
import EmptyState from '../components/EmptyState';
import PageError from '../components/PageError';
import ActionMenu from '../components/ActionMenu';
import { getZoneDisplayName, getZoneNumber, getZoneShortName } from '../utils/scheduleUtils';
import { groupZonesByNumber, takenZoneNumbers } from '../utils/zoneIdentity';
import { getZoneTheme } from '../utils/programColors';
import { useColumnAlign } from '../hooks/useColumnAlign';

const ZONES_ALIGN = {
  number: 'left',
  name: 'left',
  color: 'left',
  program: 'left',
};

const TH_ZONES =
  'sticky top-0 z-20 px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider bg-navy-900 select-none [-webkit-tap-highlight-color:transparent]';

export default function Zones() {
  const navigate = useNavigate();
  const { zones, loading, error, reload, updateZone } = useAllZones();
  const { programs } = usePrograms();
  const { cycle, cellClass, flexClass } = useColumnAlign('zones-align', ZONES_ALIGN);
  const [editing, setEditing] = useState(null);

  const programsById = useMemo(
    () => new Map(programs.map(program => [program.id, program])),
    [programs],
  );

  const groups = useMemo(() => groupZonesByNumber(zones), [zones]);

  const editExcludeIds = editing
    ? editing.members.map(zone => zone.id)
    : [];

  if (loading) return <div className="py-16 text-center text-sm text-slate-400">Loading valves…</div>;
  if (error) return <PageError message={`Could not load valves: ${error}`} onRetry={reload} />;

  return (
    <div className="min-w-0 w-full overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Valves</h1>
        <p className="mt-1 text-sm text-slate-500">Each valve number is unique. Edit a valve once and it updates everywhere.</p>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <EmptyState
            icon={MapPin}
            title="No valves yet"
            description="Add a valve from a program. Valve numbers cannot be reused."
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
                  <th onClick={() => cycle('program')} className={TH_ZONES}>Program</th>
                  <th className="sticky top-0 z-20 px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider w-14 bg-navy-900"></th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const zone = group.zone;
                  const program = programsById.get(zone.program_id);
                  const theme = getZoneTheme(zone, program);
                  const displayName = getZoneDisplayName(zone, program?.name);
                  const shortName = getZoneShortName(zone) || displayName;
                  const programNames = [...new Set(
                    group.members
                      .map(member => programsById.get(member.program_id)?.name)
                      .filter(Boolean),
                  )];
                  const firstProgram = programsById.get(group.members[0].program_id);

                  return (
                    <tr
                      key={group.number}
                      role="link"
                      tabIndex={0}
                      onClick={() => {
                        if (firstProgram) navigate(`/programs/${firstProgram.id}`, { state: { program: firstProgram } });
                      }}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && firstProgram) {
                          e.preventDefault();
                          navigate(`/programs/${firstProgram.id}`, { state: { program: firstProgram } });
                        }
                      }}
                      className={`border-b ${theme.border} last:border-0 cursor-pointer transition-colors duration-200 ease-in-out ${theme.row} ${theme.hover}`}
                      style={{ backgroundColor: theme.rowHex, borderColor: theme.borderHex }}
                    >
                      <td className="p-0 w-[4.5rem] min-w-[4.5rem] h-px">
                        <div className="h-full min-h-[4.5rem] w-full">
                          <ProgramLogo
                            name={displayName}
                            profileImageId={zone.profile_image_id}
                            size="fill"
                            square
                          />
                        </div>
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
                          {firstProgram && (
                            <ProgramBadge
                              code={firstProgram.controller_program}
                              color={firstProgram.color}
                              size="sm"
                            />
                          )}
                          <span className="truncate text-slate-700">{programNames.join(', ') || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <ActionMenu
                          items={[
                            firstProgram && {
                              label: 'View program',
                              icon: Eye,
                              to: `/programs/${firstProgram.id}`,
                            },
                            { label: 'Edit', icon: Pencil, onClick: () => setEditing(group) },
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

      {editing && (
        <Modal title="Edit Valve" onClose={() => setEditing(null)} size="sm">
          <ZoneForm
            initial={editing.zone}
            existingNumbers={takenZoneNumbers(zones, editExcludeIds)}
            defaultColor={editing.zone.color}
            onSubmit={async data => {
              await updateZone(editing.zone.id, data);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}
