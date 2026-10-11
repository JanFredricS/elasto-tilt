import type { Apple, Controls, Level, Snapshot, Surface, Vec } from '../types';

const p = (x: number, y: number): Vec => ({ x, y });
const g = (id: string, x: number, y: number, w: number, h = .6): Surface => ({ id, x, y, w, h, kind: 'ground' });
const a = (id: string, x: number, y: number): Apple => ({ id, x, y });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** A block whose top face is at `top`, spanning x0..x1 and reaching down to `bottom`. */
const block = (id: string, x0: number, x1: number, top: number, bottom: number): Surface =>
  g(id, (x0 + x1) / 2, (top + bottom) / 2, x1 - x0, top - bottom);
/** A pad whose ridden face runs from `from` to `to`, facing the left of travel. */
const pad = (id: string, from: Vec, to: Vec, h = .5): Surface => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  return { id, kind: 'spring', angle, w: Math.hypot(to.x - from.x, to.y - from.y), h,
    x: (from.x + to.x) / 2 + Math.sin(angle) * h / 2, y: (from.y + to.y) / 2 - Math.cos(angle) * h / 2 };
};
/** A ground slab whose ridden face runs from `from` to `to`. */
const slab = (id: string, from: Vec, to: Vec, h = .6): Surface => ({ ...pad(id, from, to, h), kind: 'ground' });
/** An arc of chained slabs turning the ridden heading from h0 to h1 (radians) on `radius`. */
const arc = (id: string, from: Vec, h0: number, h1: number, radius: number, pieces = 6): { surfaces: Surface[]; end: Vec } => {
  const step = (h1 - h0) / pieces, chord = 2 * radius * Math.sin(Math.abs(step) / 2);
  let at = from;
  const surfaces = Array.from({ length: pieces }, (_, i) => {
    const heading = h0 + (i + .5) * step, to = p(at.x + chord * Math.cos(heading), at.y + chord * Math.sin(heading));
    const piece = { ...slab(`${id}-${i}`, at, to), chain: id };
    at = to; return piece;
  });
  return { surfaces, end: at };
};

/**
 * Bernoulli's Updraft. A chimney climbed with gravity turned upside down.
 * The rider loops onto the underside of a rising lintel and is carried into
 * the chimney upside down; from there the "updraft" is the world itself,
 * held near straight up (gravity = g·(sin a, −cos a), a ≈ π) and swung to
 * lean toward the wall the rider is flying at. Brass pads line both walls
 * and throw the rider back across, higher each time; at the top it lands
 * wheels-first on the roof and rides it back over the start, round a
 * quarter-pipe and down the far wall to the door.
 *
 *   - Plateau top 2, a short chute to the floor (y 0) under the left wall
 *     and across the chimney foot to a loop (radius 2.5, from x 16) that
 *     turns the ride 160° onto the underside of a 9 m lintel rising 20°
 *     back over the floor. The lintel's top end is the foot of the
 *     chimney's right wall (x ≈ 8.4, y ≈ 7.9): the chimney is ≈ 8.4 m wide
 *     at the pads' faces, ≈ 6.3 m between the rider's wheel-contact lines.
 *   - Following the bike round the loop with the world (a lead of 1.5 rad
 *     or more) brings gravity nearly along the lintel by its end, so the
 *     rider leaves it with no pitch spin. Leading by 1.25 rad or less, it
 *     leaves with gravity across the surface, the square end pivots the
 *     bike and the head meets the first wall.
 *   - Left pad x 0 (y 2.6 … 22), right pad on the column above the lintel
 *     (y 8.5 … 27). The roof (underside y 30) runs from the right wall to a
 *     quarter-pipe at x −13 that turns down into the far wall.
 *   - Each pad throws the rider back at .9 of its normal speed: the left pad
 *     at y ≈ 10.5, the right at y ≈ 16, then the roof near x −1. The pilot
 *     asks for ±.55 rad either side of π; at .95 rad/s the world actually
 *     swings ≈ .7 rad (40°) between the walls, from the lintel's ≈ π + 1.1
 *     back to just past π. A full quarter turn per flight, each wall the floor in turn,
 *     would need half a turn through straight up for every crossing, which
 *     at .95 rad/s throws a rider ≈ 20 m/s faster each time: far more than
 *     a 30 m chimney can hold.
 */
const DEG = Math.PI / 180;
const LOOP_R = 2.5, LOOP_X = 16, LINTEL_TILT = 20 * DEG, LINTEL = 9;
const ROOF = 30, LEFT_TOP = 22, FAR = -13, CORNER_R = 2.5;
const loop = arc('bernoulli-loop', p(LOOP_X, 0), 0, Math.PI - LINTEL_TILT, LOOP_R, 10);
const lintelTop = p(loop.end.x - LINTEL * Math.cos(LINTEL_TILT), loop.end.y + LINTEL * Math.sin(LINTEL_TILT));
const corner = arc('bernoulli-roof', p(FAR + CORNER_R, ROOF), Math.PI, 3 * Math.PI / 2, CORNER_R, 6);
const wallX = LOOP_X + LOOP_R;
export const BERNOULLI = {
  loopX: LOOP_X, loopR: LOOP_R, lintelTilt: LINTEL_TILT, lintelTop, roof: ROOF, leftTop: LEFT_TOP, far: FAR, cornerR: CORNER_R,
  /** Chimney walls: the left pad's face (x 0) and the right pad's face (the lintel's top end). */
  left: 0, right: lintelTop.x,
  pads: { left: [p(0, LEFT_TOP), p(0, 2.6)] as const, right: [p(lintelTop.x, lintelTop.y + .6), p(lintelTop.x, ROOF - 3)] as const },
  door: p(FAR + .9, LEFT_TOP - 2),
};
const B = BERNOULLI;

export const bernoulliUpdraftLevel: Level = {
  id: 'bernoullis-updraft', name: 'Bernoulli’s Updraft', subtitle: 'Where the flow quickens, it lifts',
  mechanic: 'Turn the world upside down and the chimney becomes a well to fall up. Brass pads on both walls throw you across.',
  hint: 'Follow the bike round the loop with the world so gravity runs along the lintel as you leave it. In the chimney keep gravity up, leaning it toward the wall you are flying at.',
  spawn: p(-6, 2.72), initialAngle: 0,
  bounds: { min: p(FAR - 1, -3), max: p(wallX + 1.5, ROOF + 2) },
  camera: { zoom: .85 },
  surfaces: [
    block('bernoulli-plateau', FAR, -4, 2, -1),
    { ...slab('bernoulli-chute', p(-4, 2), p(-1, 0)), chain: 'bernoulli-way' },
    { ...slab('bernoulli-floor', p(-1, 0), p(LOOP_X, 0)), chain: 'bernoulli-way' },
    ...loop.surfaces.map(s => ({ ...s, chain: 'bernoulli-way' })),
    { ...slab('bernoulli-lintel', loop.end, lintelTop), chain: 'bernoulli-way' },
    block('bernoulli-outer-wall', wallX, wallX + .6, ROOF, -1),
    block('bernoulli-column', lintelTop.x, wallX, ROOF, lintelTop.y + .6),
    pad('bernoulli-pad-left', ...B.pads.left),
    pad('bernoulli-pad-right', ...B.pads.right),
    // The start room's ceiling is the gallery's lower side.
    block('bernoulli-gallery-shelf', FAR + 3, -.5, LEFT_TOP, LEFT_TOP - .6),
    { ...slab('bernoulli-roof-run', p(wallX, ROOF), p(FAR + CORNER_R, ROOF)), chain: 'bernoulli-roof' },
    ...corner.surfaces,
    { ...slab('bernoulli-far-wall', corner.end, p(FAR, 2)), chain: 'bernoulli-roof' },
  ],
  apples: [
    a('bernoulli-start', 6, .9),
    a('bernoulli-core-1', 4.5, 8.7),
    a('bernoulli-core-2', 4.7, 13.3),
    a('bernoulli-core-3', 4.8, 19.4),
    a('bernoulli-gallery', -6, 29.3),
  ],
  routeHints: [
    { x: LOOP_X - 3, y: 2.5, angle: 0, label: 'FOLLOW', spin: 1 },
    { x: 5, y: 5, angle: Math.PI, label: 'UP' },
    { x: -3, y: ROOF - 2, angle: Math.PI, label: 'ROOF' },
    { x: FAR + 2.5, y: ROOF - 5, angle: 3 * Math.PI / 2, label: 'DOWN', spin: 1 },
  ],
  exit: B.door, difficulty: 12.75, accent: '#7fc4a8',
};

/**
 * Observation-only demonstration. On the floor it holds `cruise`. Round the
 * loop and up the lintel it leads the bike's own (unwrapped) pitch by `lead`
 * with the world, stopping where gravity runs along the lintel. In the
 * chimney it swings gravity `sway` rad either side of straight up toward
 * the wall it is flying at; above `roofAt` it holds gravity up and leaned
 * toward the far wall, and round the quarter-pipe turns it down that wall.
 */
export function createBernoulliPilot({ lead = 1.5, sway = .55, cruise = 3, roofAt = 21, roofLean = .35 } = {}):
  (state: Snapshot) => Controls {
  let previous: Vec | undefined, pitch = 0, lastRaw = 0, phase = 0, side = -1;
  return state => {
    const raw = state.bodies.find(body => body.kind === 'frame')?.angle ?? 0;
    pitch += Math.atan2(Math.sin(raw - lastRaw), Math.cos(raw - lastRaw)); lastRaw = raw;
    const vx = previous ? (state.bike.x - previous.x) * 120 : 0, vy = previous ? (state.bike.y - previous.y) * 120 : 0;
    previous = state.bike;
    const { x, y } = state.bike, speed = vx * Math.cos(pitch) + vy * Math.sin(pitch);
    let target = pitch + clamp((cruise - speed) * .22, -.4, .4);
    if (phase === 0 && x > B.loopX - .5) phase = 1;
    if (phase === 1 && x < B.right - .3 && pitch > 2.5) phase = 2;
    if (phase === 2 && y > roofAt) phase = 3;
    if (phase === 3 && x < B.far + B.cornerR + 1) phase = 4;
    if (phase === 1) target = Math.min(pitch + lead, 3 * Math.PI / 2 - B.lintelTilt);
    if (phase === 2) { if (vx > 1) side = 1; if (vx < -1) side = -1; target = Math.PI - side * sway; }
    if (phase === 3) target = Math.PI + roofLean;
    if (phase === 4) target = 3 * Math.PI / 2;
    return { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake: false };
  };
}
