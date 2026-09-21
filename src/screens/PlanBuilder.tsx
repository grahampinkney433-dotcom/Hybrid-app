import { useState } from 'react';
import { Panel } from '../components/ui';
import LibraryPicker from '../components/LibraryPicker';
import { LOG_TYPES, type LogType, type Plan, type Session, type Workout } from '../core/types';
import { categoryToLogType } from '../core/library';
import { uid } from '../core/time';
import {
  addWeek, removeWeek, addDay, removeDay, addSession, removeSession,
  updateSession, reorderSession, moveSession, dayOptions, renamePlan,
} from '../core/planEdit';

// Editable plan: rename, add/remove weeks & days, add sessions from the library or as
// quick custom entries, reorder within a day, and move between days (tap-driven).
export default function PlanBuilder({
  plan,
  onChange,
  onLog,
}: {
  plan: Plan;
  onChange: (p: Plan) => void;
  onLog: (prefill: { type: LogType; title: string; workoutId?: string }) => void;
}) {
  const [pickerDay, setPickerDay] = useState<string | null>(null);
  const days = dayOptions(plan);

  const addFromLibrary = (dayId: string, w: Workout) => {
    const session: Session = {
      id: uid(),
      type: categoryToLogType(w.category),
      title: w.name,
      workoutId: w.id,
      detail: w.purpose,
    };
    onChange(addSession(plan, dayId, session));
    setPickerDay(null);
  };

  const addQuick = (dayId: string) => {
    onChange(addSession(plan, dayId, { id: uid(), type: 'Conditioning', title: 'New session', detail: '' }));
  };

  return (
    <>
      <Panel>
        <label className="field-label" htmlFor="plan-name">Plan name</label>
        <input
          id="plan-name"
          className="field"
          value={plan.name}
          onChange={(e) => onChange(renamePlan(plan, e.target.value))}
        />
      </Panel>

      {plan.weeks.map((week) => (
        <Panel key={week.id}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-cond font-semibold text-lg m-0">{week.label}</h3>
            <div className="flex gap-2">
              <button className="btn ghost small" onClick={() => onChange(addDay(plan, week.id))}>+ Day</button>
              <button className="btn danger small" onClick={() => onChange(removeWeek(plan, week.id))}>Remove week</button>
            </div>
          </div>

          {week.days.length === 0 && <p className="text-steel text-sm">No days yet — add one.</p>}

          {week.days.map((day) => (
            <div key={day.id} className="mb-3 border-t border-line pt-2">
              <div className="flex justify-between items-center">
                <span className="font-cond font-semibold text-steel">{day.label}</span>
                <button className="x" aria-label={`Remove ${day.label}`} onClick={() => onChange(removeDay(plan, week.id, day.id))}>×</button>
              </div>

              {day.sessions.map((s) => (
                <div
                  key={s.id}
                  className={`border-l-4 pl-3 py-2 my-1 rounded-r-[10px] bg-panel ${s.isKey ? 'border-effort' : 'border-lane'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="tag">{s.type}</span>
                    {s.workoutId ? (
                      <span className="font-cond font-semibold">{s.title}</span>
                    ) : (
                      <input
                        className="field !py-1 flex-1"
                        aria-label="Session title"
                        value={s.title}
                        onChange={(e) => onChange(updateSession(plan, day.id, s.id, { title: e.target.value }))}
                      />
                    )}
                  </div>

                  {!s.workoutId && (
                    <select
                      className="field !py-1 mb-1"
                      aria-label="Session type"
                      value={s.type}
                      onChange={(e) => onChange(updateSession(plan, day.id, s.id, { type: e.target.value as LogType }))}
                    >
                      {LOG_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  )}

                  {s.detail && <p className="text-sm m-0 mb-1">{s.detail}</p>}

                  <div className="flex flex-wrap gap-[6px] items-center">
                    <button className="btn ghost small" onClick={() => onLog({ type: s.type, title: s.title, workoutId: s.workoutId })}>Log this</button>
                    <button className="btn ghost small" aria-label="Move up" onClick={() => onChange(reorderSession(plan, day.id, s.id, -1))}>▲</button>
                    <button className="btn ghost small" aria-label="Move down" onClick={() => onChange(reorderSession(plan, day.id, s.id, 1))}>▼</button>
                    <select
                      className="field !py-1 !w-auto text-sm"
                      aria-label="Move to day"
                      value=""
                      onChange={(e) => e.target.value && onChange(moveSession(plan, day.id, s.id, e.target.value))}
                    >
                      <option value="">Move to…</option>
                      {days.filter((d) => d.id !== day.id).map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                    </select>
                    <button className="btn danger small" onClick={() => onChange(removeSession(plan, day.id, s.id))}>Remove</button>
                  </div>
                </div>
              ))}

              <div className="flex gap-2 mt-1">
                <button className="btn ghost small" onClick={() => setPickerDay(pickerDay === day.id ? null : day.id)}>
                  {pickerDay === day.id ? 'Close' : '+ From library'}
                </button>
                <button className="btn ghost small" onClick={() => addQuick(day.id)}>+ Quick session</button>
              </div>

              {pickerDay === day.id && (
                <LibraryPicker onPick={(w) => addFromLibrary(day.id, w)} onClose={() => setPickerDay(null)} />
              )}
            </div>
          ))}
        </Panel>
      ))}

      <button className="btn ghost w-full" onClick={() => onChange(addWeek(plan))}>+ Add week</button>
      <p className="text-steel text-sm mt-2" aria-live="polite">Changes save automatically. Use “Move to…” to shift a session to another day.</p>
    </>
  );
}
