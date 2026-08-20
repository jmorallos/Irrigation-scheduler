import { programsRepository } from "./programsRepository";
import { zonesRepository } from "./zonesRepository";
import { valvesRepository } from "./valvesRepository";
import { schedulesRepository } from "./schedulesRepository";
import { SEED_RECORDS } from "./seedRecords";
import { colorFromLetter } from "../utils/programColors";
import { formatZoneName } from "../utils/scheduleUtils";

export async function loadSampleData() {
  const programs = await programsRepository.getAll();
  if (programs.length > 0) {
    throw new Error("Sample data can only be loaded when the app has no programs.");
  }

  const now = new Date().toISOString();
  const valveByNumber = new Map();

  for (const programSeed of SEED_RECORDS) {
    const program = {
      id: crypto.randomUUID(),
      controller_program: programSeed.controller_program ?? null,
      color: programSeed.color ?? colorFromLetter(programSeed.controller_program) ?? "emerald",
      name: programSeed.name,
      description: programSeed.description,
      status: "active",
      created_at: now,
      updated_at: now,
    };
    await programsRepository.putRaw(program);

    const sortedZones = [...programSeed.zones].sort((a, b) => a.valve - b.valve);

    for (const zoneSeed of sortedZones) {
      let valve = valveByNumber.get(zoneSeed.valve);
      if (!valve) {
        valve = {
          id: crypto.randomUUID(),
          zone_number: zoneSeed.valve,
          name: formatZoneName(zoneSeed.valve, zoneSeed.name),
          color: zoneSeed.color ?? program.color,
          profile_image_id: null,
          created_at: now,
          updated_at: now,
        };
        await valvesRepository.putRaw(valve);
        valveByNumber.set(zoneSeed.valve, valve);
      }

      const membership = {
        id: crypto.randomUUID(),
        program_id: program.id,
        valve_id: valve.id,
        status: "active",
        created_at: now,
        updated_at: now,
      };
      await zonesRepository.putRaw(membership);

      for (const scheduleSeed of zoneSeed.schedules) {
        await schedulesRepository.putRaw({
          id: crypto.randomUUID(),
          zone_id: membership.id,
          start_time: scheduleSeed.start_time,
          duration_minutes: scheduleSeed.duration_minutes,
          days_of_week: scheduleSeed.days_of_week,
          status: scheduleSeed.status,
          notes: scheduleSeed.notes ?? '',
          created_at: now,
          updated_at: now,
        });
      }
    }
  }
}
