/** Money is stored and computed as integer agorot (1 ₪ = 100). */

/** Parse user input ("4,500", "4500.5", "₪ 120") to agorot. Returns null for empty/invalid input. */
export function parseShekels(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : null;
  const cleaned = input.replace(/[₪,\s]/g, '');
  if (!cleaned) return null;
  if (!/^-?\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

/** Agorot → "4,500" / "4,500.50" (no currency sign). */
export function formatAmount(agorot: number): string {
  const hasCents = agorot % 100 !== 0;
  return (agorot / 100).toLocaleString('he-IL', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/** Agorot → "‏4,500 ₪" */
export function formatILS(agorot: number): string {
  return `${formatAmount(agorot)} ₪`;
}

/** Agorot → editable input string ("4500" / "4500.5"). */
export function agorotToInput(agorot: number | null | undefined): string {
  if (agorot === null || agorot === undefined) return '';
  return String(agorot / 100);
}
