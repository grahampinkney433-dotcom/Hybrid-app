// The eight race stations, in order, with their race-standard distances/reps.
// Ported from the prototype. `key` is used as the split key in Log.splits.
// (Describing the eight stations is fine; we just never use the trademarked race name.)
export interface Station {
  key: string;
  name: string;
  detail: string;
}

export const STATIONS: Station[] = [
  { key: 'ski', name: 'SkiErg', detail: '1000 m' },
  { key: 'push', name: 'Sled Push', detail: '50 m' },
  { key: 'pull', name: 'Sled Pull', detail: '50 m' },
  { key: 'bbj', name: 'Burpee Broad Jumps', detail: '80 m' },
  { key: 'row', name: 'Row', detail: '1000 m' },
  { key: 'farm', name: 'Farmers Carry', detail: '200 m' },
  { key: 'lunge', name: 'Sandbag Lunges', detail: '100 m' },
  { key: 'wb', name: 'Wall Balls', detail: '100 reps' },
];

// Run split keys in a full simulation: 'r0'..'r7' (eight 1 km runs).
export const RUN_KEYS = Array.from({ length: 8 }, (_, i) => `r${i}`);
