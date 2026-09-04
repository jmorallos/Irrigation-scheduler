import { programsRepository } from "./programsRepository";
import { zonesRepository } from "./zonesRepository";
import { valvesRepository } from "./valvesRepository";
import { schedulesRepository } from "./schedulesRepository";
import { SEED_RECORDS } from "./seedRecords";
import { colorFromLetter } from "../utils/programColors";
import { formatZoneName } from "../utils/scheduleUtils";
import { programSchedulePayload } from "../utils/programSchedule";
import { lastWaterPayload } from "../utils/lastWater";
import { normalizeGph } from "../utils/waterUsage";

function seedProgramScheduleFields(programSeed) {
  return programSchedulePayload({
    watering_mode: programSeed.watering_mode,
    interval_days: programSeed.interval_days,
    program_start_date: programSeed.program_start_date,
    program_end_mode: programSeed.program_end_date ? "date" : "never",
    program_end_date: programSeed.program_end_date,
    never_on_days: programSeed.never_on_days,
  });
}

function seedValveFields(zoneSeed) {
  return {
    gph: normalizeGph(zoneSeed.gph),
    ...lastWaterPayload(zoneSeed),
    profile_image_id: null,
  };
}

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
      profile_image_id: null,
      created_at: now,
      updated_at: now,
      ...seedProgramScheduleFields(programSeed),
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
          created_at: now,
          updated_at: now,
          ...seedValveFields(zoneSeed),
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
          notes: scheduleSeed.notes ?? "",
          created_at: now,
          updated_at: now,
        });
      }
    }
  }
}
