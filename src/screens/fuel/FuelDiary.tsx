import { useCallback, useEffect, useState } from 'react';
import { Panel, EmptyState } from '../../components/ui';
import MacroBars from '../../components/MacroBars';
import type { DiaryEntry, Food, MealPlan, Profile } from '../../core/types';
import { computeTargets, sumMacros, macrosForItem, type Macros } from '../../core/nutrition';
import { today, niceDate } from '../../core/time';
import {
  getDiary, saveDiary, allFoods, getProfile, listMealPlans, diaryInRange, logsInRange,
} from '../../data/repo';

function shiftDate(date: string, delta: number): string {
  const d = new Date(date + 'T12:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export default function FuelDiary() {
  const [date, setDate] = useState(today());
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [profile, setProfile] = useState<Profile>({} as Profile);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [week, setWeek] = useState<{ date: string; kcal: number; target: number }[]>([]);
  const [addFoodId, setAddFoodId] = useState('');
  const [addGrams, setAddGrams] = useState('');

  useEffect(() => {
    (async () => {
      setFoods(await allFoods());
      setProfile((await getProfile()) ?? ({} as Profile));
      setMealPlans(await listMealPlans());
    })();
  }, []);

  const blankEntry = useCallback((d: string): DiaryEntry => ({ date: d, items: [], updatedAt: Date.now() }), []);

  // Load the selected day's entry, and (once we have a profile) the 7-day adherence.
  const loadDay = useCallback(
    async (d: string) => {
      const e = (await getDiary(d)) ?? blankEntry(d);
      setEntry(e);
    },
    [blankEntry],
  );

  useEffect(() => {
    loadDay(date);
  }, [date, loadDay]);

  // 7-day adherence, recomputed when the profile is ready or the day changes.
  useEffect(() => {
    (async () => {
      const t = computeTargets(profile);
      const from = shiftDate(date, -6);
      const entries = await diaryInRange(from, date);
      const byDate = new Map(entries.map((e) => [e.date, e]));
      const days: { date: string; kcal: number; target: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = shiftDate(date, -i);
        const e = byDate.get(d);
        const logs = await logsInRange(d, d);
        const dayType = e?.dayType ?? (logs.length ? 'training' : 'rest');
        const kcal = e ? sumMacros(e.items, foods).kcal : 0;
        const target = t.ok ? (dayType === 'training' ? t.training.kcal : t.rest.kcal) : 0;
        days.push({ date: d, kcal, target });
      }
      setWeek(days);
    })();
  }, [date, profile, foods]);

  if (!entry) return <p className="text-steel">Loading…</p>;

  const t = computeTargets(profile);
  const dayType = entry.dayType ?? 'training';
  const target: Macros | undefined = t.ok ? (dayType === 'training' ? t.training : t.rest) : undefined;
  const totals = sumMacros(entry.items, foods);
  const byId = new Map(foods.map((f) => [f.id, f]));

  const persist = (e: DiaryEntry) => {
    setEntry(e);
    saveDiary(e);
  };

  const addItem = () => {
    const grams = parseFloat(addGrams);
    if (!addFoodId || !isFinite(grams)) return;
    persist({ ...entry, items: [...entry.items, { foodId: addFoodId, grams }] });
    setAddGrams('');
  };
  const setGrams = (i: number, g: string) => {
    const grams = parseFloat(g);
    persist({ ...entry, items: entry.items.map((it, idx) => (idx === i ? { ...it, grams: isFinite(grams) ? grams : 0 } : it)) });
  };
  const removeItem = (i: number) => persist({ ...entry, items: entry.items.filter((_, idx) => idx !== i) });

  const copyPlan = (planId: string) => {
    const p = mealPlans.find((x) => x.id === planId);
    if (!p) return;
    const items = p.meals.flatMap((m) => m.items.map((it) => ({ foodId: it.foodId, grams: it.grams })));
    persist({ ...entry, items: [...entry.items, ...items] });
  };
  const copyYesterday = async () => {
    const y = await getDiary(shiftDate(date, -1));
    if (!y || y.items.length === 0) return;
    persist({ ...entry, items: [...entry.items, ...y.items] });
  };

  const maxKcal = Math.max(1, ...week.map((d) => Math.max(d.kcal, d.target)));

  return (
    <>
      {/* Date + day type */}
      <Panel>
        <div className="flex items-center justify-between gap-2">
          <button className="btn ghost small" aria-label="Previous day" onClick={() => setDate(shiftDate(date, -1))}>←</button>
          <div className="text-center">
            <input className="field !py-1 text-center" type="date" value={date} aria-label="Diary date" onChange={(e) => setDate(e.target.value)} />
            <div className="text-steel text-sm mt-1">{niceDate(date)}</div>
          </div>
          <button className="btn ghost small" aria-label="Next day" onClick={() => setDate(shiftDate(date, 1))}>→</button>
        </div>
        <div className="seg-tabs !mb-0 mt-2 justify-center" role="group" aria-label="Day type">
          <button aria-pressed={dayType === 'training'} onClick={() => persist({ ...entry, dayType: 'training' })}>Training day</button>
          <button aria-pressed={dayType === 'rest'} onClick={() => persist({ ...entry, dayType: 'rest' })}>Rest day</button>
        </div>
      </Panel>

      {/* Totals vs target */}
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-2">Today vs target</h3>
        {target ? (
          <MacroBars total={totals} target={target} />
        ) : (
          <p className="text-steel text-sm m-0">Add your stats in the Targets tab to compare against a target.</p>
        )}
      </Panel>

      {/* Foods */}
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-2">Foods</h3>
        {entry.items.length === 0 ? (
          <p className="text-steel text-sm">Nothing logged yet. Add foods below, or copy a plan / yesterday.</p>
        ) : (
          entry.items.map((it, i) => {
            const f = byId.get(it.foodId);
            const kcal = f ? Math.round(macrosForItem(f, it.grams).kcal) : 0;
            return (
              <div className="food-row" key={i}>
                <span>{f ? f.name : 'Unknown food'}</span>
                <input className="field" inputMode="numeric" aria-label={`Grams of ${f?.name ?? 'food'}`} value={it.grams} onChange={(e) => setGrams(i, e.target.value)} />
                <span className="text-steel">{kcal} kcal</span>
                <button className="x" aria-label="Remove food" onClick={() => removeItem(i)}>×</button>
              </div>
            );
          })
        )}
        <div className="add-food">
          <select className="field" aria-label="Food to add" value={addFoodId} onChange={(e) => setAddFoodId(e.target.value)}>
            <option value="">Choose a food…</option>
            {foods.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <input className="field" inputMode="numeric" placeholder="g" aria-label="Grams" value={addGrams} onChange={(e) => setAddGrams(e.target.value)} />
          <button className="btn small" onClick={addItem}>Add</button>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <button className="btn ghost small" onClick={copyYesterday}>Copy yesterday</button>
          {mealPlans.length > 0 && (
            <select className="field !w-auto !py-1 text-sm" aria-label="Copy a saved plan" defaultValue="" onChange={(e) => { if (e.target.value) copyPlan(e.target.value); e.target.value = ''; }}>
              <option value="">Copy a saved plan…</option>
              {mealPlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>
      </Panel>

      {/* 7-day adherence */}
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-1">Last 7 days</h3>
        {week.some((d) => d.kcal > 0) ? (
          <>
            <div className="bars" role="img" aria-label="Calories logged over the last 7 days versus target">
              {week.map((d) => {
                const pct = (d.kcal / maxKcal) * 100;
                const onTarget = d.target && d.kcal >= d.target * 0.9 && d.kcal <= d.target * 1.1;
                return (
                  <div
                    key={d.date}
                    className={onTarget ? 'now' : ''}
                    style={{ height: `${Math.max(3, pct)}%` }}
                    title={`${d.date}: ${Math.round(d.kcal)} kcal${d.target ? ` / ${d.target}` : ''}`}
                  />
                );
              })}
            </div>
            <div className="bar-labels">
              {week.map((d) => <span key={d.date}>{d.date.slice(8)}</span>)}
            </div>
            <p className="text-steel text-sm mt-2 mb-0">Blue bars are days within 10% of that day's calorie target.</p>
          </>
        ) : (
          <p className="text-steel text-sm m-0">Log foods across a few days to see your adherence trend.</p>
        )}
      </Panel>

      {entry.items.length === 0 && week.every((d) => d.kcal === 0) && (
        <EmptyState title="Your food diary is empty">
          Pick a date, add foods, and Stationlog totals them against that day's target.
        </EmptyState>
      )}
    </>
  );
}
