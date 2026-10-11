import { describe, expect, it } from 'vitest';
import { applySkip, canSkip, MAX_SKIPS, parseProgress, skipCosts, skipsLeft } from '../src/progress';

const LEVELS = 23;

describe('progress saves', () => {
  it('starts fresh with one open map and all skips', () => {
    expect(parseProgress(null, LEVELS)).toEqual({ unlocked: 1, skipsUsed: 0 });
  });

  it('loads an older save without a skip count', () => {
    expect(parseProgress(JSON.stringify({ unlocked: 5 }), LEVELS)).toEqual({ unlocked: 5, skipsUsed: 0 });
  });

  it('clamps malformed and out-of-range saves', () => {
    expect(parseProgress('not json', LEVELS)).toEqual({ unlocked: 1, skipsUsed: 0 });
    expect(parseProgress(JSON.stringify({ unlocked: 99, skipsUsed: 99 }), LEVELS))
      .toEqual({ unlocked: LEVELS, skipsUsed: MAX_SKIPS });
    expect(parseProgress(JSON.stringify({ unlocked: -2, skipsUsed: -2 }), LEVELS))
      .toEqual({ unlocked: 1, skipsUsed: 0 });
  });
});

describe('map skips', () => {
  it('allows up to three skips past locked maps', () => {
    let progress = parseProgress(null, LEVELS);
    for (let index = 0; index < MAX_SKIPS; index += 1) {
      expect(canSkip(progress, index, LEVELS)).toBe(true);
      expect(skipCosts(progress, index)).toBe(true);
      progress = applySkip(progress, index, LEVELS)!;
      expect(progress.unlocked).toBe(index + 2);
      expect(progress.skipsUsed).toBe(index + 1);
    }
    expect(skipsLeft(progress)).toBe(0);
    expect(canSkip(progress, MAX_SKIPS, LEVELS)).toBe(false);
    expect(applySkip(progress, MAX_SKIPS, LEVELS)).toBeUndefined();
  });

  it('moves to an already-open map without spending a skip', () => {
    const progress = { unlocked: 5, skipsUsed: MAX_SKIPS };
    expect(skipCosts(progress, 2)).toBe(false);
    expect(applySkip(progress, 2, LEVELS)).toEqual(progress);
  });

  it('never skips past the final map', () => {
    const progress = { unlocked: LEVELS, skipsUsed: 0 };
    expect(canSkip(progress, LEVELS - 1, LEVELS)).toBe(false);
    expect(applySkip(progress, LEVELS - 1, LEVELS)).toBeUndefined();
  });

  it('never unlocks beyond what the skip opens', () => {
    const progress = applySkip({ unlocked: 1, skipsUsed: 0 }, 0, LEVELS)!;
    expect(progress.unlocked).toBe(2);
  });
});
