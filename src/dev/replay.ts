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
import { createHuygensPilot } from '../levels/huygens-return';
import { createPistonWorksPilot } from '../levels/piston-works';
import { createTorricelliPilot } from '../levels/torricelli';
import type { Controls, Snapshot } from '../types';

type Pilot = (state: Snapshot) => Controls;

/** Campaign index → pilot factory, in the same order as src/levels.ts. The early and late
 *  pilots keep the indices of their own level arrays. */
const pilots: (() => Pilot)[] = [
  createFirstLessonPilot,           // 0 newtons-first-lesson
  () => createEarlyReplayPilot(0),  // 1 newtons-orchard
  () => createEarlyReplayPilot(1),  // 2 one-wheel-wonder
  () => createEarlyReplayPilot(4),  // 3 room-on-its-side
  () => createLateReplayPilot(0),   // 4 newtons-attic
  () => createEarlyReplayPilot(3),  // 5 pendulum-mill
  () => createLateReplayPilot(1),   // 6 eschers-orchard
  createCannonballPilot,            // 7 newtons-cannonball
  createOuroborosPilot,             // 8 newtons-ouroboros
  () => createLateReplayPilot(2),   // 9 contrary-conservatory
  createTorricelliPilot,            // 10 torricellis-well
  () => createLateReplayPilot(3),   // 11 gravity-engine
  () => createEarlyReplayPilot(2),  // 12 hanging-garden
  () => createLateReplayPilot(4),   // 13 clockwork-apple
  createClockworkWedgePilot,        // 14 clockwork-wedge
  () => createFlipSpiralPilot(0),   // 15 underside-return
  () => createHuygensPilot(),       // 16 huygens-return
  () => createFlipSpiralPilot(1),   // 17 spiral-sanctuary
  () => createTowerChasmPilot(0),   // 18 switchback-scaffold
  () => createTowerChasmPilot(1),   // 19 the-hidden-way-home
  () => createSpringboardPilot(),   // 20 hookes-springboard
  () => createPistonWorksPilot(),   // 21 piston-works
  createStairwayPilot,              // 22 stairway-to-heaven
];

/** Input-only campaign pilot. Call once before each fixed 1/120 s physics step. */
export function createReplayPilot(index: number): Pilot {
  if (!Number.isInteger(index) || index < 0 || index >= pilots.length) throw new RangeError(`Campaign index must be 0–${pilots.length - 1}`);
  return pilots[index]();
}
