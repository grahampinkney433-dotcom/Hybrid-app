import { describe, it, expect } from 'vitest';
import {
  computeTargets, sumMacros, macrosForItem,
  CAL_FLOOR, PROTEIN_FLOOR_PER_KG, PROTEIN_CAP_PER_KG, CARB_FLOOR_G,
} from '../src/core/nutrition';
import type { Food, Profile } from '../src/core/types';

const P = (o: Partial<Profile>): Partial<Profile> => ({ sex: 'male', age: 34, heightCm: 180, weightKg: 82, activity: 1.55, goal: 'general', ...o });

describe('computeTargets — normal cases', () => {
  it('produces sensible targets for a typical athlete', () => {
    const r = computeTargets(P({}));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bmr).toBeGreaterThan(1500);
    expect(r.tdee).toBeGreaterThan(r.bmr);
    expect(r.training.kcal).toBeGreaterThanOrEqual(r.rest.kcal);
    // macros roughly reconstruct the calories (±10 kcal rounding)
    const recon = r.rest.protein * 4 + r.rest.carbs * 4 + r.rest.fat * 9;
    expect(Math.abs(recon - r.rest.kcal)).toBeLessThanOrEqual(10);
  });

  it('lean goal creates a deficit but never below the floor', () => {
    const r = computeTargets(P({ goal: 'lean' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rest.kcal).toBeGreaterThanOrEqual(r.calFloor);
  });
});

describe('computeTargets — incomplete & nonsense inputs', () => {
  it('asks for more info when incomplete', () => {
    expect(computeTargets({ sex: 'male' }).ok).toBe(false);
  });
  it('refuses impossible age / height / weight and explains', () => {
    expect(computeTargets(P({ age: 5 }))).toMatchObject({ ok: false });
    expect(computeTargets(P({ age: 5 })).ok).toBe(false);
    const tall = computeTargets(P({ heightCm: 300 }));
    expect(tall.ok).toBe(false);
    if (!tall.ok) expect(tall.reason).toMatch(/Height/);
    const heavy = computeTargets(P({ weightKg: 500 }));
    expect(heavy.ok).toBe(false);
    if (!heavy.ok) expect(heavy.reason).toMatch(/Weight/);
  });
});

describe('computeTargets — floors hold for extreme but valid inputs', () => {
  it('a tiny, older woman on a cut never drops below safe calories/protein/fat/carbs', () => {
    const r = computeTargets(P({ sex: 'female', age: 65, heightCm: 150, weightKg: 40, activity: 1.375, goal: 'lean' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const day of [r.rest, r.training]) {
      expect(day.kcal).toBeGreaterThanOrEqual(CAL_FLOOR.female);
      expect(day.kcal).toBeGreaterThanOrEqual(r.bmr); // never below BMR
      expect(day.carbs).toBeGreaterThanOrEqual(CARB_FLOOR_G);
      expect(day.protein).toBeGreaterThanOrEqual(Math.round(40 * PROTEIN_FLOOR_PER_KG));
      expect(day.fat).toBeGreaterThanOrEqual(Math.round(40 * 0.5));
    }
    expect(r.floored).toBe(true);
  });

  it('a very large athlete gets a high but not absurd protein target (capped)', () => {
    const r = computeTargets(P({ weightKg: 150, goal: 'strength' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rest.protein).toBeLessThanOrEqual(Math.round(150 * PROTEIN_CAP_PER_KG));
    expect(r.proteinPerKg).toBeLessThanOrEqual(PROTEIN_CAP_PER_KG);
    expect(r.proteinPerKg).toBeGreaterThanOrEqual(PROTEIN_FLOOR_PER_KG);
  });

  it('training load scales training-day carbs upward', () => {
    const low = computeTargets(P({}), 0);
    const high = computeTargets(P({}), 1);
    if (!low.ok || !high.ok) throw new Error('expected ok');
    expect(high.training.kcal).toBeGreaterThan(low.training.kcal);
    expect(high.training.carbs).toBeGreaterThan(low.training.carbs);
  });
});

describe('food math', () => {
  const foods: Food[] = [
    { id: 'chicken', name: 'Chicken', kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
    { id: 'rice', name: 'Rice', kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  ];
  it('scales per-100g values by grams', () => {
    const m = macrosForItem(foods[0], 200);
    expect(m.kcal).toBeCloseTo(330);
    expect(m.protein).toBeCloseTo(62);
  });
  it('sums a list of items, ignoring unknown foods', () => {
    const t = sumMacros([{ foodId: 'chicken', grams: 100 }, { foodId: 'rice', grams: 200 }, { foodId: 'ghost', grams: 50 }], foods);
    expect(t.kcal).toBeCloseTo(165 + 260);
    expect(t.carbs).toBeCloseTo(56);
  });
});
