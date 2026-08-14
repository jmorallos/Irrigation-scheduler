import { programsRepository } from "./programsRepository";
import { zonesRepository } from "./zonesRepository";
import { schedulesRepository } from "./schedulesRepository";
import { SEED_RECORDS } from "./seedRecords";

export async function loadSampleData() {
  const programs = await programsRepository.getAll();
  if (programs.length > 0) {
    throw new Error("Sample data can only be loaded when the app has no programs.");
  }

  const now = new Date().toISOString();

  for (const programSeed of SEED_RECORDS) {
    const program = {
      id: crypto.randomUUID(),
      controller_program: programSeed.controller_program ?? null,
      name: programSeed.name,
      description: programSeed.description,
      status: "active",
      created_at: now,
      updated_at: now,
    };
    await programsRepository.putRaw(program);

    const sortedZones = [...programSeed.zones].sort((a, b) => a.valve - b.valve);

    for (const zoneSeed of sortedZones) {
      const zone = {
        id: crypto.randomUUID(),
        program_id: program.id,
        name: `Zone ${zoneSeed.valve} · ${zoneSeed.name}`,
        status: "active",
        created_at: now,
        updated_at: now,
      };
      await zonesRepository.putRaw(zone);

      for (const scheduleSeed of zoneSeed.schedules) {
        await schedulesRepository.putRaw({
          id: crypto.randomUUID(),
          zone_id: zone.id,
          start_time: scheduleSeed.start_time,
          duration_minutes: scheduleSeed.duration_minutes,
          days_of_week: scheduleSeed.days_of_week,
          status: scheduleSeed.status,
          cycle: scheduleSeed.cycle ?? 1,
          created_at: now,
          updated_at: now,
        });
      }
    }
  }
}
