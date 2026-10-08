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
import type { Level } from './types';

/**
 * The campaign, in play order. Saves store only an unlocked count, so the order may change freely;
 * level IDs stay stable. Keep src/dev/replay.ts's pilot table in the same order.
 */
export const levels: Level[] = [
  firstLessonLevel,           // 0
  newtonsOrchardLevel,        // 1
  oneWheelWonderLevel,        // 2
  pendulumMillLevel,          // 3
  roomOnItsSideLevel,         // 4
  newtonsAtticLevel,          // 5
  eschersOrchardLevel,        // 6
  cannonballLevel,            // 7
  ouroborosLevel,             // 8
  contraryConservatoryLevel,  // 9
  gravityEngineLevel,         // 10
  hangingGardenLevel,         // 11
  clockworkAppleLevel,        // 12
  clockworkWedgeLevel,        // 13
  undersideReturnLevel,       // 14
  huygensReturnLevel,         // 15
  spiralSanctuaryLevel,       // 16
  switchbackScaffoldLevel,    // 17
  hiddenWayHomeLevel,         // 18
  springboardLevel,           // 19
  pistonWorksLevel,           // 20
  stairwayLevel,              // 21
];
