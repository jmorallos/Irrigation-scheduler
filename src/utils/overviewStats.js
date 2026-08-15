import { sortProgramsByController } from '../db/programSort';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';

export async function countOverviewStats(programsRepository) {
  const programs = sortProgramsByController(await programsRepository.getAll());
  let starts = 0;
  let minutes = 0;

  for (const program of programs) {
    if (program.status !== 'active') continue;
    const programZones = await zonesRepository.getByProgramId(program.id);

    for (const zone of programZones) {
      if (zone.status !== 'active') continue;
      const schedules = await schedulesRepository.getByZoneId(zone.id);

      for (const schedule of schedules) {
        if (schedule.status !== 'active') continue;
        starts += 1;
        minutes += Number(schedule.duration_minutes) || 0;
      }
    }
  }

  return {
    total: programs.length,
    active: programs.filter(p => p.status === 'active').length,
    starts,
    minutes,
  };
}
