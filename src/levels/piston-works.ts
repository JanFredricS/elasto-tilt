import type { Apple, Controls, Level, Snapshot, Surface, TimePlatform, Vec } from '../types';

const p = (x: number, y: number): Vec => ({ x, y });
const g = (id: string, x: number, y: number, w: number, h = .6): Surface => ({ id, x, y, w, h, kind: 'ground' });
const a = (id: string, x: number, y: number): Apple => ({ id, x, y });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** A block whose top face is at `top`, spanning x0..x1 and reaching down to `bottom`. */
const block = (id: string, x0: number, x1: number, top: number, bottom: number): Surface =>
  g(id, (x0 + x1) / 2, (top + bottom) / 2, x1 - x0, top - bottom);
/** A ground slab whose top face runs from `from` to `to`. */
const slab = (id: string, from: Vec, to: Vec, h = .6): Surface => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  return { ...g(id, (from.x + to.x) / 2 + Math.sin(angle) * h / 2, (from.y + to.y) / 2 - Math.cos(angle) * h / 2,
    Math.hypot(to.x - from.x, to.y - from.y), h), angle };
};
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
 * The Piston Works. Every lift is a PAIR of brass pistons, each about as wide as a tyre, set a
 * wheelbase apart so one carries each wheel. They run on their own clocks (period, offset):
 * up and down for ever, eased so they dwell at both ends, whatever the rider does. Geometry
 * (metres, y up):
 *
 *   - The start floor (top y = 0) ends at a shaft. Lift A rises from the floor to the first
 *     deck (top 3.5) and back every 8 s (over-travelling both by .1, see `over`). Roll on
 *     while it rests at the bottom, brake (a wheel on each piston), ride it up, roll off at
 *     the top. Arrive early and the sinking pistons pin the front wheel at the shaft's lip.
 *   - The deck's east end rounds over a knee into a half-pipe (bottom y ≈ 1, an apple) and
 *     back up onto a second deck at the same height.
 *   - The double lift: B1 (3.5 → 6.5) and B2 (6.5 → 9.5) side by side, a hand's breadth apart,
 *     in antiphase on a 12 s cycle. Their tops meet only as B1 peaks and B2 bottoms out: there
 *     B2 sits .2 below B1 (with the over-travel below), and it stays no higher than B1 for only
 *     ≈ .7 s either side; then it climbs past as B1 sinks, and a bike straddling the seam is
 *     levered nose-up between them. Board B1 at the bottom, ride it up, roll across onto B2 as
 *     they meet (an apple hangs over the seam), then ride B2 up to the upper floor.
 *   - The last lift, C, hangs in a shaft between the upper floor and the door floor (both top
 *     9.5) and sinks 4 m and back every 10 s. Its apple waits at the bottom of the shaft: a
 *     rider who crosses C at the top reaches the door one apple short. Board C at the top,
 *     ride it down to the apple and back up, and roll off east to the door.
 *   - Every shaft is wider than the bike (.1 m to spare at each side of a pair, 1.2 m from its
 *     centre to the walls; a centred bike reaches 1.04), so a rider braked on a lift never rubs.
 */
export const PISTON = {
  /** One piston: w × h, centred ±offset from its pair's centre (the bike's axles sit at ±.7). */
  piece: { w: .9, h: .5, offset: .65 },
  /** Every lift over-travels its floors: it sinks `low` below the floor it rests at and rises
   *  `high` above the one it climbs to, so a rider always steps DOWN onto a lift and off it, and
   *  the eased ends leave a second or so in which that step is small. */
  over: { low: .1, high: .1 },
  start: { x0: -9, x1: 0, y: 0 },
  liftA: { x: 1.2, low: 0, high: 3.5, period: 8, offset: 0 },
  deck1: { x0: 2.4, x1: 9, y: 3.5 },
  bowl: { knee: 2, radius: 4, slope: 40 * Math.PI / 180, run: 1.7 },
  deck2: { x1: 27 },
  liftB1: { x: 28.2, low: 3.5, high: 6.5, period: 12, offset: 0 },
  liftB2: { x: 30.5, low: 6.5, high: 9.5, period: 12, offset: .5 },
  upper: { x0: 31.7, x1: 41, y: 9.5 },
  liftC: { x: 42.2, low: 5.5, high: 9.5, period: 10, offset: .5 },
  door: { x0: 43.4, x1: 54, y: 9.5 },
  exit: p(51, 10.3),
};
const P = PISTON;
type Lift = { x: number; low: number; high: number; period: number; offset: number };

/** A lift's two pistons: their tops run between `low` and `high` on the lift's own cycle. */
const pistons = (id: string, lift: Lift): TimePlatform[] => [-1, 1].map((side, i) => {
  const x = lift.x + side * P.piece.offset, centre = (top: number) => p(x, top - P.piece.h / 2);
  return { id: `${id}-${i}`, from: centre(lift.low - P.over.low), to: centre(lift.high + P.over.high), w: P.piece.w, h: P.piece.h, period: lift.period, offset: lift.offset };
});

// The half-pipe: a knee over the deck's edge, a straight slope, a round bowl, and the mirror image out.
const bowl = (() => {
  const B = P.bowl, start = p(P.deck1.x1, P.deck1.y);
  const kneeIn = arc('piston-knee-in', start, 0, -B.slope, B.knee);
  const down = p(kneeIn.end.x + B.run * Math.cos(B.slope), kneeIn.end.y - B.run * Math.sin(B.slope));
  const bottom = arc('piston-bowl', down, -B.slope, B.slope, B.radius, 10);
  const up = p(bottom.end.x + B.run * Math.cos(B.slope), bottom.end.y + B.run * Math.sin(B.slope));
  const kneeOut = arc('piston-knee-out', up, B.slope, 0, B.knee);
  return {
    surfaces: [...kneeIn.surfaces, { ...slab('piston-slope-in', kneeIn.end, down), chain: 'piston-bowl' }, ...bottom.surfaces,
      { ...slab('piston-slope-out', bottom.end, up), chain: 'piston-bowl' }, ...kneeOut.surfaces],
    floor: down.y - B.radius * (1 - Math.cos(B.slope)), centre: (down.x + bottom.end.x) / 2, end: kneeOut.end,
  };
})();
export const BOWL = { floor: bowl.floor, centre: bowl.centre, x1: bowl.end.x };

export const pistonWorksLevel: Level = {
  id: 'piston-works', name: 'The Piston Works', subtitle: 'Wait for the rise',
  mechanic: 'Brass pistons rise and fall on their own clocks. Brake on a pair to ride it; cross from one lift to the next only as their tops meet.',
  hint: 'Roll on while a lift rests at the bottom and brake with a wheel on each piston. On the double lift, cross as the two tops meet, not before. Ride the last lift down for its apple, then back up to the door.',
  spawn: p(-5, .72), initialAngle: 0,
  bounds: { min: p(-12, -3), max: p(58, 16) },
  surfaces: [
    block('piston-start', P.start.x0, P.start.x1, P.start.y, -2.4),
    g('piston-back-wall', P.start.x0 - .3, 2, .6, 4.8),
    block('piston-pit-a', P.start.x1, P.deck1.x0, -1.2, -2.4),
    block('piston-deck-1', P.deck1.x0, P.deck1.x1, P.deck1.y, -2.4),
    ...bowl.surfaces,
    block('piston-deck-2', bowl.end.x, P.deck2.x1, P.deck1.y, -2.4),
    block('piston-pit-b', P.deck2.x1, P.upper.x0, 2.4, -2.4),
    block('piston-upper', P.upper.x0, P.upper.x1, P.upper.y, -2.4),
    block('piston-pit-c', P.upper.x1, P.door.x0, 4.4, -2.4),
    block('piston-door-floor', P.door.x0, P.door.x1, P.door.y, -2.4),
    g('piston-end-wall', P.door.x1 + .3, P.door.y + 2.4, .6, 4.8),
  ],
  timePlatforms: [
    ...pistons('piston-a', P.liftA),
    ...pistons('piston-b1', P.liftB1),
    ...pistons('piston-b2', P.liftB2),
    ...pistons('piston-c', P.liftC),
  ],
  apples: [
    a('piston-crest', P.liftA.x, P.liftA.high + 1.1),
    a('piston-bowl', bowl.centre, bowl.floor + .9),
    a('piston-seam', (P.liftB1.x + P.liftB2.x) / 2, P.liftB1.high + .9),
    a('piston-ledge', 36, P.upper.y + .9),
    a('piston-shaft', P.liftC.x, P.liftC.low + 1.1),
  ],
  routeHints: [
    { x: -2, y: 1.6, angle: 0, label: 'WAIT' },
    { x: (P.liftB1.x + P.liftB2.x) / 2, y: P.liftB2.high + 1.6, angle: 0, label: 'CROSS' },
    { x: P.liftC.x, y: P.upper.y + 2.2, angle: -Math.PI / 2, label: 'DOWN' },
  ],
  exit: P.exit, difficulty: 14.75, accent: '#c8a060',
};

/** Where a lift's tops are at `time`, and how long until they next reach the bottom / top. */
export function liftSchedule(lift: Lift, time: number) {
  const f = ((time / lift.period + lift.offset) % 1 + 1) % 1;
  const low = lift.low - P.over.low, high = lift.high + P.over.high;
  return { top: low + (high - low) * (1 - Math.cos(2 * Math.PI * f)) / 2,
    toLow: (1 - f) * lift.period, toHigh: ((1.5 - f) % 1) * lift.period };
}

/**
 * Observation-only demonstration (tilt and brake, as a player). It reads the lifts' cycles off
 * the clock, as a player watching them would: it waits braked short of each shaft, sets off
 * so it arrives as the lift rests level with its floor, brakes with a wheel on each piston,
 * and, braked and with the world tilted a little toward the way on, lets go just before the
 * lift reaches the next floor. On the double lift it rides B1 to its crest and crosses to B2
 * as their tops meet; on lift C it rides down for the apple and back up.
 */
export function createPistonWorksPilot(options: { lead?: number; leave?: number; cross?: number } = {}): (state: Snapshot) => Controls {
  const lead = options.lead ?? 1.1, leave = options.leave ?? .9, cross = options.cross ?? 1;
  let previous: Vec | undefined, lastTime = 0, stage = 0, holdFrom = 0;
  // Each stage: ride to x (braking there) and wait until `go` says the way on is open.
  type Stage = { x: number; go?: (t: number) => boolean; speed?: number };
  const A = P.liftA, B1 = P.liftB1, B2 = P.liftB2, C = P.liftC;
  /** Is the event `eta` seconds away due within the next `by` seconds (and not long overdue)? */
  const due = (eta: number, by: number) => eta < by && eta > by - .6;
  const stages: Stage[] = [
    { x: P.start.x1 - 1.3, go: t => due(liftSchedule(A, t).toLow, lead) },
    { x: A.x, go: t => due(liftSchedule(A, t).toHigh, leave) },
    { x: P.deck2.x1 - 1.3, speed: 2.5, go: t => due(liftSchedule(B1, t).toLow, lead) },
    { x: B1.x, go: t => due(liftSchedule(B1, t).toHigh, cross) },
    { x: B2.x, go: t => due(liftSchedule(B2, t).toHigh, leave) },
    { x: P.upper.x1 - 1.3, go: t => due(liftSchedule(C, t).toHigh, lead) },
    // Down for the apple and back up: the next time C tops out, a whole cycle on.
    { x: C.x, go: t => due(liftSchedule(C, t).toHigh, leave) },
    { x: P.exit.x },
  ];
  return state => {
    const dt = state.elapsed - lastTime, heading = state.bodies.find(body => body.id === 'frame')!.angle;
    // Speed along the frame, and the world steered relative to it (as a player leans into the half-pipe).
    const v = previous && dt > 0 ? ((state.bike.x - previous.x) * Math.cos(heading) + (state.bike.y - previous.y) * Math.sin(heading)) / dt : 0;
    previous = state.bike; lastTime = state.elapsed;
    const level = (target: number, brake = false) => ({ tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake });
    const here = stages[stage], x = state.bike.x;
    const close = Math.abs(here.x - x) < .12 && Math.abs(v) < .4;
    if (close && here.go) {
      if (!holdFrom) holdFrom = state.elapsed;
      if (here.go(state.elapsed) && state.elapsed - holdFrom > .3) { stage++; holdFrom = 0; return level(.25); }
      // Braked; in the last moments, lean the world toward the way on so the rider leaves at once.
      return level(here.go(state.elapsed + .4) ? .25 : 0, true);
    }
    const desired = clamp((here.x - x) * 2.5, -(here.speed ?? 2), here.speed ?? 2);
    const brake = here.go !== undefined && Math.abs(here.x - x) < .3 && Math.abs(v) > .3;
    return level(heading + clamp((desired - v) * .3, -.35, .35), brake);
  };
}
