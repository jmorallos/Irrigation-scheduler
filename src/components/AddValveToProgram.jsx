import { useState } from 'react';
import { getZoneShortName } from '../utils/scheduleUtils';
import ProgramLogo from './ProgramLogo';

export default function AddValveToProgram({
  catalogValves,
  programValveCounts = {},
  onAddExisting,
  onCreateNew,
  onCancel,
}) {
  const [creating, setCreating] = useState(false);

  if (creating) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setCreating(false)}
          className="mb-4 text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          ← Back to existing valves
        </button>
        {onCreateNew({ onDone: () => setCreating(false) })}
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-600 mb-4">
        Choose a valve from your catalog. You can add the same valve more than once for another set of cycles, as long as times do not overlap.
      </p>
      {catalogValves.length === 0 ? (
        <p className="text-sm text-slate-500 mb-4">No catalog valves yet. Create one below.</p>
      ) : (
        <ul className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {catalogValves.map(valve => {
            const count = programValveCounts[valve.id] ?? 0;
            return (
              <li key={valve.id}>
                <button
                  type="button"
                  onClick={() => onAddExisting(valve.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 hover:border-brand-400 hover:bg-blue-50/50 text-left transition-colors"
                >
                  <ProgramLogo
                    name={valve.name}
                    profileImageId={valve.profile_image_id}
                    size="md"
                    square
                  />
                  <span className="font-mono font-semibold text-navy-900">{valve.zone_number}</span>
                  <span className="text-sm text-navy-900 truncate flex-1">
                    {getZoneShortName(valve) || valve.name}
                  </span>
                  {count > 0 && (
                    <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                      In program ×{count} · Add again
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="px-5 py-2.5 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          Create new valve
        </button>
      </div>
    </div>
  );
}
