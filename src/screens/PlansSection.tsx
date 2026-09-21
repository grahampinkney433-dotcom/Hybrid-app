import { useEffect, useState } from 'react';
import { Panel, EmptyState } from '../components/ui';
import QuestionnaireScreen from './QuestionnaireScreen';
import PlanBuilder from './PlanBuilder';
import type { Plan, LogType } from '../core/types';
import { newBlankPlan, duplicatePlan } from '../core/planEdit';
import { listPlans, savePlan, setActivePlan, deletePlan } from '../data/repo';

// The "My plans" area: choose/create/duplicate/delete plans, mark one active (drives
// Today), edit the selected plan in the builder, or (re)generate from the questionnaire.
export default function PlansSection({
  onLog,
}: {
  onLog: (prefill: { type: LogType; title: string; workoutId?: string }) => void;
}) {
  const [plans, setPlans] = useState<Plan[] | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'questionnaire'>('view');

  async function refresh(preferId?: string) {
    const all = await listPlans();
    setPlans(all);
    const active = all.find((p) => p.isActive);
    const keep = preferId && all.some((p) => p.id === preferId) ? preferId : null;
    setSelectedId((cur) => keep ?? (cur && all.some((p) => p.id === cur) ? cur : active?.id ?? all[0]?.id ?? null));
  }
  useEffect(() => {
    refresh();
  }, []);

  if (mode === 'questionnaire') {
    return (
      <QuestionnaireScreen
        onDone={async () => {
          await refresh();
          setMode('view');
        }}
      />
    );
  }

  if (plans === undefined) return <p className="text-steel">Loading…</p>;

  if (plans.length === 0) {
    return (
      <EmptyState title="No plans yet">
        Answer a few questions to generate a plan around your race, level and equipment —
        or start a blank one and build it yourself.
        <br />
        <span className="flex gap-2 justify-center mt-3">
          <button className="btn" onClick={() => setMode('questionnaire')}>Set up my plan</button>
          <button className="btn ghost" onClick={async () => { const p = newBlankPlan(); await savePlan(p); await refresh(p.id); }}>
            Blank plan
          </button>
        </span>
      </EmptyState>
    );
  }

  const selected = plans.find((p) => p.id === selectedId) ?? plans[0];

  const save = async (updated: Plan) => {
    setPlans((ps) => ps?.map((p) => (p.id === updated.id ? updated : p)));
    await savePlan(updated);
  };

  return (
    <>
      <Panel>
        <label className="field-label" htmlFor="plan-select">Plan</label>
        <select
          id="plan-select"
          className="field mb-2"
          value={selected.id}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.isActive ? ' — active' : ''}
            </option>
          ))}
        </select>

        <div className="flex flex-wrap gap-2">
          {selected.isActive ? (
            <span className="text-ok text-sm font-semibold self-center">✓ Active (drives Today)</span>
          ) : (
            <button className="btn small" onClick={async () => { await setActivePlan(selected.id); await refresh(selected.id); }}>
              Make active
            </button>
          )}
          <button className="btn ghost small" onClick={async () => { const p = duplicatePlan(selected); await savePlan(p); await refresh(p.id); }}>
            Duplicate
          </button>
          <button className="btn ghost small" onClick={async () => { const p = newBlankPlan(); await savePlan(p); await refresh(p.id); }}>
            New blank
          </button>
          <button className="btn ghost small" onClick={() => setMode('questionnaire')}>Generate / re-run</button>
          <button
            className="btn danger small"
            onClick={async () => {
              if (!confirm(`Delete plan “${selected.name}”?`)) return;
              await deletePlan(selected.id);
              await refresh();
            }}
          >
            Delete
          </button>
        </div>
      </Panel>

      <PlanBuilder plan={selected} onChange={save} onLog={onLog} />
    </>
  );
}
