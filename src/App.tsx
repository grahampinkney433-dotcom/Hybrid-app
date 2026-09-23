import { useEffect, useRef, useState } from 'react';
import { seedLibraryIfNeeded } from './data/seed';
import { getSettings, saveSettings } from './data/repo';
import { applyTheme } from './lib/theme';
import TodayScreen from './screens/TodayScreen';
import LogScreen from './screens/LogScreen';
import HistoryScreen from './screens/HistoryScreen';
import PlanScreen from './screens/PlanScreen';
import FuelScreen from './screens/FuelScreen';
import SettingsScreen from './screens/SettingsScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import type { Log, LogType, Settings } from './core/types';

type View = 'today' | 'log' | 'plan' | 'fuel' | 'history' | 'settings';

const TABS: { id: View; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'log', label: 'Log' },
  { id: 'plan', label: 'Plan' },
  { id: 'fuel', label: 'Fuel' },
  { id: 'history', label: 'History' },
];

interface LogTarget {
  editLog?: Log;
  prefill?: { type?: LogType; title?: string; workoutId?: string; notes?: string };
}

export default function App() {
  const [view, setView] = useState<View>('today');
  const [logTarget, setLogTarget] = useState<LogTarget>({});
  const [settings, setSettings] = useState<Settings | undefined>();
  const logKey = useRef(0);

  useEffect(() => {
    seedLibraryIfNeeded().catch((err) => console.error('Library seed failed:', err));
    getSettings().then((s) => {
      applyTheme(s?.theme);
      setSettings(s ?? {});
    });
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  function openLog(target: LogTarget = {}) {
    setLogTarget(target);
    logKey.current += 1;
    setView('log');
  }
  function go(next: View) {
    if (next === 'log') openLog({});
    else setView(next);
  }

  // Still loading settings — render nothing to avoid a flash of the wrong screen.
  if (settings === undefined) return null;

  // First run: show the welcome/disclaimer walkthrough until acknowledged.
  if (!settings.disclaimerAcceptedAt) {
    const accept = (dest: View) => {
      const next = { ...settings, disclaimerAcceptedAt: Date.now() };
      setSettings(next);
      saveSettings(next);
      setView(dest);
    };
    return (
      <WelcomeScreen onAcceptAndSetup={() => accept('plan')} onAcceptAndExplore={() => accept('today')} />
    );
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
        {view === 'fuel' && <FuelScreen />}
        {view === 'settings' && <SettingsScreen />}
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
