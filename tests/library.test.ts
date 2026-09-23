import { describe, it, expect } from 'vitest';
import { categoryToLogType, matchesDuration, filterWorkouts, emptyFilters } from '../src/core/library';
import type { Workout } from '../src/core/types';

const w = (p: Partial<Workout>): Workout => ({
  id: 'x', name: 'Test', category: 'conditioning', equipment: ['none'], durationMin: 45,
  difficulty: 'intermediate', purpose: '', warmup: '', blocks: [], cooldown: '',
  scaling: { down: '', up: '' }, source: 'library', updatedAt: 0, ...p,
});

describe('categoryToLogType', () => {
  it('maps categories to log types', () => {
    expect(categoryToLogType('running')).toBe('Run');
    expect(categoryToLogType('simulation')).toBe('Race sim');
    expect(categoryToLogType('station skills')).toBe('Stations');
    expect(categoryToLogType('recovery')).toBe('Mobility');
    expect(categoryToLogType('compromised running')).toBe('Conditioning');
  });
});

describe('matchesDuration', () => {
  it('buckets by length', () => {
    expect(matchesDuration(30, 'lte30')).toBe(true);
    expect(matchesDuration(31, 'lte30')).toBe(false);
    expect(matchesDuration(80, 'gt60')).toBe(true);
    expect(matchesDuration(45, 'any')).toBe(true);
  });
});

describe('filterWorkouts', () => {
  const list = [
    w({ id: 'a', name: 'Threshold kilometres', category: 'running', equipment: ['none'], durationMin: 50, difficulty: 'intermediate' }),
    w({ id: 'b', name: 'Sled strength', category: 'strength', equipment: ['sled'], durationMin: 45, difficulty: 'advanced' }),
    w({ id: 'c', name: 'Recovery jog', category: 'running', equipment: ['none'], durationMin: 30, difficulty: 'beginner' }),
  ];
  it('returns all with empty filters', () => {
    expect(filterWorkouts(list, emptyFilters).length).toBe(3);
  });
  it('filters by category and difficulty', () => {
    expect(filterWorkouts(list, { ...emptyFilters, category: 'running' }).map((x) => x.id)).toEqual(['a', 'c']);
    expect(filterWorkouts(list, { ...emptyFilters, difficulty: 'advanced' }).map((x) => x.id)).toEqual(['b']);
  });
  it('filters by equipment and duration', () => {
    expect(filterWorkouts(list, { ...emptyFilters, equipment: 'sled' }).map((x) => x.id)).toEqual(['b']);
    expect(filterWorkouts(list, { ...emptyFilters, duration: 'lte30' }).map((x) => x.id)).toEqual(['c']);
  });
  it('searches name and purpose', () => {
    expect(filterWorkouts(list, { ...emptyFilters, query: 'sled' }).map((x) => x.id)).toEqual(['b']);
    expect(filterWorkouts(list, { ...emptyFilters, query: 'JOG' }).map((x) => x.id)).toEqual(['c']);
  });
});
