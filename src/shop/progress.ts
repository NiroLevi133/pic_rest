/**
 * Estimated progress while the 4 images are generated. OpenAI reports no real progress,
 * so this blends elapsed time against the expected duration with how many images are ready.
 * It never reaches 100% until everything is done, and slows down (rather than stalls) when late.
 */

/** Typical time for a 4-image generation, until this browser has learned its own average. */
export const DEFAULT_EXPECTED_SEC = 90;
const MIN_EXPECTED_SEC = 30;
const MAX_EXPECTED_SEC = 300;

export interface ProgressEstimate {
  percent: number;
  /** Seconds left, or null once we're past the estimate ("almost ready"). */
  remainingSec: number | null;
}

/** Share of the work a still-running image has done after `t` seconds (0…0.98). */
function timeFraction(t: number, expected: number): number {
  if (t <= expected) return 0.9 * (t / expected);
  // Late: keep creeping toward 98% so the bar never looks frozen.
  return 0.9 + 0.08 * (1 - Math.exp(-(t - expected) / 45));
}

/** Progress (0…0.98) of one image that is still being generated, for the thin line inside its frame. */
export function tileProgress(elapsedSec: number, expectedSec: number): number {
  const e = Math.min(MAX_EXPECTED_SEC, Math.max(MIN_EXPECTED_SEC, expectedSec));
  return Math.max(0.02, timeFraction(Math.max(0, elapsedSec), e));
}

export function estimateProgress(elapsedSec: number, expectedSec: number, total: number, settled: number): ProgressEstimate {
  const t = Math.max(0, elapsedSec);
  const e = Math.min(MAX_EXPECTED_SEC, Math.max(MIN_EXPECTED_SEC, expectedSec));
  if (total <= 0) return { percent: 0, remainingSec: Math.round(e) };
  if (settled >= total) return { percent: 100, remainingSec: 0 };
  const share = (settled + (total - settled) * timeFraction(t, e)) / total;
  const percent = Math.min(99, Math.max(1, Math.round(share * 100)));
  // Once images start arriving, the real pace beats the estimate: extrapolate from progress so far.
  const left = settled > 0 && share > 0 ? Math.min(e - t, (t * (1 - share)) / share) : e - t;
  return { percent, remainingSec: left > 5 ? Math.ceil(left / 5) * 5 : null };
}

/** "עוד כ־40 שניות", "עוד כדקה וחצי", "כמעט מוכן…" */
export function formatRemaining(sec: number | null): string {
  if (sec === null) return 'כמעט מוכן…';
  if (sec < 60) return `עוד כ־${sec} שניות`;
  if (sec < 90) return 'עוד כדקה';
  if (sec < 150) return 'עוד כדקה וחצי';
  return `עוד כ־${Math.round(sec / 60)} דקות`;
}

const DURATIONS_KEY = 'kiri-gen-durations-v1';

/** Average of the last few generation times seen in this browser (falls back to the default). */
export function expectedSeconds(): number {
  try {
    const list = JSON.parse(window.localStorage.getItem(DURATIONS_KEY) || '[]');
    const nums = Array.isArray(list) ? list.filter((n) => typeof n === 'number' && n >= MIN_EXPECTED_SEC / 2 && n <= MAX_EXPECTED_SEC * 2) : [];
    if (nums.length === 0) return DEFAULT_EXPECTED_SEC;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  } catch {
    return DEFAULT_EXPECTED_SEC;
  }
}

export function recordDuration(sec: number) {
  try {
    const list = JSON.parse(window.localStorage.getItem(DURATIONS_KEY) || '[]');
    const next = [...(Array.isArray(list) ? list : []), Math.round(sec)].slice(-5);
    window.localStorage.setItem(DURATIONS_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}
