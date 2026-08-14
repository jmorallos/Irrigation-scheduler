import { sortProgramsByController } from '../db/programSort';
import { zonesRepository } from '../db/zonesRepository';

export async function countOverviewStats(programsRepository) {
  const programs = sortProgramsByController(await programsRepository.getAll());
  let zones = 0;

  for (const program of programs) {
    const programZones = await zonesRepository.getByProgramId(program.id);
    zones += programZones.length;
  }

  return {
    total: programs.length,
    active: programs.filter(p => p.status === 'active').length,
    zones,
  };
}
