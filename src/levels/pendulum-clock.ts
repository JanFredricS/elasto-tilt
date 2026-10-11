import type { Apple, Controls, Level, Snapshot, Surface, TimePlatform, Vec } from '../types';

const p = (x: number, y: number): Vec => ({ x, y });
const g = (id: string, x: number, y: number, w: number, h = .6): Surface => ({ id, x, y, w, h, kind: 'ground' });
const a = (id: string, x: number, y: number): Apple => ({ id, x, y });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** A block whose top face is at `top`, spanning x0..x1 and reaching down to `bottom`. */
const block = (id: string, x0: number, x1: number, top: number, bottom: number): Surface =>
  g(id, (x0 + x1) / 2, (top + bottom) / 2, x1 - x0, top - bottom);
/** A slab whose ridden face runs from `from` to `to`; the stone lies to the right of that direction. */
const slab = (id: string, from: Vec, to: Vec, h = .6): Surface => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  return { ...g(id, (from.x + to.x) / 2 + Math.sin(angle) * h / 2, (from.y + to.y) / 2 - Math.cos(angle) * h / 2,
    Math.hypot(to.x - from.x, to.y - from.y), h), angle };
};
/** An arc of chained slabs turning the ridden heading from h0 to h1 (radians) on `radius`. */
const arc = (id: string, from: Vec, h0: number, h1: number, radius: number, pieces: number) => {
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
 * The Pendulum Clock. Inside a giant clock, the Piston Works' self-running lifts and Huygens'
 * heavy pendulum meet a new part: a MOVING HAZARD, red pallet bars on their own cycle (a time
 * platform of kind 'hazard'; touching it ends the ride). Geometry (metres, y up):
 *
 *   - The escapement: the start floor (top 0) ends at a shaft holding two lifts side by side, each
 *     a pair of tyre-wide pistons a wheelbase apart. E1 runs 0 → 3, E2 3 → 6, in antiphase on a
 *     12 s cycle (both over-travel their floors by .1, so a rider steps DOWN onto them). Their
 *     tops meet only as E1 peaks and E2 bottoms out. Board E1 as it rests low (WAIT), brake, ride
 *     it up, roll across onto E2 as their tops meet (CROSS, an apple over the seam), ride E2 up
 *     and roll off onto the dial floor (top 6).
 *   - The pallets: like a real escapement's anchor, two red bars (tick and tock) drop across the
 *     dial floor in antiphase, each lifting clear again every 6 s and dwelling at both ends, with
 *     an apple in each one's jaws. Wait braked short of TICK, set off as it starts to rise and
 *     pass beneath it, stop braked between the two while TICK drops behind you, and pass beneath
 *     TOCK as it hangs high. The dial's face carries twelve gilded hour marks.
 *   - The hand: a 6 m pendulum (light, on a heavily damped bearing: mass .1, damping 400) hangs
 *     with its 3 m plank flush with the dial floor. Brake on the plank and turn the world a
 *     quarter turn: the loaded hand swings up until its end meets the foot of the "12" tower,
 *     and the plank's face lines up with the tower's west face (RIDE THE HAND).
 *   - Ride up the west face (an apple), round a quarter-circle crown (radius 3) onto the "12"
 *     ledge, turning the world back to level as you go, and roll along it to the door at the
 *     clock's centre arbor.
 */
const DEG = Math.PI / 180;
const L = 6, W = 3, GAP = .03, R = 3;
export const CLOCK = {
  /** One piston: w × h, centred ±offset from its pair's centre (the bike's axles sit at ±.7). */
  piece: { w: .9, h: .5, offset: .65 },
  /** Every lift over-travels its floors by .1 at both ends. */
  over: { low: .1, high: .1 },
  start: { x0: -9, x1: 0, y: 0 },
  // E1 rests low about four seconds in, so a rider who rolls straight to the shaft waits little.
  escapeLow: { x: 1.2, low: 0, high: 3, period: 12, offset: 2 / 3 },
  escapeHigh: { x: 3.5, low: 3, high: 6, period: 12, offset: 1 / 6 },
  dial: { x0: 4.7, y: 6 },
  /** The pallet bars: w × h; each one's bottom drops to `closed` above the dial floor and lifts to
   *  `open`. TICK is raised at phase 0, TOCK half a cycle later. */
  pallet: { w: .5, h: 2.4, closed: .15, open: 3.1, period: 6 },
  tick: { x: 9, offset: 0 },
  tock: { x: 14, offset: .5 },
  hand: { anchor: p(20, 6 + L - .12), length: L, width: W, mass: .1, damping: 400 },
  crown: { radius: R, rise: 4 },
};
const P = CLOCK;
const anchor = P.hand.anchor;
const westFace = anchor.x + L - .12, footY = anchor.y + W / 2 + GAP, crownY = footY + P.crown.rise;
const ledgeY = crownY + R, dialEnd = anchor.x - W / 2 - GAP;
const nose = arc('clock-crown', p(westFace, crownY), Math.PI / 2, 0, R, 16);
export const CLOCK_FACE = { westFace, footY, crownY, ledgeY, dialEnd, ledgeEnd: westFace + R + 7 };
type Lift = { x: number; low: number; high: number; period: number; offset: number };
type Pallet = { x: number; offset: number };

/** A lift's two pistons: their tops run between `low` and `high` on the lift's own cycle. */
const pistons = (id: string, lift: Lift): TimePlatform[] => [-1, 1].map((side, i) => {
  const x = lift.x + side * P.piece.offset, centre = (top: number) => p(x, top - P.piece.h / 2);
  return { id: `${id}-${i}`, from: centre(lift.low - P.over.low), to: centre(lift.high + P.over.high), w: P.piece.w, h: P.piece.h, period: lift.period, offset: lift.offset };
});
/** A pallet bar: open (raised) at phase 0 of its cycle, dropped across the dial floor at phase .5. */
const pallet = (id: string, bar: Pallet): TimePlatform => ({
  id, kind: 'hazard', w: P.pallet.w, h: P.pallet.h, period: P.pallet.period, offset: bar.offset,
  from: p(bar.x, P.dial.y + P.pallet.open + P.pallet.h / 2), to: p(bar.x, P.dial.y + P.pallet.closed + P.pallet.h / 2),
});
/** Where a rider stops braked between the two pallets. */
const between = (P.tick.x + P.tock.x) / 2;
/** Twelve hour marks set into the dial's face below the floor (inside its stone, never ridden):
 *  each a short radial slot whose gilded (cradle) edge faces outward. */
const dialFace = { x: between, y: 1.6, radius: 3.1 };
const hourMarks: Surface[] = Array.from({ length: 12 }, (_, hour) => {
  const heading = Math.PI / 2 - hour * Math.PI / 6, major = hour % 3 === 0, h = major ? 1.2 : 1.02;
  const r = dialFace.radius - h / 2;
  return { id: `clock-hour-${hour || 12}`, x: dialFace.x + r * Math.cos(heading), y: dialFace.y + r * Math.sin(heading),
    w: major ? .36 : .2, h, angle: heading - Math.PI / 2, kind: 'cradle' };
});
const crownApple = p(westFace + R - (R + .9) * Math.cos(45 * DEG), crownY + (R + .9) * Math.sin(45 * DEG));

export const pendulumClockLevel: Level = {
  id: 'pendulum-clock', name: 'The Pendulum Clock', subtitle: 'Tick, tock, and a time to cross.',
  mechanic: 'Inside a giant clock: ride the escapement’s antiphase lifts, slip beneath two red pallet bars that drop across the dial in turn, tick and tock, then brake on the pendulum’s hand and turn the world a quarter turn to ride it up to the 12.',
  hint: 'Roll onto the first lift as it rests low and brake. Cross to the second only as their tops meet. Wait short of the red TICK bar; go as it starts to rise, pass beneath it and stop between the bars while it drops behind you. Go again as TOCK rises. Brake on the hand under the BRAKE arrow and turn the world to swing it up, then ride briskly off it up the wall (lingering levers it down) and round onto the 12.',
  spawn: p(-5, .72), initialAngle: 0,
  bounds: { min: p(-12, -4), max: p(CLOCK_FACE.ledgeEnd + 3, ledgeY + 5) },
  surfaces: [
    block('clock-start', P.start.x0, P.start.x1, P.start.y, -2.4),
    g('clock-back-wall', P.start.x0 - .3, 2, .6, 4.8),
    block('clock-escape-pit', P.start.x1, P.dial.x0, -1.2, -2.4),
    block('clock-dial', P.dial.x0, dialEnd, P.dial.y, -2.4),
    ...hourMarks,
    // The 12 tower: its foot is the hand's upper stop, its west face continues the parked plank's face.
    block('clock-tower', westFace, westFace + 2, crownY, footY),
    ...nose.surfaces,
    // Masonry inside the crown, kept within its radius so nothing pokes through the curve.
    block('clock-crown-core', westFace + 1, westFace + R, crownY + 2, crownY),
    block('clock-twelve', westFace + R, CLOCK_FACE.ledgeEnd, ledgeY, crownY),
    g('clock-end-wall', CLOCK_FACE.ledgeEnd + .3, ledgeY + 2.4, .6, 4.8),
  ],
  timePlatforms: [
    ...pistons('clock-escape-1', P.escapeLow),
    ...pistons('clock-escape-2', P.escapeHigh),
    pallet('clock-tick', P.tick),
    pallet('clock-tock', P.tock),
  ],
  swings: [{ id: 'clock-hand', anchor, length: L, width: W, mass: P.hand.mass, damping: P.hand.damping }],
  apples: [
    a('clock-seam', (P.escapeLow.x + P.escapeHigh.x) / 2, P.escapeLow.high + .9),
    a('clock-tick-jaws', P.tick.x, P.dial.y + .9),
    a('clock-tock-jaws', P.tock.x, P.dial.y + .9),
    a('clock-hand-face', westFace - .9, footY + 2),
    a('clock-crest', crownApple.x, crownApple.y),
  ],
  routeHints: [
    { x: -2, y: 1.6, angle: 0, label: 'WAIT' },
    { x: (P.escapeLow.x + P.escapeHigh.x) / 2, y: P.escapeHigh.high + 1.6, angle: 0, label: 'CROSS' },
    { x: P.tick.x - 2.6, y: P.dial.y + 1.6, angle: 0, label: 'TICK' },
    { x: between, y: P.dial.y + 1.6, angle: 0, label: 'TOCK' },
    // Brake here: the middle of the safe parking span on the hand's plank (about −.4…+1.2 m from its anchor).
    { x: anchor.x + .4, y: P.dial.y + 2.1, angle: -Math.PI / 2, label: 'BRAKE' },
    { x: anchor.x + 3, y: P.dial.y + 1.4, angle: 45 * DEG, label: 'RIDE THE HAND', spin: 1 },
    { x: westFace + R + 1.6, y: ledgeY + 1.5, angle: 0, label: 'XII' },
  ],
  exit: p(westFace + R + 4, ledgeY + .8), difficulty: 11.75, accent: '#7fb8a4',
};

/** Where a lift's tops are at `time`, and how long until they next reach the bottom / top. */
export function escapeSchedule(lift: Lift, time: number) {
  const f = ((time / lift.period + lift.offset) % 1 + 1) % 1;
  const low = lift.low - P.over.low, high = lift.high + P.over.high;
  return { top: low + (high - low) * (1 - Math.cos(2 * Math.PI * f)) / 2,
    toLow: (1 - f) * lift.period, toHigh: ((1.5 - f) % 1) * lift.period };
}
/** A pallet bar's underside above the dial floor at `time`, and how long until it is next fully raised. */
export function palletSchedule(time: number, bar: Pallet = P.tick) {
  const f = ((time / P.pallet.period + bar.offset) % 1 + 1) % 1;
  return { clearance: P.pallet.open - (P.pallet.open - P.pallet.closed) * (1 - Math.cos(2 * Math.PI * f)) / 2,
    toOpen: (1 - f) * P.pallet.period };
}

/**
 * Observation-only demonstration (tilt and brake, as a player). It reads the escapement's and
 * the pallets' cycles off the clock, as a player watching them would: it waits braked short of
 * the shaft, sets off so it arrives as E1 rests low, brakes on it, crosses to E2 `cross` s before
 * E1 crests and leaves E2 `leave` s before it tops out. It waits braked short of TICK and sets off
 * `pallet` s before that bar is fully raised, stops braked between the bars and sets off again
 * `tock` s before TOCK is fully raised. It stops braked on the hand's plank `park` m
 * east of the anchor and leads the world `swing` rad ahead of the swing until it stands against
 * the tower, then follows the bike's own heading up the wall at `climb` m/s, round the crown at
 * `rounding` m/s and along the 12 to the door.
 *
 * The climb must not dawdle: a rider standing on the parked plank's upper half (above the
 * anchor) levers the light, heavily damped hand down off its stop at about .08 rad/s, opening a
 * gap under the tower's foot that a slow wheel wedges into.
 */
export function createPendulumClockPilot(options: { lead?: number; leave?: number; cross?: number; pallet?: number;
  tock?: number; park?: number; swing?: number; climb?: number; rounding?: number } = {}): (state: Snapshot) => Controls {
  const lead = options.lead ?? 1.1, leave = options.leave ?? .9, cross = options.cross ?? 1;
  const go = options.pallet ?? 1.5, goTock = options.tock ?? 1.5, rounding = options.rounding ?? 1.6;
  const park = options.park ?? 0, swing = options.swing ?? .55, climb = options.climb ?? 1.4;
  let previous: Vec | undefined, lastTime = 0, stage = 0, holdFrom = 0, bike = 0, lastRaw = 0;
  type Stage = { x: number; go?: (t: number) => boolean; speed?: number };
  const E1 = P.escapeLow, E2 = P.escapeHigh;
  /** Is the event `eta` seconds away due within the next `by` seconds (and not long overdue)? */
  const due = (eta: number, by: number) => eta < by && eta > by - .6;
  const stages: Stage[] = [
    { x: P.start.x1 - 1.3, go: t => due(escapeSchedule(E1, t).toLow, lead) },
    { x: E1.x, go: t => due(escapeSchedule(E1, t).toHigh, cross) },
    { x: E2.x, go: t => due(escapeSchedule(E2, t).toHigh, leave) },
    { x: P.tick.x - 2.5, go: t => due(palletSchedule(t, P.tick).toOpen, go) },
    { x: between, go: t => due(palletSchedule(t, P.tock).toOpen, goTock) },
    // Onto the hand's plank, and stop there.
    { x: anchor.x + park, speed: 2.5, go: () => true },
  ];
  return state => {
    const dt = state.elapsed - lastTime, raw = state.bodies.find(body => body.id === 'frame')!.angle;
    bike += Math.atan2(Math.sin(raw - lastRaw), Math.cos(raw - lastRaw)); lastRaw = raw;
    // Speed along the frame, and the world steered relative to it.
    const v = previous && dt > 0 ? ((state.bike.x - previous.x) * Math.cos(bike) + (state.bike.y - previous.y) * Math.sin(bike)) / dt : 0;
    previous = state.bike; lastTime = state.elapsed;
    const steer = (target: number, brake = false): Controls => ({ tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake });
    const cruise = (speed: number, back = -.35, ahead = .35) => bike + clamp((speed - v) * .3, back, ahead);
    const theta = state.bodies.find(body => body.id === 'clock-hand')!.angle;
    const { x, y } = state.bike;
    if (stage < stages.length) {
      const here = stages[stage];
      const close = Math.abs(here.x - x) < .12 && Math.abs(v) < .4;
      if (close && here.go) {
        if (!holdFrom) holdFrom = state.elapsed;
        if (here.go(state.elapsed) && state.elapsed - holdFrom > .3) { stage++; holdFrom = 0; return steer(stage === stages.length ? 0 : .25); }
        // Braked; in the last moments, lean the world toward the way on so the rider leaves at once.
        return steer(stage < stages.length - 1 && here.go(state.elapsed + .4) ? .25 : 0, true);
      }
      const desired = clamp((here.x - x) * 2.5, -(here.speed ?? 2), here.speed ?? 2);
      const brake = here.go !== undefined && Math.abs(here.x - x) < .3 && Math.abs(v) > .3;
      return steer(bike + clamp((desired - v) * .3, -.35, .35), brake);
    }
    // On the hand: lead the loaded swing until it stands against the tower.
    if (stage === stages.length) {
      if (theta > Math.PI / 2 - .012) stage++;
      return steer(Math.min(theta + swing, Math.PI / 2 + .25), true);
    }
    // Ride briskly off the plank onto the face, climb it, round the crown, ride the 12.
    const speed = y < footY + .5 ? climb : y < crownY - 1 ? 2 : rounding;
    return steer(cruise(speed, y < footY + 2 && x < westFace ? 0 : -.35, .35));
  };
}
