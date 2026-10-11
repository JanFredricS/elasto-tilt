import type { Apple, Controls, Level, RouteHint, Snapshot, Surface, Vec } from '../types';

const p = (x: number, y: number): Vec => ({ x, y });
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const DEG = Math.PI / 180;
const THICK = .5;
const TAU = 2 * Math.PI;
const STEP = .3;

/**
 * Kepler's Orbit: one closed, egg-shaped loop ridden on its inside, a sibling of Newton's Ouroboros
 * turned upside down. Its broad end is on top: two 5.5 m corners and a long roof, broken near the apex
 * by a hole into a small alcove that holds the door. Its tight end is at the bottom: one 3 m arc whose
 * foot is cut off by a straight brass spring pad, where the ride starts. The arc meets the pad at 25°
 * either side, so a rider diving fast into the tight end strikes the pad and is thrown up (the pad
 * returns .9 of the speed into it; plain stone there would swallow it), while a rider rolling slowly
 * just rocks through the shallow V.
 *
 * The shape is built the right way up for the Ouroboros (hole in the floor, tight end on top) and
 * then turned half a revolution about the origin, so travel stays counter-clockwise and the world
 * angle keeps rising lap after lap. Every piece is an exact arc or straight, so the ring closes by
 * construction.
 */
export interface KeplerShape {
  /** Broad end: corner radius and the straight between the corner centres (the roof). */
  broad: number; width: number;
  /** Tight end: radius and height of its centre above the broad corners' centres. The pad is a
   *  straight chord across its foot that meets the arc at `chord` degrees either side. */
  tight: number; height: number; chord: number;
  /** Roof run after the last broad corner, then a concave kicker (deg, radius) ending at the hole's near tip. */
  run: number; kick: number; kickRadius: number;
  /** Hole from the kicker tip to the far lip, which sits `drop` further out; the lip's bull-nose radius. */
  gap: number; drop: number; nose: number;
  /** Alcove beyond the hole: depth past the roof, the rounded edge at the tip and the alcove's corner radius. */
  depth: number; edge: number; corner: number;
}
export const KEPLER_SHAPE: KeplerShape = {
  broad: 5.5, width: 10.2,
  tight: 3, height: 10, chord: 25,
  run: 4.5, kick: 10, kickRadius: 3,
  gap: 3.3, drop: .3, nose: .5,
  depth: 3, edge: .4, corner: .8,
};

/** Points along an arc about centre (radians), every ~STEP metres, including both ends. */
const arc = (centre: Vec, radius: number, from: number, to: number) => {
  const n = Math.max(1, Math.ceil(Math.abs(to - from) * radius / STEP));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = from + (to - from) * i / n;
    return p(centre.x + radius * Math.cos(t), centre.y + radius * Math.sin(t));
  });
};
/** Appends points, dropping a first point that duplicates the current last one. */
const extend = (into: Vec[], points: Vec[]) => {
  for (const q of points) if (into.length === 0 || Math.hypot(q.x - into.at(-1)!.x, q.y - into.at(-1)!.y) > 1e-6) into.push(q);
  return into;
};
/** Angle of the shared outward normal where a loop ridden counter-clockwise on its inside leaves
 *  circle a (radius ra) along a straight for circle b (radius rb). */
const tangent = (a: Vec, ra: number, b: Vec, rb: number) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  return Math.atan2(dy, dx) - Math.acos((ra - rb) / Math.hypot(dx, dy));
};
/** An angle moved by whole turns into [from, from + 2π). */
const after = (angle: number, from: number) => from + ((angle - from) % TAU + TAU) % TAU;
const on = (c: Vec, r: number, t: number) => p(c.x + r * Math.cos(t), c.y + r * Math.sin(t));
/** Half a turn about the origin: built tight end up, played tight end down. */
const turn = (q: Vec) => p(-q.x, -q.y);

export interface KeplerTrack {
  /** Ridden top-face points (map space, counter-clockwise) from the alcove's far wall over the far
   *  lip's nose, round the loop and over the kicker tip, round the alcove back to its far wall. */
  points: Vec[];
  /** Map-space centres: broad top-right and top-left corners, and the tight end. */
  broadRight: Vec; broadLeft: Vec; tight: Vec;
  /** Roof (y) of the run before the hole, the kicker tip and the far lip (top of its nose). */
  roofY: number; tip: Vec; lip: Vec;
  /** The pad's ridden face (left and right ends) and the loop's inside bottom. */
  padFrom: Vec; padTo: Vec; bottom: number;
  /** The alcove's inside: x span between its walls and its far face (y), and the door. */
  alcove: { left: number; right: number; top: number }; door: Vec;
}

export function keplerTrackFor(shape: KeplerShape): KeplerTrack {
  const R = shape.broad, r = shape.tight, floorY = -R, k = shape.kick * DEG;
  // Built Ouroboros-style: hole in the floor, travel to the right along it.
  const kickCentre = p(shape.run, floorY + shape.kickRadius);
  const tip = p(kickCentre.x + shape.kickRadius * Math.sin(k), kickCentre.y - shape.kickRadius * Math.cos(k));
  const lip = p(tip.x + shape.gap + shape.nose, floorY - shape.drop);
  const c0 = p(0, 0), c1 = p(shape.width, lip.y + R);
  const mid = shape.width / 2;
  const c2 = p(mid, shape.height), c3 = c2, b = shape.chord * DEG;
  const t12 = tangent(c1, R, c2, r), t30 = after(tangent(c3, r, c0, R), Math.PI / 2);
  if (!(t12 < Math.PI / 2 - b && t30 > Math.PI / 2 + b)) throw new RangeError('Kepler pad is wider than the tight end');
  const local: Vec[] = [];
  // The alcove's far wall rises to the nose; the ring then runs from the nose round to the kicker tip.
  const noseCentre = p(lip.x, lip.y - shape.nose), wallX = lip.x - shape.nose;
  const bottomY = floorY - shape.depth, edge = p(tip.x + shape.edge * Math.sin(k), tip.y - shape.edge * Math.cos(k));
  const nearX = edge.x + shape.edge, cr = shape.corner;
  extend(local, arc(noseCentre, shape.nose, Math.PI, Math.PI / 2));
  extend(local, [p(c1.x, lip.y)]);
  extend(local, arc(c1, R, -Math.PI / 2, t12));
  extend(local, arc(c2, r, t12, Math.PI / 2 - b));
  extend(local, arc(c3, r, Math.PI / 2 + b, t30));
  extend(local, arc(c0, R, t30, 1.5 * Math.PI));
  extend(local, [p(shape.run, floorY)]);
  extend(local, arc(kickCentre, shape.kickRadius, -Math.PI / 2, -Math.PI / 2 + k));
  // Round the tip's edge into the alcove's near wall, across its far face and up its far wall.
  extend(local, arc(edge, shape.edge, k + Math.PI / 2, 0));
  extend(local, arc(p(nearX + cr, bottomY + cr), cr, Math.PI, 1.5 * Math.PI));
  extend(local, arc(p(wallX - cr, bottomY + cr), cr, 1.5 * Math.PI, 2 * Math.PI));
  extend(local, [p(wallX, noseCentre.y)]);
  const padFrom = turn(on(c2, r, Math.PI / 2 - b)), padTo = turn(on(c2, r, Math.PI / 2 + b));
  return {
    points: local.map(turn),
    broadRight: turn(c0), broadLeft: turn(c1), tight: turn(c2),
    roofY: -floorY, tip: turn(tip), lip: turn(lip), padFrom, padTo, bottom: padFrom.y,
    alcove: { left: -wallX, right: -nearX, top: -bottomY },
    door: p(-(nearX + wallX) / 2, -bottomY - 1.1),
  };
}

/** One rideable plank between two top-face points in travel order; the face left of travel is ridden. */
const plank = (id: string, a: Vec, b: Vec, chain?: string, thick = THICK, kind: Surface['kind'] = 'ground'): Surface => {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  return { id, x: (a.x + b.x) / 2 + Math.sin(angle) * thick / 2, y: (a.y + b.y) / 2 - Math.cos(angle) * thick / 2,
    w: Math.hypot(b.x - a.x, b.y - a.y), h: thick, angle, kind, ...(chain ? { chain } : {}) };
};
/** Planks through top-face points in travel order, as one seam-free chain. */
const chainOf = (id: string, points: Vec[], thick = THICK) =>
  points.slice(1).map((q, i) => plank(`${id}-${i}`, points[i], q, id, thick));

export function buildKepler(shape: KeplerShape = KEPLER_SHAPE, apples: Apple[] = [], routeHints: RouteHint[] = [],
  pad = true): { level: Level; track: KeplerTrack } {
  const track = keplerTrackFor(shape);
  const xs = track.points.map(q => q.x), ys = track.points.map(q => q.y);
  const level: Level = {
    id: 'keplers-orbit', name: 'Kepler’s Orbit', subtitle: 'Equal areas in equal times', difficulty: 6.75, accent: '#c98fae',
    mechanic: 'Turn the world round an egg-shaped loop: fast through its tight end, slow under its broad roof. A brass pad at the bottom throws you on; a hole in the roof is the way out.',
    hint: 'Keep turning to ride round: turning on past upside-down flies you over the hole in the roof, and a fast dive onto the brass pad throws you up to the low apple. With both in, stop turning on the roof, brake, and fall up through the hole to the door.',
    spawn: p((track.padFrom.x + track.padTo.x) / 2, track.bottom + .72), initialAngle: 0,
    bounds: { min: p(Math.min(...xs) - 3, Math.min(...ys) - 3), max: p(Math.max(...xs) + 3, Math.max(...ys) + 3) },
    surfaces: [
      ...chainOf('kepler-orbit', track.points),
      // The brass pad lies over the chain's flat at the foot of the tight end, face flush with it.
      ...(pad ? [plank('kepler-pad', track.padFrom, track.padTo, undefined, THICK, 'spring')] : []),
    ],
    apples, exit: track.door, routeHints,
  };
  return { level, track };
}

const track0 = keplerTrackFor(KEPLER_SHAPE);
/** Perihelion: over the middle of the pad, higher than any rolling rider reaches, so only the pad's
 *  throw of a fast dive into the tight end collects it. Roof: on the run before the hole, taken on
 *  every lap. Aphelion: just inside the hole's mouth, out of reach of a rider thrown across it, so
 *  only a rider who falls up through the hole collects it, on the way to the door. Riders cross the
 *  hole only while the world is turned well past roof-upright (the pilot holds 1 rad); anyone who
 *  stops turning on the roof falls in, and without both loop apples crashes in the alcove. */
export const KEPLER_APPLES: Apple[] = [
  { id: 'kepler-perihelion', x: (track0.padFrom.x + track0.padTo.x) / 2, y: track0.bottom + 2.4 },
  { id: 'kepler-roof', x: track0.broadRight.x - 2.2, y: track0.roofY - 1 },
  { id: 'kepler-aphelion', x: (track0.alcove.left + track0.alcove.right) / 2, y: track0.roofY + .8 },
];
export const KEPLER_HINTS: RouteHint[] = [
  { x: track0.padTo.x + 1.2, y: track0.bottom + 2.4, angle: Math.PI / 4, label: 'ROUND', spin: 1 },
  // Under the hole, pointing up through it to the door.
  { x: track0.door.x, y: track0.roofY - 2.2, angle: Math.PI / 2, label: 'OUT' },
];
const built = buildKepler(KEPLER_SHAPE, KEPLER_APPLES, KEPLER_HINTS);
export const keplerTrack = built.track;
export const keplersOrbitLevel: Level = built.level;

export interface KeplerPilotTuning {
  /** Riding speed held round the loop, m/s, and the lean limit (rad). */
  speed: number; lean: number;
  /** Lean (rad) of the world past roof-upright held along the roof and over the hole when not yielding. */
  hole: number;
  /** Speed to creep at while yielding, the forward tip over the kicker, and how far (rad) before roof-upright to start. */
  creep: number; nudge: number; yieldFrom: number;
}
export const KEPLER_PILOT: KeplerPilotTuning = { speed: 5.5, lean: .3, hole: 1, creep: .6, nudge: .1, yieldFrom: 1 };

/**
 * Observation-only pilot (the Ouroboros pilot, half a turn round). Rides the loop by keeping gravity
 * just ahead of the bike's heading, so it dives into the tight end fast enough for the pad to throw
 * it up through the perihelion apple, and along the roof holds the world well past roof-upright so
 * the bike is thrown over the hole. With `escape` it yields once the perihelion and roof apples are
 * in: rights the world down the last broad corner, brakes on the roof, creeps over the kicker and
 * falls up through the hole, past the aphelion apple, into the door.
 * Without it, it carries its speed over the hole every lap and orbits forever.
 */
export function keplerPilotFor(track: KeplerTrack, tuning: KeplerPilotTuning, escape = true): (state: Snapshot) => Controls {
  let previous: Vec | undefined, lastTime = 0, angle = 0, lastRaw = 0, along = 0;
  let phase: 'loop' | 'yield' | 'fall' = 'loop', home = 0;
  return state => {
    const raw = state.bodies.find(body => body.id === 'frame')!.angle;
    angle += Math.atan2(Math.sin(raw - lastRaw), Math.cos(raw - lastRaw)); lastRaw = raw;
    const dt = state.elapsed - lastTime;
    if (previous && dt > 0)
      along = ((state.bike.x - previous.x) * Math.cos(angle) + (state.bike.y - previous.y) * Math.sin(angle)) / dt;
    previous = state.bike; lastTime = state.elapsed;
    const { x, y } = state.bike;
    // Riding the roof the bike is upside down: the world's roof-upright is half a turn past a whole one.
    const upright = Math.round((state.worldAngle - Math.PI) / TAU) * TAU + Math.PI;
    const nextUpright = Math.ceil((angle - Math.PI) / TAU - .02) * TAU + Math.PI;
    const roof = x < track.broadRight.x + 1 && y > track.roofY - 1.6 && Math.abs(state.worldAngle - upright) < 1.6;
    // Every apple but the one in the hole's mouth: time to yield.
    const ready = state.collected.includes('kepler-perihelion') && state.collected.includes('kepler-roof');
    if (escape && phase === 'loop' && ready && angle > nextUpright - tuning.yieldFrom && x > track.broadRight.x && y > track.roofY - 4) {
      phase = 'yield'; home = nextUpright;
    }
    if (phase === 'yield' && (y > track.roofY + .3 || x < track.tip.x - .3)) phase = 'fall';
    let target: number, brake = false;
    if (phase === 'loop') {
      const lean = clamp((tuning.speed - along) * .22, -tuning.lean, tuning.lean);
      target = roof ? Math.max(angle + lean, upright + tuning.hole) : angle + lean;
    } else if (phase === 'yield') {
      const onRoof = x < track.broadRight.x + 1 && y > track.roofY - 1.5;
      target = onRoof ? home + clamp(tuning.nudge + (tuning.creep - along) * .5, 0, .45) : Math.min(angle + .15, home);
      brake = along > (x > track.tip.x + 2.5 ? 2 : tuning.creep + .3) && x > track.tip.x + .3;
    } else target = home; // hold roof-upright: the bike falls up into the alcove
    return { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake };
  };
}

/** Replay pilot for the campaign map. */
export function createKeplerPilot(): (state: Snapshot) => Controls {
  return keplerPilotFor(keplerTrack, KEPLER_PILOT);
}
