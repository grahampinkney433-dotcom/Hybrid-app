import { db } from './db';
import { seedLibraryIfNeeded } from './seed';
import { toSec } from '../core/time';
import type {
  Workout,
  Log,
  Plan,
  MealPlan,
  Food,
  DiaryEntry,
  LogType,
  Profile,
  Settings,
} from '../core/types';

// Export / import of ALL on-device data as a single JSON file. This is the only backup
// mechanism (there is no server), so the format is deliberately plain and documented.
// Import also understands the original prototype's backup format (see below).

const APP_TAG = 'stationlog';
const SCHEMA = 1;

export interface BackupFile {
  app: typeof APP_TAG;
  schema: number;
  exportedAt: string;
  data: {
    workouts: Workout[]; // user-created only; the library re-seeds itself
    logs: Log[];
    plans: Plan[];
    mealPlans: MealPlan[];
    foods: Food[]; // user custom foods
    diary: DiaryEntry[];
    meta: { key: string; value: unknown }[];
  };
}

// Build the backup object. User workouts only — library workouts reseed from the file.
export async function exportAll(): Promise<BackupFile> {
  const [workouts, logs, plans, mealPlans, foods, diary, meta] = await Promise.all([
    db.workouts.where('source').equals('user').toArray(),
    db.logs.toArray(),
    db.plans.toArray(),
    db.mealPlans.toArray(),
    db.foods.toArray(),
    db.diary.toArray(),
    db.meta.toArray(),
  ]);
  return {
    app: APP_TAG,
    schema: SCHEMA,
    exportedAt: new Date().toISOString(),
    data: { workouts, logs, plans, mealPlans, foods, diary, meta },
  };
}

// A short human summary of what an import loaded.
export interface ImportResult {
  format: 'stationlog' | 'prototype';
  logs: number;
  workouts: number;
  plans: number;
  mealPlans: number;
  foods: number;
  diary: number;
}

// Restore from a parsed backup object. Replaces existing data, then re-seeds the library.
export async function importData(parsed: unknown): Promise<ImportResult> {
  if (isStationlogBackup(parsed)) return importNative(parsed);
  if (isPrototypeBackup(parsed)) return importPrototype(parsed);
  throw new Error('Not a Stationlog or Hybrid Log backup file.');
}

// ---- native format ----

function isStationlogBackup(x: unknown): x is BackupFile {
  return !!x && typeof x === 'object' && (x as BackupFile).app === APP_TAG;
}

async function importNative(b: BackupFile): Promise<ImportResult> {
  const d = b.data;
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
      await db.workouts.bulkPut(d.workouts ?? []);
      await db.logs.bulkPut(d.logs ?? []);
      await db.plans.bulkPut(d.plans ?? []);
      await db.mealPlans.bulkPut(d.mealPlans ?? []);
      await db.foods.bulkPut(d.foods ?? []);
      await db.diary.bulkPut(d.diary ?? []);
      await db.meta.bulkPut(d.meta ?? []);
    },
  );
  await seedLibraryIfNeeded();
  return {
    format: 'stationlog',
    logs: d.logs?.length ?? 0,
    workouts: d.workouts?.length ?? 0,
    plans: d.plans?.length ?? 0,
    mealPlans: d.mealPlans?.length ?? 0,
    foods: d.foods?.length ?? 0,
    diary: d.diary?.length ?? 0,
  };
}

// ---- prototype format (hybrid-log.html localStorage export) ----

// The prototype stored: { workouts:[...], settings:{...}, diet:{ profile, custom, plans, active, dayType } }
interface ProtoWorkout {
  id?: string;
  date?: string;
  type?: string;
  duration?: string | number;
  rpe?: string | number;
  notes?: string;
  distance?: string | number;
  time?: string;
  splits?: Record<string, string>;
  sets?: { ex?: string; sets?: string | number; reps?: string | number; kg?: string | number }[];
}
interface ProtoBackup {
  workouts?: ProtoWorkout[];
  settings?: { raceDate?: string; division?: string; level?: string; days?: string };
  diet?: {
    profile?: { sex?: string; age?: string; height?: string; weight?: string; activity?: string; goal?: string };
    custom?: { id: string; name: string; kcal: number; p: number; c: number; f: number }[];
    plans?: { id: string; name: string; meals: { name: string; items: { food: string; g: number }[] }[] }[];
    active?: string | null;
    dayType?: string;
  };
}

function isPrototypeBackup(x: unknown): x is ProtoBackup {
  if (!x || typeof x !== 'object') return false;
  const o = x as ProtoBackup;
  // It has a workouts array and either a diet or settings block, and no stationlog tag.
  return Array.isArray(o.workouts) && (o.diet !== undefined || o.settings !== undefined);
}

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && isFinite(n) ? n : undefined;
};

// Map the prototype's session type to ours (its 'HYROX sim' becomes our 'Race sim').
function mapType(t: string | undefined): LogType {
  if (t === 'HYROX sim') return 'Race sim';
  const allowed: LogType[] = ['Run', 'Strength', 'Stations', 'Conditioning', 'Mobility'];
  return (allowed.find((a) => a === t) as LogType) ?? 'Conditioning';
}

async function importPrototype(p: ProtoBackup): Promise<ImportResult> {
  const now = Date.now();

  // Logs: convert "m:ss"/"h:mm:ss" strings to seconds, map the type.
  const logs: Log[] = (p.workouts ?? []).map((w) => {
    const splits: Record<string, number> = {};
    if (w.splits) {
      for (const [k, v] of Object.entries(w.splits)) {
        const s = toSec(v);
        if (s) splits[k] = s;
      }
    }
    return {
      id: w.id ?? crypto.randomUUID(),
      date: w.date ?? new Date().toISOString().slice(0, 10),
      type: mapType(w.type),
      durationMin: num(w.duration),
      rpe: num(w.rpe),
      notes: w.notes || undefined,
      distanceKm: num(w.distance),
      timeSec: w.time ? toSec(w.time) : undefined,
      splits: Object.keys(splits).length ? splits : undefined,
      sets: w.sets
        ?.filter((s) => s.ex)
        .map((s) => ({ ex: s.ex!, sets: num(s.sets), reps: num(s.reps), kg: num(s.kg) })),
      updatedAt: now,
    };
  });

  // Custom foods: prototype uses p/c/f; we use protein/carbs/fat.
  const foods: Food[] = (p.diet?.custom ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    kcal: f.kcal,
    protein: f.p,
    carbs: f.c,
    fat: f.f,
  }));

  // Meal plans: prototype item {food, g} becomes our {foodId, grams}.
  const mealPlans: MealPlan[] = (p.diet?.plans ?? []).map((pl) => ({
    id: pl.id,
    name: pl.name,
    isActive: p.diet?.active === pl.id,
    meals: pl.meals.map((m) => ({
      name: m.name,
      items: m.items.map((it) => ({ foodId: it.food, grams: it.g })),
    })),
    updatedAt: now,
  }));

  // Profile: fold the prototype's settings + diet.profile into one profile record.
  const dietGoal = p.diet?.profile?.goal;
  const profile: Profile = {
    raceBooked: !!p.settings?.raceDate,
    raceDate: p.settings?.raceDate || undefined,
    division: (p.settings?.division as Profile['division']) || undefined,
    daysPerWeek: num(p.settings?.days) as Profile['daysPerWeek'],
    level: (p.settings?.level as Profile['level']) || undefined,
    sex: (p.diet?.profile?.sex as Profile['sex']) || undefined,
    age: num(p.diet?.profile?.age),
    heightCm: num(p.diet?.profile?.height),
    weightKg: num(p.diet?.profile?.weight),
    activity: num(p.diet?.profile?.activity),
    // prototype diet goal (lose/maintain/gain) → our training goal enum
    goal: dietGoal === 'lose' ? 'lean' : dietGoal === 'gain' ? 'strength' : 'general',
  };

  const settings: Settings = {
    defaultDayType: (p.diet?.dayType as Settings['defaultDayType']) || 'training',
  };

  await db.transaction(
    'rw',
    [db.logs, db.foods, db.mealPlans, db.meta],
    async () => {
      await db.logs.bulkPut(logs);
      await db.foods.bulkPut(foods);
      await db.mealPlans.bulkPut(mealPlans);
      await db.meta.put({ key: 'profile', value: profile });
      await db.meta.put({ key: 'settings', value: settings });
    },
  );

  return {
    format: 'prototype',
    logs: logs.length,
    workouts: 0,
    plans: 0,
    mealPlans: mealPlans.length,
    foods: foods.length,
    diary: 0,
  };
}
