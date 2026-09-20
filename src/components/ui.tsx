import type { ReactNode } from 'react';

// Small shared building blocks so every screen looks consistent. These mirror the
// prototype's .panel / .empty / heading styles, expressed with the Tailwind tokens.

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-panel border border-line rounded-2xl p-4 mb-3 ${className}`}>{children}</div>
  );
}

export function ScreenTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="font-cond font-semibold text-3xl leading-tight m-0">{children}</h2>
      {sub && <p className="text-steel mt-1 mb-0">{sub}</p>}
    </div>
  );
}

// Friendly empty state — a stranger opening the app cold should know what to do here.
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Panel>
      <div className="text-center text-steel py-6 px-2">
        <p className="font-cond font-semibold text-graphite text-lg m-0">{title}</p>
        {children && <p className="mt-2 mb-0 text-sm">{children}</p>}
      </div>
    </Panel>
  );
}
