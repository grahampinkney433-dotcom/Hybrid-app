import {
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config';

// Generates the icon set current iOS and Android actually use, from one source SVG:
//   - pwa-64x64.png, pwa-192x192.png, pwa-512x512.png  (Android / manifest)
//   - maskable-icon-512x512.png                        (Android adaptive icon)
//   - apple-touch-icon-180x180.png                     (iOS home screen)
//   - favicon.ico                                      (browser tab)
// vite-plugin-pwa wires these into the manifest and <head> automatically.
export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/favicon.svg'],
});
