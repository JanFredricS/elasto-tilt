/** Campaign progress: how many maps are open, and how many of the three map skips are spent.
 *  Saves are additive — older `{ unlocked }` saves load with no skips spent. */

export const MAX_SKIPS = 3;

export interface Progress { unlocked: number; skipsUsed: number }

export function parseProgress(raw: string | null, levelCount: number): Progress {
  let unlocked = 1;
  let skipsUsed = 0;
  try {
    const saved = JSON.parse(raw || 'null');
    if (saved && Number.isInteger(saved.unlocked)) unlocked = Math.max(1, Math.min(levelCount, saved.unlocked));
    if (saved && Number.isInteger(saved.skipsUsed)) skipsUsed = Math.max(0, Math.min(MAX_SKIPS, saved.skipsUsed));
  } catch { /* Private mode or malformed saves should not prevent play. */ }
  return { unlocked, skipsUsed };
}

export function skipsLeft(progress: Progress): number {
  return Math.max(0, MAX_SKIPS - progress.skipsUsed);
}

/** Whether the rider on `levelIndex` may move on to the next map right now: there must be a
 *  next map, and it must either be open already or affordable with a remaining skip. */
export function canSkip(progress: Progress, levelIndex: number, levelCount: number): boolean {
  const next = levelIndex + 1;
  if (next >= levelCount) return false;
  return next < progress.unlocked || skipsLeft(progress) > 0;
}

/** True when moving past `levelIndex` would open a still-locked map, spending a skip.
 *  Returning to an already-open map costs nothing. */
export function skipCosts(progress: Progress, levelIndex: number): boolean {
  return levelIndex + 1 >= progress.unlocked;
}

/** Progress after skipping past `levelIndex`, or undefined when no skip is possible. */
export function applySkip(progress: Progress, levelIndex: number, levelCount: number): Progress | undefined {
  if (!canSkip(progress, levelIndex, levelCount)) return undefined;
  if (!skipCosts(progress, levelIndex)) return progress;
  return { unlocked: Math.max(progress.unlocked, levelIndex + 2), skipsUsed: progress.skipsUsed + 1 };
}
