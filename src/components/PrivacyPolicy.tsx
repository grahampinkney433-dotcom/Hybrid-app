// The privacy policy text, reused on the Welcome screen and in Settings.
// The core promise: nothing leaves the device.
export default function PrivacyPolicy() {
  return (
    <div className="text-sm leading-relaxed">
      <p className="mt-0">
        <strong>Your data never leaves this device.</strong> Stationlog stores everything —
        your workouts, plans, nutrition and settings — locally in your browser (IndexedDB).
        There is no account, no server and no cloud sync.
      </p>
      <ul className="pl-5 my-2 list-disc">
        <li>No sign-up, no email, no login.</li>
        <li>No analytics, tracking or advertising.</li>
        <li>No third-party scripts — the app runs entirely offline after first load.</li>
        <li>Nothing is sent anywhere; we can't see any of your data.</li>
      </ul>
      <p>
        Because your data lives only on this device, the <strong>only backup is the one you
        make</strong>: use Export in Settings to save a JSON file, and keep it somewhere safe.
        Clearing your browser data, or uninstalling the app, will erase everything here.
        Importing a backup restores it.
      </p>
      <p className="mb-0">
        If the app is later published to an app store, this policy will be updated to describe
        any platform permissions — but the on-device, no-server principle will not change.
      </p>
    </div>
  );
}
