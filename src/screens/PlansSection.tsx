import { useEffect, useState } from 'react';
import { Panel, EmptyState } from '../components/ui';
import QuestionnaireScreen from './QuestionnaireScreen';
import type { Plan, LogType } from '../core/types';
import { phaseNote, type Phase } from '../core/plan';
import { getActivePlan } from '../data/repo';

// The "My plans" area of the Plan tab: shows the active generated plan, or the
// questionnaire when there is none / the user wants to redo it. (Editing & custom
// building arrive in step 5.)
export default function PlansSection({
  onLog,
}: {
  onLog: (prefill: { type: LogType; title: string; workoutId?: string }) => void;
}) {
  const [plan, setPlan] = useState<Plan | null | undefined>(undefined);
  const [mode, setMode] = useState<'view' | 'questionnaire'>('view');

  const refresh = () => getActivePlan().then((p) => setPlan(p ?? null));
  useEffect(() => {
    refresh();
  }, []);

  if (mode === 'questionnaire') {
    return (
      <QuestionnaireScreen
        onDone={() => {
          setMode('view');
          refresh();
        }}
      />
    );
  }

  if (plan === undefined) return <p className="text-steel">Loading…</p>;

  if (plan === null) {
    return (
      <EmptyState title="No plan yet">
        Answer a few questions and Stationlog builds a week-by-week plan around your race,
        level and equipment.
        <br />
        <button className="btn mt-3" onClick={() => setMode('questionnaire')}>Set up my plan</button>
      </EmptyState>
    );
  }

  return (
    <>
      <Panel>
        <div className="flex justify-between items-start gap-2">
          <div>
            <h3 className="font-cond font-semibold text-xl m-0">{plan.name}</h3>
            <p className="text-steel text-sm m-0 mt-1">{phaseNote((plan.meta?.phase as Phase) ?? 'base')}</p>
          </div>
          <button className="btn ghost small whitespace-nowrap" onClick={() => setMode('questionnaire')}>
            Re-run
          </button>
        </div>
      </Panel>

      {plan.weeks.map((week, wi) => (
        <WeekBlock key={week.id} label={week.label} defaultOpen={wi === 0}>
          {week.days.map((day) => (
            <div key={day.id} className="mb-3 last:mb-0">
              <div className="font-cond font-semibold text-steel text-sm">{day.label}</div>
              {day.sessions.map((s) => (
                <div
                  key={s.id}
                  className={`border-l-4 pl-3 py-2 my-1 rounded-r-[10px] bg-chalk ${s.isKey ? 'border-effort' : 'border-lane'}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="tag">{s.type}</span>
                      {s.isKey && <span className="text-effort text-xs font-semibold">key session</span>}
                      <div className="font-cond font-semibold">{s.title}</div>
                      {s.detail && <p className="text-sm m-0 mt-1">{s.detail}</p>}
                    </div>
                    <button
                      className="btn ghost small whitespace-nowrap"
                      onClick={() => onLog({ type: s.type, title: s.title, workoutId: s.workoutId })}
                    >
                      Log this
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </WeekBlock>
      ))}

      <p className="text-steel text-sm mt-2">
        Editing plans — moving sessions, adding your own, saving templates — arrives next.
      </p>
    </>
  );
}

function WeekBlock({ label, defaultOpen, children }: { label: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <Panel>
      <button className="w-full text-left flex justify-between items-center" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="font-cond font-semibold text-lg">{label}</span>
        <span className="text-steel">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="mt-3 border-t border-line pt-3">{children}</div>}
    </Panel>
  );
}
