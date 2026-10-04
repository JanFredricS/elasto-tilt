import { earlyLevels } from './levels/early';
import { lateLevels } from './levels/late';
import { flipSpiralLevels } from './levels/flip-spiral';
import { towerChasmLevels } from './levels/tower-chasm';
import { stairwayLevel } from './levels/stairway';
import type { Level } from './types';

/** Stable IDs and ordering preserve campaign saves across the route redesign. */
export const levels: Level[] = [...earlyLevels, ...lateLevels, ...flipSpiralLevels, ...towerChasmLevels, stairwayLevel];
