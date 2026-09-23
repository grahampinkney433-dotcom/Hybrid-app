import { describe, it, expect } from 'vitest';
import {
  newBlankPlan, duplicatePlan, renamePlan, addWeek, removeWeek, addDay, removeDay,
  addSession, removeSession, updateSession, reorderSession, moveSession, dayOptions,
} from '../src/core/planEdit';
import type { Session } from '../src/core/types';

const sess = (title: string): Session => ({ id: 't-' + title, type: 'Run', title });

describe('planEdit', () => {
  it('creates a blank plan with one week and three days', () => {
    const p = newBlankPlan('Test');
    expect(p.name).toBe('Test');
    expect(p.source).toBe('custom');
    expect(p.isActive).toBe(false);
    expect(p.weeks.length).toBe(1);
    expect(p.weeks[0].days.length).toBe(3);
  });

  it('duplicates with fresh ids and inactive', () => {
    const p = addSession(newBlankPlan(), newBlankPlan().weeks[0].days[0].id, sess('x')); // benign
    const orig = newBlankPlan('Orig');
    const withSession = addSession(orig, orig.weeks[0].days[0].id, sess('run'));
    const dup = duplicatePlan(withSession);
    expect(dup.id).not.toBe(withSession.id);
    expect(dup.weeks[0].id).not.toBe(withSession.weeks[0].id);
    expect(dup.weeks[0].days[0].sessions[0].id).not.toBe(withSession.weeks[0].days[0].sessions[0].id);
    expect(dup.isActive).toBe(false);
    expect(dup.name).toMatch(/copy/);
    void p;
  });

  it('renames without mutating the original', () => {
    const p = newBlankPlan('A');
    const r = renamePlan(p, 'B');
    expect(r.name).toBe('B');
    expect(p.name).toBe('A');
  });

  it('adds and removes weeks and days', () => {
    let p = newBlankPlan();
    p = addWeek(p);
    expect(p.weeks.length).toBe(2);
    const wid = p.weeks[1].id;
    p = addDay(p, wid, 'Sun');
    expect(p.weeks[1].days.some((d) => d.label === 'Sun')).toBe(true);
    const did = p.weeks[1].days[0].id;
    p = removeDay(p, wid, did);
    expect(p.weeks[1].days.some((d) => d.id === did)).toBe(false);
    p = removeWeek(p, wid);
    expect(p.weeks.length).toBe(1);
  });

  it('adds, updates, reorders and removes sessions in a day', () => {
    let p = newBlankPlan();
    const day = p.weeks[0].days[0].id;
    p = addSession(p, day, sess('a'));
    p = addSession(p, day, sess('b'));
    expect(p.weeks[0].days[0].sessions.map((s) => s.title)).toEqual(['a', 'b']);
    p = reorderSession(p, day, 't-a', 1);
    expect(p.weeks[0].days[0].sessions.map((s) => s.title)).toEqual(['b', 'a']);
    p = updateSession(p, day, 't-a', { title: 'a2', type: 'Strength' });
    const s = p.weeks[0].days[0].sessions.find((x) => x.id === 't-a')!;
    expect(s.title).toBe('a2');
    expect(s.type).toBe('Strength');
    p = removeSession(p, day, 't-b');
    expect(p.weeks[0].days[0].sessions.length).toBe(1);
  });

  it('moves a session between days', () => {
    let p = newBlankPlan();
    const [d0, d1] = [p.weeks[0].days[0].id, p.weeks[0].days[1].id];
    p = addSession(p, d0, sess('m'));
    p = moveSession(p, d0, 't-m', d1);
    expect(p.weeks[0].days[0].sessions.length).toBe(0);
    expect(p.weeks[0].days[1].sessions.map((s) => s.title)).toEqual(['m']);
  });

  it('lists day options across weeks', () => {
    let p = newBlankPlan();
    p = addWeek(p);
    const opts = dayOptions(p);
    expect(opts.length).toBe(6); // 2 weeks × 3 days
    expect(opts[0].label).toMatch(/^W1 ·/);
  });
});
