import type { Apple, Controls, Level, RouteHint, Snapshot, Surface, Vec } from '../types';

const p = (x: number, y: number): Vec => ({ x, y });
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const DEG = Math.PI / 180;
const THICK = .5;
const TAU = 2 * Math.PI;
const STEP = .3;

/**
 * Newton's Ouroboros: one counter-clockwise loop ridden on its inside, a rounded rectangle whose
 * floor is broken by a hole. The loop ends on a small kicker at the hole's near lip; beyond the
 * hole its own beginning, a little lower, catches anyone who flies across and sends them round
 * again, forever. The only way on is to yield: brake, tip over the kicker and fall. Under the hole
 * there is nothing for over thirteen metres; the bike somersaults once on the way down, is caught by
 * the curve at the shaft's foot and its sloping run-out, and rides the corridor, the ramp and the door.
 *
 * Every piece is an exact arc or straight, so the ring closes by construction (no solver).
 */
export interface OuroborosShape {
  /** Corner radius of the ring (all four corners) and the straight lengths between corner centres. */
  radius: number; width: number; height: number;
  /** Flat run after the last corner, then a concave kicker (deg, radius) and its straight tip. */
  run: number; kick: number; kickRadius: number; kickLength: number;
  /** Horizontal hole from the kicker tip to the far face, whose lip sits `drop` below the floor. */
  gap: number; drop: number;
  /** Radius of the bull-nose that rounds the far lip's face into its top, so a short jump glances up onto it. */
  nose: number;
  /** Landing deck: a straight downslope (deg, length) easing through a concave bend onto the floor. */
  deckAngle: number; deckLength: number; deckRadius: number;
}
export const OUROBOROS_SHAPE: OuroborosShape = {
  radius: 5.5, width: 10.2, height: 1,
  run: 4.5, kick: 10, kickRadius: 3, kickLength: 0,
  gap: 3.3, drop: .3, nose: .5,
  deckAngle: 0, deckLength: 0, deckRadius: 1,
};

/** The way down: a rounded edge off the kicker tip into a sheer, slightly undercut shaft. Nothing
 *  waits under the hole for `shaft` metres; there a curved catcher turns the wall onto a sloping
 *  run-out that a wide bend lays onto the corridor, then the slanted ramp and the door's walled pocket.
 *  The yielding bike drifts ~4 m forward and turns a full somersault in its ~1.5 s, 16 m fall, coming
 *  down a little nose-first: the run-out slopes to meet it so it lands on both wheels. */
export interface OuroborosWell {
  /** Radius of the convex edge that rolls the yielding bike off the tip; the shaft wall's angle (deg,
   *  just past straight down so it falls away from the bike) and its depth below the ring floor. */
  edgeRadius: number; wall: number; shaft: number;
  /** Catcher radius, run-out angle (deg) and the radius of the bend that flattens it onto the corridor. */
  catchRadius: number; runout: number; bendRadius: number;
  /** Corridor floor depth below the ring floor; ramp foot x, ramp angle (deg), rise to the pocket. */
  floor: number; rampFrom: number; rampAngle: number; rise: number;
  /** Pocket length, back-wall bend radius and lip height above the bend; roof height above the pocket,
   *  and how far past the bend the corridor stays open to the shaft before the roof begins. */
  pocketLength: number; backRadius: number; lip: number; headroom: number; open: number;
}
export const OUROBOROS_WELL: OuroborosWell = {
  edgeRadius: .4, wall: -92, shaft: 13.4,
  catchRadius: 3, runout: -12, bendRadius: 6,
  floor: 18.3, rampFrom: 20, rampAngle: 16, rise: 2,
  pocketLength: 4, backRadius: 1.5, lip: 2.2, headroom: 3.3, open: 7,
};

/** Points along an arc about centre (radians), every ~STEP metres, including both ends. */
const arc = (centre: Vec, radius: number, from: number, to: number) => {
  const n = Math.max(1, Math.ceil(Math.abs(to - from) * radius / STEP));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = from + (to - from) * i / n;
    return p(centre.x + radius * Math.cos(t), centre.y + radius * Math.sin(t));
  });
};
/** A straight from a to b is one plank: collinear seams would only add ghost bumps. */
const line = (_a: Vec, b: Vec) => [b];
/** Appends points, dropping a first point that duplicates the current last one. */
const extend = (into: Vec[], points: Vec[]) => {
  for (const q of points) if (into.length === 0 || Math.hypot(q.x - into.at(-1)!.x, q.y - into.at(-1)!.y) > 1e-6) into.push(q);
  return into;
};

export interface OuroborosTrack {
  /** Ridden top-face points from the landing deck's lip round to the kicker tip (counter-clockwise). */
  points: Vec[];
  /** Corner centres: bottom-left, bottom-right, top-right, top-left. */
  corners: [Vec, Vec, Vec, Vec];
  /** The ring floor (y) before the hole, the kicker tip, the deck's lip, the floor after the deck. */
  floorY: number; tip: Vec; lip: Vec; deckY: number;
  /** Top (roof) and bottom (deck floor) of the ring's inside. */
  top: number; bottom: number;
}

export function ouroborosTrackFor(shape: OuroborosShape): OuroborosTrack {
  const R = shape.radius, floorY = -R, k = shape.kick * DEG, d = shape.deckAngle * DEG;
  const kickCentre = p(shape.run, floorY + shape.kickRadius);
  const kickEnd = p(kickCentre.x + shape.kickRadius * Math.sin(k), kickCentre.y - shape.kickRadius * Math.cos(k));
  const tip = p(kickEnd.x + shape.kickLength * Math.cos(k), kickEnd.y + shape.kickLength * Math.sin(k));
  const lip = p(tip.x + shape.gap + shape.nose, floorY - shape.drop);
  const slopeEnd = p(lip.x + shape.deckLength * Math.cos(d), lip.y + shape.deckLength * Math.sin(d));
  const deckCentre = p(slopeEnd.x - shape.deckRadius * Math.sin(d), slopeEnd.y + shape.deckRadius * Math.cos(d));
  const deckY = deckCentre.y - shape.deckRadius, bend = p(deckCentre.x, deckY);
  if (bend.x > shape.width) throw new RangeError('Ouroboros deck runs into the right corner');
  const c0 = p(0, 0), c1 = p(shape.width, deckY + R), c2 = p(shape.width, shape.height), c3 = p(0, shape.height);
  if (!(c2.y > c1.y)) throw new RangeError('Ouroboros ring is too short');
  const points: Vec[] = arc(p(lip.x, lip.y - shape.nose), shape.nose, Math.PI, Math.PI / 2);
  extend(points, line(lip, slopeEnd));
  extend(points, arc(deckCentre, shape.deckRadius, -Math.PI / 2 + d, -Math.PI / 2));
  extend(points, line(bend, p(c1.x, deckY)));
  extend(points, arc(c1, R, -Math.PI / 2, 0));
  extend(points, line(p(c1.x + R, c1.y), p(c2.x + R, c2.y)));
  extend(points, arc(c2, R, 0, Math.PI / 2));
  extend(points, line(p(c2.x, c2.y + R), p(c3.x, c3.y + R)));
  extend(points, arc(c3, R, Math.PI / 2, Math.PI));
  extend(points, line(p(c3.x - R, c3.y), p(c0.x - R, c0.y)));
  extend(points, arc(c0, R, Math.PI, 1.5 * Math.PI));
  extend(points, line(p(0, floorY), p(shape.run, floorY)));
  extend(points, arc(kickCentre, shape.kickRadius, -Math.PI / 2, -Math.PI / 2 + k));
  extend(points, line(kickEnd, tip));
  return { points, corners: [c0, c1, c2, c3], floorY, tip, lip, deckY, top: c2.y + R, bottom: deckY };
}

/** One rideable plank between two top-face points in travel order; the face left of travel is ridden. */
const plank = (id: string, a: Vec, b: Vec, chain?: string, thick = THICK): Surface => {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  return { id, x: (a.x + b.x) / 2 + Math.sin(angle) * thick / 2, y: (a.y + b.y) / 2 - Math.cos(angle) * thick / 2,
    w: Math.hypot(b.x - a.x, b.y - a.y), h: thick, angle, kind: 'ground', ...(chain ? { chain } : {}) };
};
/** Planks through top-face points in travel order, as one seam-free chain. */
const chainOf = (id: string, points: Vec[], thick = THICK) =>
  points.slice(1).map((q, i) => plank(`${id}-${i}`, points[i], q, id, thick));

export interface OuroborosLower {
  /** Ridden top-face points from the kicker tip over the edge, down the shaft wall, round the catcher,
   *  along the corridor, up the ramp and into the pocket (they continue the ring's chain). */
  floor: Vec[]; edgeEnd: Vec; wallEnd: Vec; catchEnd: Vec; corridorY: number; corridorFrom: number; rampFoot: Vec; rampTop: Vec;
  pocketY: number; back: number; door: Vec; roofY: number;
}

function lowerRoute(track: OuroborosTrack, shape: OuroborosShape, well: OuroborosWell): { surfaces: Surface[]; lower: OuroborosLower } {
  const k = shape.kick * DEG, w = well.wall * DEG, a = well.runout * DEG, r = well.edgeRadius, R = well.catchRadius;
  const wallDir = p(Math.cos(w), Math.sin(w)), dir = p(Math.cos(a), Math.sin(a));
  // Convex edge: its centre lies to the right of travel (below the tip).
  const edge = p(track.tip.x + r * Math.sin(k), track.tip.y - r * Math.cos(k));
  const edgeEnd = p(edge.x + r * Math.cos(w + Math.PI / 2), edge.y + r * Math.sin(w + Math.PI / 2));
  // The sheer wall, then the catcher: a concave curve (centre left of travel) turning it onto the run-out.
  const wallEnd = p(edgeEnd.x + wallDir.x * (edgeEnd.y - track.floorY + well.shaft) / -wallDir.y, track.floorY - well.shaft);
  const catcher = p(wallEnd.x - wallDir.y * R, wallEnd.y + wallDir.x * R);
  const catchEnd = p(catcher.x + R * Math.cos(a - Math.PI / 2), catcher.y + R * Math.sin(a - Math.PI / 2));
  const corridorY = track.floorY - well.floor;
  // A wide concave bend flattens the run-out onto the corridor: its centre sits bendRadius above the floor.
  const centreY = corridorY + well.bendRadius, normal = p(-dir.y, dir.x);
  const along = (centreY - well.bendRadius * normal.y - catchEnd.y) / dir.y;
  if (!(along > 0)) throw new RangeError('Ouroboros run-out is too short');
  const bendStart = p(catchEnd.x + dir.x * along, catchEnd.y + dir.y * along);
  const bend = p(bendStart.x + normal.x * well.bendRadius, centreY);
  const rampFoot = p(well.rampFrom, corridorY);
  if (!(rampFoot.x > bend.x)) throw new RangeError('Ouroboros ramp starts inside the bend');
  const pocketY = corridorY + well.rise, rampTop = p(rampFoot.x + well.rise / Math.tan(well.rampAngle * DEG), pocketY);
  const backCentre = p(rampTop.x + well.pocketLength, pocketY + well.backRadius);
  const back = backCentre.x + well.backRadius;
  const floor: Vec[] = [track.tip];
  extend(floor, arc(edge, r, k + Math.PI / 2, w + Math.PI / 2));
  extend(floor, line(edgeEnd, wallEnd));
  extend(floor, arc(catcher, R, w - Math.PI / 2, a - Math.PI / 2));
  extend(floor, line(catchEnd, bendStart));
  extend(floor, arc(bend, well.bendRadius, a - Math.PI / 2, -Math.PI / 2));
  extend(floor, line(p(bend.x, corridorY), rampFoot));
  extend(floor, line(rampFoot, rampTop));
  extend(floor, line(rampTop, p(backCentre.x, pocketY)));
  extend(floor, arc(backCentre, well.backRadius, -Math.PI / 2, 0));
  extend(floor, line(p(back, backCentre.y), p(back, backCentre.y + well.lip)));
  const roofY = pocketY + well.headroom;
  // The corridor roof covers the ramp and the pocket, ending well short of the open sky the bike
  // falls through (and of the ring's outer wall).
  const [, c1] = track.corners, outer = shape.radius + THICK;
  const roofFrom = Math.max(bend.x + well.open, c1.x + Math.sqrt(Math.max(0, outer ** 2 - (roofY + .5 - c1.y) ** 2)));
  const surfaces: Surface[] = [
    { id: 'ouroboros-corridor-roof', x: (roofFrom + back + 1) / 2, y: roofY + .25, w: back + 1 - roofFrom, h: .5, kind: 'ground' },
  ];
  return { surfaces, lower: { floor, edgeEnd, wallEnd, catchEnd, corridorY, corridorFrom: bend.x, rampFoot, rampTop, pocketY, back,
    door: p(rampTop.x + well.pocketLength * .5, pocketY + .9), roofY } };
}

export function buildOuroboros(shape: OuroborosShape = OUROBOROS_SHAPE, well: OuroborosWell = OUROBOROS_WELL,
  apples: Apple[] = [], routeHints: RouteHint[] = []): { level: Level; track: OuroborosTrack; lower: OuroborosLower } {
  const track = ouroborosTrackFor(shape);
  const { surfaces: below, lower } = lowerRoute(track, shape, well);
  const right = track.corners[1].x + shape.radius;
  const level: Level = {
    id: 'newtons-ouroboros', name: 'Newton’s Ouroboros', subtitle: 'Only a fall breaks the circle', difficulty: 7.5, accent: '#7e90d6',
    mechanic: 'Turn the world all the way round a loop that swallows its own tail. Carry speed over the hole and the loop takes you round again; brake, and let yourself fall through to the way out.',
    hint: 'Turn steadily with the loop to gather both apples. Then brake before the hole, tip over the edge and let gravity take you down.',
    spawn: p(track.lip.x + .8, track.deckY + .78), initialAngle: 0,
    bounds: { min: p(-shape.radius - 4, lower.corridorY - 4), max: p(Math.max(right, lower.back) + 4, track.top + 4) },
    surfaces: [...chainOf('ouroboros-way', [...track.points, ...lower.floor.slice(1)]), ...below], apples, exit: lower.door, routeHints,
  };
  return { level, track, lower };
}

const track0 = ouroborosTrackFor(OUROBOROS_SHAPE);
/** One apple at the very top of the loop and one at its very bottom (a full revolution is
 *  unavoidable), then one in the corridor below and one over the slanted ramp. */
export const OUROBOROS_APPLES: Apple[] = [
  { id: 'ouroboros-top', x: OUROBOROS_SHAPE.width / 2, y: track0.top - .85 },
  { id: 'ouroboros-bottom', x: OUROBOROS_SHAPE.width + 1.4, y: track0.bottom + 1 },
  { id: 'ouroboros-corridor', x: 0, y: 0 },
  { id: 'ouroboros-ramp', x: 0, y: 0 },
];
export const OUROBOROS_HINTS: RouteHint[] = [
  { x: track0.lip.x + 1.6, y: track0.deckY + 2.6, angle: 0, label: 'ROUND' },
  { x: 0, y: 0, angle: 0, label: 'HOME' },
];
const built = buildOuroboros(OUROBOROS_SHAPE, OUROBOROS_WELL, OUROBOROS_APPLES, OUROBOROS_HINTS);
{
  const { lower } = built;
  Object.assign(OUROBOROS_APPLES[2], p((lower.corridorFrom + lower.rampFoot.x) / 2, lower.corridorY + .8));
  Object.assign(OUROBOROS_APPLES[3], p((lower.rampFoot.x + lower.rampTop.x) / 2, (lower.rampFoot.y + lower.rampTop.y) / 2 + .9));
  Object.assign(OUROBOROS_HINTS[1], p(OUROBOROS_APPLES[2].x - 2.5, lower.corridorY + 2.2));
}
export const ouroborosTrack = built.track;
export const ouroborosLower = built.lower;
export const ouroborosLevel: Level = built.level;

export interface OuroborosPilotTuning {
  /** Riding speed held round the loop, m/s, and the lean limit (rad). */
  speed: number; lean: number;
  /** Once both loop apples are in, start yielding this much heading (rad) before the loop's end. */
  yieldFrom: number;
  /** Speed (m/s) to creep at while yielding, and how far (rad) to tip the world forward over the kicker. */
  creep: number; nudge: number;
  /** Below the hole: corridor cruising speed. */
  corridor: number;
  /** Lean (rad) of the world past upright held along the floor and over the hole when not yielding. */
  hole: number;
}
export const OUROBOROS_PILOT: OuroborosPilotTuning = { speed: 5.5, lean: .3, yieldFrom: 1, creep: .6, nudge: .1, corridor: 3.5, hole: 1 };

/**
 * Observation-only pilot. Rides the loop by keeping gravity just ahead of the bike's heading and
 * holds the world upright over the hole. With `escape` it yields once both loop apples are in:
 * brakes down the last corner, tips over the kicker, falls down the shaft with the world held upright
 * and rides from the landing to the door.
 * Without it, it carries its speed over the hole every lap and orbits forever.
 */
export function ouroborosPilotFor(track: OuroborosTrack, lower: OuroborosLower, tuning: OuroborosPilotTuning,
  escape = true): (state: Snapshot) => Controls {
  let previous: Vec | undefined, lastTime = 0, angle = 0, lastRaw = 0, vy = 0, along = 0;
  let phase: 'loop' | 'yield' | 'fall' = 'loop', home = 0;
  return state => {
    const raw = state.bodies.find(body => body.id === 'frame')!.angle;
    angle += Math.atan2(Math.sin(raw - lastRaw), Math.cos(raw - lastRaw)); lastRaw = raw;
    const dt = state.elapsed - lastTime;
    if (previous && dt > 0) {
      vy = (state.bike.y - previous.y) / dt;
      along = ((state.bike.x - previous.x) * Math.cos(angle) + (state.bike.y - previous.y) * Math.sin(angle)) / dt;
    }
    previous = state.bike; lastTime = state.elapsed;
    const has = (id: string) => state.collected.includes(id);
    const { x, y } = state.bike;
    // The loop ends upright: the world's next whole turn.
    const upright = Math.round(state.worldAngle / TAU) * TAU;
    const nextUpright = Math.ceil(angle / TAU - .02) * TAU;
    // From the floor over the hole and up the landing corner, the world never leans back past `hole`.
    const overHole = x > -1 && (y < track.floorY + 1.6 || (x > track.lip.x && y < track.corners[1].y)) && Math.abs(state.worldAngle - upright) < 1.6;
    if (escape && phase === 'loop' && has('ouroboros-top') && has('ouroboros-bottom') && angle > nextUpright - tuning.yieldFrom &&
      x < 0 && y < track.floorY + 4) { phase = 'yield'; home = nextUpright; }
    if (phase === 'yield' && (y < track.floorY - .3 || x > track.tip.x + .3)) phase = 'fall';
    let target: number, brake = false;
    if (phase === 'loop') {
      const lean = clamp((tuning.speed - along) * .22, -tuning.lean, tuning.lean);
      // Along the floor keep turning: the world runs ahead, so gravity throws the bike across the hole.
      target = overHole ? Math.max(angle + lean, upright + tuning.hole) : angle + lean;
    } else if (phase === 'yield') {
      // Right the world as the bike comes down the last corner and shed speed; on the kicker, tip the
      // world forward so the bike creeps up and over its edge. Never brake once the front is over the hole.
      const floor = x > -1 && y < track.floorY + 1.5;
      target = floor ? home + clamp(tuning.nudge + (tuning.creep - along) * .5, 0, .45) : Math.min(angle + .15, home);
      brake = along > (x < track.tip.x - 2.5 ? 2 : tuning.creep + .3) && x < track.tip.x - .3;
    } else {
      // Hold the world upright through the free fall and the catch. Once down on the corridor, lean
      // the world by the ground's own slope (never by the bike's pitch, which would only feed a
      // wheelie after the hard landing) plus a little for speed; brake in the pocket.
      const pocket = x > lower.door.x - .6, down = x > lower.corridorFrom && Math.abs(vy) < 3 &&
        (y < lower.corridorY + 1.6 || x > lower.rampFoot.x - .5);
      const ramp = x > lower.rampFoot.x - .5 && x < lower.rampTop.x
        ? Math.atan2(lower.rampTop.y - lower.rampFoot.y, lower.rampTop.x - lower.rampFoot.x) : 0;
      target = pocket || !down ? home : home + ramp + clamp((tuning.corridor - along) * .3, -.35, .35);
      brake = pocket || (down && along > tuning.corridor + 3);
    }
    return { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake };
  };
}

/** Replay pilot for the campaign map: one full round, then yield into the hole and ride home. */
export function createOuroborosPilot(): (state: Snapshot) => Controls {
  return ouroborosPilotFor(ouroborosTrack, ouroborosLower, OUROBOROS_PILOT);
}
