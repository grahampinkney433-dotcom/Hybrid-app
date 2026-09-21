// Pure, immutable edit operations on a Plan (weeks → days → sessions). Kept out of the
// UI so they can be unit-tested and reused. Every function returns a NEW plan object.
import type { Plan, PlanWeek, PlanDay, Session } from './types';
import { uid } from './time';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function newBlankPlan(name = 'My plan'): Plan {
  return {
    id: uid(),
    name,
    source: 'custom',
    isActive: false,
    weeks: [makeWeek('Week 1', ['Mon', 'Wed', 'Fri'])],
    updatedAt: Date.now(),
  };
}

function makeWeek(label: string, dayLabels: string[]): PlanWeek {
  return { id: uid(), label, days: dayLabels.map((l) => ({ id: uid(), label: l, sessions: [] })) };
}

// Deep-copy a plan under a new identity (for "Duplicate"). New ids everywhere; inactive.
export function duplicatePlan(plan: Plan, name?: string): Plan {
  const copy = clone(plan);
  copy.id = uid();
  copy.name = name ?? `${plan.name} (copy)`;
  copy.source = 'custom';
  copy.isActive = false;
  copy.updatedAt = Date.now();
  for (const w of copy.weeks) {
    w.id = uid();
    for (const d of w.days) {
      d.id = uid();
      for (const s of d.sessions) s.id = uid();
    }
  }
  return copy;
}

export function renamePlan(plan: Plan, name: string): Plan {
  return { ...clone(plan), name };
}

export function addWeek(plan: Plan): Plan {
  const p = clone(plan);
  const last = p.weeks[p.weeks.length - 1];
  const dayLabels = last ? last.days.map((d) => d.label) : ['Mon', 'Wed', 'Fri'];
  p.weeks.push(makeWeek(`Week ${p.weeks.length + 1}`, dayLabels));
  return p;
}

export function removeWeek(plan: Plan, weekId: string): Plan {
  const p = clone(plan);
  p.weeks = p.weeks.filter((w) => w.id !== weekId);
  return p;
}

// Add a day; picks the first weekday not already present in that week.
export function addDay(plan: Plan, weekId: string, label?: string): Plan {
  const p = clone(plan);
  const w = p.weeks.find((x) => x.id === weekId);
  if (!w) return p;
  const used = new Set(w.days.map((d) => d.label));
  const nextLabel = label ?? WEEKDAYS.find((d) => !used.has(d)) ?? `Day ${w.days.length + 1}`;
  w.days.push({ id: uid(), label: nextLabel, sessions: [] });
  return p;
}

export function removeDay(plan: Plan, weekId: string, dayId: string): Plan {
  const p = clone(plan);
  const w = p.weeks.find((x) => x.id === weekId);
  if (w) w.days = w.days.filter((d) => d.id !== dayId);
  return p;
}

function findDay(p: Plan, dayId: string): PlanDay | undefined {
  for (const w of p.weeks) {
    const d = w.days.find((x) => x.id === dayId);
    if (d) return d;
  }
  return undefined;
}

export function addSession(plan: Plan, dayId: string, session: Session): Plan {
  const p = clone(plan);
  findDay(p, dayId)?.sessions.push(session);
  return p;
}

export function removeSession(plan: Plan, dayId: string, sessionId: string): Plan {
  const p = clone(plan);
  const d = findDay(p, dayId);
  if (d) d.sessions = d.sessions.filter((s) => s.id !== sessionId);
  return p;
}

export function updateSession(plan: Plan, dayId: string, sessionId: string, patch: Partial<Session>): Plan {
  const p = clone(plan);
  const d = findDay(p, dayId);
  if (d) d.sessions = d.sessions.map((s) => (s.id === sessionId ? { ...s, ...patch } : s));
  return p;
}

// Move a session up/down within its day.
export function reorderSession(plan: Plan, dayId: string, sessionId: string, dir: -1 | 1): Plan {
  const p = clone(plan);
  const d = findDay(p, dayId);
  if (!d) return p;
  const i = d.sessions.findIndex((s) => s.id === sessionId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= d.sessions.length) return p;
  [d.sessions[i], d.sessions[j]] = [d.sessions[j], d.sessions[i]];
  return p;
}

// Move a session to a different day (this is our "drag between days", tap-driven).
export function moveSession(plan: Plan, fromDayId: string, sessionId: string, toDayId: string): Plan {
  if (fromDayId === toDayId) return clone(plan);
  const p = clone(plan);
  const from = findDay(p, fromDayId);
  const to = findDay(p, toDayId);
  if (!from || !to) return p;
  const idx = from.sessions.findIndex((s) => s.id === sessionId);
  if (idx < 0) return p;
  const [moved] = from.sessions.splice(idx, 1);
  to.sessions.push(moved);
  return p;
}

// A flat list of every day in the plan, for "move to…" menus.
export function dayOptions(plan: Plan): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  plan.weeks.forEach((w, wi) => {
    w.days.forEach((d) => out.push({ id: d.id, label: `W${wi + 1} · ${d.label}` }));
  });
  return out;
}
