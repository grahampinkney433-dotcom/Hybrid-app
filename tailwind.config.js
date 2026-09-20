/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // These map to the CSS variables defined in src/index.css, which are the exact
      // colours from the prototype. Because they point at variables, dark mode flips
      // automatically (see the @media block in index.css) — no dark: classes needed.
      colors: {
        chalk: 'var(--chalk)',
        panel: 'var(--panel)',
        graphite: 'var(--graphite)',
        steel: 'var(--steel)',
        line: 'var(--line)',
        lane: 'var(--lane)',
        'lane-soft': 'var(--lane-soft)',
        effort: 'var(--effort)',
        ok: 'var(--ok)',
      },
      fontFamily: {
        // Barlow (body) and Barlow Condensed (headings/numbers), loaded in index.html.
        body: ['Barlow', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        cond: ['"Barlow Condensed"', '"Arial Narrow"', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        // Phone-first single column, capped so it stays readable on a tablet/desktop.
        app: '760px',
      },
    },
  },
  plugins: [],
};
