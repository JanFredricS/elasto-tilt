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
/** An arc of chained slabs turning the ridden heading from h0 to h1 (radians) on `radius`;
 * `thick` gives each piece's depth behind its face (default .6). */
const arc = (id: string, from: Vec, h0: number, h1: number, radius: number, pieces = 6,
  thick: (heading: number, at: Vec, to: Vec) => number = () => .6): { surfaces: Surface[]; end: Vec } => {
  const step = (h1 - h0) / pieces, chord = 2 * radius * Math.sin(Math.abs(step) / 2);
  let at = from;
  const surfaces = Array.from({ length: pieces }, (_, i) => {
    const heading = h0 + (i + .5) * step, to = p(at.x + chord * Math.cos(heading), at.y + chord * Math.sin(heading));
    const piece = { ...slab(`${id}-${i}`, at, to, thick(heading, at, to)), chain: id };
    at = to; return piece;
  });
  return { surfaces, end: at };
};

/**
 * Bernoulli's Updraft. A chimney climbed with gravity turned upside down.
 * The rider loops onto the underside of a rising lintel and is carried into
 * the chimney upside down; from there the "updraft" is the world itself,
 * held near straight up (gravity = g·(sin a, −cos a), a ≈ π). Brass pads
 * line both walls and throw the rider back across, higher each time; at the
 * top it meets a sloping hood at a glancing angle, rides it onto the roof
 * and back over the start, round a quarter-pipe and down the far wall to the
 * door.
 *
 *   - Plateau top 2, a short chute to the floor (y 0) under the left wall
 *     and across the chimney foot to a loop (radius 2.5, from x 16) that
 *     turns the ride 160° onto the underside of a 9 m lintel rising 20°
 *     back over the floor. The lintel's top end is the foot of the
 *     chimney's right wall (x ≈ 8.4, y ≈ 7.9): the chimney is ≈ 8.4 m wide
 *     at the pads' faces, ≈ 6.3 m between the rider's wheel-contact lines.
 *   - The rider crawls round the loop and up the lintel only as fast as the
 *     world turns, so the world must keep turning (≈ 4.5 s at .95 rad/s)
 *     until the lintel throws the rider off. Held to a ≥ 4.2 rad (gravity
 *     within ≈ 10° of along the lintel, 3π/2 − 20° ≈ 4.36) the rider leaves
 *     it cleanly; stopped at ≤ 4.05 gravity still presses it into the
 *     lintel, the square end pivots the bike and the head meets the left
 *     wall. Turning on through the launch is fine if gravity is then
 *     turned back up promptly (below).
 *   - Left pad x 0 (y 2.6 … 22), right pad on the column above the lintel
 *     (y 8.5 … ≈ 20). Above the right pad a 40° cap rises left to a
 *     radius-6 hood that turns it into the flat roof (underside y 30); the
 *     roof runs to a radius-4 quarter-pipe at x −13 that turns down into the
 *     far wall, whose foot curves out onto the plateau.
 *   - Each pad throws the rider back at .9 of its normal speed: the left pad
 *     at y ≈ 10.5, the right at y ≈ 16, then the cap near x 0. The flights
 *     are short (≈ .8 s), so at .95 rad/s the chimney is forgiving: any
 *     swing within ≈ .9 rad of straight up completes, straight up included.
 *     What it does demand is turning back from the lintel's lean (≈ π + 1.1)
 *     toward π within ≈ .6 s of launch: holding the lintel's lean, or
 *     turning on past it, carries the rider flat into the top of the left
 *     wall. A full quarter turn per flight, each wall the floor in turn,
 *     would need half a turn through straight up for every crossing, which
 *     at .95 rad/s throws a rider ≈ 20 m/s faster each time: far more than
 *     a 30 m chimney can hold.
 */
const DEG = Math.PI / 180;
const LOOP_R = 2.5, LOOP_X = 16, LINTEL_TILT = 20 * DEG, LINTEL = 9;
const ROOF = 30, LEFT_TOP = 22, FAR = -13, CORNER_R = 4;
const loop = arc('bernoulli-loop', p(LOOP_X, 0), 0, Math.PI - LINTEL_TILT, LOOP_R, 10);
const lintelTop = p(loop.end.x - LINTEL * Math.cos(LINTEL_TILT), loop.end.y + LINTEL * Math.sin(LINTEL_TILT));
const corner = arc('bernoulli-roof', p(FAR + CORNER_R, ROOF), Math.PI, 3 * Math.PI / 2, CORNER_R, 8);
// The far wall's foot curves out onto the plateau, so a rider who comes down
// short of an apple can turn the world back and ride the route again.
const FOOT_R = 2, PLATEAU = 2;
const foot = arc('bernoulli-foot', p(FAR, PLATEAU + FOOT_R), 3 * Math.PI / 2, 2 * Math.PI, FOOT_R, 6);
const wallX = LOOP_X + LOOP_R;
// The hood: the chimney's top is a 40° cap rising left from the right wall,
// curving (radius HOOD_R) into the flat roof, so the rider meets it at a
// glancing angle instead of falling flat onto the roof.
const HOOD = 140 * DEG, HOOD_R = 6, HOOD_X = -3.05;
const hoodEnd = p(HOOD_X - HOOD_R * Math.tan((Math.PI - HOOD) / 2), ROOF);
const hoodStart = p(hoodEnd.x + HOOD_R * Math.sin(HOOD), ROOF - HOOD_R * (1 + Math.cos(HOOD)));
const capY = (x: number) => hoodStart.y - (x - hoodStart.x) * Math.tan(Math.PI - HOOD);
const capFoot = p(lintelTop.x, capY(lintelTop.x));
// The cap and hood are deep enough to close the stone behind them (no sky
// between the stepped fill and the ridden face) without rising past the roof's top.
const CAP_DEPTH = 2, BACK = ROOF + .6;
const hood = arc('bernoulli-hood', hoodStart, HOOD, Math.PI, HOOD_R, 8,
  (heading, at, to) => clamp((BACK - Math.max(at.y, to.y)) / -Math.cos(heading), .6, CAP_DEPTH));
export const BERNOULLI = {
  loopX: LOOP_X, loopR: LOOP_R, lintelTilt: LINTEL_TILT, lintelTop, roof: ROOF, leftTop: LEFT_TOP, far: FAR, cornerR: CORNER_R,
  /** Chimney walls: the left pad's face (x 0) and the right pad's face (the lintel's top end). */
  left: 0, right: lintelTop.x,
  pads: { left: [p(0, LEFT_TOP), p(0, 2.6)] as const, right: [p(lintelTop.x, lintelTop.y + .6), p(lintelTop.x, capFoot.y - .3)] as const },
  capFoot, hoodStart, hoodEnd,
  door: p(FAR + .9, LEFT_TOP - 2),
};
const B = BERNOULLI;

export const bernoulliUpdraftLevel: Level = {
  id: 'bernoullis-updraft', name: 'Bernoulli’s Updraft', subtitle: 'Where the flow quickens, it lifts',
  mechanic: 'Turn the world upside down and the chimney becomes a well to fall up. Brass pads on both walls throw you across.',
  hint: 'Follow the bike round the loop with the world and keep turning until the lintel throws you off. Then turn gravity back to straight up: the pads do the climbing.',
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
    block('bernoulli-column', lintelTop.x, wallX, capFoot.y, lintelTop.y + .6),
    block('bernoulli-hood-back', lintelTop.x, wallX, ROOF + .6, capFoot.y),
    // Stone behind the cap, stepped so no corner reaches its ridden face.
    ...[-1.5, 1, 3.5, 6].map((x, i) => block(`bernoulli-hood-fill-${i}`, x, lintelTop.x, ROOF + .6, capY(x) + .3)),
    pad('bernoulli-pad-left', ...B.pads.left),
    pad('bernoulli-pad-right', ...B.pads.right),
    // The start room's ceiling is the gallery's lower side.
    block('bernoulli-gallery-shelf', FAR + 3, -.5, LEFT_TOP, LEFT_TOP - .6),
    { ...slab('bernoulli-cap', capFoot, hoodStart, CAP_DEPTH), chain: 'bernoulli-roof' },
    ...hood.surfaces.map(s => ({ ...s, chain: 'bernoulli-roof' })),
    { ...slab('bernoulli-roof-run', hood.end, p(FAR + CORNER_R, ROOF)), chain: 'bernoulli-roof' },
    ...corner.surfaces,
    { ...slab('bernoulli-far-wall', corner.end, p(FAR, PLATEAU + FOOT_R)), chain: 'bernoulli-roof' },
    ...foot.surfaces.map(s => ({ ...s, chain: 'bernoulli-roof' })),
  ],
  apples: [
    a('bernoulli-start', 6, .9),
    a('bernoulli-core-1', 4.5, 8.7),
    a('bernoulli-core-2', 4.7, 13.3),
    a('bernoulli-core-3', 4.8, 19.4),
    a('bernoulli-gallery', -6, 29.3),
  ],
  routeHints: [
    { x: 14.8, y: 1.8, angle: 0, label: 'FOLLOW', spin: 1 },
    // Seen through the whole loop turn and clear of the rider's head as it passes.
    { x: 11.8, y: 3.4, angle: Math.PI - LINTEL_TILT, label: 'KEEP TURNING', spin: 1 },
    { x: 5, y: 5, angle: Math.PI, label: 'UP' },
    { x: -3, y: ROOF - 2, angle: Math.PI, label: 'ROOF' },
    { x: FAR + 2.5, y: ROOF - 5, angle: 3 * Math.PI / 2, label: 'DOWN', spin: 1 },
  ],
  exit: B.door, difficulty: 12.75, accent: '#7fc4a8',
};

/**
 * Observation-only demonstration. On the floor it holds `cruise`. Round the
 * loop and up the lintel it leads the bike's own (unwrapped) pitch by `lead`
 * with the world, stopping at `release` (by default where gravity runs along
 * the lintel). In the chimney it swings gravity `sway` rad either side of
 * straight up toward the wall it is flying at, or holds `chimney` if given;
 * above `roofAt` it holds gravity up and leaned toward the far wall, and
 * round the quarter-pipe turns it down that wall. Speeds come from the
 * snapshot clock, so it rides at any step size.
 */
export function createBernoulliPilot({ lead = 1.5, release = 3 * Math.PI / 2 - LINTEL_TILT, sway = .55, chimney = undefined as number | undefined,
  cruise = 3, roofAt = 21, roofLean = .35 } = {}): (state: Snapshot) => Controls {
  let previous: Snapshot | undefined, pitch = 0, lastRaw = 0, phase = 0, side = -1;
  return state => {
    const raw = state.bodies.find(body => body.kind === 'frame')?.angle ?? 0;
    pitch += Math.atan2(Math.sin(raw - lastRaw), Math.cos(raw - lastRaw)); lastRaw = raw;
    const dt = previous ? state.elapsed - previous.elapsed : 0;
    const vx = dt > 0 ? (state.bike.x - previous!.bike.x) / dt : 0, vy = dt > 0 ? (state.bike.y - previous!.bike.y) / dt : 0;
    previous = state;
    const { x, y } = state.bike, speed = vx * Math.cos(pitch) + vy * Math.sin(pitch);
    let target = pitch + clamp((cruise - speed) * .22, -.4, .4);
    if (phase === 0 && x > B.loopX - .5) phase = 1;
    if (phase === 1 && x < B.right - .3 && pitch > 2.5) phase = 2;
    if (phase === 2 && y > roofAt) phase = 3;
    if (phase === 3 && x < B.far + B.cornerR + 1) phase = 4;
    if (phase === 1) target = Math.min(pitch + lead, release);
    if (phase === 2) { if (vx > 1) side = 1; if (vx < -1) side = -1; target = chimney ?? Math.PI - side * sway; }
    if (phase === 3) target = Math.PI + roofLean;
    if (phase === 4) target = 3 * Math.PI / 2;
    return { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake: false };
  };
}
