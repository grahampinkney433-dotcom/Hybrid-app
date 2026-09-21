import { useEffect, useRef, useState } from 'react';
import { ScreenTitle, EmptyState } from './components/ui';
import { seedLibraryIfNeeded } from './data/seed';
import TodayScreen from './screens/TodayScreen';
import LogScreen from './screens/LogScreen';
import HistoryScreen from './screens/HistoryScreen';
import PlanScreen from './screens/PlanScreen';
import type { Log, LogType } from './core/types';

// The five bottom-tab views, plus Settings (reached from the header).
type View = 'today' | 'log' | 'plan' | 'fuel' | 'history' | 'settings';

const TABS: { id: View; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'log', label: 'Log' },
  { id: 'plan', label: 'Plan' },
  { id: 'fuel', label: 'Fuel' },
  { id: 'history', label: 'History' },
];

// What the Log screen should open with: a fresh log, an edit, or a prefilled type/title.
interface LogTarget {
  editLog?: Log;
  prefill?: { type?: LogType; title?: string; workoutId?: string; notes?: string };
}

export default function App() {
  const [view, setView] = useState<View>('today');
  const [logTarget, setLogTarget] = useState<LogTarget>({});
  const logKey = useRef(0); // bump to remount the Log screen with fresh state

  useEffect(() => {
    seedLibraryIfNeeded().catch((err) => console.error('Library seed failed:', err));
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  // Open the Log screen with a given target (fresh, edit, or prefilled).
  function openLog(target: LogTarget = {}) {
    setLogTarget(target);
    logKey.current += 1;
    setView('log');
  }

  function go(next: View) {
    if (next === 'log') openLog({});
    else setView(next);
  }

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
        {view === 'today' && <TodayScreen onLog={(prefill) => openLog(prefill ? { prefill } : {})} />}
        {view === 'log' && (
          <LogScreen
            key={logKey.current}
            editLog={logTarget.editLog}
            prefill={logTarget.prefill}
            onSaved={(editing) => go(editing ? 'history' : 'today')}
            onCancel={() => setView('history')}
          />
        )}
        {view === 'history' && <HistoryScreen onEdit={(log) => openLog({ editLog: log })} />}
        {view === 'plan' && <PlanScreen onLog={(prefill) => openLog({ prefill })} />}
        {view === 'fuel' && (
          <>
            <ScreenTitle>Fuel</ScreenTitle>
            <EmptyState title="Nutrition arrives soon">
              Daily targets and the food diary will live here.
            </EmptyState>
          </>
        )}
        {view === 'settings' && (
          <>
            <ScreenTitle>Settings</ScreenTitle>
            <EmptyState title="Settings arrive with the features">
              Race details, backup/restore, theme and the disclaimer will live here.
            </EmptyState>
          </>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 bg-panel border-t border-line z-10 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="max-w-app mx-auto flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => go(t.id)}
              aria-current={view === t.id ? 'page' : undefined}
              className={`flex-1 py-[10px] pb-3 font-cond font-semibold text-base ${
                view === t.id ? 'text-lane shadow-[inset_0_3px_0_var(--lane)]' : 'text-steel'
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
