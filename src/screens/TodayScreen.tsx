import { useEffect, useState } from 'react';
import { Panel, ScreenTitle, EmptyState } from '../components/ui';
import LogItem from '../components/LogItem';
import type { Log, Profile } from '../core/types';
import { weekStats, weeklyVolume } from '../core/logs';
import { today, niceDate } from '../core/time';
import { listLogs, getProfile } from '../data/repo';

// Days until the race, or null if no race date set.
function daysToRace(raceDate?: string): number | null {
  if (!raceDate) return null;
  return Math.ceil((new Date(raceDate + 'T12:00').getTime() - Date.now()) / 86400000);
}

export default function TodayScreen({ onLog }: { onLog: () => void }) {
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [profile, setProfile] = useState<Profile | undefined>();

  useEffect(() => {
    listLogs().then(setLogs);
    getProfile().then(setProfile);
  }, []);

  if (logs === null) return <ScreenTitle>Today</ScreenTitle>;

  const td = today();
  const stats = weekStats(logs, td);
  const vol = weeklyVolume(logs, td, 8);
  const maxVol = Math.max(60, ...vol);
  const recent = [...logs].slice(0, 4); // listLogs is already newest-first
  const days = daysToRace(profile?.raceDate);

  return (
    <>
      <ScreenTitle>Today</ScreenTitle>

      {/* Race countdown, or a prompt if no date yet. */}
      <Panel>
        {days === null ? (
          <>
            <h3 className="font-cond font-semibold text-xl m-0 mb-1">No race date set</h3>
            <p className="text-steel text-sm m-0">
              Add one in the questionnaire and your countdown and plan phases run off it.
            </p>
          </>
        ) : days >= 0 ? (
          <div className="flex items-baseline gap-3">
            <b className="font-cond font-bold text-6xl leading-none text-lane">{days}</b>
            <div>
              <strong>days to race</strong>
              <br />
              <span className="text-steel">
                {profile?.division ?? 'Open'} · {niceDate(profile!.raceDate!)}
              </span>
            </div>
          </div>
        ) : (
          <>
            <h3 className="font-cond font-semibold text-xl m-0">Race done</h3>
            <p className="text-steel m-0">Set your next race date in the questionnaire.</p>
          </>
        )}
      </Panel>

      {/* This week */}
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-2">This week</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <Stat value={stats.sessions} label="sessions" />
          <Stat value={Math.round(stats.minutes / 6) / 10} label="hours" />
          <Stat value={stats.runKm.toFixed(1)} label="run km" />
          <Stat value={stats.avgRpe != null ? stats.avgRpe.toFixed(1) : '–'} label="avg RPE" />
        </div>
        {stats.avgHr && (
          <p className="text-steel text-sm mt-2 mb-0 text-center">Average HR this week: {stats.avgHr} bpm</p>
        )}
      </Panel>

      {/* 8-week volume */}
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-1">Training minutes, last 8 weeks</h3>
        <div className="bars" role="img" aria-label="Training minutes over the last 8 weeks">
          {vol.map((v, i) => (
            <div
              key={i}
              className={i === vol.length - 1 ? 'now' : ''}
              style={{ height: `${Math.max(3, (v / maxVol) * 100)}%` }}
              title={`${v} min`}
            />
          ))}
        </div>
        <div className="bar-labels">
          {vol.map((_, i) => (
            <span key={i}>{i === vol.length - 1 ? 'Now' : `-${vol.length - 1 - i}w`}</span>
          ))}
        </div>
      </Panel>

      {/* Recent */}
      <Panel>
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-cond font-semibold text-xl m-0">Recent</h3>
          <button className="btn small" onClick={onLog}>Log a workout</button>
        </div>
        {recent.length ? (
          recent.map((w) => <LogItem key={w.id} w={w} />)
        ) : (
          <p className="text-steel text-center py-4 m-0">
            No workouts yet. Log your first session to start the trend lines.
          </p>
        )}
      </Panel>

      {logs.length === 0 && (
        <EmptyState title="Welcome to Stationlog">
          Tap “Log a workout” to record your first session. Your library of 100 workouts is
          ready under the Plan and (soon) Library screens.
        </EmptyState>
      )}
    </>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="py-[10px] px-1">
      <b className="block font-cond font-bold text-3xl leading-none">{value}</b>
      <span className="text-steel text-sm">{label}</span>
    </div>
  );
}
