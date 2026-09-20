import { db } from './db';
import { BUILT_IN_FOODS } from '../core/foods';
import type {
  Workout,
  Log,
  Plan,
  MealPlan,
  Food,
  DiaryEntry,
  Profile,
  Settings,
  SeedState,
} from '../core/types';

// The repository: every read and write the app does goes through these functions.
// Feature code (screens, generators, nutrition maths) imports from here and NEVER
// touches Dexie or IndexedDB directly. That single boundary is what lets Capacitor
// wrap the app later without rewriting the features.

// ---- meta singletons ----

async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row?.value as T | undefined;
}
async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

export const getSettings = () => getMeta<Settings>('settings');
export const saveSettings = (s: Settings) => setMeta('settings', s);

export const getProfile = () => getMeta<Profile>('profile');
export const saveProfile = (p: Profile) => setMeta('profile', p);

export const getSeedState = () => getMeta<SeedState>('seed');
export const setSeedState = (s: SeedState) => setMeta('seed', s);

// ---- workouts (library + user) ----

export interface WorkoutFilter {
  category?: string;
  difficulty?: string;
  equipment?: string; // must be present in the workout's equipment array
  maxDuration?: number;
  source?: 'library' | 'user';
}

export async function listWorkouts(filter: WorkoutFilter = {}): Promise<Workout[]> {
  let rows = await db.workouts.toArray();
  if (filter.category) rows = rows.filter((w) => w.category === filter.category);
  if (filter.difficulty) rows = rows.filter((w) => w.difficulty === filter.difficulty);
  if (filter.equipment) rows = rows.filter((w) => w.equipment.includes(filter.equipment!));
  if (filter.maxDuration) rows = rows.filter((w) => w.durationMin <= filter.maxDuration!);
  if (filter.source) rows = rows.filter((w) => w.source === filter.source);
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export const getWorkout = (id: string) => db.workouts.get(id);
export const saveWorkout = (w: Workout) => db.workouts.put({ ...w, updatedAt: Date.now() });
export const deleteWorkout = (id: string) => db.workouts.delete(id);
// Bulk upsert used by the seeder.
export const putWorkouts = (ws: Workout[]) => db.workouts.bulkPut(ws);

// ---- logs (training history) ----

export const listLogs = () => db.logs.orderBy('date').reverse().toArray();
export const getLog = (id: string) => db.logs.get(id);
export const addLog = (l: Log) => db.logs.put({ ...l, updatedAt: Date.now() });
export const deleteLog = (id: string) => db.logs.delete(id);
export const logsInRange = (from: string, to: string) =>
  db.logs.where('date').between(from, to, true, true).toArray();
export const logsByType = (type: string) => db.logs.where('type').equals(type).toArray();

// ---- plans ----

export const listPlans = () => db.plans.toArray();
export const getPlan = (id: string) => db.plans.get(id);
export const getActivePlan = () => db.plans.filter((p) => p.isActive).first();

export async function savePlan(p: Plan): Promise<void> {
  await db.plans.put({ ...p, updatedAt: Date.now() });
}
export const deletePlan = (id: string) => db.plans.delete(id);

// Marks one plan active and clears the flag on all others (only one active plan).
export async function setActivePlan(id: string): Promise<void> {
  await db.transaction('rw', db.plans, async () => {
    const all = await db.plans.toArray();
    await Promise.all(
      all.map((p) => db.plans.update(p.id, { isActive: p.id === id })),
    );
  });
}

// ---- meal plans (templates) ----

export const listMealPlans = () => db.mealPlans.toArray();
export const getActiveMealPlan = () => db.mealPlans.filter((m) => m.isActive).first();
export const saveMealPlan = (m: MealPlan) => db.mealPlans.put({ ...m, updatedAt: Date.now() });
export const deleteMealPlan = (id: string) => db.mealPlans.delete(id);
export async function setActiveMealPlan(id: string): Promise<void> {
  await db.transaction('rw', db.mealPlans, async () => {
    const all = await db.mealPlans.toArray();
    await Promise.all(
      all.map((m) => db.mealPlans.update(m.id, { isActive: m.id === id })),
    );
  });
}

// ---- foods ----

export const listCustomFoods = () => db.foods.toArray();
export const addFood = (f: Food) => db.foods.put(f);
export const deleteFood = (id: string) => db.foods.delete(id);

// All foods the app knows about: built-ins (shipped in code) + user's custom foods.
export async function allFoods(): Promise<Food[]> {
  const custom = await db.foods.toArray();
  return [...BUILT_IN_FOODS, ...custom];
}

// ---- daily diet diary ----

export const getDiary = (date: string) => db.diary.get(date);
export const saveDiary = (e: DiaryEntry) => db.diary.put({ ...e, updatedAt: Date.now() });
export const diaryInRange = (from: string, to: string) =>
  db.diary.where('date').between(from, to, true, true).toArray();

// ---- destructive reset (used by Settings → delete all data) ----

export async function wipeAll(): Promise<void> {
  await db.transaction(
    'rw',
    [db.workouts, db.logs, db.plans, db.mealPlans, db.foods, db.diary, db.meta],
    async () => {
      await Promise.all([
        db.workouts.clear(),
        db.logs.clear(),
        db.plans.clear(),
        db.mealPlans.clear(),
        db.foods.clear(),
        db.diary.clear(),
        db.meta.clear(),
      ]);
    },
  );
}
