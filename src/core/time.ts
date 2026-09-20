// Small, dependency-free helpers for times and dates.
// Pure functions only, so they are safe under Capacitor and easy to unit-test.

// Parse a "m:ss" or "h:mm:ss" (or plain seconds) string into whole seconds.
// Returns 0 for empty/invalid input, matching the prototype's forgiving behaviour.
export function toSec(v: string | number | undefined | null): number {
  if (v === undefined || v === null || v === '') return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  const parts = String(v).trim().split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

// Format seconds as "m:ss" or "h:mm:ss". Returns "–" for 0/empty.
export function fmt(seconds: number | undefined | null): string {
  if (!seconds) return '–';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return (h ? `${h}:` : '') + `${mm}:${String(x).padStart(2, '0')}`;
}

// Today's date as 'YYYY-MM-DD' (local time).
export function today(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

// The Monday (ISO week start) for a given 'YYYY-MM-DD', as 'YYYY-MM-DD'.
export function weekStart(date: string): string {
  const x = new Date(date + 'T12:00');
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - day);
  return x.toISOString().slice(0, 10);
}

// Friendly date label, e.g. "Sat, 20 Sep".
export function niceDate(date: string): string {
  return new Date(date + 'T12:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// A short random id for records the user creates.
export function uid(): string {
  // crypto.randomUUID exists in modern browsers and in Capacitor's WebView.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
