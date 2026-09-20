import Dexie, { type Table } from 'dexie';
import type {
  Workout,
  Log,
  Plan,
  MealPlan,
  Food,
  DiaryEntry,
} from '../core/types';

// A single meta table holds the app's singletons as key → value rows.
// Keys: 'settings', 'profile', 'seed'.
export interface MetaRow {
  key: string;
  value: unknown;
}

// The Dexie database. This is the ONLY file that talks to IndexedDB directly.
// Everything else in the app goes through repo.ts, so if we later move storage
// (e.g. Capacitor SQLite for the App Store), only these two files change.
class StationlogDB extends Dexie {
  workouts!: Table<Workout, string>;
  logs!: Table<Log, string>;
  plans!: Table<Plan, string>;
  mealPlans!: Table<MealPlan, string>;
  foods!: Table<Food, string>; // user-added custom foods only
  diary!: Table<DiaryEntry, string>; // primary key is `date`
  meta!: Table<MetaRow, string>;

  constructor() {
    super('stationlog');
    // Version 1. When the schema changes, add a new .version(2).stores({...})
    // block below with an optional .upgrade() — never edit this one.
    this.version(1).stores({
      // The part before the first comma is the primary key; the rest are indexes.
      // A leading '*' marks a multi-value (array) index, so we can filter by equipment.
      workouts: 'id, category, difficulty, durationMin, source, *equipment',
      logs: 'id, date, type, workoutId',
      plans: 'id, isActive, source',
      mealPlans: 'id, isActive',
      foods: 'id, name',
      diary: 'date',
      meta: 'key',
    });
  }
}

export const db = new StationlogDB();
