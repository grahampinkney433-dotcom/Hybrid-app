import { useEffect, useState } from 'react';
import { Panel } from '../../components/ui';
import type { Goal, Profile, Sex } from '../../core/types';
import { computeTargets, type Macros } from '../../core/nutrition';
import { getProfile, saveProfile } from '../../data/repo';

const ACTIVITY = [
  { value: 1.375, label: 'Light (1–3/wk)' },
  { value: 1.55, label: 'Moderate (3–5/wk)' },
  { value: 1.725, label: 'High (6–7/wk)' },
  { value: 1.9, label: 'Very high (doubles)' },
];
const GOALS: { value: Goal; label: string }[] = [
  { value: 'finish', label: 'Finish a race' },
  { value: 'target-time', label: 'Hit a target time' },
  { value: 'lean', label: 'Lean down' },
  { value: 'strength', label: 'Build strength' },
  { value: 'general', label: 'General fitness' },
];

export default function FuelTargets() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dayType, setDayType] = useState<'training' | 'rest'>('training');

  useEffect(() => {
    getProfile().then((p) => setProfile(p ?? ({} as Profile)));
  }, []);

  if (!profile) return <p className="text-steel">Loading…</p>;

  const update = (patch: Partial<Profile>) => {
    const next = { ...profile, ...patch };
    setProfile(next);
    saveProfile(next); // recalculates automatically on the next render (feature 5)
  };
  const numOr = (v: string) => {
    const n = parseFloat(v);
    return isFinite(n) ? n : undefined;
  };

  const t = computeTargets(profile);

  return (
    <>
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-2">Your stats</h3>
        <div className="flex gap-[10px] flex-wrap">
          <div className="flex-1 min-w-[100px]">
            <label className="field-label" htmlFor="ft-sex">Sex</label>
            <select id="ft-sex" className="field" value={profile.sex ?? 'male'} onChange={(e) => update({ sex: e.target.value as Sex })}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div className="flex-1 min-w-[80px]">
            <label className="field-label" htmlFor="ft-age">Age</label>
            <input id="ft-age" className="field" type="number" inputMode="numeric" value={profile.age ?? ''} onChange={(e) => update({ age: numOr(e.target.value) })} />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="field-label" htmlFor="ft-h">Height (cm)</label>
            <input id="ft-h" className="field" type="number" inputMode="numeric" value={profile.heightCm ?? ''} onChange={(e) => update({ heightCm: numOr(e.target.value) })} />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="field-label" htmlFor="ft-w">Weight (kg)</label>
            <input id="ft-w" className="field" type="number" step="0.1" inputMode="decimal" value={profile.weightKg ?? ''} onChange={(e) => update({ weightKg: numOr(e.target.value) })} />
          </div>
        </div>
        <div className="flex gap-[10px] flex-wrap mt-2">
          <div className="flex-1 min-w-[140px]">
            <label className="field-label" htmlFor="ft-act">Training load</label>
            <select id="ft-act" className="field" value={profile.activity ?? 1.55} onChange={(e) => update({ activity: numOr(e.target.value) })}>
              {ACTIVITY.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="field-label" htmlFor="ft-goal">Goal</label>
            <select id="ft-goal" className="field" value={profile.goal ?? 'general'} onChange={(e) => update({ goal: e.target.value as Goal })}>
              {GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
        </div>
      </Panel>

      {t.ok ? (
        <Panel>
          <h3 className="font-cond font-semibold text-xl m-0 mb-2">Daily targets</h3>
          <div className="seg-tabs" role="group" aria-label="Day type">
            <button aria-pressed={dayType === 'training'} onClick={() => setDayType('training')}>Training day</button>
            <button aria-pressed={dayType === 'rest'} onClick={() => setDayType('rest')}>Rest day</button>
          </div>
          <MacroGrid m={dayType === 'training' ? t.training : t.rest} />
          <p className="text-steel text-sm mt-2 mb-0">
            Maintenance ≈ {t.maintenance} kcal (BMR {t.bmr}). Carbs flex between training and rest
            days. Estimates — adjust after 2–3 weeks of bodyweight trend.
          </p>
          {t.floored && (
            <p className="text-effort text-sm mt-2 mb-0">
              We've held your calories at the safe minimum of {t.calFloor} kcal. A larger deficit
              than this isn't healthy or sustainable — eat at least this much.
            </p>
          )}
        </Panel>
      ) : (
        <Panel className="border-lane">
          <p className="m-0 text-sm">{t.reason}</p>
        </Panel>
      )}

      <Panel className="border-lane">
        <p className="m-0 text-sm">
          <strong>Not medical advice.</strong> These are general estimates, not a prescription.
          If you have a health condition or an eating disorder history, work with a professional.
        </p>
      </Panel>
    </>
  );
}

function MacroGrid({ m }: { m: Macros }) {
  const cell = (v: string | number, label: string) => (
    <div className="py-[10px] px-1">
      <b className="block font-cond font-bold text-3xl leading-none">{v}</b>
      <span className="text-steel text-sm">{label}</span>
    </div>
  );
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
      {cell(m.kcal, 'kcal')}
      {cell(`${m.protein}g`, 'protein')}
      {cell(`${m.carbs}g`, 'carbs')}
      {cell(`${m.fat}g`, 'fat')}
    </div>
  );
}
