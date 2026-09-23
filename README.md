# Stationlog

An installable, offline-first training app for hybrid racing and the eight stations
(SkiErg, sled push, sled pull, burpee broad jumps, row, farmers carry, sandbag lunges,
wall balls). Workout logging, plan building, a 100-workout library, a workout-of-the-day,
and nutrition targets with a food diary — all stored **on your device**, with no account,
no server and no tracking.

> **Not medical advice.** Stationlog gives general fitness guidance only. Consult a
> qualified professional before starting a new training or nutrition programme.

_"Stationlog" is a working name; it deliberately avoids any trademarked race name. The app
describes itself as built for hybrid racing and the eight stations._

---

## Run it locally

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install        # install dependencies (first time only)
npm run dev        # start the dev server — open the printed http://localhost:5173/Hybrid-app/ URL
npm test           # run the unit tests
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

## Deploy to GitHub Pages

The app is a **project site** at `https://grahampinkney433-dotcom.github.io/Hybrid-app/`.
Deployment is automatic via GitHub Actions (`.github/workflows/deploy.yml`).

**One-time setup:** in the repo on GitHub, go to **Settings → Pages → Build and deployment**
and set **Source = "GitHub Actions"**.

After that, every push to the **`main`** branch builds the app (running the tests first) and
publishes it. You can also trigger it manually from the **Actions** tab.

> **Important — the base path is case-sensitive.** GitHub Pages serves this project at
> `/Hybrid-app/` (matching the repository name's exact casing). That path is set once in
> `vite.config.ts` as `BASE_PATH`, and the PWA manifest scope, start URL and service worker
> all follow it. **If you ever rename the repository, change `BASE_PATH` to match the new
> name exactly** (including capitals) or the app will fail to load and install.

## Install on your phone

Open the site URL in your phone's browser, then add it to your home screen. It runs
full-screen, works offline, and behaves like a native app.

- **iPhone / iPad (Safari):** tap the **Share** button → **Add to Home Screen** → **Add**.
- **Android (Chrome):** tap the **⋮** menu → **Install app** (or **Add to Home screen**).

The first load needs an internet connection to cache the app; after that it works offline.

## Back up your data

Because everything lives only on your device, **the only backup is the one you make.**
In **Settings → Backup & restore**, tap **Export backup** to save a JSON file, and keep it
safe. **Import backup** restores it (and also reads a backup from the original *Hybrid Log*
prototype). Clearing your browser data or uninstalling the app erases everything.

---

## For whoever maintains this (a quick map)

The code is deliberately plain and commented. The important idea: **all the thinking is in
pure, tested functions, and all the storage is behind one module** — so the screens stay
simple and the app could later be wrapped for the App Store (with Capacitor) without a
rewrite.

```
src/
  core/        Pure logic — NO browser or database calls. Unit-tested.
    types.ts       All the data shapes and vocabularies.
    time.ts        Time/date/split helpers (m:ss ↔ seconds).
    logs.ts        Personal bests, weekly stats, trends.
    hr.ts          Heart-rate max estimate and training zones.
    library.ts     Library filtering + category → log-type mapping.
    plan.ts        Training-plan generator (phases, day templates).
    planEdit.ts    Immutable edits to a plan (add/move/reorder…).
    wod.ts         Workout-of-the-day generator.
    nutrition.ts   BMR/TDEE/macros + the hard SAFETY FLOORS.
    foods.ts       Built-in food list (per 100 g).
    stations.ts    The eight stations.
  data/        The ONLY code that touches the database (IndexedDB via Dexie).
    db.ts          The schema (change here to add/alter tables).
    repo.ts        Every read/write the app does goes through here.
    seed.ts        Loads workout-library.json on first run.
    backup.ts      Export/import, incl. prototype migration.
    workout-library.json   The 100 seed workouts (edit to update the library).
  components/  Reused UI pieces (panels, macro bars, workout detail…).
  screens/     One folder/file per screen.
  lib/         Small browser-only helpers (theme).
tests/         Unit tests (run with `npm test`).
```

Common changes:

- **Add or edit library workouts:** edit `src/data/workout-library.json` and bump its
  `version` number — the app re-seeds the built-in workouts on next open (your own added
  workouts are untouched).
- **Add a food to the built-in list:** add a row in `src/core/foods.ts`.
- **Change the schema (new field/table):** add a new `db.version(n).stores({…})` block in
  `src/data/db.ts` (never edit the existing version 1 block), then add repo functions.
- **Adjust nutrition safety floors:** the constants at the top of `src/core/nutrition.ts`.

Please keep the tests green (`npm test`) before deploying — the deploy runs them and will
refuse to publish if any fail.

## Tech

Vite · React · TypeScript · Tailwind CSS · Dexie (IndexedDB) · vite-plugin-pwa. No backend,
no analytics, no third-party runtime scripts.
