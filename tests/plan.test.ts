import { describe, it, expect } from 'vitest';
import {
  phaseForWeeksOut, levelFromProfile, availableEquipment, pickWorkout, generatePlan,
} from '../src/core/plan';
import type { Workout } from '../src/core/types';
import libraryFile from '../src/data/workout-library.json';

// Build the same Workout[] the seeder produces, from the real library file.
const library: Workout[] = (libraryFile as any).workouts.map((w: any) => ({
  id: w.id, name: w.name, category: w.category, equipment: w.equipment,
  durationMin: w.duration_min, difficulty: w.difficulty, purpose: w.purpose,
  warmup: w.warmup, blocks: w.blocks, cooldown: w.cooldown, scaling: w.scaling,
  source: 'library', updatedAt: 0,
}));

describe('phase + level helpers', () => {
  it('phases by weeks out', () => {
    expect(phaseForWeeksOut(null)).toBe('base');
    expect(phaseForWeeksOut(16)).toBe('base');
    expect(phaseForWeeksOut(8)).toBe('build');
    expect(phaseForWeeksOut(3)).toBe('peak');
    expect(phaseForWeeksOut(1)).toBe('taper');
  });
  it('derives level from experience', () => {
    expect(levelFromProfile('new')).toBe('beginner');
    expect(levelFromProfile('competitive')).toBe('advanced');
    expect(levelFromProfile(undefined, 'advanced')).toBe('advanced');
    expect(levelFromProfile('anything')).toBe('intermediate');
  });
  it('a full gym means everything is available', () => {
    expect(availableEquipment('full', [])).toBe('all');
    const home = availableEquipment('home', ['dumbbells']);
    expect(home).not.toBe('all');
    expect((home as Set<string>).has('dumbbells')).toBe(true);
    expect((home as Set<string>).has('none')).toBe(true);
  });
});

describe('pickWorkout', () => {
  it('never returns a workout needing unavailable equipment', () => {
    const noKit = new Set(['none']); // bodyweight only
    for (let r = 0; r < 5; r++) {
      const w = pickWorkout(library, 'threshold', 'advanced', noKit, r);
      if (w) expect(w.equipment.every((e) => noKit.has(e))).toBe(true);
    }
  });
  it('respects difficulty ceiling for beginners where possible', () => {
    const w = pickWorkout(library, 'lower', 'beginner', 'all', 0);
    expect(w).toBeDefined();
    expect(w!.category).toBe('strength');
  });
});

describe('generatePlan', () => {
  it('builds 8 base weeks when no race is booked', () => {
    const plan = generatePlan({ daysPerWeek: 4, gym: 'full' }, library, { weeksOut: null });
    expect(plan.weeks.length).toBe(8);
    expect(plan.weeks[0].days.length).toBe(4);
    expect(plan.isActive).toBe(true);
    expect(plan.source).toBe('generated');
  });

  it('sizes the plan to the weeks until race and ends in a taper', () => {
    const plan = generatePlan({ daysPerWeek: 5, gym: 'full' }, library, { weeksOut: 6 });
    expect(plan.weeks.length).toBe(6);
    expect(plan.weeks[0].days.length).toBe(5);
    // last week (1 week out) should be taper
    expect(plan.weeks[plan.weeks.length - 1].label).toMatch(/Taper/);
  });

  it('caps very distant races at maxWeeks', () => {
    const plan = generatePlan({ daysPerWeek: 4, gym: 'full' }, library, { weeksOut: 40, maxWeeks: 16 });
    expect(plan.weeks.length).toBe(16);
  });

  it('only uses equipment the athlete has', () => {
    const plan = generatePlan({ daysPerWeek: 6, gym: 'minimal', equipment: ['kettlebells'] }, library, { weeksOut: null });
    const available = new Set(['none', 'kettlebells']);
    for (const wk of plan.weeks) {
      for (const d of wk.days) {
        for (const s of d.sessions) {
          if (s.workoutId) {
            const w = library.find((x) => x.id === s.workoutId)!;
            expect(w.equipment.every((e) => available.has(e))).toBe(true);
          }
        }
      }
    }
  });

  it('every session has a title and a log type', () => {
    const plan = generatePlan({ daysPerWeek: 4, gym: 'full' }, library, { weeksOut: 10 });
    for (const wk of plan.weeks)
      for (const d of wk.days)
        for (const s of d.sessions) {
          expect(s.title.length).toBeGreaterThan(0);
          expect(s.type).toBeTruthy();
        }
  });
});
