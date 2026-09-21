import { useEffect, useMemo, useState } from 'react';
import { Panel, ScreenTitle } from '../components/ui';
import { LOG_TYPES, type LogType, type Log, type Profile } from '../core/types';
import { STATIONS, RUN_KEYS } from '../core/stations';
import { toSec, fmt, today, uid } from '../core/time';
import { simTotal } from '../core/logs';
import { estimateMaxHr, zoneRanges } from '../core/hr';
import { addLog, getProfile } from '../data/repo';

// Common lifts offered as autocomplete in the strength logger (from the prototype).
const LIFTS = [
  'Back squat', 'Front squat', 'Deadlift', 'Romanian deadlift', 'Bulgarian split squat',
  'Walking lunge', 'Hip thrust', 'Bench press', 'Overhead press', 'Pull-up',
  'Bent-over row', 'Sled push', 'Sled pull', 'Farmers carry', 'Wall ball', 'Kettlebell swing',
];

// The logger keeps everything as strings while editing (so the numeric keypad and the
// m:ss split fields behave), and converts to the stored numeric Log on save.
interface SetRow { ex: string; sets: string; reps: string; kg: string }
interface Draft {
  id: string;
  editing: boolean;
  date: string;
  type: LogType;
  title: string;
  durationMin: string;
  rpe: string;
  notes: string;
  distanceKm: string;
  timeStr: string;
  splits: Record<string, string>; // key -> 'm:ss'
  sets: SetRow[];
  hrAvg: string;
  hrMax: string;
  zones: { z1: string; z2: string; z3: string; z4: string; z5: string };
}

const emptyZones = () => ({ z1: '', z2: '', z3: '', z4: '', z5: '' });
const emptySet = (): SetRow => ({ ex: '', sets: '', reps: '', kg: '' });

function blankDraft(type: LogType = 'Race sim', title = ''): Draft {
  return {
    id: uid(), editing: false, date: today(), type, title,
    durationMin: '', rpe: '', notes: '', distanceKm: '', timeStr: '',
    splits: {}, sets: [emptySet()], hrAvg: '', hrMax: '', zones: emptyZones(),
  };
}

// Seconds -> input string ('' for 0 so empty fields stay empty).
const secToInput = (sec?: number) => (sec ? fmt(sec) : '');

// Hydrate the editing draft from a stored Log.
function draftFromLog(log: Log): Draft {
  const splits: Record<string, string> = {};
  if (log.splits) for (const [k, v] of Object.entries(log.splits)) splits[k] = secToInput(v);
  return {
    id: log.id, editing: true, date: log.date, type: log.type, title: log.title ?? '',
    durationMin: log.durationMin != null ? String(log.durationMin) : '',
    rpe: log.rpe != null ? String(log.rpe) : '',
    notes: log.notes ?? '',
    distanceKm: log.distanceKm != null ? String(log.distanceKm) : '',
    timeStr: secToInput(log.timeSec),
    splits,
    sets: log.sets?.length
      ? log.sets.map((s) => ({
          ex: s.ex ?? '', sets: s.sets != null ? String(s.sets) : '',
          reps: s.reps != null ? String(s.reps) : '', kg: s.kg != null ? String(s.kg) : '',
        }))
      : [emptySet()],
    hrAvg: log.hr?.avg != null ? String(log.hr.avg) : '',
    hrMax: log.hr?.max != null ? String(log.hr.max) : '',
    zones: {
      z1: log.hr?.zones?.z1 ? String(log.hr.zones.z1) : '',
      z2: log.hr?.zones?.z2 ? String(log.hr.zones.z2) : '',
      z3: log.hr?.zones?.z3 ? String(log.hr.zones.z3) : '',
      z4: log.hr?.zones?.z4 ? String(log.hr.zones.z4) : '',
      z5: log.hr?.zones?.z5 ? String(log.hr.zones.z5) : '',
    },
  };
}

const numOrUndef = (v: string): number | undefined => {
  const n = parseFloat(v);
  return isFinite(n) ? n : undefined;
};

// Build the stored Log from the draft.
function toLog(d: Draft): Log {
  const splits: Record<string, number> = {};
  for (const [k, v] of Object.entries(d.splits)) {
    const s = toSec(v);
    if (s) splits[k] = s;
  }
  const hasSplits = Object.keys(splits).length > 0;
  const timeSec = d.timeStr ? toSec(d.timeStr) : undefined;

  // HR: keep only what was filled in.
  const zoneVals = {
    z1: numOrUndef(d.zones.z1) ?? 0, z2: numOrUndef(d.zones.z2) ?? 0,
    z3: numOrUndef(d.zones.z3) ?? 0, z4: numOrUndef(d.zones.z4) ?? 0,
    z5: numOrUndef(d.zones.z5) ?? 0,
  };
  const anyZone = Object.values(zoneVals).some((v) => v > 0);
  const hrAvg = numOrUndef(d.hrAvg);
  const hrMax = numOrUndef(d.hrMax);
  const hr =
    hrAvg || hrMax || anyZone
      ? { avg: hrAvg, max: hrMax, zones: anyZone ? zoneVals : undefined }
      : undefined;

  let durationMin = numOrUndef(d.durationMin);
  if (durationMin == null) {
    if (d.type === 'Race sim' && hasSplits) durationMin = Math.round(simTotal({ splits }) / 60);
    else if (d.type === 'Run' && timeSec) durationMin = Math.round(timeSec / 60);
  }

  return {
    id: d.id,
    date: d.date,
    type: d.type,
    title: d.title || undefined,
    durationMin,
    rpe: numOrUndef(d.rpe),
    notes: d.notes || undefined,
    distanceKm: d.type === 'Run' ? numOrUndef(d.distanceKm) : undefined,
    timeSec: d.type === 'Run' ? timeSec : undefined,
    splits: hasSplits ? splits : undefined,
    sets:
      d.type === 'Strength'
        ? d.sets
            .filter((s) => s.ex.trim())
            .map((s) => ({ ex: s.ex.trim(), sets: numOrUndef(s.sets), reps: numOrUndef(s.reps), kg: numOrUndef(s.kg) }))
        : undefined,
    hr,
    updatedAt: Date.now(),
  };
}

export default function LogScreen({
  editLog,
  prefill,
  onSaved,
  onCancel,
}: {
  editLog?: Log;
  prefill?: { type?: LogType; title?: string };
  onSaved: (editing: boolean) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    editLog ? draftFromLog(editLog) : blankDraft(prefill?.type ?? 'Race sim', prefill?.title ?? ''),
  );
  const [profile, setProfile] = useState<Profile | undefined>();
  const [error, setError] = useState('');

  useEffect(() => {
    getProfile().then(setProfile);
  }, []);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setSplit = (key: string, value: string) =>
    setDraft((d) => ({ ...d, splits: { ...d.splits, [key]: value } }));
  const setSet = (i: number, patch: Partial<SetRow>) =>
    setDraft((d) => ({ ...d, sets: d.sets.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));

  function save() {
    if (!draft.date) { setError('Add a date.'); return; }
    addLog(toLog(draft)).then(() => onSaved(draft.editing));
  }

  return (
    <>
      <ScreenTitle>{draft.editing ? 'Edit workout' : 'Log workout'}</ScreenTitle>

      {/* Workout type */}
      <div className="seg-tabs" role="group" aria-label="Workout type">
        {LOG_TYPES.map((t) => (
          <button key={t} type="button" aria-pressed={draft.type === t} onClick={() => set({ type: t })}>
            {t}
          </button>
        ))}
      </div>

      {/* Common fields */}
      <Panel>
        <div className="flex gap-[10px] flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <label className="field-label" htmlFor="f-date">Date</label>
            <input id="f-date" className="field" type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="field-label" htmlFor="f-dur">Duration (min)</label>
            <input id="f-dur" className="field" type="number" inputMode="numeric" value={draft.durationMin} onChange={(e) => set({ durationMin: e.target.value })} />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="field-label" htmlFor="f-rpe">RPE (1–10)</label>
            <input id="f-rpe" className="field" type="number" min={1} max={10} inputMode="numeric" value={draft.rpe} onChange={(e) => set({ rpe: e.target.value })} />
          </div>
        </div>
      </Panel>

      {/* Type-specific fields */}
      <TypeFields draft={draft} setSplit={setSplit} set={set} setSet={setSet} setDraft={setDraft} />

      {/* Heart rate (optional, all types) */}
      <HeartRatePanel draft={draft} set={set} setDraft={setDraft} profileAge={profile?.age} />

      {/* Notes */}
      <Panel>
        <label className="field-label" htmlFor="f-notes">Notes</label>
        <textarea id="f-notes" className="field" placeholder="How it felt, pacing, weights used…" value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
      </Panel>

      {error && <p className="text-effort text-sm mb-2" role="alert">{error}</p>}

      <div className="flex gap-[10px]">
        <button className="btn" onClick={save}>{draft.editing ? 'Save changes' : 'Save workout'}</button>
        {draft.editing && <button className="btn ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </>
  );
}

function TypeFields({
  draft, setSplit, set, setSet, setDraft,
}: {
  draft: Draft;
  setSplit: (k: string, v: string) => void;
  set: (p: Partial<Draft>) => void;
  setSet: (i: number, p: Partial<SetRow>) => void;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
}) {
  if (draft.type === 'Race sim') {
    // Runs interleaved with stations (a run before each station), then the roxzone total.
    const rows: { key: string; label: string; sub: string; station: boolean; n: string }[] = [];
    STATIONS.forEach((s, i) => {
      rows.push({ key: RUN_KEYS[i], label: `Run ${i + 1}`, sub: '1 km', station: false, n: `R${i + 1}` });
      rows.push({ key: s.key, label: s.name, sub: s.detail, station: true, n: String(i + 1) });
    });
    rows.push({ key: 'rox', label: 'Roxzone total', sub: 'optional', station: false, n: 'RZ' });

    const secs = (pred: (k: string) => boolean) =>
      Object.entries(draft.splits).filter(([k]) => pred(k)).reduce((a, [, v]) => a + toSec(v), 0);
    const runSec = secs((k) => /^r\d/.test(k));
    const stationSec = STATIONS.reduce((a, s) => a + toSec(draft.splits[s.key]), 0);
    const total = Object.values(draft.splits).reduce((a, v) => a + toSec(v), 0);

    return (
      <>
        <div className="clock">
          <b>{total ? fmt(total) : '0:00'}</b>
          <span>
            Runs <strong>{fmt(runSec)}</strong>
            <br />Stations <strong>{fmt(stationSec)}</strong>
          </span>
        </div>
        <Panel>
          <p className="text-steel text-sm m-0 mb-[6px]">Enter splits as m:ss. Leave blank for half sims.</p>
          <div className="strip">
            {rows.map((r) => (
              <SegRow key={r.key} r={r} value={draft.splits[r.key] ?? ''} onChange={(v) => setSplit(r.key, v)} />
            ))}
          </div>
        </Panel>
      </>
    );
  }

  if (draft.type === 'Stations') {
    return (
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-1">Station times</h3>
        <p className="text-steel text-sm m-0 mb-[6px]">Log only the stations you trained. Race-standard distances assumed.</p>
        <div className="strip">
          {STATIONS.map((s, i) => (
            <SegRow
              key={s.key}
              r={{ key: s.key, label: s.name, sub: s.detail, station: true, n: String(i + 1) }}
              value={draft.splits[s.key] ?? ''}
              onChange={(v) => setSplit(s.key, v)}
            />
          ))}
        </div>
      </Panel>
    );
  }

  if (draft.type === 'Run') {
    const paceSec = draft.distanceKm && toSec(draft.timeStr) ? toSec(draft.timeStr) / parseFloat(draft.distanceKm) : 0;
    return (
      <Panel>
        <div className="flex gap-[10px] flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <label className="field-label" htmlFor="f-dist">Distance (km)</label>
            <input id="f-dist" className="field" type="number" step="0.01" inputMode="decimal" value={draft.distanceKm} onChange={(e) => set({ distanceKm: e.target.value })} />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="field-label" htmlFor="f-time">Time (h:mm:ss)</label>
            <input id="f-time" className="field" inputMode="numeric" placeholder="25:30" value={draft.timeStr} onChange={(e) => set({ timeStr: e.target.value })} />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="field-label">Pace</label>
            <div className="font-cond font-semibold text-2xl pt-1">{paceSec ? `${fmt(paceSec)} /km` : '–'}</div>
          </div>
        </div>
      </Panel>
    );
  }

  if (draft.type === 'Strength') {
    return (
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-2">Lifts</h3>
        <div className="set-row text-steel text-xs">
          <span>Exercise</span><span>Sets</span><span>Reps</span><span>kg</span><span></span>
        </div>
        {draft.sets.map((s, i) => (
          <div className="set-row" key={i}>
            <input className="field" list="exlist" placeholder="Back squat" aria-label="Exercise" value={s.ex} onChange={(e) => setSet(i, { ex: e.target.value })} />
            <input className="field" inputMode="numeric" aria-label="Sets" value={s.sets} onChange={(e) => setSet(i, { sets: e.target.value })} />
            <input className="field" inputMode="numeric" aria-label="Reps" value={s.reps} onChange={(e) => setSet(i, { reps: e.target.value })} />
            <input className="field" inputMode="decimal" aria-label="Weight kg" value={s.kg} onChange={(e) => setSet(i, { kg: e.target.value })} />
            <button
              className="x"
              aria-label="Remove lift"
              onClick={() =>
                setDraft((d) => {
                  const sets = d.sets.filter((_, idx) => idx !== i);
                  return { ...d, sets: sets.length ? sets : [emptySet()] };
                })
              }
            >
              ×
            </button>
          </div>
        ))}
        <datalist id="exlist">
          {LIFTS.map((x) => <option key={x} value={x} />)}
        </datalist>
        <button className="btn ghost small" onClick={() => setDraft((d) => ({ ...d, sets: [...d.sets, emptySet()] }))}>
          Add lift
        </button>
      </Panel>
    );
  }

  return null; // Conditioning / Mobility use only duration + notes
}

// One row of the race strip.
function SegRow({
  r, value, onChange,
}: {
  r: { key: string; label: string; sub: string; station: boolean; n: string };
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={`seg ${r.station ? 'station' : ''}`}>
      <span className="n">{r.n}</span>
      <span className="name">
        {r.label}
        <small>{r.sub}</small>
      </span>
      <input inputMode="numeric" placeholder="m:ss" aria-label={`${r.label} time`} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function HeartRatePanel({
  draft, set, setDraft, profileAge,
}: {
  draft: Draft;
  set: (p: Partial<Draft>) => void;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  profileAge?: number;
}) {
  // Max HR for zone display: the value typed here, else estimated from the profile's age.
  const estimated = estimateMaxHr(profileAge);
  const maxForZones = numOrUndef(draft.hrMax) ?? estimated;
  const ranges = useMemo(() => zoneRanges(maxForZones), [maxForZones]);
  const zoneKeys = ['z1', 'z2', 'z3', 'z4', 'z5'] as const;

  return (
    <Panel>
      <h3 className="font-cond font-semibold text-xl m-0 mb-1">Heart rate <span className="text-steel text-sm font-body font-normal">(optional)</span></h3>
      <div className="flex gap-[10px] flex-wrap">
        <div className="flex-1 min-w-[120px]">
          <label className="field-label" htmlFor="hr-avg">Average HR</label>
          <input id="hr-avg" className="field" type="number" inputMode="numeric" value={draft.hrAvg} onChange={(e) => set({ hrAvg: e.target.value })} />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="field-label" htmlFor="hr-max">Max HR{estimated ? '' : ''}</label>
          <input
            id="hr-max" className="field" type="number" inputMode="numeric"
            placeholder={estimated ? `est. ${estimated}` : ''}
            value={draft.hrMax} onChange={(e) => set({ hrMax: e.target.value })}
          />
        </div>
      </div>
      {ranges.length > 0 ? (
        <>
          <p className="text-steel text-sm mt-3 mb-1">
            Time in zones (minutes). Ranges from max HR {maxForZones}
            {!numOrUndef(draft.hrMax) && estimated ? ' (estimated from age)' : ''}.
          </p>
          {ranges.map((z, i) => (
            <div className="flex items-center gap-[10px] mb-[6px]" key={z.zone}>
              <span className="w-[150px] text-sm">
                <strong>Z{z.zone}</strong> {z.label}
                <br />
                <span className="text-steel text-xs">{z.min}–{z.max} bpm</span>
              </span>
              <input
                className="field" inputMode="numeric" aria-label={`Minutes in zone ${z.zone}`} placeholder="min"
                value={draft.zones[zoneKeys[i]]}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, zones: { ...d.zones, [zoneKeys[i]]: e.target.value } }))
                }
              />
            </div>
          ))}
        </>
      ) : (
        <p className="text-steel text-sm mt-3 mb-0">
          Add your age in the questionnaire, or type a max HR above, to see zone ranges.
        </p>
      )}
    </Panel>
  );
}
