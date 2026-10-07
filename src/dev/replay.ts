import { createEarlyReplayPilot } from '../levels/early';
import { createLateReplayPilot } from '../levels/late';
import { createFlipSpiralPilot } from '../levels/flip-spiral';
import { createTowerChasmPilot } from '../levels/tower-chasm';
import { createStairwayPilot } from '../levels/stairway';
import { createCannonballPilot } from '../levels/cannonball';
import { createOuroborosPilot } from '../levels/ouroboros';
import { createFirstLessonPilot } from '../levels/first-lesson';
import { createClockworkWedgePilot } from '../levels/clockwork-wedge';
import { createSpringboardPilot } from '../levels/springboard';
import type { Controls, Snapshot } from '../types';

type Pilot = (state: Snapshot) => Controls;

/** Campaign index → pilot factory, in the same order as src/levels.ts. The early and late
 *  pilots keep the indices of their own level arrays. */
const pilots: (() => Pilot)[] = [
  createFirstLessonPilot,           // 0 newtons-first-lesson
  () => createEarlyReplayPilot(0),  // 1 newtons-orchard
  () => createEarlyReplayPilot(1),  // 2 one-wheel-wonder
  () => createEarlyReplayPilot(3),  // 3 pendulum-mill
  () => createEarlyReplayPilot(4),  // 4 room-on-its-side
  () => createLateReplayPilot(0),   // 5 newtons-attic
  () => createLateReplayPilot(1),   // 6 eschers-orchard
  createCannonballPilot,            // 7 newtons-cannonball
  createOuroborosPilot,             // 8 newtons-ouroboros
  () => createLateReplayPilot(2),   // 9 contrary-conservatory
  () => createLateReplayPilot(3),   // 10 gravity-engine
  () => createEarlyReplayPilot(2),  // 11 hanging-garden
  () => createLateReplayPilot(4),   // 12 clockwork-apple
  createClockworkWedgePilot,        // 13 clockwork-wedge
  () => createFlipSpiralPilot(0),   // 14 underside-return
  () => createFlipSpiralPilot(1),   // 15 spiral-sanctuary
  () => createTowerChasmPilot(0),   // 16 switchback-scaffold
  () => createTowerChasmPilot(1),   // 17 the-hidden-way-home
  () => createSpringboardPilot(),   // 18 hookes-springboard
  createStairwayPilot,              // 19 stairway-to-heaven
];

/** Input-only campaign pilot. Call once before each fixed 1/120 s physics step. */
export function createReplayPilot(index: number): Pilot {
  if (!Number.isInteger(index) || index < 0 || index >= pilots.length) throw new RangeError(`Campaign index must be 0–${pilots.length - 1}`);
  return pilots[index]();
}
