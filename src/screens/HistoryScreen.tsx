import { useEffect, useState } from 'react';
import { Panel, ScreenTitle, EmptyState } from '../components/ui';
import LogItem, { logDetail } from '../components/LogItem';
import { LOG_TYPES, type Log, type LogType } from '../core/types';
import { personalBests, simTotal } from '../core/logs';
import { fmt, niceDate } from '../core/time';
import { listLogs, deleteLog } from '../data/repo';

type Filter = 'All' | LogType;

export default function HistoryScreen({ onEdit }: { onEdit: (log: Log) => void }) {
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [filter, setFilter] = useState<Filter>('All');

  const refresh = () => listLogs().then(setLogs);
  useEffect(() => {
    refresh();
  }, []);

  if (logs === null) return <ScreenTitle>History</ScreenTitle>;

  const pbs = personalBests(logs);
  const filtered = logs.filter((w) => filter === 'All' || w.type === filter);

  async function remove(id: string) {
    if (!confirm('Delete this workout?')) return;
    await deleteLog(id);
    refresh();
  }

  return (
    <>
      <ScreenTitle>History</ScreenTitle>

      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-2">Personal bests</h3>
        {pbs.length ? (
          <table className="pb-table">
            <tbody>
              {pbs.map((p) => (
                <tr key={p.label}>
                  <td>
                    {p.label}
                    <br />
                    <span className="text-steel text-sm">{niceDate(p.date)}</span>
                  </td>
                  <td>
                    {fmt(p.seconds)}
                    {p.unit ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-steel text-center py-4 m-0">PBs appear once you log sims, station times or runs.</p>
        )}
      </Panel>

      {/* Trend for the selected type (feature 7: shows avg HR for similar sessions). */}
      {filter !== 'All' && <Trend logs={filtered} type={filter} />}

      <div className="seg-tabs" role="group" aria-label="Filter">
        {(['All', ...LOG_TYPES] as Filter[]).map((t) => (
          <button key={t} type="button" aria-pressed={filter === t} onClick={() => setFilter(t)}>
            {t}
          </button>
        ))}
      </div>

      {filtered.length ? (
        <Panel>
          {filtered.map((w) => (
            <div key={w.id}>
              <LogItem w={w} />
              <div className="flex gap-[6px] -mt-1 mb-2">
                <button className="btn ghost small" onClick={() => onEdit(w)}>Edit</button>
                <button className="btn danger small" onClick={() => remove(w.id)}>Delete</button>
              </div>
            </div>
          ))}
        </Panel>
      ) : (
        <EmptyState title={`Nothing logged${filter !== 'All' ? ' for ' + filter : ''} yet`}>
          Log a session from the Log tab to start the trend lines.
        </EmptyState>
      )}
    </>
  );
}

// A small bar trend of recent sessions of one type, annotated with average HR.
function Trend({ logs, type }: { logs: Log[]; type: LogType }) {
  // oldest → newest, last 8
  const recent = [...logs].sort((a, b) => a.date.localeCompare(b.date)).slice(-8);
  if (recent.length < 2) return null;

  // Metric per bar: sim total for sims, else duration.
  const metric = (w: Log) => (type === 'Race sim' ? simTotal(w) / 60 : w.durationMin || 0);
  const values = recent.map(metric);
  const max = Math.max(1, ...values);
  const hrs = recent.map((w) => w.hr?.avg || 0).filter((h) => h > 0);
  const avgHr = hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null;

  return (
    <Panel>
      <div className="flex justify-between items-baseline">
        <h3 className="font-cond font-semibold text-xl m-0">{type} trend</h3>
        {avgHr && <span className="text-steel text-sm">avg {avgHr} bpm</span>}
      </div>
      <div className="bars" role="img" aria-label={`${type} recent sessions`}>
        {values.map((v, i) => (
          <div
            key={i}
            className={i === values.length - 1 ? 'now' : ''}
            style={{ height: `${Math.max(3, (v / max) * 100)}%` }}
            title={`${recent[i].date}: ${type === 'Race sim' ? fmt(simTotal(recent[i])) : Math.round(v) + ' min'}${recent[i].hr?.avg ? ` · ${recent[i].hr!.avg} bpm` : ''}`}
          />
        ))}
      </div>
      <div className="bar-labels">
        {recent.map((w) => (
          <span key={w.id}>{niceDate(w.date).replace(/^\w+,\s*/, '')}</span>
        ))}
      </div>
      <p className="text-steel text-sm mt-2 mb-0">
        {type === 'Race sim' ? 'Total time' : 'Duration'} per session. Most recent on the right.
        {' '}
        <span className="text-steel">{logDetail(recent[recent.length - 1])}</span>
      </p>
    </Panel>
  );
}
