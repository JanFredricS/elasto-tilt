import { createEarlyReplayPilot } from '../levels/early';
import { createLateReplayPilot } from '../levels/late';
import { createFlipSpiralPilot } from '../levels/flip-spiral';
import { createTowerChasmPilot } from '../levels/tower-chasm';
import { createStairwayPilot } from '../levels/stairway';
import type { Controls, Snapshot } from '../types';

/** Input-only campaign pilot. Call once before each fixed 1/120 s physics step. */
export function createReplayPilot(index: number): (state: Snapshot) => Controls {
  if (!Number.isInteger(index) || index < 0 || index > 14) throw new RangeError('Campaign index must be 0–14');
  if (index === 14) return createStairwayPilot();
  if (index >= 12) return createTowerChasmPilot((index - 12) as 0 | 1);
  if (index >= 10) return createFlipSpiralPilot((index - 10) as 0 | 1);
  if (index < 5) return createEarlyReplayPilot(index);
  return createLateReplayPilot(index - 5);
}
