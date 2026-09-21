import { useState } from 'react';
import { ScreenTitle } from '../components/ui';
import LibraryScreen from './LibraryScreen';
import PlansSection from './PlansSection';
import type { LogType } from '../core/types';

// The Plan tab hosts two things: the workout Library (browse/filter/add) and, from
// step 5, the plan builder. A segmented control switches between them.
type Section = 'library' | 'plans';

export default function PlanScreen({
  onLog,
}: {
  onLog: (prefill: { type: LogType; title: string; workoutId?: string }) => void;
}) {
  const [section, setSection] = useState<Section>('library');

  return (
    <>
      <ScreenTitle>Plan</ScreenTitle>
      <div className="seg-tabs" role="group" aria-label="Plan section">
        <button aria-pressed={section === 'library'} onClick={() => setSection('library')}>
          Library
        </button>
        <button aria-pressed={section === 'plans'} onClick={() => setSection('plans')}>
          My plans
        </button>
      </div>

      {section === 'library' ? <LibraryScreen onLog={onLog} /> : <PlansSection onLog={onLog} />}
    </>
  );
}
