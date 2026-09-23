import { useEffect, useMemo, useState } from 'react';
import type { Workout } from '../core/types';
import { filterWorkouts, emptyFilters } from '../core/library';
import { listWorkouts } from '../data/repo';

// A compact searchable list of workouts, used to add one into a plan day.
export default function LibraryPicker({
  onPick,
  onClose,
}: {
  onPick: (w: Workout) => void;
  onClose: () => void;
}) {
  const [all, setAll] = useState<Workout[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    listWorkouts().then(setAll);
  }, []);

  const results = useMemo(
    () => filterWorkouts(all, { ...emptyFilters, query }).slice(0, 40),
    [all, query],
  );

  return (
    <div className="mt-2 border border-line rounded-[10px] p-2 bg-chalk">
      <div className="flex gap-2 mb-2">
        <input
          className="field"
          type="search"
          autoFocus
          placeholder="Search library…"
          aria-label="Search library to add"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn ghost small" onClick={onClose}>Close</button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {results.map((w) => (
          <button
            key={w.id}
            className="w-full text-left py-2 border-t border-line first:border-t-0"
            onClick={() => onPick(w)}
          >
            <div className="font-cond font-semibold">{w.name}</div>
            <div className="text-steel text-sm">{w.category} · {w.difficulty} · {w.durationMin} min</div>
          </button>
        ))}
        {results.length === 0 && <p className="text-steel text-sm p-2 m-0">No matches.</p>}
      </div>
    </div>
  );
}
