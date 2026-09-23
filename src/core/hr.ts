// Heart-rate helpers (feature 7). Pure functions, no browser/DB — easy to test.

// Estimate maximum heart rate from age (Tanaka formula: 208 − 0.7 × age), which is
// more accurate across ages than the old "220 − age". Falls back sensibly out of range.
export function estimateMaxHr(age: number | undefined): number | undefined {
  if (!age || age < 5 || age > 120) return undefined;
  return Math.round(208 - 0.7 * age);
}

export interface HrZone {
  zone: 1 | 2 | 3 | 4 | 5;
  label: string;
  lowPct: number; // % of max HR
  highPct: number;
  min: number; // bpm
  max: number; // bpm
}

// Five zones as a percentage of max HR — the standard model used by most watches.
const ZONE_DEFS: { zone: HrZone['zone']; label: string; low: number; high: number }[] = [
  { zone: 1, label: 'Recovery', low: 0.5, high: 0.6 },
  { zone: 2, label: 'Easy (aerobic)', low: 0.6, high: 0.7 },
  { zone: 3, label: 'Tempo', low: 0.7, high: 0.8 },
  { zone: 4, label: 'Threshold', low: 0.8, high: 0.9 },
  { zone: 5, label: 'VO₂ max', low: 0.9, high: 1.0 },
];

// Compute the bpm range for each zone from a max HR. Returns [] if maxHr is missing.
export function zoneRanges(maxHr: number | undefined): HrZone[] {
  if (!maxHr || maxHr < 100 || maxHr > 240) return [];
  return ZONE_DEFS.map((z) => ({
    zone: z.zone,
    label: z.label,
    lowPct: z.low,
    highPct: z.high,
    min: Math.round(maxHr * z.low),
    max: Math.round(maxHr * z.high),
  }));
}
