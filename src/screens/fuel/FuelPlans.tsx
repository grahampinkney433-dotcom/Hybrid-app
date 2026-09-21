import { useEffect, useState } from 'react';
import { Panel, EmptyState } from '../../components/ui';
import MacroBars from '../../components/MacroBars';
import type { Food, MealPlan, Profile } from '../../core/types';
import { computeTargets, sumMacros, macrosForItem } from '../../core/nutrition';
import { uid } from '../../core/time';
import {
  listMealPlans, saveMealPlan, deleteMealPlan, allFoods, addFood, getProfile,
} from '../../data/repo';

// A starter meal plan built from the built-in foods (same idea as the prototype).
function starterPlan(): MealPlan {
  return {
    id: uid(), name: 'Training day', isActive: false, updatedAt: Date.now(),
    meals: [
      { name: 'Breakfast', items: [{ foodId: 'oats', grams: 80 }, { foodId: 'milk', grams: 250 }, { foodId: 'whey', grams: 30 }, { foodId: 'banana', grams: 120 }, { foodId: 'blueb', grams: 80 }] },
      { name: 'Lunch', items: [{ foodId: 'chicken', grams: 150 }, { foodId: 'rice', grams: 250 }, { foodId: 'peppers', grams: 100 }, { foodId: 'spinach', grams: 50 }, { foodId: 'oil', grams: 10 }] },
      { name: 'Pre-session', items: [{ foodId: 'bagel', grams: 85 }, { foodId: 'pb', grams: 20 }, { foodId: 'honey', grams: 15 }] },
      { name: 'Dinner', items: [{ foodId: 'salmon', grams: 150 }, { foodId: 'sweetpot', grams: 250 }, { foodId: 'broc', grams: 150 }] },
      { name: 'Evening', items: [{ foodId: 'gyog', grams: 200 }, { foodId: 'granola', grams: 40 }] },
    ],
  };
}
function blankPlan(): MealPlan {
  return {
    id: uid(), name: 'New plan', isActive: false, updatedAt: Date.now(),
    meals: ['Breakfast', 'Lunch', 'Snack', 'Dinner'].map((name) => ({ name, items: [] })),
  };
}

export default function FuelPlans() {
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [profile, setProfile] = useState<Profile>({} as Profile);
  const [cf, setCf] = useState({ name: '', kcal: '', p: '', c: '', f: '' });
  const [addSel, setAddSel] = useState<Record<number, string>>({});
  const [addG, setAddG] = useState<Record<number, string>>({});

  const refresh = async (preferId?: string) => {
    const [ps, fs] = await Promise.all([listMealPlans(), allFoods()]);
    setPlans(ps);
    setFoods(fs);
    setSelectedId((cur) => preferId ?? (cur && ps.some((p) => p.id === cur) ? cur : ps[0]?.id ?? null));
  };
  useEffect(() => {
    getProfile().then((p) => setProfile(p ?? ({} as Profile)));
    refresh();
  }, []);

  const selected = plans.find((p) => p.id === selectedId) ?? null;
  const t = computeTargets(profile);
  const target = t.ok ? t.training : undefined;

  const save = (p: MealPlan) => {
    setPlans((ps) => ps.map((x) => (x.id === p.id ? p : x)));
    saveMealPlan(p);
  };

  const addCustomFood = async () => {
    const kcal = parseFloat(cf.kcal);
    if (!cf.name.trim() || !isFinite(kcal)) return;
    await addFood({ id: 'c-' + uid(), name: cf.name.trim(), kcal, protein: +cf.p || 0, carbs: +cf.c || 0, fat: +cf.f || 0 });
    setCf({ name: '', kcal: '', p: '', c: '', f: '' });
    setFoods(await allFoods());
  };

  return (
    <>
      <Panel>
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <h3 className="font-cond font-semibold text-xl m-0">Meal plans</h3>
          <div className="flex gap-2">
            <button className="btn ghost small" onClick={async () => { const p = starterPlan(); await saveMealPlan(p); await refresh(p.id); }}>Starter</button>
            <button className="btn ghost small" onClick={async () => { const p = blankPlan(); await saveMealPlan(p); await refresh(p.id); }}>New blank</button>
          </div>
        </div>
        {plans.length > 0 && (
          <div className="flex gap-[10px] flex-wrap mt-2">
            <div className="flex-1 min-w-[140px]">
              <label className="field-label" htmlFor="mp-sel">Plan</label>
              <select id="mp-sel" className="field" value={selected?.id ?? ''} onChange={(e) => setSelectedId(e.target.value)}>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {selected && (
              <div className="flex-1 min-w-[140px]">
                <label className="field-label" htmlFor="mp-name">Name</label>
                <input id="mp-name" className="field" value={selected.name} onChange={(e) => save({ ...selected, name: e.target.value })} />
              </div>
            )}
          </div>
        )}
      </Panel>

      {selected ? (
        <Panel>
          {target && <MacroBars total={sumMacros(selected.meals.flatMap((m) => m.items), foods)} target={target} />}
          {target && (
            <button
              className="btn small mb-2"
              onClick={() => {
                const cur = sumMacros(selected.meals.flatMap((m) => m.items), foods).kcal;
                if (!cur) return;
                const k = target.kcal / cur;
                save({
                  ...selected,
                  meals: selected.meals.map((m) => ({ ...m, items: m.items.map((it) => ({ ...it, grams: Math.max(5, Math.round((it.grams * k) / 5) * 5) })) })),
                });
              }}
            >
              Scale portions to training target
            </button>
          )}

          {selected.meals.map((meal, mi) => {
            const mt = sumMacros(meal.items, foods);
            return (
              <div className="meal" key={mi}>
                <div className="flex justify-between items-baseline">
                  <h4 className="font-cond font-semibold m-0">{meal.name}</h4>
                  <span className="text-steel text-sm">{Math.round(mt.kcal)} kcal · {Math.round(mt.protein)}g protein</span>
                </div>
                {meal.items.map((it, ii) => {
                  const f = foods.find((x) => x.id === it.foodId);
                  const kcal = f ? Math.round(macrosForItem(f, it.grams).kcal) : 0;
                  return (
                    <div className="food-row" key={ii}>
                      <span>{f ? f.name : 'Unknown food'}</span>
                      <input className="field" inputMode="numeric" aria-label={`Grams of ${f?.name ?? 'food'} in ${meal.name}`} value={it.grams}
                        onChange={(e) => { const g = parseFloat(e.target.value); save({ ...selected, meals: selected.meals.map((m, x) => x === mi ? { ...m, items: m.items.map((y, z) => z === ii ? { ...y, grams: isFinite(g) ? g : 0 } : y) } : m) }); }} />
                      <span className="text-steel">{kcal} kcal</span>
                      <button className="x" aria-label="Remove" onClick={() => save({ ...selected, meals: selected.meals.map((m, x) => x === mi ? { ...m, items: m.items.filter((_, z) => z !== ii) } : m) })}>×</button>
                    </div>
                  );
                })}
                <div className="add-food">
                  <select className="field" aria-label={`Food to add to ${meal.name}`} value={addSel[mi] ?? ''} onChange={(e) => setAddSel((s) => ({ ...s, [mi]: e.target.value }))}>
                    <option value="">Choose…</option>
                    {foods.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <input className="field" inputMode="numeric" placeholder="g" aria-label={`Grams to add to ${meal.name}`} value={addG[mi] ?? ''} onChange={(e) => setAddG((s) => ({ ...s, [mi]: e.target.value }))} />
                  <button className="btn small" onClick={() => {
                    const fid = addSel[mi]; const g = parseFloat(addG[mi] ?? '');
                    if (!fid || !isFinite(g)) return;
                    save({ ...selected, meals: selected.meals.map((m, x) => x === mi ? { ...m, items: [...m.items, { foodId: fid, grams: g }] } : m) });
                    setAddSel((s) => ({ ...s, [mi]: '' })); setAddG((s) => ({ ...s, [mi]: '' }));
                  }}>Add</button>
                </div>
              </div>
            );
          })}

          <div className="mt-3">
            <button className="btn danger small" onClick={async () => { if (confirm('Delete this meal plan?')) { await deleteMealPlan(selected.id); await refresh(); } }}>Delete plan</button>
          </div>
        </Panel>
      ) : (
        <EmptyState title="No meal plans yet">
          Start from the starter plan (it scales to your targets) or a blank one. Plans are
          templates — copy one into a day's diary from the Diary tab.
        </EmptyState>
      )}

      {/* Custom food */}
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-1">Add a custom food</h3>
        <p className="text-steel text-sm mt-0 mb-2">Values per 100 g, from the pack label.</p>
        <label className="field-label" htmlFor="cf-name">Name</label>
        <input id="cf-name" className="field mb-2" placeholder="e.g. Protein bar" value={cf.name} onChange={(e) => setCf({ ...cf, name: e.target.value })} />
        <div className="flex gap-[10px] flex-wrap">
          <div className="flex-1 min-w-[80px]"><label className="field-label" htmlFor="cf-k">kcal</label><input id="cf-k" className="field" type="number" inputMode="decimal" value={cf.kcal} onChange={(e) => setCf({ ...cf, kcal: e.target.value })} /></div>
          <div className="flex-1 min-w-[80px]"><label className="field-label" htmlFor="cf-p">Protein</label><input id="cf-p" className="field" type="number" inputMode="decimal" value={cf.p} onChange={(e) => setCf({ ...cf, p: e.target.value })} /></div>
          <div className="flex-1 min-w-[80px]"><label className="field-label" htmlFor="cf-c">Carbs</label><input id="cf-c" className="field" type="number" inputMode="decimal" value={cf.c} onChange={(e) => setCf({ ...cf, c: e.target.value })} /></div>
          <div className="flex-1 min-w-[80px]"><label className="field-label" htmlFor="cf-f">Fat</label><input id="cf-f" className="field" type="number" inputMode="decimal" value={cf.f} onChange={(e) => setCf({ ...cf, f: e.target.value })} /></div>
        </div>
        <button className="btn small mt-2" onClick={addCustomFood}>Add food</button>
      </Panel>
    </>
  );
}
