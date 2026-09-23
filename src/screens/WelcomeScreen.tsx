import { useState } from 'react';
import { Panel } from '../components/ui';
import PrivacyPolicy from '../components/PrivacyPolicy';

// First-run walkthrough. A stranger opening the app cold sees what it is, the
// not-medical-advice disclaimer, and where to start. Shown until the disclaimer is
// acknowledged (Settings can show it again).
export default function WelcomeScreen({
  onAcceptAndSetup,
  onAcceptAndExplore,
}: {
  onAcceptAndSetup: () => void;
  onAcceptAndExplore: () => void;
}) {
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <div className="max-w-app mx-auto px-4 py-6 pb-16">
      <h1 className="font-cond font-bold text-4xl m-0">
        Welcome to Station<span className="text-lane">log</span>
      </h1>
      <p className="text-steel mt-1">
        A training log, plan builder and nutrition tracker for hybrid racing and the eight
        stations — SkiErg, sled push, sled pull, burpee broad jumps, row, farmers carry,
        sandbag lunges and wall balls.
      </p>

      <Panel>
        <h3 className="font-cond font-semibold text-xl m-0 mb-2">What you can do</h3>
        <ul className="pl-5 my-0 list-disc text-sm leading-relaxed">
          <li><strong>Log</strong> runs, strength, stations and full simulations — with splits, RPE and heart rate.</li>
          <li><strong>Plan</strong> your training: generate a plan around your race, or build your own from a 100-workout library.</li>
          <li>Get a <strong>workout of the day</strong> that fits your kit and what you've already trained.</li>
          <li><strong>Fuel</strong>: calorie and macro targets, a daily food diary and meal plans.</li>
        </ul>
      </Panel>

      <Panel className="border-lane">
        <h3 className="font-cond font-semibold text-xl m-0 mb-2">Before you start</h3>
        <p className="text-sm m-0">
          <strong>This is general fitness guidance, not medical advice.</strong> Stationlog
          can't know your health history. Check with a qualified professional before starting
          a new programme, especially if you have an injury, are pregnant, or have a health
          condition. Stop and seek help if something hurts.
        </p>
        <p className="text-sm mt-2 mb-0">
          Your data stays on this device — no account, no servers.{' '}
          <button className="text-lane underline" onClick={() => setShowPrivacy((s) => !s)}>
            {showPrivacy ? 'Hide privacy policy' : 'Read the privacy policy'}
          </button>
        </p>
        {showPrivacy && <div className="mt-2 border-t border-line pt-2"><PrivacyPolicy /></div>}
      </Panel>

      <button className="btn w-full" onClick={onAcceptAndSetup}>
        I understand — set up my plan
      </button>
      <button className="btn ghost w-full mt-2" onClick={onAcceptAndExplore}>
        I understand — explore first
      </button>
    </div>
  );
}
