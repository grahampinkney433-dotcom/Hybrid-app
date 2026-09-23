import { useState } from 'react';
import { ScreenTitle } from '../components/ui';
import FuelTargets from './fuel/FuelTargets';
import FuelDiary from './fuel/FuelDiary';
import FuelPlans from './fuel/FuelPlans';

type Section = 'targets' | 'diary' | 'plans';

export default function FuelScreen() {
  const [section, setSection] = useState<Section>('targets');
  return (
    <>
      <ScreenTitle sub="Targets from your stats, a daily food diary, and reusable meal plans.">
        Fuel
      </ScreenTitle>
      <div className="seg-tabs" role="group" aria-label="Fuel section">
        <button aria-pressed={section === 'targets'} onClick={() => setSection('targets')}>Targets</button>
        <button aria-pressed={section === 'diary'} onClick={() => setSection('diary')}>Diary</button>
        <button aria-pressed={section === 'plans'} onClick={() => setSection('plans')}>Meal plans</button>
      </div>
      {section === 'targets' && <FuelTargets />}
      {section === 'diary' && <FuelDiary />}
      {section === 'plans' && <FuelPlans />}
    </>
  );
}
