// Training-plan generator. Pure logic (profile + library in, Plan out) so it is fully
// unit-tested and safe under Capacitor. Turns the questionnaire answers into weeks of
// days of sessions, drawn from the real workout library where a good match exists.
import type { Difficulty, Plan, PlanWeek, Session, Workout } from './types';
import { categoryToLogType } from './library';
import { uid } from './time';

export type Phase = 'base' | 'build' | 'peak' | 'taper';

const PHASE_NAME: Record<Phase, string> = {
  base: 'Base', build: 'Build', peak: 'Peak', taper: 'Taper',
};

const PHASE_NOTE: Record<Phase, string> = {
  base: 'Build the aerobic engine and general strength. Most running easy.',
  build: 'Add compromised running — running on tired legs is the race.',
  peak: 'Race-specific sessions. Rehearse pacing, transitions and fuelling.',
  taper: 'Cut volume, keep a little sharpness. Arrive fresh.',
};

// Days-to-race → training phase (same thresholds as the prototype).
export function phaseForWeeksOut(weeksOut: number | null): Phase {
  if (weeksOut === null) return 'base';
  if (weeksOut > 12) return 'base';
  if (weeksOut > 4) return 'build';
  if (weeksOut > 1.5) return 'peak';
  return 'taper';
}

// The roles a session can play. Each maps to a library category + a log type.
type Role = 'easy' | 'threshold' | 'long' | 'lower' | 'upper' | 'full' | 'stations' | 'comp' | 'sim' | 'mob';

const ROLE_DEF: Record<Role, { title: string; category: Workout['category']; hints: string[]; fallback: string }> = {
  easy: { title: 'Easy run', category: 'running', hints: ['recovery', 'easy', 'jog', 'fartlek', 'progression'], fallback: '30–40 min easy zone 2, conversational.' },
  threshold: { title: 'Threshold / speed run', category: 'running', hints: ['threshold', 'tempo', 'interval', 'hundred', 'pyramid', 'trial', 'half-marathon', 'incline', 'broken'], fallback: '5 × 1 km at threshold, 90 s jog recovery.' },
  long: { title: 'Long run', category: 'running', hints: ['long'], fallback: '60–80 min easy, last 10 min at race pace if fresh.' },
  lower: { title: 'Strength — lower', category: 'strength', hints: ['squat', 'leg', 'posterior', 'single leg', 'lunge', 'sled', 'power'], fallback: 'Back squat 5×5, RDL 3×8, split squat 3×10, sled push.' },
  upper: { title: 'Strength — pull & carry', category: 'strength', hints: ['pull', 'press', 'grip'], fallback: 'Pull-ups, bent-over row, overhead press, farmers carry.' },
  full: { title: 'Strength — full body', category: 'strength', hints: ['full', 'dumbbell', 'kettlebell', 'endurance'], fallback: 'Squat, deadlift, pull-ups, sled, walking lunge.' },
  stations: { title: 'Station skills', category: 'station skills', hints: [], fallback: 'Ski + row intervals, wall balls and burpee broad jumps for rhythm.' },
  comp: { title: 'Compromised running', category: 'compromised running', hints: [], fallback: 'Rounds of 1 km run + one station at race load. Hold run pace off the station.' },
  sim: { title: 'Race simulation', category: 'simulation', hints: [], fallback: 'Runs + stations at race standard. Practise pacing and transitions.' },
  mob: { title: 'Mobility & recovery', category: 'recovery', hints: ['mobility', 'foam', 'recovery', 'flow', 'stretch'], fallback: '20–30 min hips, ankles, thoracic spine.' },
};

const RANK: Record<Difficulty, number> = { beginner: 0, intermediate: 1, advanced: 2 };

// Derive a training level if the profile doesn't state one, from stated experience.
export function levelFromProfile(experience?: string, stated?: Difficulty): Difficulty {
  if (stated) return stated;
  switch (experience) {
    case 'competitive': return 'advanced';
    case 'consistent': return 'intermediate';
    case 'new': return 'beginner';
    default: return 'intermediate';
  }
}

// The set of equipment available to the athlete (a full gym means everything).
export function availableEquipment(gym?: string, equipment?: string[]): Set<string> | 'all' {
  if (gym === 'full' || !equipment || equipment.length === 0) return 'all';
  return new Set(['none', ...equipment]);
}

function hasEquipment(w: Workout, available: Set<string> | 'all'): boolean {
  if (available === 'all') return true;
  return w.equipment.every((e) => available.has(e));
}

// Pick a workout for a role: right category, not too hard, equipment available, then
// prefer a name matching the role's hints. `rotation` varies the choice week to week.
export function pickWorkout(
  library: Workout[],
  role: Role,
  level: Difficulty,
  available: Set<string> | 'all',
  rotation: number,
): Workout | undefined {
  const def = ROLE_DEF[role];
  const maxRank = RANK[level];
  let pool = library.filter(
    (w) => w.category === def.category && RANK[w.difficulty] <= maxRank && hasEquipment(w, available),
  );
  if (pool.length === 0) {
    // Relax difficulty, keep equipment constraint.
    pool = library.filter((w) => w.category === def.category && hasEquipment(w, available));
  }
  if (pool.length === 0) return undefined;

  // Prefer hint matches, but keep a stable, rotating order.
  const hinted = pool.filter((w) => def.hints.some((h) => w.name.toLowerCase().includes(h)));
  const chosen = hinted.length ? hinted : pool;
  const sorted = [...chosen].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[rotation % sorted.length];
}

// Which weekdays + roles for a given number of days and phase. Lower-body and long-run
// days are kept apart so there are never heavy legs the day after heavy legs.
function dayTemplate(days: number, keyRole: Role): [string, Role][] {
  switch (days) {
    case 3:
      return [['Mon', 'full'], ['Wed', keyRole], ['Sat', 'long']];
    case 5:
      return [['Mon', 'lower'], ['Tue', 'threshold'], ['Wed', 'upper'], ['Fri', keyRole], ['Sat', 'long']];
    case 6:
      return [['Mon', 'lower'], ['Tue', 'threshold'], ['Wed', 'upper'], ['Thu', 'easy'], ['Fri', keyRole], ['Sat', 'long']];
    case 4:
    default:
      return [['Mon', 'lower'], ['Tue', 'threshold'], ['Thu', keyRole], ['Sat', 'long']];
  }
}

function keyRoleForPhase(phase: Phase): Role {
  if (phase === 'peak') return 'sim';
  if (phase === 'build') return 'comp';
  if (phase === 'taper') return 'sim';
  return 'stations';
}

// Taper: drop the extra volume days and turn heavy strength into mobility.
function applyTaper(template: [string, Role][]): [string, Role][] {
  return template
    .filter(([, role]) => role !== 'upper' && role !== 'easy')
    .map(([day, role]) => [day, role === 'lower' || role === 'full' ? 'mob' : role] as [string, Role]);
}

export interface GenerateOptions {
  weeksOut: number | null; // whole weeks to race, or null if no race booked
  maxWeeks?: number;
}

// Build a full plan from the profile + library.
export function generatePlan(
  profile: { experience?: string; level?: Difficulty; daysPerWeek?: number; gym?: string; equipment?: string[] },
  library: Workout[],
  opts: GenerateOptions,
): Plan {
  const level = levelFromProfile(profile.experience, profile.level);
  const days = profile.daysPerWeek ?? 4;
  const available = availableEquipment(profile.gym, profile.equipment);
  const totalWeeks = Math.min(opts.maxWeeks ?? 16, opts.weeksOut && opts.weeksOut > 0 ? opts.weeksOut : 8);

  const weeks: PlanWeek[] = [];
  for (let i = 0; i < totalWeeks; i++) {
    const weeksOutForWeek = opts.weeksOut !== null ? opts.weeksOut - i : null;
    const phase = phaseForWeeksOut(weeksOutForWeek);
    let template = dayTemplate(days, keyRoleForPhase(phase));
    if (phase === 'taper') template = applyTaper(template);

    const planDays = template.map(([dayLabel, role]) => {
      const def = ROLE_DEF[role];
      const workout = pickWorkout(library, role, level, available, i);
      const isKey = role === 'sim' || role === 'comp';
      const session: Session = {
        id: uid(),
        type: workout ? categoryToLogType(workout.category) : logTypeForRole(role),
        title: workout ? workout.name : def.title,
        workoutId: workout?.id,
        detail: workout ? workout.purpose : def.fallback,
        isKey,
      };
      return { id: uid(), label: dayLabel, sessions: [session] };
    });

    weeks.push({ id: uid(), label: `Week ${i + 1} — ${PHASE_NAME[phase]}`, days: planDays });
  }

  return {
    id: uid(),
    name: opts.weeksOut && opts.weeksOut > 0 ? `${totalWeeks}-week race plan` : 'Base training plan',
    source: 'generated',
    isActive: true,
    weeks,
    meta: { phase: phaseForWeeksOut(opts.weeksOut), fromProfileAt: Date.now() },
    updatedAt: Date.now(),
  };
}

function logTypeForRole(role: Role): Session['type'] {
  switch (role) {
    case 'easy': case 'threshold': case 'long': return 'Run';
    case 'lower': case 'upper': case 'full': return 'Strength';
    case 'stations': return 'Stations';
    case 'sim': return 'Race sim';
    case 'mob': return 'Mobility';
    default: return 'Conditioning';
  }
}

export const phaseName = (p: Phase) => PHASE_NAME[p];
export const phaseNote = (p: Phase) => PHASE_NOTE[p];
