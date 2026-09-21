import type { Log } from '../core/types';
import { STATIONS } from '../core/stations';
import { simTotal, pacePerKm } from '../core/logs';
import { fmt, niceDate } from '../core/time';

// One row summarising a logged session. Used on Today (recent) and History.
// Shows heart rate alongside RPE (feature 7).
export function logDetail(w: Log): string {
  if (w.type === 'Race sim') return 'Total ' + fmt(simTotal(w));
  if (w.type === 'Run' && w.distanceKm) {
    const pace = pacePerKm(w.distanceKm, w.timeSec);
    return `${w.distanceKm} km` + (pace ? ` · ${fmt(pace)}/km` : '');
  }
  if (w.type === 'Strength' && w.sets?.length) {
    return w.sets.filter((s) => s.ex).map((s) => s.ex).slice(0, 3).join(', ');
  }
  if (w.type === 'Stations' && w.splits) {
    return `${Object.values(w.splits).filter((v) => v > 0).length} stations`;
  }
  return (w.notes ?? '').slice(0, 60);
}

export default function LogItem({ w }: { w: Log }) {
  // count only real station keys for the stations detail
  void STATIONS;
  return (
    <div className="list-item">
      <div className="min-w-0">
        <span className="tag">{w.type}</span>
        <span className="text-steel">{niceDate(w.date)}</span>
        {w.title && <div className="font-cond font-semibold">{w.title}</div>}
        <div className="truncate">{logDetail(w)}</div>
      </div>
      <div className="text-right whitespace-nowrap">
        {w.durationMin ? <div>{w.durationMin} min</div> : null}
        {w.rpe ? <div className="rpe">RPE {w.rpe}</div> : null}
        {w.hr?.avg ? <div className="text-steel text-sm">{w.hr.avg} bpm avg</div> : null}
      </div>
    </div>
  );
}
