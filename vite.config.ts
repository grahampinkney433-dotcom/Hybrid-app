import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The app is served from a GitHub Pages *project* site:
//   https://grahampinkney433-dotcom.github.io/hybrid-app/
// Everything (assets, the service worker, the manifest scope) has to live under
// that "/hybrid-app/" sub-path, or the app won't install. If you rename the repo,
// change BASE_PATH to match the new "/<repo-name>/" and nothing else needs to move.
const BASE_PATH = '/hybrid-app/';

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      // "autoUpdate" = when you ship a new version, installed phones quietly pick it
      // up on next launch. No update prompts to build or maintain.
      registerType: 'autoUpdate',
      // Let the plugin inject the small "register the service worker" snippet for us.
      injectRegister: 'auto',
      // Generates every icon size (incl. iOS apple-touch + Android maskable) from the
      // single source image in pwa-assets.config.ts, and wires them into the manifest.
      pwaAssets: { config: true },
      manifest: {
        name: 'Stationlog',
        short_name: 'Stationlog',
        description: 'Training log, plans and nutrition for hybrid racing and the eight stations.',
        // scope + start_url MUST sit under BASE_PATH for the install to work.
        scope: BASE_PATH,
        start_url: BASE_PATH,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ECEDE8',
        theme_color: '#1F4E9E',
        lang: 'en-GB',
        categories: ['health', 'fitness', 'sports'],
      },
      workbox: {
        // Precache the app shell + data so it works fully offline after first load.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json}'],
        // Single-page app: unknown routes fall back to index.html (under the base path).
        navigateFallback: `${BASE_PATH}index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Enables the service worker in `npm run dev` so we can test install/offline locally.
        enabled: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
});
