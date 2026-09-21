// Workout-of-the-day generator. Pure and deterministic: the same date + mode + re-roll
// offset always yields the same pick, so it's stable per day but can be re-rolled.
import type { Difficulty, Workout } from './types';

export type WodMode = 'race' | 'general';

const RANK: Record<Difficulty, number> = { beginner: 0, intermediate: 1, advanced: 2 };

// Categories each mode draws from, in priority order.
const MODE_CATEGORIES: Record<WodMode, Workout['category'][]> = {
  race: ['simulation', 'compromised running', 'station skills'],
  general: ['running', 'strength', 'conditioning', 'station skills'],
};

// Leg-heavy categories — we avoid these the day after a heavy-legs session.
const HEAVY: Workout['category'][] = ['strength', 'simulation', 'compromised running'];

// Small deterministic PRNG so a (date, mode, offset) maps to a stable index.
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function seededIndex(seed: string, n: number): number {
  let a = hashStr(seed);
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return Math.floor(r * n);
}

function hasEquipment(w: Workout, available: Set<string> | 'all'): boolean {
  return available === 'all' || w.equipment.every((e) => available.has(e));
}

export interface WodContext {
  library: Workout[];
  mode: WodMode;
  level: Difficulty;
  available: Set<string> | 'all';
  date: string; // 'YYYY-MM-DD'
  offset: number; // re-roll counter
  yesterdayHeavy: boolean; // was a heavy-legs session logged yesterday?
  yesterdayCategories: Set<string>; // categories trained yesterday (avoid repeats)
}

// Pick the workout of the day. Never returns undefined unless the library is empty.
export function generateWod(ctx: WodContext): Workout | undefined {
  const maxRank = RANK[ctx.level];
  const inMode = new Set(MODE_CATEGORIES[ctx.mode]);

  const base = ctx.library.filter(
    (w) => RANK[w.difficulty] <= maxRank && hasEquipment(w, ctx.available),
  );
  if (base.length === 0) {
    // fall back ignoring level if equipment is the blocker
    const eqOnly = ctx.library.filter((w) => hasEquipment(w, ctx.available));
    return pickFrom(applyConstraints(eqOnly, inMode, ctx), ctx) ?? eqOnly[0];
  }
  return pickFrom(applyConstraints(base, inMode, ctx), ctx) ?? base[0];
}

// Narrow to the mode, then avoid heavy-after-heavy and yesterday's categories,
// relaxing progressively so we always end up with a non-empty pool when possible.
function applyConstraints(pool: Workout[], inMode: Set<string>, ctx: WodContext): Workout[] {
  const modePool = pool.filter((w) => inMode.has(w.category));
  const candidates = modePool.length ? modePool : pool; // fall back to any category

  let step = candidates;
  if (ctx.yesterdayHeavy) {
    const noHeavy = step.filter((w) => !HEAVY.includes(w.category));
    if (noHeavy.length) step = noHeavy;
  }
  const noRepeat = step.filter((w) => !ctx.yesterdayCategories.has(w.category));
  if (noRepeat.length) step = noRepeat;

  return step;
}

function pickFrom(pool: Workout[], ctx: WodContext): Workout | undefined {
  if (pool.length === 0) return undefined;
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[seededIndex(`${ctx.date}|${ctx.mode}|${ctx.offset}`, sorted.length)];
}
