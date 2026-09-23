import { useState } from 'react';
import { Panel } from '../components/ui';
import { CATEGORIES, DIFFICULTIES, EQUIPMENT, type Category, type Difficulty, type Workout } from '../core/types';
import { uid } from '../core/time';
import { saveWorkout } from '../data/repo';

// Lets the user add their own workout in the same shape as the library ones.
export default function AddWorkoutForm({
  onSaved,
  onCancel,
}: {
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('conditioning');
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  const [durationMin, setDurationMin] = useState('45');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [purpose, setPurpose] = useState('');
  const [warmup, setWarmup] = useState('');
  const [blocks, setBlocks] = useState([{ name: 'Main set', detail: '' }]);
  const [cooldown, setCooldown] = useState('');
  const [scaleDown, setScaleDown] = useState('');
  const [scaleUp, setScaleUp] = useState('');
  const [error, setError] = useState('');

  const toggleEquip = (e: string) =>
    setEquipment((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]));

  function save() {
    if (!name.trim()) return setError('Give your workout a name.');
    if (!blocks.some((b) => b.detail.trim())) return setError('Add at least one block with some detail.');
    const w: Workout = {
      id: 'user-' + uid(),
      name: name.trim(),
      category,
      equipment: equipment.length ? equipment : ['none'],
      durationMin: parseInt(durationMin, 10) || 0,
      difficulty,
      purpose: purpose.trim(),
      warmup: warmup.trim(),
      blocks: blocks.filter((b) => b.detail.trim()).map((b) => ({ name: b.name.trim() || 'Set', detail: b.detail.trim() })),
      cooldown: cooldown.trim(),
      scaling: { down: scaleDown.trim(), up: scaleUp.trim() },
      source: 'user',
      updatedAt: Date.now(),
    };
    saveWorkout(w).then(onSaved);
  }

  return (
    <Panel>
      <h3 className="font-cond font-semibold text-xl m-0 mb-2">Add your own workout</h3>

      <label className="field-label" htmlFor="aw-name">Name</label>
      <input id="aw-name" className="field mb-3" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sunday sled session" />

      <div className="flex gap-[10px] flex-wrap mb-3">
        <div className="flex-1 min-w-[120px]">
          <label className="field-label" htmlFor="aw-cat">Category</label>
          <select id="aw-cat" className="field" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="field-label" htmlFor="aw-diff">Difficulty</label>
          <select id="aw-diff" className="field" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="field-label" htmlFor="aw-dur">Duration (min)</label>
          <input id="aw-dur" className="field" type="number" inputMode="numeric" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
        </div>
      </div>

      <fieldset className="mb-3 border-0 p-0 m-0">
        <legend className="field-label">Equipment</legend>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map((e) => (
            <label key={e} className={`text-sm px-2 py-1 rounded-full border cursor-pointer ${equipment.includes(e) ? 'bg-graphite text-chalk border-graphite' : 'border-line'}`}>
              <input type="checkbox" className="sr-only" checked={equipment.includes(e)} onChange={() => toggleEquip(e)} />
              {e}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field-label" htmlFor="aw-purpose">Purpose (one line)</label>
      <input id="aw-purpose" className="field mb-3" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="What this session builds" />

      <label className="field-label" htmlFor="aw-warm">Warm-up</label>
      <textarea id="aw-warm" className="field mb-3" value={warmup} onChange={(e) => setWarmup(e.target.value)} />

      <div className="field-label">Blocks</div>
      {blocks.map((b, i) => (
        <div key={i} className="mb-2">
          <input
            className="field mb-1"
            value={b.name}
            aria-label={`Block ${i + 1} name`}
            onChange={(e) => setBlocks((bs) => bs.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
          />
          <div className="flex gap-2">
            <textarea
              className="field"
              value={b.detail}
              aria-label={`Block ${i + 1} detail`}
              placeholder="e.g. 4 rounds: 1 km run + 25 wall balls"
              onChange={(e) => setBlocks((bs) => bs.map((x, idx) => (idx === i ? { ...x, detail: e.target.value } : x)))}
            />
            {blocks.length > 1 && (
              <button className="x" aria-label="Remove block" onClick={() => setBlocks((bs) => bs.filter((_, idx) => idx !== i))}>×</button>
            )}
          </div>
        </div>
      ))}
      <button className="btn ghost small mb-3" onClick={() => setBlocks((bs) => [...bs, { name: 'Block', detail: '' }])}>
        Add block
      </button>

      <label className="field-label" htmlFor="aw-cool">Cool-down</label>
      <textarea id="aw-cool" className="field mb-3" value={cooldown} onChange={(e) => setCooldown(e.target.value)} />

      <div className="flex gap-[10px] flex-wrap mb-3">
        <div className="flex-1 min-w-[140px]">
          <label className="field-label" htmlFor="aw-down">Easier option</label>
          <input id="aw-down" className="field" value={scaleDown} onChange={(e) => setScaleDown(e.target.value)} />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="field-label" htmlFor="aw-up">Harder option</label>
          <input id="aw-up" className="field" value={scaleUp} onChange={(e) => setScaleUp(e.target.value)} />
        </div>
      </div>

      {error && <p className="text-effort text-sm mb-2" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button className="btn" onClick={save}>Save workout</button>
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </Panel>
  );
}
