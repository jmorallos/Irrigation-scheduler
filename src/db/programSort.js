export function sortProgramsByController(programs) {
  return [...programs].sort((a, b) => {
    const codeA = (a.controller_program ?? "ZZ").toUpperCase();
    const codeB = (b.controller_program ?? "ZZ").toUpperCase();
    const byCode = codeA.localeCompare(codeB);
    if (byCode !== 0) return byCode;
    return a.name.localeCompare(b.name);
  });
}
