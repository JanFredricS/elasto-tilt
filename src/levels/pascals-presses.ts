import type { Apple, Controls, Level, Prop, Snapshot, Surface, TimePlatform, Vec } from '../types';

const p = (x: number, y: number): Vec => ({ x, y });
const g = (id: string, x: number, y: number, w: number, h = .6): Surface => ({ id, x, y, w, h, kind: 'ground' });
const a = (id: string, x: number, y: number): Apple => ({ id, x, y });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** A block whose top face is at `top`, spanning x0..x1 and reaching down to `bottom`. */
const block = (id: string, x0: number, x1: number, top: number, bottom: number): Surface =>
  g(id, (x0 + x1) / 2, (top + bottom) / 2, x1 - x0, top - bottom);

/**
 * Pascal's Presses: a hydraulic workshop. Every press runs on its own clock (period, offset),
 * up and down for ever, eased so it dwells at both ends, whatever the rider does. Geometry
 * (metres, y up):
 *
 *   - The start floor (top y = 0) ends at press A's shaft (x .1 … 5.7). A wooden crate (a 2 × .8
 *     box, slick underneath: friction .5) waits on the floor west of it. Press A is one wide
 *     plate: it rises from the floor to the upper floor (top 3) and back every 12 s. Its partner,
 *     press B, a plate a bike long in a second shaft further east, runs the same stroke a floor
 *     higher (3 → 6) in antiphase: B rests at the bottom exactly as A rests at the top. Press
 *     here, rise there.
 *   - WAIT at A's lip with the crate parked short of it; as A comes down, LOAD: shove the crate
 *     on across the plate until it stops against the far wall of the shaft, and follow it on.
 *     The shaft's east wall is faced with a slick plate, so the crate rides up against it
 *     without dragging. Push it early and it drops into the empty shaft (its floor, 2.2 below,
 *     is lost for good); a rider who drops in after it is crushed as A comes down.
 *   - East of A's shaft a narrow sill (.2 m, at the upper floor's height) and then a pit (2.2
 *     long, floor 2.2): the crate's socket. Only as A rests at the top (its plate .1 above the
 *     sill) can the crate be pushed east off the plate, over the sill, until it tips into the
 *     pit. The pit's floor is slick, so it slides down flat instead of leaning on the sill's
 *     edge, and it locks there only once it lies LEVEL (socket `angle`), flush with the floor:
 *     the gold step from A's top to the ledge. A sinks before it settles; ride A down and back
 *     up, and roll over it. Without it the pit is a 2.2 m gap the rider cannot roll across.
 *   - The ledge ends at B's shaft. WAIT for B to rest at the bottom, ride it up to the press
 *     hall floor (top 6), and roll off east.
 *   - The press hall: a 2.6 m tunnel whose ceiling holds three crush presses (rams). Each
 *     drops from its slot to .9 m above the floor and back every 7 s: just clear of the frame's
 *     top (.84) but far below the helmet's (1.75), so a rider caught under a ram is always
 *     struck on the head (a crash), never pinned alive. Go UNDER each one only while it
 *     rests up; the gaps between them are wide enough to stop and wait in.
 *   - Every shaft is wider than its plate (.1 m each side) and deep enough that a rider who
 *     falls in is struck on the head by the descending plate rather than trapped below it.
 */
export const PASCAL = {
  /** Every lift over-travels its floors by .1, so a rider always steps DOWN onto a press and off it. */
  over: { low: .1, high: .1 },
  start: { x0: -16, x1: 0, y: 0 },
  crate: { x: -6, w: 2, h: .8, friction: .5, density: 1.5 },
  /** Press A: one plate across the whole shaft (x0 … x1), from the start floor to the upper floor. */
  pressA: { x0: .1, x1: 5.7, low: 0, high: 3, period: 12, offset: 0, h: .5 },
  /** The shaft's floor, and the slick facing (x0 … x1) on its east wall. */
  shaftA: { floor: -2.2, face: { x0: 5.75, x1: 5.8 } },
  /** A narrow stone sill at the upper floor's height between A's shaft and the pit. */
  sill: { x0: 5.8, x1: 6 },
  /** The crate's socket: a pit in the upper floor, .2 m longer than the crate, so it lies flat. */
  pit: { x0: 6, x1: 8.2, floor: 2.2 },
  ledge: { x1: 12, y: 3 },
  /** Press B: a bike-long plate, the next floor up, in antiphase with A. */
  pressB: { x0: 12.1, x1: 14.7, low: 3, high: 6, period: 12, offset: .5, h: .5 },
  shaftB: { floor: 1 },
  hall: { x0: 14.8, x1: 44, y: 6 },
  ceiling: { x0: 19, x1: 37, y: 8.6, top: 10.6 },
  /** Crush presses: bottom face from `up` (just inside the ceiling slot) down to `down`. */
  ram: { w: 1.6, h: 1.8, up: 8.7, down: 6.9, period: 7 },
  rams: [{ x: 23, offset: 0 }, { x: 28.5, offset: .62 }, { x: 34, offset: .25 }],
  exit: p(41.5, 6.8),
};
const P = PASCAL;
type Press = { x0: number; x1: number; low: number; high: number; period: number; offset: number; h: number };

const press = (id: string, lift: Press): TimePlatform => {
  const x = (lift.x0 + lift.x1) / 2, centre = (top: number) => p(x, top - lift.h / 2);
  return { id, from: centre(lift.low - P.over.low), to: centre(lift.high + P.over.high), w: lift.x1 - lift.x0, h: lift.h,
    period: lift.period, offset: lift.offset };
};
const rams = P.rams.map((ram, i): TimePlatform => ({ id: `pascal-ram-${i}`, from: p(ram.x, P.ram.up + P.ram.h / 2),
  to: p(ram.x, P.ram.down + P.ram.h / 2), w: P.ram.w, h: P.ram.h, period: P.ram.period, offset: ram.offset }));
/** The press hall's ceiling, cut by a slot (.1 m clear each side) over every ram. */
const ceiling = (): Surface[] => {
  const edges = [P.ceiling.x0, ...P.rams.flatMap(ram => [ram.x - P.ram.w / 2 - .1, ram.x + P.ram.w / 2 + .1]), P.ceiling.x1];
  return Array.from({ length: edges.length / 2 }, (_, i) => block(`pascal-ceiling-${i}`, edges[2 * i], edges[2 * i + 1], P.ceiling.top, P.ceiling.y));
};

/** The crate seated in its pit, flush with the upper floor (anywhere along the pit's floor). */
export const CRATE_SEAT = p((P.pit.x0 + P.pit.x1) / 2, P.pit.floor + P.crate.h / 2);
const crate: Prop = { id: 'pascal-crate', shape: 'box', x: P.crate.x, y: P.start.y + P.crate.h / 2, w: P.crate.w, h: P.crate.h,
  friction: P.crate.friction, density: P.crate.density,
  socket: { x: CRATE_SEAT.x, y: CRATE_SEAT.y, tolerance: .13, speed: .2, angle: .05 } };

export const pascalsPressesLevel: Level = {
  id: 'pascals-presses', name: 'Pascal’s Presses', subtitle: 'Press here, rise there.',
  mechanic: 'Two presses rise and fall in antiphase on their own clocks. Load the crate onto the low press, ride it up and push the crate into the pit at the top, where it seats level as a step; then pass under the crush presses only while they rest up.',
  hint: 'Park the crate at the first shaft and wait for the press to come down. Shove the crate across it and ride up behind it. As the press tops out, push the crate over the sill until it tips into the pit, then brake. Ride the press down and back up, and roll over the seated crate. Wait for the second press at the bottom. In the hall, stop short of each crush press and go under only as it lifts.',
  spawn: p(-13, .72), initialAngle: 0,
  bounds: { min: p(-19, -4), max: p(47, 12) },
  surfaces: [
    block('pascal-start', P.start.x0, P.start.x1, P.start.y, -3),
    g('pascal-back-wall', P.start.x0 - .3, 2.4, .6, 4.8),
    block('pascal-shaft-a', P.start.x1, P.shaftA.face.x0, P.shaftA.floor, -3),
    // The shaft's east wall is faced with a slick plate: the crate rides up against it freely.
    { ...block('pascal-shaft-a-face', P.shaftA.face.x0, P.shaftA.face.x1, P.ledge.y, P.shaftA.floor), friction: 0 },
    block('pascal-sill', P.sill.x0, P.sill.x1, P.ledge.y, -3),
    { ...block('pascal-pit', P.pit.x0, P.pit.x1, P.pit.floor, -3), friction: .05 },
    block('pascal-ledge', P.pit.x1, P.ledge.x1, P.ledge.y, -3),
    block('pascal-shaft-b', P.ledge.x1, P.hall.x0, P.shaftB.floor, -3),
    block('pascal-hall', P.hall.x0, P.hall.x1, P.hall.y, -3),
    ...ceiling(),
    g('pascal-end-wall', P.hall.x1 + .3, P.hall.y + 2.4, .6, 4.8),
  ],
  props: [crate],
  timePlatforms: [press('pascal-press-a', P.pressA), press('pascal-press-b', P.pressB), ...rams],
  apples: [
    a('pascal-rise', 2.4, 2),
    a('pascal-step', CRATE_SEAT.x, P.ledge.y + 1.3),
    a('pascal-crest', (P.pressB.x0 + P.pressB.x1) / 2, P.pressB.high + 1),
    a('pascal-under', P.rams[1].x, P.hall.y + .9),
    a('pascal-hall-end', 38.5, P.hall.y + .9),
  ],
  routeHints: [
    { x: -2.5, y: 1.6, angle: 0, label: 'WAIT' },
    { x: (P.pressA.x0 + P.pressA.x1) / 2, y: 1.6, angle: 0, label: 'LOAD' },
    { x: P.ceiling.x0 + 1.2, y: P.hall.y + 1.4, angle: 0, label: 'UNDER' },
  ],
  exit: P.exit, difficulty: 13.5, accent: '#c8a060',
};

/** Where a press's top is at `time`, and how long until it next rests at the bottom / top. */
export function pressSchedule(lift: { low: number; high: number; period: number; offset: number }, time: number) {
  const f = ((time / lift.period + lift.offset) % 1 + 1) % 1;
  const low = lift.low - P.over.low, high = lift.high + P.over.high;
  return { top: low + (high - low) * (1 - Math.cos(2 * Math.PI * f)) / 2,
    toLow: (1 - f) * lift.period, toHigh: ((1.5 - f) % 1) * lift.period };
}
/** Where a crush press's bottom face is at `time`, and how long until it next rests up. */
export function ramSchedule(ram: { offset: number }, time: number) {
  const f = ((time / P.ram.period + ram.offset) % 1 + 1) % 1;
  return { bottom: P.ram.up + (P.ram.down - P.ram.up) * (1 - Math.cos(2 * Math.PI * f)) / 2, toUp: (1 - f) * P.ram.period };
}

/**
 * Observation-only demonstration (tilt and brake, as a player). It reads the presses' cycles
 * off the clock, as a player watching them would. It pushes the crate up to A's lip and waits
 * braked; sets off `lead` s before A rests at the bottom, shoving the crate across the plate to
 * the far wall and following it on; rides A up braked; `push` s before A tops out it shoves
 * the crate over the sill until it tips into the pit, stopping with its front tyre still on the
 * plate; rides A down and, once the crate has seated and A is up again, rolls over the step,
 * waits at B's shaft, rides B up, and passes under each crush press as it lifts (setting off
 * `under` s before the press rests up).
 */
export function createPascalsPressesPilot(options: { lead?: number; push?: number; under?: number } = {}): (state: Snapshot) => Controls {
  const lead = options.lead ?? 1.2, push = options.push ?? 1.4, under = options.under ?? 1.2;
  let previous: Vec | undefined, lastTime = 0, stage = 0, holdFrom = 0;
  type Stage = { x: number; go?: (t: number, state: Snapshot) => boolean; speed?: number };
  const A = P.pressA, B = P.pressB;
  const due = (eta: number, by: number) => eta < by && eta > by - .6;
  /** The frame's x with its front tyre against the crate's west face, the crate centred at `x`. */
  const behind = (x: number) => x - P.crate.w / 2 - 1.04;
  const settled = (state: Snapshot) => !!state.bodies.find(body => body.id === 'pascal-crate')?.settled;
  const stages: Stage[] = [
    { x: behind(P.start.x1 - .3 - P.crate.w / 2), speed: 1.5, go: t => due(pressSchedule(A, t).toLow, lead) },
    { x: behind(P.shaftA.face.x0 - P.crate.w / 2) - .05, speed: 3, go: t => due(pressSchedule(A, t).toHigh, push) },
    { x: A.x1 - 1.12, speed: 1.5, go: (t, s) => settled(s) && pressSchedule(A, t).top > A.high - .05 },
    { x: P.ledge.x1 - 1.3, go: t => due(pressSchedule(B, t).toLow, lead) },
    { x: (B.x0 + B.x1) / 2, go: t => due(pressSchedule(B, t).toHigh, .9) },
    ...P.rams.map((ram): Stage => ({ x: ram.x - P.ram.w / 2 - 1.5, go: t => due(ramSchedule(ram, t).toUp, under) })),
    { x: P.exit.x },
  ];
  return state => {
    const dt = state.elapsed - lastTime, heading = state.bodies.find(body => body.id === 'frame')!.angle;
    const v = previous && dt > 0 ? ((state.bike.x - previous.x) * Math.cos(heading) + (state.bike.y - previous.y) * Math.sin(heading)) / dt : 0;
    previous = state.bike; lastTime = state.elapsed;
    const level = (target: number, brake = false) => ({ tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake });
    const here = stages[stage], x = state.bike.x;
    const close = Math.abs(here.x - x) < .15 && Math.abs(v) < .4;
    if (close && here.go) {
      if (!holdFrom) holdFrom = state.elapsed;
      if (here.go(state.elapsed, state) && state.elapsed - holdFrom > .3) { stage++; holdFrom = 0; return level(.3); }
      return level(0, true);
    }
    const desired = clamp((here.x - x) * 2.5, -(here.speed ?? 2), here.speed ?? 2);
    const brake = here.go !== undefined && Math.abs(here.x - x) < .3 && Math.abs(v) > .3;
    // Shoving the loose crate takes a firmer lean: the bike's weight has to beat its friction too.
    const box = state.bodies.find(body => body.id === 'pascal-crate');
    const shove = box && !box.settled && box.x > x && box.x - x < 2.3 && desired > 0 ? .2 : 0;
    return level(heading + shove + clamp((desired - v) * .4, -.45, .45), brake);
  };
}
