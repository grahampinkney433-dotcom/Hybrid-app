import { describe, it, expect } from 'vitest';
import { simTotal, pacePerKm, personalBests, weekStats, weeklyVolume } from '../src/core/logs';
import { estimateMaxHr, zoneRanges } from '../src/core/hr';
import type { Log } from '../src/core/types';

const log = (p: Partial<Log>): Log => ({ id: Math.random().toString(36).slice(2), date: '2026-09-20', type: 'Run', updatedAt: 0, ...p });

describe('sim + pace helpers', () => {
  it('sums all splits for a sim total', () => {
    expect(simTotal({ splits: { r0: 240, ski: 300, wb: 200 } })).toBe(740);
    expect(simTotal({ splits: undefined })).toBe(0);
  });
  it('computes pace per km', () => {
    expect(pacePerKm(5, 1500)).toBe(300);
    expect(pacePerKm(0, 1500)).toBeUndefined();
    expect(pacePerKm(5, undefined)).toBeUndefined();
  });
});

describe('personal bests', () => {
  it('picks the fastest full sim (all 8 stations present)', () => {
    const full = (n: number, date: string) => {
      const splits: Record<string, number> = { ski: n, push: n, pull: n, bbj: n, row: n, farm: n, lunge: n, wb: n };
      return log({ type: 'Race sim', splits, date });
    };
    const pbs = personalBests([full(100, '2026-01-01'), full(90, '2026-02-01')]);
    const sim = pbs.find((p) => p.label === 'Full simulation');
    expect(sim?.seconds).toBe(720); // 8 × 90
    expect(sim?.date).toBe('2026-02-01');
  });

  it('ignores incomplete sims for the full-sim PB but still records station bests', () => {
    const partial = log({ type: 'Race sim', splits: { ski: 200, row: 210 }, date: '2026-03-01' });
    const pbs = personalBests([partial]);
    expect(pbs.find((p) => p.label === 'Full simulation')).toBeUndefined();
    expect(pbs.find((p) => p.label === 'SkiErg')?.seconds).toBe(200);
    expect(pbs.find((p) => p.label === 'Row')?.seconds).toBe(210);
  });

  it('finds the fastest 1 km run split and best 5k+ pace', () => {
    const sim = log({ type: 'Race sim', splits: { r0: 250, r1: 240 } });
    const run = log({ type: 'Run', distanceKm: 10, timeSec: 2700 }); // 270 s/km
    const pbs = personalBests([sim, run]);
    expect(pbs.find((p) => p.label === 'Fastest 1 km split')?.seconds).toBe(240);
    expect(pbs.find((p) => p.label === 'Best pace, 5 km+ run')?.seconds).toBe(270);
  });

  it('returns nothing for an empty history', () => {
    expect(personalBests([])).toEqual([]);
  });
});

describe('weekly aggregates', () => {
  const monday = '2026-09-21'; // a Monday
  it('sums this week and averages RPE + HR', () => {
    const logs = [
      log({ date: '2026-09-21', durationMin: 60, rpe: 7, hr: { avg: 150 } }),
      log({ date: '2026-09-23', durationMin: 40, rpe: 5, type: 'Run', distanceKm: 8 }),
      log({ date: '2026-09-10', durationMin: 90 }), // previous weeks, excluded
    ];
    const s = weekStats(logs, '2026-09-24');
    expect(s.sessions).toBe(2);
    expect(s.minutes).toBe(100);
    expect(s.runKm).toBe(8);
    expect(s.avgRpe).toBeCloseTo(6);
    expect(s.avgHr).toBe(150);
    void monday;
  });

  it('produces one volume bucket per week', () => {
    const v = weeklyVolume([log({ date: '2026-09-21', durationMin: 30 })], '2026-09-24', 8);
    expect(v.length).toBe(8);
    expect(v[7]).toBe(30); // current week is the last bucket
  });
});

describe('heart-rate zones', () => {
  it('estimates max HR from age (Tanaka)', () => {
    expect(estimateMaxHr(30)).toBe(187);
    expect(estimateMaxHr(undefined)).toBeUndefined();
    expect(estimateMaxHr(200)).toBeUndefined();
  });
  it('builds five ascending zones from a max HR', () => {
    const z = zoneRanges(190);
    expect(z.length).toBe(5);
    expect(z[0].zone).toBe(1);
    expect(z[4].max).toBe(190);
    expect(z[0].min).toBeLessThan(z[4].min);
  });
  it('returns no zones without a valid max HR', () => {
    expect(zoneRanges(undefined)).toEqual([]);
    expect(zoneRanges(50)).toEqual([]);
  });
});
