import {
  hangingGardenLevel, newtonsOrchardLevel, oneWheelWonderLevel, pendulumMillLevel, roomOnItsSideLevel,
} from './levels/early';
import {
  clockworkAppleLevel, contraryConservatoryLevel, eschersOrchardLevel, gravityEngineLevel, newtonsAtticLevel,
} from './levels/late';
import { spiralSanctuaryLevel, undersideReturnLevel } from './levels/flip-spiral';
import { hiddenWayHomeLevel, switchbackScaffoldLevel } from './levels/tower-chasm';
import { stairwayLevel } from './levels/stairway';
import { cannonballLevel } from './levels/cannonball';
import { ouroborosLevel } from './levels/ouroboros';
import { firstLessonLevel } from './levels/first-lesson';
import { clockworkWedgeLevel } from './levels/clockwork-wedge';
import { springboardLevel } from './levels/springboard';
import { huygensReturnLevel } from './levels/huygens-return';
import { pistonWorksLevel } from './levels/piston-works';
import { galileosRampLevel } from './levels/galileos-ramp';
import { iceHouseLevel } from './levels/ice-house';
import { foucaultHallLevel } from './levels/foucault-hall';
import { leibnizCounterweightLevel } from './levels/leibniz-counterweight';
import { pendulumClockLevel } from './levels/pendulum-clock';
import { eulersBridgesLevel } from './levels/eulers-bridges';
import { pascalsPressesLevel } from './levels/pascals-presses';
import { hookesCeilingLevel } from './levels/hookes-ceiling';
import { noetherLevel } from './levels/noether';
import { keplersOrbitLevel } from './levels/kepler';
import { torricelliLevel } from './levels/torricelli';
import { bernoulliUpdraftLevel } from './levels/bernoulli-updraft';
import type { Level } from './types';

/**
 * The campaign, in play order. Saves store only an unlocked count, so the order may change freely;
 * level IDs stay stable. Keep src/dev/replay.ts's pilot table in the same order.
 */
export const levels: Level[] = [
  firstLessonLevel,           // 0
  newtonsOrchardLevel,        // 1
  galileosRampLevel,          // 2
  oneWheelWonderLevel,        // 3
  roomOnItsSideLevel,         // 4
  newtonsAtticLevel,          // 5
  pendulumMillLevel,          // 6
  keplersOrbitLevel,          // 7
  eschersOrchardLevel,        // 8
  cannonballLevel,            // 9
  ouroborosLevel,             // 10
  contraryConservatoryLevel,  // 11
  torricelliLevel,            // 12
  iceHouseLevel,              // 13
  gravityEngineLevel,         // 14
  hangingGardenLevel,         // 15
  foucaultHallLevel,          // 16
  clockworkAppleLevel,        // 17
  leibnizCounterweightLevel,  // 18
  clockworkWedgeLevel,        // 19
  undersideReturnLevel,       // 20
  huygensReturnLevel,         // 21
  pendulumClockLevel,         // 22
  spiralSanctuaryLevel,       // 23
  eulersBridgesLevel,         // 24
  bernoulliUpdraftLevel,      // 25
  switchbackScaffoldLevel,    // 26
  pascalsPressesLevel,        // 27
  hiddenWayHomeLevel,         // 28
  springboardLevel,           // 29
  hookesCeilingLevel,         // 30
  pistonWorksLevel,           // 31
  stairwayLevel,              // 32
  noetherLevel,               // 33
];
