// Nutrition maths: Mifflin-St Jeor BMR → TDEE → calorie and macro targets, with hard
// safety floors so no combination of inputs can produce an unsafe calorie or protein
// target. Pure functions, thoroughly unit-tested (see tests/nutrition.test.ts).
import type { Food, Profile } from './types';

export interface Macros {
  kcal: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
}

// ---- safety floors (the numbers we will never go below) ----
// Widely used clinical minimums for self-directed dieting. We never target below these,
// and never below a person's BMR (eating under BMR for long isn't safe or sustainable).
export const CAL_FLOOR = { male: 1500, female: 1200 };
export const PROTEIN_FLOOR_PER_KG = 1.2; // g/kg — health minimum
export const PROTEIN_CAP_PER_KG = 2.5; // g/kg — no need to exceed for this sport
export const FAT_FLOOR_PER_KG = 0.5; // g/kg — essential fats
export const CARB_FLOOR_G = 50; // g — minimum functional carbohydrate

// Plausible input ranges. Outside these we refuse rather than guess.
const AGE = { min: 14, max: 100 };
const HEIGHT = { min: 120, max: 230 };
const WEIGHT = { min: 35, max: 250 };

export type TargetsResult =
  | { ok: false; reason: string }
  | {
      ok: true;
      bmr: number;
      tdee: number;
      maintenance: number;
      proteinPerKg: number;
      rest: Macros;
      training: Macros;
      floored: boolean; // true if a floor held calories above the raw deficit
      calFloor: number;
    };

const round = (n: number) => Math.round(n);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// Compute daily targets from the profile. `trainingLoad` (0–1) scales training-day carbs
// to that day's planned session — 0 is an easy day, 1 a long/key session.
export function computeTargets(profile: Partial<Profile>, trainingLoad = 0.5): TargetsResult {
  // Sex, activity and goal have sensible defaults (matching the on-screen selects); the
  // real measurements below are what we genuinely need before computing anything.
  const sex = profile.sex ?? 'male';
  const activity = profile.activity ?? 1.55;
  const { age, heightCm: h, weightKg: w } = profile;

  // Incomplete — not an error, just not enough to compute yet.
  if (!age || !h || !w) {
    return { ok: false, reason: 'Add your age, height and weight to see targets.' };
  }
  // Nonsense / out-of-range — refuse and explain.
  if (age < AGE.min || age > AGE.max)
    return { ok: false, reason: `Enter an age between ${AGE.min} and ${AGE.max}. Targets for under-14s should come from a professional.` };
  if (h < HEIGHT.min || h > HEIGHT.max)
    return { ok: false, reason: `Height looks off — enter ${HEIGHT.min}–${HEIGHT.max} cm.` };
  if (w < WEIGHT.min || w > WEIGHT.max)
    return { ok: false, reason: `Weight looks off — enter ${WEIGHT.min}–${WEIGHT.max} kg.` };

  const bmr = 10 * w + 6.25 * h - 5 * age + (sex === 'male' ? 5 : -161);
  const tdee = bmr * activity;

  // Goal → calorie adjustment (training goal drives diet direction).
  const adj = profile.goal === 'lean' ? -400 : profile.goal === 'strength' ? 250 : 0;
  const base = tdee + adj;

  // Protein and fat per kg, clamped to safe bands.
  const proteinPerKg = clamp(profile.goal === 'lean' || profile.goal === 'strength' ? 2.2 : 2.0, PROTEIN_FLOOR_PER_KG, PROTEIN_CAP_PER_KG);
  const protein = round(w * proteinPerKg);
  const fat = round(w * Math.max(0.9, FAT_FLOOR_PER_KG));

  // Never target below the sex floor or below BMR.
  const calFloor = Math.max(CAL_FLOOR[sex], round(bmr));

  const restRaw = base - 200;
  const trainRaw = base + 200 + round(trainingLoad * 250);
  const floored = round(restRaw) < calFloor || round(trainRaw) < calFloor;

  const build = (rawKcal: number): Macros => {
    let kcal = Math.max(round(rawKcal), calFloor); // clamp UP to the floor
    let carbs = round((kcal - protein * 4 - fat * 9) / 4);
    // Guarantee a minimum carbohydrate intake; if that pushes calories up, so be it —
    // the point of the floors is that we never output an unsafe (too-low) target.
    if (carbs < CARB_FLOOR_G) {
      carbs = CARB_FLOOR_G;
      kcal = protein * 4 + fat * 9 + carbs * 4;
    }
    return { kcal, protein, carbs, fat };
  };

  return {
    ok: true,
    bmr: round(bmr),
    tdee: round(tdee),
    maintenance: round(tdee),
    proteinPerKg,
    rest: build(restRaw),
    training: build(trainRaw),
    floored,
    calFloor,
  };
}

// ---- food math (shared by the diary and meal-plan templates) ----

export function macrosForItem(food: Food, grams: number): Macros {
  const g = (grams || 0) / 100;
  return {
    kcal: food.kcal * g,
    protein: food.protein * g,
    carbs: food.carbs * g,
    fat: food.fat * g,
  };
}

export function sumMacros(items: { foodId: string; grams: number }[], foods: Food[]): Macros {
  const byId = new Map(foods.map((f) => [f.id, f]));
  const total: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const it of items) {
    const f = byId.get(it.foodId);
    if (!f) continue;
    const m = macrosForItem(f, it.grams);
    total.kcal += m.kcal;
    total.protein += m.protein;
    total.carbs += m.carbs;
    total.fat += m.fat;
  }
  return total;
}
