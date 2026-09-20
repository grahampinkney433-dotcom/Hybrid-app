import libraryFile from './workout-library.json';
import { getSeedState, setSeedState, putWorkouts, listWorkouts } from './repo';
import type { Workout } from '../core/types';

// The shape of workout-library.json. Note the file uses snake_case `duration_min`,
// which we map to our camelCase `durationMin` below.
interface LibraryWorkout {
  id: string;
  name: string;
  category: Workout['category'];
  equipment: string[];
  duration_min: number;
  difficulty: Workout['difficulty'];
  purpose: string;
  warmup: string;
  blocks: { name: string; detail: string }[];
  cooldown: string;
  scaling: { down: string; up: string };
}
interface LibraryFile {
  version: number;
  count: number;
  workouts: LibraryWorkout[];
}

const library = libraryFile as unknown as LibraryFile;

// Memoised so that concurrent callers (startup + a screen mounting) share ONE run and
// all await the same completion — a fresh install never briefly shows an empty library.
let inFlight: Promise<void> | null = null;

// Seeds the 100 library workouts into the database on first run, and re-seeds when the
// file's `version` increases (e.g. you ship an updated library). User-created workouts
// (source: 'user') are never touched — only 'library' rows are refreshed.
export function seedLibraryIfNeeded(): Promise<void> {
  if (!inFlight) inFlight = runSeed();
  return inFlight;
}

async function runSeed(): Promise<void> {
  const seed = await getSeedState();
  if (seed && seed.version >= library.version) return; // already up to date

  const now = Date.now();
  const rows: Workout[] = library.workouts.map((w) => ({
    id: w.id,
    name: w.name,
    category: w.category,
    equipment: w.equipment,
    durationMin: w.duration_min, // snake_case in the file → camelCase in the app
    difficulty: w.difficulty,
    purpose: w.purpose,
    warmup: w.warmup,
    blocks: w.blocks,
    cooldown: w.cooldown,
    scaling: w.scaling,
    source: 'library',
    updatedAt: now,
  }));
  await putWorkouts(rows);
  await setSeedState({ version: library.version, seededAt: now });
}

// Convenience for screens: how many workouts are in the library right now.
export async function libraryCount(): Promise<number> {
  return (await listWorkouts({ source: 'library' })).length;
}
