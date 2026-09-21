import { useEffect, useState } from 'react';
import { Panel } from './ui';
import WorkoutDetail from './WorkoutDetail';
import type { Category, LogType, Profile, Workout } from '../core/types';
import { generateWod, type WodMode } from '../core/wod';
import { levelFromProfile, availableEquipment } from '../core/plan';
import { categoryToLogType } from '../core/library';
import { today } from '../core/time';
import { listWorkouts, getProfile, logsInRange, getWodOffsets, saveWodOffsets } from '../data/repo';

// Map a logged session type back to a library category (for the "don't repeat yesterday"
// and "no heavy legs after heavy legs" rules).
function typeToCategory(t: LogType): Category {
  switch (t) {
    case 'Run': return 'running';
    case 'Strength': return 'strength';
    case 'Stations': return 'station skills';
    case 'Race sim': return 'simulation';
    case 'Mobility': return 'recovery';
    default: return 'conditioning';
  }
}

function yesterdayOf(date: string): string {
  const d = new Date(date + 'T12:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default function WodCard({
  onLog,
}: {
  onLog: (prefill: { type: LogType; title: string; workoutId?: string }) => void;
}) {
  const [library, setLibrary] = useState<Workout[]>([]);
  const [profile, setProfile] = useState<Profile | undefined>();
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<WodMode>('race');
  const [yesterdayHeavy, setYesterdayHeavy] = useState(false);
  const [yesterdayCats, setYesterdayCats] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const [ready, setReady] = useState(false);

  const date = today();

  useEffect(() => {
    (async () => {
      const [lib, prof, off, yLogs] = await Promise.all([
        listWorkouts(),
        getProfile(),
        getWodOffsets(),
        logsInRange(yesterdayOf(date), yesterdayOf(date)),
      ]);
      setLibrary(lib);
      setProfile(prof);
      setOffsets(off ?? {});
      setYesterdayHeavy(yLogs.some((l) => l.type === 'Strength' || l.type === 'Race sim'));
      setYesterdayCats(new Set(yLogs.map((l) => typeToCategory(l.type))));
      setReady(true);
    })();
  }, [date]);

  if (!ready || library.length === 0) return null;

  const key = `${date}|${mode}`;
  const offset = offsets[key] ?? 0;
  const workout = generateWod({
    library,
    mode,
    level: levelFromProfile(profile?.experience, profile?.level),
    available: availableEquipment(profile?.gym, profile?.equipment),
    date,
    offset,
    yesterdayHeavy,
    yesterdayCategories: yesterdayCats,
  });
  if (!workout) return null;

  const reroll = () => {
    const next = { ...offsets, [key]: offset + 1 };
    setOffsets(next);
    saveWodOffsets(next);
    setExpanded(false);
  };

  return (
    <Panel>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-cond font-semibold text-xl m-0">Workout of the day</h3>
        <div className="seg-tabs !mb-0" role="group" aria-label="WOD generator">
          <button aria-pressed={mode === 'race'} onClick={() => setMode('race')}>Race focus</button>
          <button aria-pressed={mode === 'general'} onClick={() => setMode('general')}>General hybrid</button>
        </div>
      </div>

      <button className="w-full text-left" aria-expanded={expanded} onClick={() => setExpanded((e) => !e)}>
        <div className="font-cond font-semibold text-lg leading-tight">{workout.name}</div>
        <div className="mt-1">
          <span className="tag">{workout.category}</span>
          <span className="text-steel text-sm">{workout.difficulty} · {workout.durationMin} min</span>
        </div>
        {!expanded && <p className="text-sm m-0 mt-1">{workout.purpose}</p>}
      </button>

      {expanded && (
        <div className="mt-2 border-t border-line pt-2">
          <WorkoutDetail w={workout} />
        </div>
      )}

      {yesterdayHeavy && (
        <p className="text-steel text-xs mt-2 mb-0">Kept off heavy legs — you trained legs hard yesterday.</p>
      )}

      <div className="flex gap-2 mt-3">
        <button className="btn small" onClick={() => onLog({ type: categoryToLogType(workout.category), title: workout.name, workoutId: workout.id })}>
          Log this
        </button>
        <button className="btn ghost small" onClick={reroll}>Re-roll</button>
      </div>
    </Panel>
  );
}
