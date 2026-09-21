import { useEffect, useState } from 'react';
import { Panel, ScreenTitle } from '../components/ui';
import {
  EQUIPMENT, type Division, type Goal, type Profile, type Sex,
} from '../core/types';
import { toSec, fmt, today } from '../core/time';
import { generatePlan } from '../core/plan';
import { getProfile, saveProfile, listWorkouts, savePlan, setActivePlan, getSettings, saveSettings } from '../data/repo';

const DIVISIONS: Division[] = ['Open', 'Pro', 'Doubles', 'Mixed Doubles', 'Relay'];
const GOALS: { value: Goal; label: string }[] = [
  { value: 'finish', label: 'Finish my first race' },
  { value: 'target-time', label: 'Hit a target time' },
  { value: 'lean', label: 'Lean down' },
  { value: 'strength', label: 'Build strength' },
  { value: 'general', label: 'General fitness' },
];
const EXPERIENCE = [
  { value: 'new', label: 'New to structured training' },
  { value: 'returning', label: 'Returning after a break' },
  { value: 'consistent', label: 'Training consistently' },
  { value: 'competitive', label: 'Competitive athlete' },
];
const ACTIVITY = [
  { value: 1.375, label: 'Light (1–3 sessions/wk)' },
  { value: 1.55, label: 'Moderate (3–5 sessions/wk)' },
  { value: 1.725, label: 'High (6–7 sessions/wk)' },
  { value: 1.9, label: 'Very high (doubles)' },
];
// Known-time fields, entered as m:ss / h:mm:ss and stored as seconds.
const KNOWN: { key: string; label: string; ph: string }[] = [
  { key: '5k', label: '5 km run', ph: '22:30' },
  { key: '1k', label: '1 km run', ph: '4:00' },
  { key: 'ski', label: 'SkiErg 1000 m', ph: '3:45' },
  { key: 'row', label: 'Row 1000 m', ph: '3:40' },
  { key: 'sim', label: 'Best full simulation', ph: '1:15:00' },
];

const secToStr = (s?: number) => (s ? fmt(s) : '');

export default function QuestionnaireScreen({ onDone }: { onDone: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // form fields
  const [raceBooked, setRaceBooked] = useState(false);
  const [raceDate, setRaceDate] = useState('');
  const [division, setDivision] = useState<Division>('Open');
  const [experience, setExperience] = useState('consistent');
  const [weeklyHours, setWeeklyHours] = useState('');
  const [times, setTimes] = useState<Record<string, string>>({});
  const [daysPerWeek, setDaysPerWeek] = useState('4');
  const [sessionMinutes, setSessionMinutes] = useState('60');
  const [gym, setGym] = useState<'full' | 'home' | 'minimal'>('full');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [injuries, setInjuries] = useState('');
  const [goal, setGoal] = useState<Goal>('finish');
  const [targetTime, setTargetTime] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [activity, setActivity] = useState('1.55');

  // Prefill from an existing profile so re-running is really editing.
  useEffect(() => {
    getProfile().then((p) => {
      if (p) {
        setRaceBooked(p.raceBooked ?? false);
        setRaceDate(p.raceDate ?? '');
        setDivision(p.division ?? 'Open');
        setExperience(p.experience ?? 'consistent');
        setWeeklyHours(p.weeklyHours != null ? String(p.weeklyHours) : '');
        setTimes(Object.fromEntries(Object.entries(p.knownTimes ?? {}).map(([k, v]) => [k, secToStr(v)])));
        setDaysPerWeek(String(p.daysPerWeek ?? 4));
        setSessionMinutes(String(p.sessionMinutes ?? 60));
        setGym(p.gym ?? 'full');
        setEquipment(p.equipment ?? []);
        setInjuries(p.injuries ?? '');
        setGoal(p.goal ?? 'finish');
        setTargetTime(secToStr(p.targetTimeSec));
        setSex(p.sex ?? 'male');
        setAge(p.age != null ? String(p.age) : '');
        setHeightCm(p.heightCm != null ? String(p.heightCm) : '');
        setWeightKg(p.weightKg != null ? String(p.weightKg) : '');
        setActivity(String(p.activity ?? 1.55));
      }
      setLoaded(true);
    });
  }, []);

  const toggleEquip = (e: string) =>
    setEquipment((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]));

  const numOr = (v: string) => {
    const n = parseFloat(v);
    return isFinite(n) ? n : undefined;
  };

  async function finish() {
    setSaving(true);
    const knownTimes: Record<string, number> = {};
    for (const [k, v] of Object.entries(times)) {
      const s = toSec(v);
      if (s) knownTimes[k] = s;
    }
    const profile: Profile = {
      raceBooked,
      raceDate: raceBooked ? raceDate || undefined : undefined,
      division: raceBooked ? division : undefined,
      experience: experience as Profile['experience'],
      weeklyHours: numOr(weeklyHours),
      knownTimes,
      daysPerWeek: (parseInt(daysPerWeek, 10) as Profile['daysPerWeek']) || 4,
      sessionMinutes: numOr(sessionMinutes),
      gym,
      equipment: gym === 'full' ? [] : equipment,
      injuries: injuries.trim() || undefined,
      goal,
      targetTimeSec: goal === 'target-time' ? toSec(targetTime) || undefined : undefined,
      sex,
      age: numOr(age),
      heightCm: numOr(heightCm),
      weightKg: numOr(weightKg),
      activity: numOr(activity),
    };
    await saveProfile(profile);

    // Generate an active plan from the profile + library. Existing logs are untouched.
    const weeksOut =
      raceBooked && raceDate
        ? Math.ceil((new Date(raceDate + 'T12:00').getTime() - Date.now()) / (7 * 86400000))
        : null;
    const library = await listWorkouts();
    const plan = generatePlan(profile, library, { weeksOut });
    await savePlan(plan);
    await setActivePlan(plan.id);

    const settings = (await getSettings()) ?? {};
    await saveSettings({ ...settings, onboardingComplete: true });

    setSaving(false);
    onDone();
  }

  if (!loaded) return <ScreenTitle>Set up your plan</ScreenTitle>;

  return (
    <>
      <ScreenTitle sub="A few questions to generate your plan and nutrition targets. You can re-run this any time — it never deletes your logged sessions.">
        Set up your plan
      </ScreenTitle>

      {/* Disclaimer up front (also lives in Settings). */}
      <Panel className="border-lane">
        <p className="m-0 text-sm">
          <strong>Not medical advice.</strong> Stationlog gives general fitness guidance only.
          Check with a qualified professional before starting a new programme, especially if you
          have an injury or health condition.
        </p>
      </Panel>

      {/* Race */}
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-2">Your race</h3>
        <label className="flex items-center gap-2 mb-2">
          <input type="checkbox" checked={raceBooked} onChange={(e) => setRaceBooked(e.target.checked)} />
          <span>I have a race booked</span>
        </label>
        {raceBooked && (
          <div className="flex gap-[10px] flex-wrap">
            <div className="flex-1 min-w-[140px]">
              <label className="field-label" htmlFor="q-date">Race date</label>
              <input id="q-date" className="field" type="date" min={today()} value={raceDate} onChange={(e) => setRaceDate(e.target.value)} />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="field-label" htmlFor="q-div">Division</label>
              <select id="q-div" className="field" value={division} onChange={(e) => setDivision(e.target.value as Division)}>
                {DIVISIONS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
        )}
      </Panel>

      {/* Experience */}
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-2">Training history</h3>
        <div className="flex gap-[10px] flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="field-label" htmlFor="q-exp">Where are you now?</label>
            <select id="q-exp" className="field" value={experience} onChange={(e) => setExperience(e.target.value)}>
              {EXPERIENCE.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="field-label" htmlFor="q-hours">Current hours/week</label>
            <input id="q-hours" className="field" type="number" inputMode="decimal" value={weeklyHours} onChange={(e) => setWeeklyHours(e.target.value)} />
          </div>
        </div>
      </Panel>

      {/* Known times */}
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-1">Known times <span className="text-steel text-sm font-body font-normal">(optional)</span></h3>
        <p className="text-steel text-sm mt-0 mb-2">Anything you know, as m:ss or h:mm:ss.</p>
        <div className="flex gap-[10px] flex-wrap">
          {KNOWN.map((k) => (
            <div className="flex-1 min-w-[120px]" key={k.key}>
              <label className="field-label" htmlFor={`q-t-${k.key}`}>{k.label}</label>
              <input
                id={`q-t-${k.key}`} className="field" inputMode="numeric" placeholder={k.ph}
                value={times[k.key] ?? ''}
                onChange={(e) => setTimes((t) => ({ ...t, [k.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </Panel>

      {/* Availability */}
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-2">Availability</h3>
        <div className="flex gap-[10px] flex-wrap">
          <div className="flex-1 min-w-[120px]">
            <label className="field-label" htmlFor="q-days">Days per week</label>
            <select id="q-days" className="field" value={daysPerWeek} onChange={(e) => setDaysPerWeek(e.target.value)}>
              {['3', '4', '5', '6'].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="field-label" htmlFor="q-sess">Session length (min)</label>
            <input id="q-sess" className="field" type="number" inputMode="numeric" value={sessionMinutes} onChange={(e) => setSessionMinutes(e.target.value)} />
          </div>
        </div>
      </Panel>

      {/* Gym & equipment */}
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-2">Gym & equipment</h3>
        <label className="field-label" htmlFor="q-gym">Access</label>
        <select id="q-gym" className="field mb-2" value={gym} onChange={(e) => setGym(e.target.value as typeof gym)}>
          <option value="full">Full gym (assume everything)</option>
          <option value="home">Home gym (pick what you have)</option>
          <option value="minimal">Minimal (pick what you have)</option>
        </select>
        {gym !== 'full' && (
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.filter((e) => e !== 'none').map((e) => (
              <label key={e} className={`text-sm px-2 py-1 rounded-full border cursor-pointer ${equipment.includes(e) ? 'bg-graphite text-chalk border-graphite' : 'border-line'}`}>
                <input type="checkbox" className="sr-only" checked={equipment.includes(e)} onChange={() => toggleEquip(e)} />
                {e}
              </label>
            ))}
          </div>
        )}
      </Panel>

      {/* Limitations */}
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-2">Injuries or limitations</h3>
        <textarea className="field" placeholder="Anything we should train around (optional)" value={injuries} onChange={(e) => setInjuries(e.target.value)} />
      </Panel>

      {/* Goal */}
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-2">Primary goal</h3>
        <select className="field" value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
          {GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        {goal === 'target-time' && (
          <div className="mt-2">
            <label className="field-label" htmlFor="q-target">Target finish time (h:mm:ss)</label>
            <input id="q-target" className="field" inputMode="numeric" placeholder="1:10:00" value={targetTime} onChange={(e) => setTargetTime(e.target.value)} />
          </div>
        )}
      </Panel>

      {/* Body stats for nutrition */}
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-1">Body stats <span className="text-steel text-sm font-body font-normal">(for nutrition targets)</span></h3>
        <div className="flex gap-[10px] flex-wrap">
          <div className="flex-1 min-w-[100px]">
            <label className="field-label" htmlFor="q-sex">Sex</label>
            <select id="q-sex" className="field" value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div className="flex-1 min-w-[80px]">
            <label className="field-label" htmlFor="q-age">Age</label>
            <input id="q-age" className="field" type="number" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="field-label" htmlFor="q-height">Height (cm)</label>
            <input id="q-height" className="field" type="number" inputMode="numeric" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="field-label" htmlFor="q-weight">Weight (kg)</label>
            <input id="q-weight" className="field" type="number" step="0.1" inputMode="decimal" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          </div>
        </div>
        <div className="mt-2">
          <label className="field-label" htmlFor="q-act">Overall training load</label>
          <select id="q-act" className="field" value={activity} onChange={(e) => setActivity(e.target.value)}>
            {ACTIVITY.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
      </Panel>

      <button className="btn w-full" disabled={saving} onClick={finish}>
        {saving ? 'Building your plan…' : 'Generate my plan'}
      </button>
    </>
  );
}
