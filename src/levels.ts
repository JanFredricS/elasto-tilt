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
  gravityEngineLevel,         // 11
  hangingGardenLevel,         // 12
  clockworkAppleLevel,        // 13
  clockworkWedgeLevel,        // 14
  undersideReturnLevel,       // 15
  huygensReturnLevel,         // 16
  spiralSanctuaryLevel,       // 17
  switchbackScaffoldLevel,    // 18
  hiddenWayHomeLevel,         // 19
  springboardLevel,           // 20
  pistonWorksLevel,           // 21
  stairwayLevel,              // 22
];
