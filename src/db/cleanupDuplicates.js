import { programsRepository } from './programsRepository';
import { deleteProgramCascade } from './deleteProgramCascade';

/** Remove duplicate programs (same name), keeping the oldest record. */
export async function cleanupDuplicatePrograms() {
  const programs = await programsRepository.getAll();
  const sorted = [...programs].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const seen = new Set();

  for (const program of sorted) {
    const key = program.name.trim().toLowerCase();
    if (seen.has(key)) {
      await deleteProgramCascade(program.id);
    } else {
      seen.add(key);
    }
  }
}
