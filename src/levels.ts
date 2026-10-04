import { earlyLevels } from './levels/early';
import { lateLevels } from './levels/late';
import type { Level } from './types';

/** Stable IDs and ordering preserve campaign saves across the route redesign. */
export const levels: Level[] = [...earlyLevels, ...lateLevels];
