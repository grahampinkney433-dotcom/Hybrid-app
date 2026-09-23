// Applies the chosen theme by setting data-theme on <html>. 'system' removes the
// attribute so the prefers-color-scheme media query in index.css takes over.
// Lives outside core/ because it touches the DOM.
export type Theme = 'system' | 'light' | 'dark';

export function applyTheme(theme: Theme | undefined) {
  const root = document.documentElement;
  if (!theme || theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}
