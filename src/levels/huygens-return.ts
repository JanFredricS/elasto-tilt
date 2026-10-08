import type { Apple, Controls, Level, Snapshot, Surface, Vec } from '../types';

const p = (x: number, y: number): Vec => ({ x, y });
const g = (id: string, x: number, y: number, w: number, h = .6): Surface => ({ id, x, y, w, h, kind: 'ground' });
const a = (id: string, x: number, y: number): Apple => ({ id, x, y });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** An axis-aligned block spanning x0..x1 and y0..y1. */
const block = (id: string, x0: number, x1: number, y0: number, y1: number): Surface =>
  g(id, (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0);
/** A slab whose ridden face runs from `from` to `to`; the stone lies to the right of that direction. */
const slab = (id: string, from: Vec, to: Vec, h = .5, kind: Surface['kind'] = 'ground'): Surface => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  return { id, kind, angle, w: Math.hypot(to.x - from.x, to.y - from.y), h,
    x: (from.x + to.x) / 2 + Math.sin(angle) * h / 2, y: (from.y + to.y) / 2 - Math.cos(angle) * h / 2 };
};
/** An arc of chained slabs turning the ridden heading from h0 to h1 (radians) on `radius`. */
const arc = (id: string, from: Vec, h0: number, h1: number, radius: number, pieces: number) => {
  const step = (h1 - h0) / pieces, chord = 2 * radius * Math.sin(Math.abs(step) / 2);
  let at = from;
  const surfaces = Array.from({ length: pieces }, (_, i) => {
    const heading = h0 + (i + .5) * step, to = p(at.x + chord * Math.cos(heading), at.y + chord * Math.sin(heading));
    const piece = { ...slab(`${id}-${i}`, at, to, .6), chain: id };
    at = to; return piece;
  });
  return { surfaces, end: at };
};
const ease = (z0: number, z1: number, t: number) => z0 + (z1 - z0) * (1 - Math.cos(Math.PI * clamp(t, 0, 1))) / 2;

/**
 * Huygens’ Return. One long pendulum does both halves of the journey.
 *
 *   - The start ground (top y = 0) is a thin .24 m shelf, exactly as thick as
 *     the plank: at rest the plank continues its top face outward and its
 *     underside back home. The shelf's end is also the swing's lower stop.
 *   - Ride onto the plank, hold BRAKE and turn the world: the loaded swing
 *     follows gravity a quarter turn (θ 0 → 90°) until its far end meets the
 *     foot of the tower, the upper stop. The plank now stands upright and its
 *     top face lines up with the tower's west face.
 *   - Ride up the west face, round the tower's crown (a 180° turn, radius 3)
 *     and run down its east face, a course laid out in the rider's own frame:
 *     a level run-up, a strip of steep saw-tooth notches whose tips sit flush
 *     with the running level, a long flat runway at the same level, and an
 *     easing down onto the thin fin whose east face lines up with the parked
 *     plank's UNDERSIDE.
 *   - The saw-teeth are plain stone and look like a bumpy bit of road. Roll
 *     onto them slowly and a wheel drops into a notch deeper than it can climb
 *     out of: the bike is stuck. Arrive fast and the wheels skim from tip to
 *     tip before they have time to fall in.
 *   - Roll onto the underside, hold BRAKE and turn the world back: the swing
 *     carries you hanging beneath it down to its lower stop, where the
 *     underside lines up with the start shelf's underside and the door waits.
 *
 * The plank is light on a heavily damped bearing: empty, it barely creeps,
 * so it waits at the tower while you ride round; under a rider's weight it
 * swings dozens of times faster. Turning the world round the crown lets it
 * sag a few degrees off the tower, opening a step at the fin. Tip the world
 * back past the course's level for a few seconds and its own weight lifts it
 * home against the tower again.
 */
const DEG = Math.PI / 180;
const L = 6, W = 3, GAP = .03, R = 3;
const anchor = p(8, L - .12);
const westFace = anchor.x + L - .12, finTop = anchor.y + W / 2 + GAP;
/** East-face course, measured from the crown: s runs down the face, z out from the west face. */
/**
 * The saw-teeth: TEETH V notches, each PITCH wide and DEPTH deep (69° flanks), their
 * tips flush with the running level. A wheel (radius .34) settles .35 m below the tips
 * in a notch, a step it cannot roll out of; at speed it crosses a notch in an eighth of
 * a second, too soon to fall in. PITCH is not a divisor of the 1.4 m wheelbase, so the
 * wheels never drop into notches together.
 */
const RUN = 9, PITCH = 1, TEETH = 5, DEPTH = 1.3;
const Z0 = RUN, Z1 = Z0 + TEETH * PITCH, LZ = 8, EZ = 11;
const course = {
  /** Level run-up from the crown to the first tooth tip. */
  runup: [0, Z0] as const,
  /** Saw-tooth notches, tips flush with the running level; then the long flat runway, then the easing down onto the fin. */
  zigzag: [Z0, Z1] as const, landing: [Z1, Z1 + LZ] as const,
  easing: [Z1 + LZ, Z1 + LZ + EZ] as const, end: Z1 + LZ + EZ + 1.5,
  high: 2 * R, pitch: PITCH, depth: DEPTH, fin: .24,
};
const C = course;
const crown = finTop + C.end;
const at = (s: number, z: number) => p(westFace + z, crown - s);
/** Running level, the notch floor between tooth tips, then the easing. */
const profile = (s: number) => {
  if (s < Z0) return C.high;
  if (s < Z1) return C.high - DEPTH * (1 - Math.abs(2 * ((s - Z0) / PITCH % 1) - 1));
  return s < C.easing[0] ? C.high : ease(C.high, C.fin, (s - C.easing[0]) / EZ);
};
/** Every notch floor and tooth tip of the saw-teeth, between the first and last tips. */
const zigBreaks = Array.from({ length: 2 * TEETH - 1 }, (_, i) => Z0 + (i + 1) * PITCH / 2);
/** A chained run along the course profile, cut into quarter-metre pieces. */
const run = (id: string, s0: number, s1: number, z: (s: number) => number, breaks: number[] = []) => {
  const cuts = [s0, ...breaks, s1], out: Surface[] = [];
  for (let k = 1; k < cuts.length; k++) {
    const n = Math.max(1, Math.ceil((cuts[k] - cuts[k - 1]) / .25 - 1e-6));
    for (let i = 0; i < n; i++) {
      const sa = cuts[k - 1] + (cuts[k] - cuts[k - 1]) * i / n, sb = cuts[k - 1] + (cuts[k] - cuts[k - 1]) * (i + 1) / n;
      const za = z(sa), zb = z(sb === cuts[k] ? sb - 1e-9 : sb);
      // Thin where the face nears the west face, so no slab pokes through it.
      const slope = Math.abs(Math.atan2(zb - za, sb - sa));
      out.push({ ...slab(`${id}-${out.length}`, at(sa, za), at(sb, zb), clamp(Math.min(za, zb) - .05 - Math.sin(slope), .12, .5)), chain: id });
    }
  }
  return out;
};
/** Hidden masonry behind the east-face slabs, in one-metre courses. */
const core = (id: string, s0: number, s1: number, z: (s: number) => number) => {
  const out: Surface[] = [];
  for (let s = s0, i = 0; s < s1 - 1e-6; s += 1, i++) {
    const e = Math.min(s + 1, s1), top = Math.min(z(s), z(e - 1e-9), z((s + e) / 2)) - .45;
    if (top > .5) out.push(block(`${id}-${i}`, westFace + .1, westFace + top, crown - e, crown - s));
  }
  return out;
};
const nose = arc('huygens-crown', p(westFace, crown), Math.PI / 2, -Math.PI / 2, R, 32);
const swingAt = (theta: number, out: number) => p(anchor.x + (L + out) * Math.sin(theta), anchor.y - (L + out) * Math.cos(theta));

export const HUYGENS = {
  anchor, length: L, width: W, westFace, finTop, crown, course, at, profile,
  /** Start shelf (top 0, underside −.24) ends a hand's breadth short of the resting plank. */
  shelf: { x0: -6, x1: anchor.x - W / 2 - GAP, top: 0, bottom: -.24 },
  swing: 'huygens-swing',
};
const H = HUYGENS;

export const huygensReturnLevel: Level = {
  id: 'huygens-return', name: 'Huygens’ Return', subtitle: 'Out on the swing, home beneath it',
  mechanic: 'Ride a long pendulum a quarter turn up to the tower, round its crown, skim a strip of saw-teeth at speed, then hang beneath the same plank and swing home underneath the start.',
  hint: 'Hold BRAKE on the plank and turn the world to swing it up to the tower. Ease round the crown, then let the bike run: the saw-teeth swallow a slow wheel, but a fast one skims their tips. Slow down on the long runway. If the plank has sagged from the tower, brake and tip the world back until it lifts home, then roll onto its underside, hold BRAKE and turn the world back.',
  spawn: p(1, .72), initialAngle: 0,
  bounds: { min: p(-9, -8), max: p(westFace + 2 * R + 5, crown + R + 5) },
  surfaces: [
    block('huygens-shelf', H.shelf.x0, H.shelf.x1, H.shelf.bottom, H.shelf.top),
    // The west face and the thin fin below the course: one stone, so neither face has a seam.
    block('huygens-tower-face', westFace, westFace + C.fin, finTop, crown),
    ...nose.surfaces,
    // One seam-free run from the crown over the saw-teeth, along the runway and down onto the fin.
    ...run('huygens-run', 0, C.easing[1], profile, [Z0, ...zigBreaks, Z1, C.easing[0]]),
    ...core('huygens-core-upper', 0, Z0, profile),
    block('huygens-teeth-bed', westFace + .1, westFace + C.high - DEPTH - .45, crown - Z1, crown - Z0),
    ...core('huygens-core-lower', Z1, C.easing[1], profile),
  ],
  swings: [{ id: H.swing, anchor, length: L, width: W, mass: .1, damping: 400 }],
  apples: [
    a('huygens-west-face', westFace - .9, finTop + 9),
    a('huygens-crown', westFace + R, crown + R + .9),
    a('huygens-teeth', at((Z0 + Z1) / 2, C.high + .8).x, at((Z0 + Z1) / 2, C.high + .8).y),
    a('huygens-underside', swingAt(45 * DEG, 1.02).x, swingAt(45 * DEG, 1.02).y),
  ],
  routeHints: [
    { x: anchor.x + 2.5, y: 1.4, angle: 45 * DEG, label: 'SWING UP' },
    { ...swingAt(30 * DEG, 2.4), angle: -120 * DEG, label: 'HANG ON' },
  ],
  exit: p(3, H.shelf.bottom - .8), difficulty: 11.5, accent: '#b9a27c',
};

/**
 * Observation-only demonstration. Rides onto the plank, brakes and leads
 * the world a little ahead of the swing until it stands against the tower;
 * follows the bike round the crown at `crown` m/s; tips the world down the
 * east-face run-up until the bike reaches `speed` m/s, holds it level over the
 * saw-teeth (plus `lean`), tips it back to slow on the runway, then holds it
 * `park` rad past level with the brake on until the plank is back against the
 * tower; creeps down the fin onto the underside; brakes and leads the world back
 * until the swing reaches its lower stop, and rolls home to the door.
 */
export function createHuygensPilot(speed = 8, lean = 0, park = .65, rounding = 1.8): (state: Snapshot) => Controls {
  let previous: Vec | undefined, stage = 0, bike = 0, lastRaw = 0;
  return state => {
    const v = previous ? { x: (state.bike.x - previous.x) * 120, y: (state.bike.y - previous.y) * 120 } : p(0, 0);
    previous = state.bike;
    const raw = state.bodies.find(body => body.id === 'frame')!.angle;
    bike += Math.atan2(Math.sin(raw - lastRaw), Math.cos(raw - lastRaw)); lastRaw = raw;
    const theta = state.bodies.find(body => body.id === H.swing)!.angle;
    const { x, y } = state.bike, s = crown - y;
    const steer = (target: number, brake = false): Controls => ({ tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake });
    const along = (heading: number) => v.x * Math.cos(heading) + v.y * Math.sin(heading);
    const cruise = (heading: number, speed: number, back = -.3, ahead = .3) => heading + clamp((speed - along(heading)) * .25, back, ahead);
    const plank = finTop - W / 2 - GAP; // map y of the parked plank's centre
    // Stage changes.
    if (stage === 0 && x > anchor.x - .6 && Math.abs(v.x) < .08) stage = 1;
    if (stage === 1 && theta > Math.PI / 2 - .012) stage = 2;
    if (stage === 2 && bike < -Math.PI / 2 + .3 && x > westFace + R) stage = 3;
    if (stage === 3 && s > Z1 + 1.5 && x < westFace + C.high + 1.2) stage = 4;
    if (stage === 4 && Math.hypot(v.x, v.y) < .05) stage = 5;
    if (stage === 5 && theta > Math.PI / 2 - .006) stage = 6;
    if (stage === 6 && y < plank + .4 && Math.hypot(v.x, v.y) < .08) stage = 7;
    if (stage === 7 && theta < .012) stage = 8;
    switch (stage) {
      case 0: return x < anchor.x - .6 ? steer(cruise(0, clamp((anchor.x - x) * .9, .3, 2))) : steer(0, true);
      // Lead the loaded swing; the brake keeps the bike on the plank.
      case 1: return steer(Math.min(theta + .55, Math.PI / 2 + .25), true);
      // Ease off the plank (pushing off swings it back), climb, then slow for the crown:
      // the world turns at most .95 rad/s, so the bike must not round it faster.
      case 2: return steer(cruise(bike, y < finTop + .5 ? .4 : y < crown - 3 ? 2.5 : rounding, y < finTop + 2 ? 0 : -.3, .3));
      case 3: {
        if (s < Z0) return steer(cruise(-Math.PI / 2, speed, -.35, .6));
        if (s < Z1) return steer(cruise(-Math.PI / 2, speed, -.35, .35) + lean);
        return steer(-Math.PI / 2);
      }
      // Stop on the runway.
      case 4: {
        const speed = along(-Math.PI / 2);
        return steer(-Math.PI / 2 - clamp(speed * .3, 0, park), speed < .5);
      }
      // The empty plank sagged a little while the world turned past it: tip the
      // world back so its own weight lifts it against the tower again.
      case 5: return steer(-Math.PI / 2 - park, true);
      case 6: {
        // Creep down the fin onto the plank, the world tipped so the plank stays parked.
        const want = clamp((y - plank) * .7, .25, 1.5);
        const speed = along(-Math.PI / 2), pitch = bike + Math.PI / 2;
        return steer(-Math.PI / 2 + clamp((want - speed) * .25, -.6, .3), y < plank + .5 || (speed > want + .6 && pitch < .06));
      }
      // Hanging beneath the plank: lead the world back ahead of the swing.
      case 7: return steer(Math.max(theta - Math.PI + .55, -Math.PI - .25), true);
      default: return steer(cruise(bike, 2));
    }
  };
}
