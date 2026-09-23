import { useEffect, useRef, useState } from 'react';
import { Panel, ScreenTitle } from '../components/ui';
import PrivacyPolicy from '../components/PrivacyPolicy';
import type { Division, Profile, Settings } from '../core/types';
import { today } from '../core/time';
import { applyTheme, type Theme } from '../lib/theme';
import { exportAll, importData } from '../data/backup';
import { getProfile, saveProfile, getSettings, saveSettings, wipeAll } from '../data/repo';

const DIVISIONS: Division[] = ['Open', 'Pro', 'Doubles', 'Mixed Doubles', 'Relay'];

export default function SettingsScreen() {
  const [profile, setProfile] = useState<Profile>({} as Profile);
  const [settings, setSettings] = useState<Settings>({});
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProfile().then((p) => setProfile(p ?? ({} as Profile)));
    getSettings().then((s) => setSettings(s ?? {}));
  }, []);

  const patchProfile = (patch: Partial<Profile>) => {
    const next = { ...profile, ...patch };
    setProfile(next);
    saveProfile(next);
  };
  const patchSettings = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  async function doExport() {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `stationlog-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg('Backup exported.');
  }

  async function doImport(file: File) {
    try {
      const parsed = JSON.parse(await file.text());
      const result = await importData(parsed);
      alert(
        `Imported ${result.format === 'prototype' ? 'a Hybrid Log backup' : 'a Stationlog backup'}:\n` +
          `${result.logs} logs, ${result.workouts} workouts, ${result.plans} plans, ` +
          `${result.mealPlans} meal plans, ${result.foods} foods, ${result.diary} diary days.\n\nThe app will reload.`,
      );
      window.location.reload();
    } catch (e) {
      setMsg('That file is not a Stationlog or Hybrid Log backup.');
    }
  }

  return (
    <>
      <ScreenTitle>Settings</ScreenTitle>

      {/* Race */}
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-2">Race</h3>
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={profile.raceBooked ?? false}
            onChange={(e) => patchProfile({ raceBooked: e.target.checked })}
          />
          <span>I have a race booked</span>
        </label>
        {profile.raceBooked && (
          <div className="flex gap-[10px] flex-wrap">
            <div className="flex-1 min-w-[140px]">
              <label className="field-label" htmlFor="set-date">Race date</label>
              <input id="set-date" className="field" type="date" value={profile.raceDate ?? ''} onChange={(e) => patchProfile({ raceDate: e.target.value })} />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="field-label" htmlFor="set-div">Division</label>
              <select id="set-div" className="field" value={profile.division ?? 'Open'} onChange={(e) => patchProfile({ division: e.target.value as Division })}>
                {DIVISIONS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
        )}
        <p className="text-steel text-sm mt-2 mb-0">To rebuild your plan or targets, re-run the questionnaire under Plan → My plans.</p>
      </Panel>

      {/* Appearance */}
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-2">Appearance</h3>
        <label className="field-label" htmlFor="set-theme">Theme</label>
        <select
          id="set-theme"
          className="field"
          value={settings.theme ?? 'system'}
          onChange={(e) => {
            const theme = e.target.value as Theme;
            patchSettings({ theme });
            applyTheme(theme);
          }}
        >
          <option value="system">Match my device</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </Panel>

      {/* Backup */}
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-1">Backup & restore</h3>
        <p className="text-steel text-sm mt-0 mb-2">
          Your data lives only in this browser. Export regularly, and import the file to move
          to another device. Import also reads a Hybrid Log (prototype) backup.
        </p>
        <div className="flex gap-2">
          <button className="btn small" onClick={doExport}>Export backup</button>
          <button className="btn ghost small" onClick={() => fileRef.current?.click()}>Import backup</button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) doImport(f);
              e.target.value = '';
            }}
          />
        </div>
        {msg && <p className="text-sm mt-2 mb-0" role="status">{msg}</p>}
      </Panel>

      {/* Legal */}
      <Panel className="border-lane">
        <h3 className="font-cond font-semibold text-xl m-0 mb-2">Disclaimer</h3>
        <p className="text-sm m-0">
          <strong>Stationlog gives general fitness guidance, not medical advice.</strong> It
          can't account for your individual health. Consult a qualified professional before
          starting a new training or nutrition programme, and stop if you feel unwell or in pain.
        </p>
        <button className="text-lane underline text-sm mt-2" onClick={() => setShowPrivacy((s) => !s)}>
          {showPrivacy ? 'Hide privacy policy' : 'Privacy policy'}
        </button>
        {showPrivacy && <div className="mt-2 border-t border-line pt-2"><PrivacyPolicy /></div>}
      </Panel>

      {/* Danger zone */}
      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-2">Delete all data</h3>
        <p className="text-steel text-sm mt-0 mb-2">Erases every workout, plan, meal plan and setting on this device. Export a backup first if unsure.</p>
        <button
          className="btn danger small"
          onClick={async () => {
            if (!confirm('Delete every workout, plan and setting? This cannot be undone.')) return;
            await wipeAll();
            window.location.reload();
          }}
        >
          Delete all data
        </button>
      </Panel>
    </>
  );
}
