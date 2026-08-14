import { programsRepository } from './programsRepository';
import { zonesRepository } from './zonesRepository';
import { schedulesRepository } from './schedulesRepository';

export async function seedIfEmpty() {
  const programs = await programsRepository.getAll();
  if (programs.length > 0) return;

  const now = new Date().toISOString();

  const program = {
    id: crypto.randomUUID(),
    name: 'Front Garden',
    description: 'Main front yard irrigation program',
    status: 'active',
    created_at: now,
    updated_at: now,
  };
  await programsRepository.putRaw(program);

  const zone1 = {
    id: crypto.randomUUID(),
    program_id: program.id,
    name: 'Lawn',
    status: 'active',
    created_at: now,
    updated_at: now,
  };
  const zone2 = {
    id: crypto.randomUUID(),
    program_id: program.id,
    name: 'Flower Beds',
    status: 'active',
    created_at: now,
    updated_at: now,
  };
  const zone3 = {
    id: crypto.randomUUID(),
    program_id: program.id,
    name: 'Side Garden',
    status: 'active',
    created_at: now,
    updated_at: now,
  };
  await zonesRepository.putRaw(zone1);
  await zonesRepository.putRaw(zone2);
  await zonesRepository.putRaw(zone3);

  const schedules = [
    {
      id: crypto.randomUUID(),
      zone_id: zone1.id,
      start_time: '06:00',
      duration_minutes: 15,
      days_of_week: ['mon', 'wed', 'fri'],
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      zone_id: zone2.id,
      start_time: '06:20',
      duration_minutes: 10,
      days_of_week: ['mon', 'wed', 'fri'],
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      zone_id: zone3.id,
      start_time: '06:35',
      duration_minutes: 20,
      days_of_week: ['tue', 'thu', 'sat'],
      status: 'active',
      created_at: now,
      updated_at: now,
    },
  ];
  for (const s of schedules) {
    await schedulesRepository.putRaw(s);
  }
}
