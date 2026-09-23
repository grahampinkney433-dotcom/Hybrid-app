// Pure helpers over logged sessions: totals, personal bests, weekly aggregates and
// simple trends. No browser/DB access, so all of this is unit-tested directly.
import type { Log } from './types';
import { STATIONS, RUN_KEYS } from './stations';
import { weekStart } from './time';

// Total time of a simulation = sum of every split (runs + stations + roxzone), in seconds.
export function simTotal(log: Pick<Log, 'splits'>): number {
  if (!log.splits) return 0;
  return Object.values(log.splits).reduce((a, v) => a + (v || 0), 0);
}

// Running pace in seconds per km, or undefined if we can't compute it.
export function pacePerKm(distanceKm?: number, timeSec?: number): number | undefined {
  if (!distanceKm || !timeSec) return undefined;
  return timeSec / distanceKm;
}

// A personal best row for the History screen.
export interface PB {
  label: string;
  seconds: number;
  date: string;
  unit?: string; // e.g. '/km'
}

// Compute personal bests from the full log list (mirrors the prototype's logic).
export function personalBests(logs: Log[]): PB[] {
  const out: PB[] = [];

  // Fastest full simulation: only sims where every station has a time.
  const fullSims = logs.filter(
    (w) => w.type === 'Race sim' && STATIONS.every((s) => (w.splits?.[s.key] ?? 0) > 0),
  );
  if (fullSims.length) {
    const best = fullSims.reduce((a, w) => (simTotal(w) < simTotal(a) ? w : a));
    out.push({ label: 'Full simulation', seconds: simTotal(best), date: best.date });
  }

  // Best time at each station, across every log.
  for (const s of STATIONS) {
    let best: PB | null = null;
    for (const w of logs) {
      const v = w.splits?.[s.key] ?? 0;
      if (v > 0 && (!best || v < best.seconds)) best = { label: s.name, seconds: v, date: w.date };
    }
    if (best) out.push(best);
  }

  // Fastest single 1 km run split, across every log.
  let fastestKm: PB | null = null;
  for (const w of logs) {
    for (const k of RUN_KEYS) {
      const v = w.splits?.[k] ?? 0;
      if (v > 0 && (!fastestKm || v < fastestKm.seconds))
        fastestKm = { label: 'Fastest 1 km split', seconds: v, date: w.date };
    }
  }
  if (fastestKm) out.push(fastestKm);

  // Best pace on a 5 km+ run.
  const longRuns = logs.filter(
    (w) => w.type === 'Run' && (w.distanceKm ?? 0) >= 5 && (w.timeSec ?? 0) > 0,
  );
  if (longRuns.length) {
    const best = longRuns.reduce((a, w) =>
      pacePerKm(w.distanceKm, w.timeSec)! < pacePerKm(a.distanceKm, a.timeSec)! ? w : a,
    );
    out.push({
      label: 'Best pace, 5 km+ run',
      seconds: pacePerKm(best.distanceKm, best.timeSec)!,
      date: best.date,
      unit: '/km',
    });
  }

  return out;
}

// This-week rollup for the Today dashboard.
export interface WeekStats {
  sessions: number;
  minutes: number;
  runKm: number;
  avgRpe: number | null;
  avgHr: number | null;
}

export function weekStats(logs: Log[], todayDate: string): WeekStats {
  const start = weekStart(todayDate);
  const wk = logs.filter((w) => w.date >= start);
  const minutes = wk.reduce((a, w) => a + (w.durationMin || 0), 0);
  const runKm = wk.reduce(
    (a, w) => a + (w.type === 'Run' ? w.distanceKm || 0 : w.type === 'Race sim' ? 8 : 0),
    0,
  );
  const rpes = wk.map((w) => w.rpe || 0).filter((r) => r > 0);
  const hrs = wk.map((w) => w.hr?.avg || 0).filter((h) => h > 0);
  return {
    sessions: wk.length,
    minutes,
    runKm,
    avgRpe: rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null,
    avgHr: hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null,
  };
}

// Training minutes for the last `weeks` ISO weeks, oldest → newest, for the volume chart.
export function weeklyVolume(logs: Log[], todayDate: string, weeks = 8): number[] {
  const thisStart = weekStart(todayDate);
  const starts: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisStart + 'T12:00');
    d.setDate(d.getDate() - 7 * i);
    starts.push(d.toISOString().slice(0, 10));
  }
  return starts.map((s, i) => {
    const end = starts[i + 1] ?? '9999-99-99';
    return logs
      .filter((w) => w.date >= s && w.date < end)
      .reduce((a, w) => a + (w.durationMin || 0), 0);
  });
}
