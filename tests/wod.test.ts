import { describe, it, expect } from 'vitest';
import { generateWod } from '../src/core/wod';
import type { Workout } from '../src/core/types';
import libraryFile from '../src/data/workout-library.json';

const library: Workout[] = (libraryFile as any).workouts.map((w: any) => ({
  id: w.id, name: w.name, category: w.category, equipment: w.equipment,
  durationMin: w.duration_min, difficulty: w.difficulty, purpose: w.purpose,
  warmup: w.warmup, blocks: w.blocks, cooldown: w.cooldown, scaling: w.scaling,
  source: 'library', updatedAt: 0,
}));

const base = {
  library, level: 'advanced' as const, available: 'all' as const,
  offset: 0, yesterdayHeavy: false, yesterdayCategories: new Set<string>(),
};

describe('generateWod', () => {
  it('is stable for the same date + mode + offset', () => {
    const a = generateWod({ ...base, mode: 'race', date: '2026-09-21' });
    const b = generateWod({ ...base, mode: 'race', date: '2026-09-21' });
    expect(a!.id).toBe(b!.id);
  });

  it('re-roll (offset) can change the pick', () => {
    const picks = new Set<string>();
    for (let o = 0; o < 6; o++) picks.add(generateWod({ ...base, mode: 'race', date: '2026-09-21', offset: o })!.id);
    expect(picks.size).toBeGreaterThan(1);
  });

  it('race mode prefers race-specific categories', () => {
    const w = generateWod({ ...base, mode: 'race', date: '2026-09-21' })!;
    expect(['simulation', 'compromised running', 'station skills']).toContain(w.category);
  });

  it('avoids heavy-legs categories the day after heavy legs', () => {
    for (let o = 0; o < 8; o++) {
      const w = generateWod({ ...base, mode: 'general', date: '2026-09-21', offset: o, yesterdayHeavy: true })!;
      expect(['strength', 'simulation', 'compromised running']).not.toContain(w.category);
    }
  });

  it('only returns workouts whose equipment is available', () => {
    const avail = new Set(['none']);
    for (let o = 0; o < 8; o++) {
      const w = generateWod({ ...base, available: avail, mode: 'general', date: '2026-09-21', offset: o })!;
      expect(w.equipment.every((e) => avail.has(e))).toBe(true);
    }
  });

  it('respects the difficulty ceiling for beginners', () => {
    for (let o = 0; o < 8; o++) {
      const w = generateWod({ ...base, level: 'beginner', mode: 'general', date: '2026-09-21', offset: o })!;
      expect(w.difficulty).toBe('beginner');
    }
  });
});
