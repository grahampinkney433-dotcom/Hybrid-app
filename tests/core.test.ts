import { describe, it, expect } from 'vitest';
import { toSec, fmt } from '../src/core/time';
import library from '../src/data/workout-library.json';
import { CATEGORIES, DIFFICULTIES } from '../src/core/types';

// Step-1 tests: they cover the time helpers used everywhere for splits/paces, and they
// guard the shape of the seed library so a bad edit to the JSON is caught before release.
// (The nutrition safety-floor tests land with the nutrition feature in a later step.)

describe('time helpers', () => {
  it('parses m:ss and h:mm:ss into seconds', () => {
    expect(toSec('0:45')).toBe(45);
    expect(toSec('4:30')).toBe(270);
    expect(toSec('1:05:00')).toBe(3900);
  });
  it('is forgiving with empty / bad input', () => {
    expect(toSec('')).toBe(0);
    expect(toSec(undefined)).toBe(0);
    expect(toSec('abc')).toBe(0);
    expect(toSec(90)).toBe(90);
  });
  it('formats seconds back to a clock string', () => {
    expect(fmt(0)).toBe('–');
    expect(fmt(270)).toBe('4:30');
    expect(fmt(3900)).toBe('1:05:00');
  });
  it('round-trips a typical split', () => {
    expect(fmt(toSec('3:07'))).toBe('3:07');
  });
});

describe('seed library integrity', () => {
  const workouts = (library as { workouts: Record<string, unknown>[] }).workouts;

  it('has 100 workouts and matches the declared count', () => {
    expect(workouts.length).toBe(100);
    expect((library as { count: number }).count).toBe(workouts.length);
  });

  it('every workout has the required fields and valid enums', () => {
    for (const w of workouts as any[]) {
      expect(typeof w.id).toBe('string');
      expect(typeof w.name).toBe('string');
      expect(CATEGORIES).toContain(w.category);
      expect(DIFFICULTIES).toContain(w.difficulty);
      expect(Array.isArray(w.equipment)).toBe(true);
      expect(typeof w.duration_min).toBe('number');
      expect(Array.isArray(w.blocks)).toBe(true);
      expect(w.scaling).toHaveProperty('down');
      expect(w.scaling).toHaveProperty('up');
    }
  });

  it('has unique ids', () => {
    const ids = (workouts as { id: string }[]).map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
