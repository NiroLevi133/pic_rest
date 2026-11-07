import { describe, expect, it } from 'vitest';
import { estimateProgress, formatRemaining } from './progress';

describe('generation progress', () => {
  it('moves with time and never claims 100% before everything is ready', () => {
    const at = (t: number) => estimateProgress(t, 90, 4, 0).percent;
    expect(at(0)).toBe(1);
    expect(at(45)).toBe(45);
    expect(at(90)).toBe(90);
    expect(at(600)).toBeLessThan(100);
    expect(at(600)).toBeGreaterThan(at(120));
  });

  it('jumps ahead as images finish, and is 100% when all are done', () => {
    expect(estimateProgress(30, 90, 4, 2).percent).toBeGreaterThan(estimateProgress(30, 90, 4, 0).percent);
    expect(estimateProgress(30, 90, 4, 4)).toEqual({ percent: 100, remainingSec: 0 });
  });

  it('shortens the time left when images are already arriving', () => {
    expect(estimateProgress(48, 90, 4, 3).remainingSec).toBeLessThanOrEqual(10);
    expect(estimateProgress(36, 90, 4, 1).remainingSec!).toBeLessThan(estimateProgress(36, 90, 4, 0).remainingSec!);
  });

  it('estimates the time left, then says almost ready', () => {
    expect(estimateProgress(20, 90, 4, 0).remainingSec).toBe(70);
    expect(estimateProgress(88, 90, 4, 0).remainingSec).toBeNull();
    expect(formatRemaining(70)).toBe('עוד כדקה');
    expect(formatRemaining(35)).toBe('עוד כ־35 שניות');
    expect(formatRemaining(120)).toBe('עוד כדקה וחצי');
    expect(formatRemaining(null)).toBe('כמעט מוכן…');
  });
});
