import type { Macros } from '../core/nutrition';

// Calories + macros as labelled progress bars against a target (the prototype's design).
export default function MacroBars({ total, target }: { total: Macros; target?: Macros }) {
  return (
    <div>
      <Bar label="Calories" value={total.kcal} max={target?.kcal} unit="kcal" />
      <Bar label="Protein" value={total.protein} max={target?.protein} unit="g" />
      <Bar label="Carbs" value={total.carbs} max={target?.carbs} unit="g" />
      <Bar label="Fat" value={total.fat} max={target?.fat} unit="g" />
    </div>
  );
}

function Bar({ label, value, max, unit }: { label: string; value: number; max?: number; unit: string }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  const over = !!max && value > max * 1.05;
  return (
    <>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span>
          <strong>{Math.round(value)}</strong>
          {max ? ` / ${Math.round(max)}` : ''} {unit}
        </span>
      </div>
      <div className="macro-bar">
        <i className={over ? 'over' : ''} style={{ width: `${pct}%` }} />
      </div>
    </>
  );
}
