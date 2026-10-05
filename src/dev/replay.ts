import { createEarlyReplayPilot } from '../levels/early';
import { createLateReplayPilot } from '../levels/late';
import { createFlipSpiralPilot } from '../levels/flip-spiral';
import { createTowerChasmPilot } from '../levels/tower-chasm';
import { createStairwayPilot } from '../levels/stairway';
import { createCannonballPilot } from '../levels/cannonball';
import { createOuroborosPilot } from '../levels/ouroboros';
import type { Controls, Snapshot } from '../types';

type Pilot = (state: Snapshot) => Controls;

/** Campaign index → pilot factory, in the same order as src/levels.ts. The early and late
 *  pilots keep the indices of their own level arrays. */
const pilots: (() => Pilot)[] = [
  () => createEarlyReplayPilot(0),  // 0 newtons-orchard
  () => createEarlyReplayPilot(1),  // 1 one-wheel-wonder
  () => createEarlyReplayPilot(3),  // 2 pendulum-mill
  () => createEarlyReplayPilot(4),  // 3 room-on-its-side
  () => createLateReplayPilot(0),   // 4 newtons-attic
  () => createLateReplayPilot(1),   // 5 eschers-orchard
  createCannonballPilot,            // 6 newtons-cannonball
  createOuroborosPilot,             // 7 newtons-ouroboros
  () => createLateReplayPilot(2),   // 8 contrary-conservatory
  () => createLateReplayPilot(3),   // 9 gravity-engine
  () => createEarlyReplayPilot(2),  // 10 hanging-garden
  () => createLateReplayPilot(4),   // 11 clockwork-apple
  () => createFlipSpiralPilot(0),   // 12 underside-return
  () => createFlipSpiralPilot(1),   // 13 spiral-sanctuary
  () => createTowerChasmPilot(0),   // 14 switchback-scaffold
  () => createTowerChasmPilot(1),   // 15 the-hidden-way-home
  createStairwayPilot,              // 16 stairway-to-heaven
];

/** Input-only campaign pilot. Call once before each fixed 1/120 s physics step. */
export function createReplayPilot(index: number): Pilot {
  if (!Number.isInteger(index) || index < 0 || index >= pilots.length) throw new RangeError(`Campaign index must be 0–${pilots.length - 1}`);
  return pilots[index]();
}
