import type { Category, LogType, Workout } from './types';

// Map a library category to the log type we prefill when you tap "Log this".
export function categoryToLogType(category: Category): LogType {
  switch (category) {
    case 'running':
      return 'Run';
    case 'strength':
      return 'Strength';
    case 'simulation':
      return 'Race sim';
    case 'station skills':
      return 'Stations';
    case 'recovery':
      return 'Mobility';
    case 'conditioning':
    case 'compromised running':
    default:
      return 'Conditioning';
  }
}

// Duration filter buckets for the library browser.
export type DurationBucket = 'any' | 'lte30' | 'lte45' | 'lte60' | 'gt60';

export function matchesDuration(min: number, bucket: DurationBucket): boolean {
  switch (bucket) {
    case 'lte30':
      return min <= 30;
    case 'lte45':
      return min <= 45;
    case 'lte60':
      return min <= 60;
    case 'gt60':
      return min > 60;
    default:
      return true;
  }
}

export interface LibraryFilters {
  category: Category | 'all';
  difficulty: Workout['difficulty'] | 'all';
  equipment: string | 'all';
  duration: DurationBucket;
  query: string;
}

export const emptyFilters: LibraryFilters = {
  category: 'all',
  difficulty: 'all',
  equipment: 'all',
  duration: 'any',
  query: '',
};

// Apply all filters to a workout list (client-side; 100 items is trivial).
export function filterWorkouts(workouts: Workout[], f: LibraryFilters): Workout[] {
  const q = f.query.trim().toLowerCase();
  return workouts.filter((w) => {
    if (f.category !== 'all' && w.category !== f.category) return false;
    if (f.difficulty !== 'all' && w.difficulty !== f.difficulty) return false;
    if (f.equipment !== 'all' && !w.equipment.includes(f.equipment)) return false;
    if (!matchesDuration(w.durationMin, f.duration)) return false;
    if (q && !(w.name.toLowerCase().includes(q) || w.purpose.toLowerCase().includes(q))) return false;
    return true;
  });
}
