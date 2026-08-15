import { sortProgramsByController } from '../db/programSort';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';

export async function countOverviewStats(programsRepository) {
  const programs = sortProgramsByController(await programsRepository.getAll());
  let zones = 0;
  let minutes = 0;

  for (const program of programs) {
    const programZones = await zonesRepository.getByProgramId(program.id);
    zones += programZones.length;
    if (program.status !== 'active') continue;

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
    total: programs.length,
    active: programs.filter(p => p.status === 'active').length,
    zones,
    minutes,
  };
}
