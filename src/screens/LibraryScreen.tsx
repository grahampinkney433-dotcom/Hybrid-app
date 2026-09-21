import { useEffect, useMemo, useState } from 'react';
import { Panel, EmptyState } from '../components/ui';
import WorkoutDetail from '../components/WorkoutDetail';
import {
  CATEGORIES, DIFFICULTIES, EQUIPMENT, type Category, type LogType, type Workout,
} from '../core/types';
import {
  categoryToLogType, filterWorkouts, emptyFilters,
  type LibraryFilters, type DurationBucket,
} from '../core/library';
import { listWorkouts } from '../data/repo';
import AddWorkoutForm from './AddWorkoutForm';

const DURATIONS: { value: DurationBucket; label: string }[] = [
  { value: 'any', label: 'Any length' },
  { value: 'lte30', label: '≤ 30 min' },
  { value: 'lte45', label: '≤ 45 min' },
  { value: 'lte60', label: '≤ 60 min' },
  { value: 'gt60', label: '60+ min' },
];

export default function LibraryScreen({
  onLog,
  onAddToPlan,
}: {
  onLog: (prefill: { type: LogType; title: string; workoutId: string }) => void;
  onAddToPlan?: (w: Workout) => void;
}) {
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [filters, setFilters] = useState<LibraryFilters>(emptyFilters);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const refresh = () => listWorkouts().then(setWorkouts);
  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(
    () => (workouts ? filterWorkouts(workouts, filters) : []),
    [workouts, filters],
  );

  if (workouts === null) return <p className="text-steel">Loading library…</p>;

  const set = (patch: Partial<LibraryFilters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <>
      {/* Search + add */}
      <div className="flex gap-2 mb-3">
        <input
          className="field"
          type="search"
          placeholder="Search workouts…"
          aria-label="Search workouts"
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
        />
        <button className="btn small whitespace-nowrap" onClick={() => setAdding((a) => !a)}>
          {adding ? 'Close' : 'Add own'}
        </button>
      </div>

      {adding && (
        <AddWorkoutForm
          onSaved={() => {
            setAdding(false);
            refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* Category filter */}
      <div className="seg-tabs" role="group" aria-label="Category">
        <button aria-pressed={filters.category === 'all'} onClick={() => set({ category: 'all' })}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button key={c} aria-pressed={filters.category === c} onClick={() => set({ category: c as Category })}>
            {c}
          </button>
        ))}
      </div>

      {/* Difficulty / equipment / duration */}
      <div className="flex gap-[10px] flex-wrap mb-3">
        <div className="flex-1 min-w-[120px]">
          <label className="field-label" htmlFor="lf-diff">Difficulty</label>
          <select id="lf-diff" className="field" value={filters.difficulty} onChange={(e) => set({ difficulty: e.target.value as LibraryFilters['difficulty'] })}>
            <option value="all">All</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="field-label" htmlFor="lf-equip">Equipment</label>
          <select id="lf-equip" className="field" value={filters.equipment} onChange={(e) => set({ equipment: e.target.value })}>
            <option value="all">All</option>
            {EQUIPMENT.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="field-label" htmlFor="lf-dur">Duration</label>
          <select id="lf-dur" className="field" value={filters.duration} onChange={(e) => set({ duration: e.target.value as DurationBucket })}>
            {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
      </div>

      <p className="text-steel text-sm mb-2">
        {filtered.length} workout{filtered.length === 1 ? '' : 's'}
        {filters.category === 'all' && filters.difficulty === 'all' && filters.equipment === 'all' && filters.duration === 'any' && !filters.query
          ? ' in the library'
          : ' match'}
      </p>

      {filtered.length === 0 ? (
        <EmptyState title="No workouts match">Loosen a filter or clear the search.</EmptyState>
      ) : (
        filtered.map((w) => (
          <Panel key={w.id}>
            <button
              className="w-full text-left"
              aria-expanded={expanded === w.id}
              onClick={() => setExpanded((id) => (id === w.id ? null : w.id))}
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="font-cond font-semibold text-lg leading-tight">{w.name}</div>
                  <div className="mt-1">
                    <span className="tag">{w.category}</span>
                    <span className="text-steel text-sm">
                      {w.difficulty} · {w.durationMin} min
                      {w.source === 'user' ? ' · yours' : ''}
                    </span>
                  </div>
                </div>
                <span className="text-steel text-sm">{expanded === w.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {expanded === w.id && (
              <div className="mt-3 border-t border-line pt-3">
                <WorkoutDetail w={w} />
                <div className="flex gap-2 mt-3">
                  <button
                    className="btn small"
                    onClick={() => onLog({ type: categoryToLogType(w.category), title: w.name, workoutId: w.id })}
                  >
                    Log this
                  </button>
                  {onAddToPlan && (
                    <button className="btn ghost small" onClick={() => onAddToPlan(w)}>
                      Add to plan
                    </button>
                  )}
                </div>
              </div>
            )}
          </Panel>
        ))
      )}
    </>
  );
}
