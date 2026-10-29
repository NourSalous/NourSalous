import { DAY_MS, dayMs, rng, toKey } from "@/components/ui/contribution-skyline";
import type { ContributionDay } from "@/components/ui/contribution-skyline";

type Phase = { week: number; rate: number; gain: number };

const PHASES: Phase[] = [
  { week: 0, rate: 0.14, gain: 1.0 },
  { week: 6, rate: 0.38, gain: 1.5 },
  { week: 13, rate: 0.72, gain: 2.6 },
  { week: 18, rate: 0.24, gain: 1.1 },
  { week: 22, rate: 0.52, gain: 1.8 },
  { week: 28, rate: 0.84, gain: 3.2 },
  { week: 33, rate: 0.16, gain: 0.8 },
  { week: 37, rate: 0.6, gain: 2.1 },
  { week: 45, rate: 0.34, gain: 1.3 },
];

const valueAt = (week: number, key: "rate" | "gain"): number => {
  if (week <= PHASES[0].week) return PHASES[0][key];
  for (let i = 0; i < PHASES.length - 1; i++) {
    const a = PHASES[i];
    const b = PHASES[i + 1];
    if (week >= a.week && week <= b.week) {
      const t = (week - a.week) / Math.max(1, b.week - a.week);
      return a[key] + (b[key] - a[key]) * t;
    }
  }
  return PHASES[PHASES.length - 1][key];
};

export function buildDiverseContributions(endDate: string | Date): ContributionDay[] {
  const endMs = dayMs(endDate);
  const r = rng(20261008);
  const days = 371;
  const out: ContributionDay[] = [];

  for (let i = 0; i < days; i++) {
    const ms = endMs - (days - 1 - i) * DAY_MS;
    const week = i / 7;
    const dow = new Date(ms).getUTCDay();
    const weekend = dow === 0 || dow === 6;
    const rate = valueAt(week, "rate");
    const gain = valueAt(week, "gain");
    const p = Math.min(0.95, rate * (weekend ? 0.42 : 1));

    let count = 0;
    if (r() < p) count = 1 + Math.floor(-Math.log(1 - r()) * gain * (weekend ? 0.6 : 1));
    if (r() < 0.012) count += 12 + Math.floor(r() * 22);

    out.push({ date: toKey(ms), count });
  }

  return out;
}
