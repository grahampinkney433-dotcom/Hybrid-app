// Shared types and vocabularies for the whole app.
//
// This file is pure data/type definitions with NO browser or database APIs, so it is
// safe to use from anywhere — including when Capacitor wraps the app for the App Store.

// The seven workout categories, exactly as they appear in workout-library.json.
export const CATEGORIES = [
  'running',
  'compromised running',
  'conditioning',
  'recovery',
  'simulation',
  'station skills',
  'strength',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

// The equipment vocabulary from workout-library.json. Kept as a list so the library
// filter and the questionnaire's "what do you have access to" question share one source.
export const EQUIPMENT = [
  'none',
  'treadmill',
  'skierg',
  'rower',
  'bike erg',
  'sled',
  'wall ball',
  'sandbag',
  'kettlebells',
  'dumbbells',
  'barbell',
  'rack',
  'pull-up bar',
  'box',
  'med ball',
  'foam roller',
  'pool',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

// The kinds of session we log. NOTE: we deliberately use 'Race sim' (never the
// trademarked race name) as the type for a full/half simulation.
export const LOG_TYPES = [
  'Run',
  'Strength',
  'Stations',
  'Race sim',
  'Conditioning',
  'Mobility',
] as const;
export type LogType = (typeof LOG_TYPES)[number];

// A workout, whether seeded from the library file or created by the user.
export interface Workout {
  id: string; // 'run-01' etc. from the file, or 'user-<uuid>' for user workouts
  name: string;
  category: Category;
  equipment: string[];
  durationMin: number;
  difficulty: Difficulty;
  purpose: string;
  warmup: string;
  blocks: { name: string; detail: string }[];
  cooldown: string;
  scaling: { down: string; up: string };
  source: 'library' | 'user';
  updatedAt: number;
}

// One row per lift in a strength session.
export interface LiftSet {
  ex: string;
  sets?: number;
  reps?: number;
  kg?: number;
}

// Optional heart-rate data attached to a log (feature 7).
// Zone values are minutes spent in each zone.
export interface HeartRate {
  avg?: number;
  max?: number;
  zones?: { z1: number; z2: number; z3: number; z4: number; z5: number };
}

// A logged training session — the source of history, PBs and trends.
export interface Log {
  id: string;
  date: string; // 'YYYY-MM-DD'
  type: LogType;
  workoutId?: string; // set when logged from the library or a plan
  title?: string;
  durationMin?: number;
  rpe?: number; // 1–10
  notes?: string;
  // Type-specific payloads (only the relevant one is populated):
  splits?: Record<string, number>; // SECONDS. keys: 'r0'..'r7' (runs) + station keys
  distanceKm?: number;
  timeSec?: number;
  sets?: LiftSet[];
  hr?: HeartRate;
  updatedAt: number;
}

// A session inside a plan day. Either references a workout, or is free text.
export interface Session {
  id: string;
  type: LogType;
  title: string;
  workoutId?: string;
  detail?: string;
  isKey?: boolean;
  done?: boolean;
}

export interface PlanDay {
  id: string;
  label: string; // 'Mon' … 'Sun'
  sessions: Session[];
}

export interface PlanWeek {
  id: string;
  label: string; // 'Week 1', 'Base — Week 2', etc.
  days: PlanDay[];
}

export interface Plan {
  id: string;
  name: string;
  source: 'generated' | 'custom';
  isActive: boolean; // exactly one plan is active; the repo enforces this
  weeks: PlanWeek[];
  meta?: { phase?: string; fromProfileAt?: number };
  updatedAt: number;
}

// Nutrition: a saved meal-plan template (separate from the dated daily diary).
export interface MealPlan {
  id: string;
  name: string;
  isActive: boolean;
  meals: { name: string; items: { foodId: string; grams: number }[] }[];
  updatedAt: number;
}

// A food, per 100 g. Built-in foods live in core/foods.ts; user foods live in the DB.
export interface Food {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

// One day's food diary. `date` is the primary key, so there is one entry per day.
export interface DiaryEntry {
  date: string; // 'YYYY-MM-DD'
  dayType?: 'training' | 'rest'; // override; otherwise derived from that day's plan/logs
  items: {
    foodId?: string; // reference into built-in or custom foods
    name?: string; // inline one-off food (when foodId is absent)
    grams: number;
    kcal?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }[];
  updatedAt: number;
}

// ---- meta (singleton) records ----

export type Goal = 'finish' | 'target-time' | 'lean' | 'strength' | 'general';
export type Sex = 'male' | 'female';
export type Division = 'Open' | 'Pro' | 'Doubles' | 'Mixed Doubles' | 'Relay';

// Everything the first-run questionnaire collects, plus body stats for nutrition.
// Re-running the questionnaire updates this record; it never touches logged history.
export interface Profile {
  // race
  raceBooked: boolean;
  raceDate?: string;
  division?: Division;
  // history & current volume
  experience?: 'new' | 'returning' | 'consistent' | 'competitive';
  weeklyHours?: number;
  // availability
  daysPerWeek?: 3 | 4 | 5 | 6;
  sessionMinutes?: number;
  // access
  gym?: 'full' | 'home' | 'minimal';
  equipment?: string[];
  // limitations (free text)
  injuries?: string;
  // goal
  goal?: Goal;
  targetTimeSec?: number;
  // known times, in seconds (5k, 1k run, ergs, station bests)
  knownTimes?: Record<string, number>;
  // body stats for Mifflin-St Jeor nutrition maths
  sex?: Sex;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  activity?: number; // TDEE multiplier, e.g. 1.55
  // level derived for plan generation
  level?: Difficulty;
}

export interface Settings {
  theme?: 'system' | 'light' | 'dark';
  onboardingComplete?: boolean;
  disclaimerAcceptedAt?: number;
  defaultDayType?: 'training' | 'rest';
}

export interface SeedState {
  version: number; // library file version currently loaded
  seededAt: number;
}
