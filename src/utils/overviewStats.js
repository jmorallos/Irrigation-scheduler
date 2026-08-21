import { sortProgramsByController } from '../db/programSort';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { valvesRepository } from '../db/valvesRepository';

export async function countOverviewStats(programsRepository) {
  const [programs, catalogValves] = await Promise.all([
    programsRepository.getAll(),
    valvesRepository.getAll(),
  ]);
  const sorted = sortProgramsByController(programs);
  let minutes = 0;

  for (const program of sorted) {
    if (program.status !== 'active') continue;
    const programZones = await zonesRepository.getByProgramId(program.id);

    for (const zone of programZones) {
      if (zone.status !== 'active') continue;
      const schedules = await schedulesRepository.getByZoneId(zone.id);

      for (const schedule of schedules) {
        if (schedule.status !== 'active') continue;
        minutes += Number(schedule.duration_minutes) || 0;
      }
    }
  }

  return {
    total: sorted.length,
    active: sorted.filter(p => p.status === 'active').length,
    zones: catalogValves.length,
    minutes,
  };
}
