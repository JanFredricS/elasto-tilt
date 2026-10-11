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
  eschersOrchardLevel,        // 7
  cannonballLevel,            // 8
  ouroborosLevel,             // 9
  contraryConservatoryLevel,  // 10
  iceHouseLevel,              // 11
  gravityEngineLevel,         // 12
  hangingGardenLevel,         // 13
  foucaultHallLevel,          // 14
  clockworkAppleLevel,        // 15
  leibnizCounterweightLevel,  // 16
  clockworkWedgeLevel,        // 17
  undersideReturnLevel,       // 18
  huygensReturnLevel,         // 19
  pendulumClockLevel,         // 20
  spiralSanctuaryLevel,       // 21
  eulersBridgesLevel,         // 22
  switchbackScaffoldLevel,    // 23
  pascalsPressesLevel,        // 24
  hiddenWayHomeLevel,         // 25
  springboardLevel,           // 26
  hookesCeilingLevel,         // 27
  pistonWorksLevel,           // 28
  stairwayLevel,              // 29
  noetherLevel,               // 30
];
