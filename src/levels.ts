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
import type { Level } from './types';

/**
 * The campaign, in play order. Saves store only an unlocked count, so the order may change freely;
 * level IDs stay stable. Keep src/dev/replay.ts's pilot table in the same order.
 */
export const levels: Level[] = [
  newtonsOrchardLevel,        // 0
  oneWheelWonderLevel,        // 1
  pendulumMillLevel,          // 2
  roomOnItsSideLevel,         // 3
  newtonsAtticLevel,          // 4
  eschersOrchardLevel,        // 5
  cannonballLevel,            // 6
  ouroborosLevel,             // 7
  contraryConservatoryLevel,  // 8
  gravityEngineLevel,         // 9
  hangingGardenLevel,         // 10
  clockworkAppleLevel,        // 11
  undersideReturnLevel,       // 12
  spiralSanctuaryLevel,       // 13
  switchbackScaffoldLevel,    // 14
  hiddenWayHomeLevel,         // 15
  stairwayLevel,              // 16
];
