import { dedupeProgramsByName } from "../utils/scheduleUtils";

export function sortProgramsByController(programs) {
  const deduped = dedupeProgramsByName(programs);

  return deduped.sort((a, b) => {
    const codeA = (a.controller_program ?? "ZZ").toUpperCase();
    const codeB = (b.controller_program ?? "ZZ").toUpperCase();
    const byCode = codeA.localeCompare(codeB);
    if (byCode !== 0) return byCode;
    return a.name.localeCompare(b.name);
  });
}
