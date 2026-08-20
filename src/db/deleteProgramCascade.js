import { programsRepository } from '../db/programsRepository';
import { zonesRepository } from '../db/zonesRepository';
import { schedulesRepository } from '../db/schedulesRepository';
import { mediaRepository } from '../db/mediaRepository';

export async function deleteProgramCascade(programId) {
  const program = await programsRepository.getById(programId);
  if (!program) return;

  const zones = await zonesRepository.getByProgramId(programId);
  for (const zone of zones) {
    const schedules = await schedulesRepository.getByZoneId(zone.id);
    for (const schedule of schedules) {
      await schedulesRepository.delete(schedule.id);
    }
    await zonesRepository.delete(zone.id);
  }

  if (program.profile_image_id) {
    await mediaRepository.deleteById(program.profile_image_id);
  }
  await programsRepository.delete(programId);
}
