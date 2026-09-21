import type { Workout } from '../core/types';

// The full read-out of a workout: purpose, equipment, warm-up, blocks, cool-down, scaling.
// Reused by the Library browser and (later) the plan builder.
export default function WorkoutDetail({ w }: { w: Workout }) {
  return (
    <div className="text-sm">
      <p className="m-0 mb-2">{w.purpose}</p>

      {w.equipment.length > 0 && (
        <p className="m-0 mb-2 text-steel">
          Equipment: {w.equipment.join(', ')}
        </p>
      )}

      <Section label="Warm-up">{w.warmup}</Section>

      {w.blocks.map((b, i) => (
        <Section key={i} label={b.name}>
          {b.detail}
        </Section>
      ))}

      <Section label="Cool-down">{w.cooldown}</Section>

      <div className="mt-2 grid gap-1">
        <div><span className="text-steel">Easier:</span> {w.scaling.down}</div>
        <div><span className="text-steel">Harder:</span> {w.scaling.up}</div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2">
      <div className="font-cond font-semibold text-steel uppercase tracking-wide text-xs">{label}</div>
      <div>{children}</div>
    </div>
  );
}
