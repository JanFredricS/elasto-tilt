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
import { createKeplerPilot } from '../levels/kepler';
import { createTorricelliPilot } from '../levels/torricelli';
import { createBernoulliPilot } from '../levels/bernoulli-updraft';
import { createAmperePilot } from '../levels/amperes-loop';
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
  createKeplerPilot,                 // 7 keplers-orbit
  () => createLateReplayPilot(1),    // 8 eschers-orchard
  createCannonballPilot,             // 9 newtons-cannonball
  createOuroborosPilot,              // 10 newtons-ouroboros
  () => createLateReplayPilot(2),    // 11 contrary-conservatory
  createTorricelliPilot,             // 12 torricellis-well
  createIceHousePilot,               // 13 ice-house
  () => createLateReplayPilot(3),    // 14 gravity-engine
  () => createEarlyReplayPilot(2),   // 15 hanging-garden
  () => createFoucaultPilot(),       // 16 foucaults-hall
  () => createLateReplayPilot(4),    // 17 clockwork-apple
  createLeibnizPilot,                // 18 leibniz-counterweight
  createClockworkWedgePilot,         // 19 clockwork-wedge
  () => createFlipSpiralPilot(0),    // 20 underside-return
  () => createHuygensPilot(),        // 21 huygens-return
  () => createPendulumClockPilot(),  // 22 pendulum-clock
  () => createFlipSpiralPilot(1),    // 23 spiral-sanctuary
  () => createEulersBridgesPilot(),  // 24 eulers-bridges
  createAmperePilot,                 // 25 amperes-loop
  () => createBernoulliPilot(),      // 26 bernoullis-updraft
  () => createTowerChasmPilot(0),    // 27 switchback-scaffold
  () => createPascalsPressesPilot(), // 28 pascals-presses
  () => createTowerChasmPilot(1),    // 29 the-hidden-way-home
  () => createSpringboardPilot(),    // 30 hookes-springboard
  () => createHookesCeilingPilot(),  // 31 hookes-ceiling
  () => createPistonWorksPilot(),    // 32 piston-works
  createStairwayPilot,               // 33 stairway-to-heaven
  () => createNoetherPilot(),        // 34 noethers-symmetry
];

/** Input-only campaign pilot. Call once before each fixed 1/120 s physics step. */
export function createReplayPilot(index: number): Pilot {
  if (!Number.isInteger(index) || index < 0 || index >= pilots.length) throw new RangeError(`Campaign index must be 0–${pilots.length - 1}`);
  return pilots[index]();
}
