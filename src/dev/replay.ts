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
import { createGalileoPilot } from '../levels/galileos-ramp';
import { createIceHousePilot } from '../levels/ice-house';
import { createFoucaultPilot } from '../levels/foucault-hall';
import { createLeibnizPilot } from '../levels/leibniz-counterweight';
import { createPendulumClockPilot } from '../levels/pendulum-clock';
import { createEulersBridgesPilot } from '../levels/eulers-bridges';
import { createPascalsPressesPilot } from '../levels/pascals-presses';
import { createHookesCeilingPilot } from '../levels/hookes-ceiling';
import { createNoetherPilot } from '../levels/noether';
import type { Controls, Snapshot } from '../types';

type Pilot = (state: Snapshot) => Controls;

/** Campaign index → pilot factory, in the same order as src/levels.ts. The early and late
 *  pilots keep the indices of their own level arrays. */
const pilots: (() => Pilot)[] = [
  createFirstLessonPilot,            // 0 newtons-first-lesson
  () => createEarlyReplayPilot(0),   // 1 newtons-orchard
  createGalileoPilot,                // 2 galileos-ramp
  () => createEarlyReplayPilot(1),   // 3 one-wheel-wonder
  () => createEarlyReplayPilot(4),   // 4 room-on-its-side
  () => createLateReplayPilot(0),    // 5 newtons-attic
  () => createEarlyReplayPilot(3),   // 6 pendulum-mill
  () => createLateReplayPilot(1),    // 7 eschers-orchard
  createCannonballPilot,             // 8 newtons-cannonball
  createOuroborosPilot,              // 9 newtons-ouroboros
  () => createLateReplayPilot(2),    // 10 contrary-conservatory
  createIceHousePilot,               // 11 ice-house
  () => createLateReplayPilot(3),    // 12 gravity-engine
  () => createEarlyReplayPilot(2),   // 13 hanging-garden
  () => createFoucaultPilot(),       // 14 foucaults-hall
  () => createLateReplayPilot(4),    // 15 clockwork-apple
  createLeibnizPilot,                // 16 leibniz-counterweight
  createClockworkWedgePilot,         // 17 clockwork-wedge
  () => createFlipSpiralPilot(0),    // 18 underside-return
  () => createHuygensPilot(),        // 19 huygens-return
  () => createPendulumClockPilot(),  // 20 pendulum-clock
  () => createFlipSpiralPilot(1),    // 21 spiral-sanctuary
  () => createEulersBridgesPilot(),  // 22 eulers-bridges
  () => createTowerChasmPilot(0),    // 23 switchback-scaffold
  () => createPascalsPressesPilot(), // 24 pascals-presses
  () => createTowerChasmPilot(1),    // 25 the-hidden-way-home
  () => createSpringboardPilot(),    // 26 hookes-springboard
  () => createHookesCeilingPilot(),  // 27 hookes-ceiling
  () => createPistonWorksPilot(),    // 28 piston-works
  createStairwayPilot,               // 29 stairway-to-heaven
  () => createNoetherPilot(),        // 30 noethers-symmetry
];

/** Input-only campaign pilot. Call once before each fixed 1/120 s physics step. */
export function createReplayPilot(index: number): Pilot {
  if (!Number.isInteger(index) || index < 0 || index >= pilots.length) throw new RangeError(`Campaign index must be 0–${pilots.length - 1}`);
  return pilots[index]();
}
