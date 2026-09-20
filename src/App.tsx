import { useEffect, useState } from 'react';
import { ScreenTitle, EmptyState, Panel } from './components/ui';
import { libraryCount, seedLibraryIfNeeded } from './data/seed';

// The five bottom-tab views, plus Settings (reached from the header).
type View = 'today' | 'log' | 'plan' | 'fuel' | 'history' | 'settings';

const TABS: { id: View; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'log', label: 'Log' },
  { id: 'plan', label: 'Plan' },
  { id: 'fuel', label: 'Fuel' },
  { id: 'history', label: 'History' },
];

export default function App() {
  const [view, setView] = useState<View>('today');

  // Scroll to top when the view changes (matches the prototype).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  return (
    <div className="min-h-screen">
      <header className="max-w-app mx-auto flex items-center justify-between px-[18px] pt-[14px] pb-[6px]">
        <h1 className="font-cond font-bold text-[26px] leading-none m-0">
          Station<span className="text-lane">log</span>
        </h1>
        <button
          type="button"
          onClick={() => setView('settings')}
          aria-current={view === 'settings' ? 'page' : undefined}
          className="border border-line rounded-[10px] px-[10px] py-[6px] text-steel"
        >
          Settings
        </button>
      </header>

      <main className="max-w-app mx-auto px-4 pt-[6px] pb-[110px]">
        <Screen view={view} />
      </main>

      <nav className="fixed inset-x-0 bottom-0 bg-panel border-t border-line z-10 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="max-w-app mx-auto flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setView(t.id)}
              aria-current={view === t.id ? 'page' : undefined}
              className={`flex-1 py-[10px] pb-3 font-cond font-semibold text-base ${
                view === t.id
                  ? 'text-lane shadow-[inset_0_3px_0_var(--lane)]'
                  : 'text-steel'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// Placeholder screens for step 1. Each real feature lands in its own step; for now every
// screen shows a clear empty state so the shell, navigation and data layer can be tested.
function Screen({ view }: { view: View }) {
  switch (view) {
    case 'today':
      return <TodayStub />;
    case 'log':
      return (
        <>
          <ScreenTitle>Log workout</ScreenTitle>
          <EmptyState title="Workout logging arrives next">
            The fast split-entry logger (with the race clock, RPE and heart rate) is the next
            step.
          </EmptyState>
        </>
      );
    case 'plan':
      return (
        <>
          <ScreenTitle>Plan</ScreenTitle>
          <EmptyState title="Plans arrive soon">
            Generated and custom training plans will drive this screen.
          </EmptyState>
        </>
      );
    case 'fuel':
      return (
        <>
          <ScreenTitle>Fuel</ScreenTitle>
          <EmptyState title="Nutrition arrives soon">
            Daily targets and the food diary will live here.
          </EmptyState>
        </>
      );
    case 'history':
      return (
        <>
          <ScreenTitle>History</ScreenTitle>
          <EmptyState title="Nothing logged yet">
            Your sessions and personal bests will appear here once logging is in.
          </EmptyState>
        </>
      );
    case 'settings':
      return (
        <>
          <ScreenTitle>Settings</ScreenTitle>
          <EmptyState title="Settings arrive with the features">
            Race details, backup/restore, theme and the disclaimer will live here.
          </EmptyState>
        </>
      );
  }
}

// A tiny live check that the database + seed pipeline works end-to-end.
function TodayStub() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    // Wait for the (idempotent) seed to finish before counting, so a fresh install
    // never briefly shows an empty library.
    seedLibraryIfNeeded()
      .then(libraryCount)
      .then(setCount)
      .catch(() => setCount(0));
  }, []);
  return (
    <>
      <ScreenTitle sub="Your foundation is set up. Features arrive step by step.">
        Today
      </ScreenTitle>
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-2">Setup check</h3>
        <p className="m-0 text-sm text-steel">
          Workout library loaded into on-device storage:{' '}
          <strong className="text-graphite">
            {count === null ? 'checking…' : `${count} workouts`}
          </strong>
        </p>
      </Panel>
    </>
  );
}
