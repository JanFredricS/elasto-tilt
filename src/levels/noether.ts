import type { Apple, Controls, Level, Prop, RouteHint, Snapshot, Surface, Swing, TimePlatform, Vec } from '../types';

const p = (x: number, y: number): Vec => ({ x, y });
const g = (id: string, x: number, y: number, w: number, h = .6): Surface => ({ id, x, y, w, h, kind: 'ground' });
const a = (id: string, x: number, y: number): Apple => ({ id, x, y });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
/** A block spanning x0..x1 with its top at `top`, reaching down to `bottom`. */
const block = (id: string, x0: number, x1: number, top: number, bottom: number): Surface =>
  g(id, (x0 + x1) / 2, (top + bottom) / 2, x1 - x0, top - bottom);
/** A slab whose ridden face runs from `from` to `to`; the stone lies to the right of that direction. */
const slab = (id: string, from: Vec, to: Vec, h = .6, kind: Surface['kind'] = 'ground'): Surface => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  return { id, kind, angle, w: Math.hypot(to.x - from.x, to.y - from.y), h,
    x: (from.x + to.x) / 2 + Math.sin(angle) * h / 2, y: (from.y + to.y) / 2 - Math.cos(angle) * h / 2 };
};
/** An arc of chained slabs turning the ridden heading from h0 to h1 (radians) on `radius`. */
const arc = (id: string, from: Vec, h0: number, h1: number, radius: number, pieces = 6) => {
  const step = (h1 - h0) / pieces, chord = 2 * radius * Math.sin(Math.abs(step) / 2);
  let at = from;
  const surfaces = Array.from({ length: pieces }, (_, i) => {
    const heading = h0 + (i + .5) * step, to = p(at.x + chord * Math.cos(heading), at.y + chord * Math.sin(heading));
    const piece = { ...slab(`${id}-${i}`, at, to), chain: id };
    at = to; return piece;
  });
  return { surfaces, end: at };
};
/** A deck edge rounded over a knee into a straight slide `angle` below horizontal, down to `floor`
 *  (as in Hooke's Springboard: riding straight down a slide adds no pitch spin). */
const chute = (id: string, top: Vec, floor: number, angle: number, knee: number) => {
  const bend = arc(`${id}-knee`, top, 0, -angle, knee);
  const bottom = p(bend.end.x + (bend.end.y - floor) / Math.tan(angle), floor);
  return { surfaces: [...bend.surfaces, { ...slab(`${id}-slide`, bend.end, bottom), chain: `${id}-knee` }], bottom };
};

/**
 * Noether's Symmetry. The campaign's victory lap: one monument that is its own image under a
 * half turn about the origin. Every stone, pad, piston, plank and wedge on its top face has a
 * twin at (−x, −y), turned by π, on its underside. The rider rides the top face out (eastward,
 * world level), curls round the east nose onto the underside and rides it home westward with
 * the world turned halfway round: in the rider's own frame the return is the outward ride again,
 * mechanic for mechanic. The west nose (the east nose's twin) brings the rider back onto the top
 * face, where the door waits beside the start. Geometry of the top face (metres, y up), west to east:
 *
 *   - Home deck, top y = 0: door, spawn, then the swing. The deck is the swing's shelf.
 *   - The swing (Huygens' Return, smaller): a plank 3 m wide on a 4 m bearing, light and heavily
 *     damped. At rest it continues the deck; brake on it and turn the world a quarter turn and
 *     it swings up until it stands against the tower, its top face flush with the tower's west
 *     face. Below the tower foot the swing's bay is cut back a metre so the plank's end clears it.
 *   - The tower: a short face over a convex crest (radius 2) onto the high deck (T1).
 *   - Hooke's pit: a knee and a 50° slide down to a brass pad 5 m below, a 4 m spike floor, and a
 *     ledge 3.5 m below the deck. Lean the world forward in the throw to clear the spikes.
 *   - The lift: a pair of brass pistons (the Piston Works' lift A) rising from the ledge back to the
 *     deck every 8 s. Board it as it rests low, brake, ride it up, roll off.
 *   - The wedge (the Clockwork Wedge's, light and very heavily damped): sitting on the deck under a
 *     sloping lintel that follows its ramp face a hand's breadth above. Tilt the world and push it
 *     east into a seat at the foot of a 2.5 m step; seated, it is stone, a ramp up the step.
 *   - The upper deck (E) and the east nose, a convex half-turn of radius (E + 0)/2 down to the
 *     underside (y = 0 at the east end: the home deck's twin).
 *
 * Why the twins survive the outward ride. While the rider is on top the world is near level, so in
 * every twin's own frame gravity points "up", away from its floor:
 *   - The twin plank is an inverted pendulum; it starts leaning a hair onto its shelf (the swing's
 *     lower stop). The swing's quarter turn (world +π/2) presses it harder onto that stop; turning
 *     the world round the east nose swings its gravity past it, then down: it creeps about 5°
 *     off the stop toward its tower (it is light and very heavily damped, so it does not swing
 *     back by itself). Board it briskly and stop a little past the bearing: the rider's weight
 *     there returns it to the stop; a slow rider's weight short of the bearing runs it away from
 *     the shelf under the back wheel.
 *   - The twin wedge rises a hand's breadth onto its lintel and rests flat against it. The lintel
 *     follows the ramp face, so a wedge sliding west under it jams between lintel and floor (a stop
 *     that only a wedge meets), and a wedge pushed east only opens the gap. When the world turns
 *     round the east nose it drops the hand's breadth back onto its floor and creeps a metre toward
 *     its seat. The original wedge, on the floor, drifts under two metres east while the world is
 *     turned for the swing (the damping caps a wedge sliding under its own weight at ≈ .2 m/s, a
 *     rider pushing adds several times its weight), well short of tipping into the seat's recess:
 *     its seat sits 7.5 m on. It only becomes stone dropped in level against the step (a
 *     tolerance of .1 m), so a wedge hung tilted on the recess lip is never fixed askew.
 *   - Spring pads, spikes and pistons do not care which way is down.
 */
const DEG = Math.PI / 180;
const T0 = 0;
/** The swing: bearing length, plank width, the hand's breadth between plank and shelf. */
const SWING = { length: 4, width: 3, gap: .03, mass: .1, damping: 400 };
const CREST = 2, FACE = 1.5;
const WEDGE = { w: 5, h: 2.85, toe: .35, density: .1, friction: .75, damping: 50, gap: .15, lintel: [3.1, 7.5] as const };
const PIECE = { w: .9, h: .5, offset: .65 }, OVER = .1;
const SLIDE = 50 * DEG, KNEE = 1.5;
/** Lengths along the top face, west to east (from the west nose's top end). */
const SPAN = { home: 11, run: 5, ledge: 16, shaft: 2.4, approach: 3, push: 7.5, upper: 7 };

const ay0 = T0 + SWING.length - .12;
/** Height of the tower foot (a hand's breadth above the parked plank's top end) and of the high deck. */
const towerFoot = ay0 + SWING.width / 2 + SWING.gap;
const T1 = towerFoot + FACE + CREST;
const E = T1 + WEDGE.h - WEDGE.toe;
/** The top face's x positions, relative to the west nose; then shifted so the monument is centred on x = 0. */
const rel = (() => {
  const shelf = SPAN.home, anchor = shelf + SWING.width / 2 + SWING.gap;
  const face = anchor + SWING.length - .12, knee = face + CREST + SPAN.run;
  const shaft = knee + 13 + SPAN.ledge, wedge = shaft + SPAN.shaft + SPAN.approach;
  const step = wedge + WEDGE.w + SPAN.push, nose = step + SPAN.upper;
  return { shelf, anchor, face, knee, shaft, wedge, step, nose };
})();
const XR = rel.nose / 2, XL = -XR;
const X = Object.fromEntries(Object.entries(rel).map(([k, v]) => [k, v + XL])) as typeof rel;
const NOSE_R = (E + T0) / 2;
const noseCentre = p(XR, (E - T0) / 2);

export const NOETHER = {
  T0, T1, E, XR, X, swing: SWING, wedge: WEDGE, nose: { radius: NOSE_R, centre: noseCentre },
  anchor: p(X.anchor, ay0), westFace: X.face, towerFoot,
  /** Hooke's pit: the pad 5 m below the deck, the spike floor, the ledge 3.5 m below the deck. */
  pit: { pad: T1 - 5, spikes: [X.knee + 9, X.knee + 13] as const, ledge: T1 - 3.5 },
  lift: { x: X.shaft + 1.2, low: T1 - 3.5, high: T1, period: 8, offset: .3 },
  /** The wedge's seat: a recess as deep as its toe at the foot of the step (x = step). */
  seat: { x0: X.step - WEDGE.w - .3, x1: X.step },
  spawn: p(XL + 6, T0 + .72), exit: p(XL + 2.5, T0 + .8),
  ids: { swing: 'noether-swing', wedge: 'noether-wedge', lift: 'noether-lift' },
};
const N = NOETHER;
type Lift = typeof N.lift;

/** The half turn about the origin that maps the monument onto itself. */
export const twinPoint = (v: Vec): Vec => p(-v.x, -v.y);
const twinId = (id: string) => `${id}-twin`;
const twinSurface = (s: Surface): Surface => ({ ...s, id: twinId(s.id), x: -s.x, y: -s.y, angle: wrap((s.angle ?? 0) + Math.PI),
  ...(s.chain ? { chain: twinId(s.chain) } : {}) });

const pistons = (id: string, lift: Lift): TimePlatform[] => [-1, 1].map((side, i) => {
  const x = lift.x + side * PIECE.offset, centre = (top: number) => p(x, top - PIECE.h / 2);
  return { id: `${id}-${i}`, from: centre(lift.low - OVER), to: centre(lift.high + OVER), w: PIECE.w, h: PIECE.h, period: lift.period, offset: lift.offset };
});

const pit = chute('noether-chute', p(X.knee, T1), N.pit.pad, SLIDE, KNEE);
const crest = arc('noether-crest', p(X.face, T1 - CREST), Math.PI / 2, 0, CREST, 12);
const nose = arc('noether-nose', p(XR, E), 0, -Math.PI, NOSE_R, 32);
/** The wedge's ramp face, measured `u` metres east of its west end, as it sits on the deck. */
const rampY = (u: number) => T1 + WEDGE.toe + (WEDGE.h - WEDGE.toe) * u / WEDGE.w;
const lintel = (() => {
  const [u0, u1] = WEDGE.lintel, lift = WEDGE.gap;
  // Ridden (lower) face from east to west, so the stone lies above it.
  return slab('noether-lintel', p(X.wedge + u1, rampY(u1) + lift), p(X.wedge + u0, rampY(u0) + lift), .4);
})();
const inset = (NOSE_R - .75) / Math.SQRT2;

/** The top half of the monument; the underside is its twin. Blocks west of the knee reach down to
 *  y −1.8, blocks east of the shaft down to 1.2 and the rest down to 0, so a block and its twin
 *  together fill the monument without either poking out of the other face. */
const topSurfaces: Surface[] = [
  block('noether-home', XL, X.shelf, T0, -1.8),
  block('noether-bay', X.shelf, X.face + 1, T0 - 1.2, -1.8),
  block('noether-bay-wall', X.face + 1, X.face + CREST, towerFoot, -1.8),
  block('noether-tower', X.face, X.face + CREST, T1 - CREST, towerFoot),
  block('noether-crest-core', X.face + .7, X.face + CREST, T1 - .7, T1 - CREST),
  ...crest.surfaces,
  block('noether-deck', X.face + CREST, X.knee, T1, -1.8),
  ...pit.surfaces,
  { ...slab('noether-pad', pit.bottom, p(N.pit.spikes[0], N.pit.pad), .5), kind: 'spring' as const },
  block('noether-pit-floor', N.pit.spikes[0], N.pit.spikes[1], N.pit.pad - .2, N.pit.pad - .8),
  { ...block('noether-spikes', N.pit.spikes[0], N.pit.spikes[1], N.pit.pad - .02 + .175, N.pit.pad - .02 - .175), kind: 'hazard' as const },
  block('noether-pit-base', X.knee, N.pit.spikes[1], N.pit.pad - .8, 0),
  block('noether-ledge', N.pit.spikes[1], X.shaft, N.pit.ledge, 0),
  block('noether-shaft', X.shaft, X.shaft + SPAN.shaft, N.pit.ledge - 1.2, 0),
  block('noether-wedge-deck', X.shaft + SPAN.shaft, N.seat.x0, T1, 1.2),
  block('noether-seat', N.seat.x0, N.seat.x1, T1 - WEDGE.toe, 1.2),
  block('noether-step', X.step, XR, E, 1.2),
  lintel,
  ...nose.surfaces,
  block('noether-nose-core', XR, XR + inset, noseCentre.y + inset, noseCentre.y - inset),
];

const swing: Swing = { id: N.ids.swing, anchor: N.anchor, length: SWING.length, width: SWING.width, mass: SWING.mass, damping: SWING.damping };
const wedge: Prop = {
  id: N.ids.wedge, shape: 'wedge', x: X.wedge + WEDGE.w / 2, y: T1 + WEDGE.h / 2, w: WEDGE.w, h: WEDGE.h, toe: WEDGE.toe,
  density: WEDGE.density, friction: WEDGE.friction, damping: WEDGE.damping,
  socket: { x: N.seat.x1 - WEDGE.w / 2, y: T1 + WEDGE.h / 2 - WEDGE.toe, tolerance: .1, speed: .25, angle: .03 },
};
const topApples: Apple[] = [
  a('noether-apple-face', X.face - .9, towerFoot + .75),
  a('noether-apple-throw', X.knee + 11, T1 - 1.2),
  a('noether-apple-lift', N.lift.x, T1 + 1.1),
  a('noether-apple-step', X.step + 2.5, E + .9),
  a('noether-apple-nose', XR + NOSE_R + .9, noseCentre.y),
];

export const noetherLevel: Level = {
  id: 'noethers-symmetry', name: 'Noether’s Symmetry', subtitle: 'What is conserved returns.',
  mechanic: 'One monument, the same under a half turn. Ride its top face out — swing, spring, lift and wedge — round the far nose, and ride its underside home with the world turned halfway round, meeting every mechanic again upside down.',
  hint: 'Out along the top: brake on the plank and turn the world to swing it up, lean forward in the spring’s throw, board the lift as it rests low, and tilt to push the wedge into its seat. Round the far nose and turn the world with you: the underside is the same ride again. The door is beside the start. On phone, pause and resume to recenter your grip between turns.',
  spawn: N.spawn, exit: N.exit, initialAngle: 0, difficulty: 15.5, accent: '#9fb4d8',
  bounds: { min: p(XL - NOSE_R - 6, -(E + 6)), max: p(XR + NOSE_R + 6, E + 6) },
  surfaces: [...topSurfaces, ...topSurfaces.map(twinSurface)],
  swings: [swing, { ...swing, id: twinId(swing.id), anchor: twinPoint(swing.anchor), angle: Math.PI - .006 }],
  props: [wedge, { ...wedge, id: twinId(wedge.id), ...twinPoint(wedge), angle: Math.PI,
    socket: { ...wedge.socket!, ...twinPoint(wedge.socket!) } }],
  timePlatforms: [...pistons(N.ids.lift, N.lift),
    ...pistons(N.ids.lift, N.lift).map(t => ({ ...t, id: twinId(t.id), from: twinPoint(t.from), to: twinPoint(t.to) }))],
  apples: [...topApples, ...topApples.map(apple => ({ id: `${apple.id}-return`, ...twinPoint(apple) }))],
  routeHints: ([
    { x: N.anchor.x + 2.2, y: 1.6, angle: 45 * DEG, label: 'SWING UP' },
    { x: X.knee + 9.5, y: T1 + .4, angle: 0, label: 'LEAN' },
    { x: X.shaft - 2.5, y: N.pit.ledge + 1.6, angle: 0, label: 'WAIT' },
    { x: X.wedge - 1.5, y: T1 + 1.4, angle: 0, label: 'PUSH' },
  ] as RouteHint[]).flatMap(hint => [hint, { ...hint, ...twinPoint(hint), angle: hint.angle + Math.PI, label: hint.label }])
    .concat([{ x: XR + NOSE_R + 2.2, y: noseCentre.y, angle: -Math.PI / 2, label: 'TURN UNDER' }]),
};

/** Where a lift's tops are at `time`, and how long until they next reach the bottom / top. */
export function liftSchedule(lift: Lift, time: number) {
  const f = ((time / lift.period + lift.offset) % 1 + 1) % 1;
  const low = lift.low - OVER, high = lift.high + OVER;
  return { top: low + (high - low) * (1 - Math.cos(2 * Math.PI * f)) / 2,
    toLow: (1 - f) * lift.period, toHigh: ((1.5 - f) % 1) * lift.period };
}

/** The same snapshot seen from the twin's frame: positions turned by π about the origin, every
 *  angle (bodies and world) turned by π, and twin bodies under their originals' ids. */
export function twinSnapshot(state: Snapshot): Snapshot {
  const original = (id: string) => id.endsWith('-twin') ? id.slice(0, -5) : `${id}-twin`;
  return { ...state, bike: twinPoint(state.bike), worldAngle: state.worldAngle + Math.PI,
    bodies: state.bodies.map(body => ({ ...body, ...twinPoint(body), angle: wrap(body.angle + Math.PI),
      id: body.kind === 'frame' || body.kind === 'wheel' || body.kind === 'head' ? body.id : original(body.id) })) };
}

export type HalfOptions = { lean?: number; push?: number; rounding?: number; board?: number };
/**
 * One half of the circuit, as a player rides it, in the top face's frame: board the plank and
 * swing it up (Huygens' Return), climb the face and round the crest, run into Hooke's pit and lean
 * the world forward in the throw (Hooke's Springboard), scrub the landing speed and wait braked by
 * the shaft until the lift is due low, ride it up and roll off (the Piston Works), tilt the world to
 * push the wedge into its seat (the Clockwork Wedge), then ride on heading-relative up the ramp and
 * round the nose.
 */
export function createHalfPilot(options: HalfOptions = {}): (state: Snapshot) => Controls {
  const lean = options.lean ?? .6, push = options.push ?? .45, rounding = options.rounding ?? 1.6;
  const board = options.board ?? 3;
  let previous: Vec | undefined, stage = 0, bike = 0, lastRaw = 0, holdFrom = 0, aboard = false, hung: number | undefined;
  return state => {
    const v = previous ? { x: (state.bike.x - previous.x) * 120, y: (state.bike.y - previous.y) * 120 } : p(0, 0);
    previous = state.bike;
    const raw = state.bodies.find(body => body.id === 'frame')!.angle;
    bike += wrap(raw - lastRaw); lastRaw = raw;
    const theta = state.bodies.find(body => body.id === N.ids.swing)?.angle ?? 0;
    const seated = !!state.bodies.find(body => body.id === N.ids.wedge)?.settled;
    const { x, y } = state.bike;
    const steer = (target: number, brake = false): Controls => ({ tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake });
    const along = (heading: number) => v.x * Math.cos(heading) + v.y * Math.sin(heading);
    const cruise = (heading: number, speed: number, back = -.3, ahead = .3) => heading + clamp((speed - along(heading)) * .25, back, ahead);
    const lift = liftSchedule(N.lift, state.elapsed);
    /** Is the event `eta` seconds away due within the next `by` seconds (and not long overdue)? */
    const due = (eta: number, by: number) => eta < by && eta > by - .6;
    // Stage changes.
    // Board briskly and brake a little past the bearing, measured on the plank as it hung when the
    // rider reached it (the twin comes out of the nose hanging a few degrees off true): a slow
    // rider's weight west of the bearing runs the plank away from the shelf under the back wheel.
    if (hung === undefined && x > X.shelf - .5) hung = theta;
    if (hung !== undefined && x > N.anchor.x + SWING.length * Math.sin(hung) + .3) aboard = true;
    if (stage === 0 && aboard && Math.abs(v.x) < .08) stage = 1;
    if (stage === 1 && theta > Math.PI / 2 - .012) stage = 2;
    if (stage === 2 && bike < .3 && x > X.face + CREST) stage = 3;
    if (stage === 3 && x > N.pit.spikes[1] + .5 && y > N.pit.ledge && y < N.pit.ledge + 1.2) stage = 4;
    if (stage === 4 && Math.abs(X.shaft - 1.3 - x) < .12 && Math.abs(v.x) < .4) {
      if (!holdFrom) holdFrom = state.elapsed;
      if (due(lift.toLow, 1.1) && state.elapsed - holdFrom > .3) { stage = 5; holdFrom = 0; }
    }
    if (stage === 5 && Math.abs(N.lift.x - x) < .12 && Math.abs(v.x) < .4) {
      if (!holdFrom) holdFrom = state.elapsed;
      if (due(lift.toHigh, .9) && state.elapsed - holdFrom > .3) { stage = 6; holdFrom = 0; }
    }
    if (stage === 6 && seated) stage = 7;
    switch (stage) {
      case 0: return !aboard ? steer(cruise(0, board)) : steer(0, true);
      // Lead the loaded swing; the brake keeps the bike on the plank.
      case 1: return steer(Math.min(theta + .55, Math.PI / 2 + .25), true);
      // Climb off the plank with the world well past it: the rider's weight above the bearing
      // would otherwise swing the plank back off the tower. Feather the brake to creep. Then
      // climb the face and round the crest.
      case 2: {
        if (y < towerFoot + .8) return steer(Math.max(bike, Math.PI / 2) + .45, along(bike) > .7);
        return steer(cruise(bike, rounding, -.3, .3));
      }
      case 3: {
        if (x < X.knee - .5) return steer(cruise(0, 2.5, -.6, .3));
        // On the slide below the knee: lean forward through the throw, level to land.
        if (x > X.knee && y < T1 - 1) return steer(x < N.pit.spikes[1] - 1.5 ? lean : 0);
        return steer(0);
      }
      case 4: {
        // Landed fast: lean the world back and feather the brake (released whenever the nose dips).
        if (v.x > 3) return steer(clamp((2.5 - v.x) * .22, -.6, .3), bike > -.06);
        const target = X.shaft - 1.3, close = Math.abs(target - x) < .12 && Math.abs(v.x) < .4;
        if (close) return steer(due(lift.toLow, 1.5) ? .25 : 0, true);
        const desired = clamp((target - x) * 2.5, -2, 2);
        return steer(bike + clamp((desired - v.x) * .3, -.35, .35), Math.abs(target - x) < .3 && Math.abs(v.x) > .3);
      }
      case 5: {
        const close = Math.abs(N.lift.x - x) < .12 && Math.abs(v.x) < .4;
        if (close) return steer(due(lift.toHigh, 1.3) ? .25 : 0, true);
        const desired = clamp((N.lift.x - x) * 2.5, -2, 2);
        return steer(bike + clamp((desired - v.x) * .3, -.35, .35), Math.abs(N.lift.x - x) < .3 && Math.abs(v.x) > .3);
      }
      // Pushing: the world tilted toward the step, more while the rider is slow.
      case 6: return steer(clamp(push + (1 - v.x) * .4, .15, .8));
      default: return steer(cruise(bike, 2));
    }
  };
}

/**
 * Observation-only demonstration of the whole circuit: the half pilot rides the top face out and
 * round the east nose; once the bike is on the underside it is handed a fresh half pilot that sees
 * the world through the half turn (twinSnapshot), so the return is literally the outward ride
 * again, and it rides on round the west nose to the door.
 */
export function createNoetherPilot(outward: HalfOptions = {}, inward: HalfOptions = outward): (state: Snapshot) => Controls {
  let half = createHalfPilot(outward), returning = false;
  return state => {
    if (!returning && state.bike.y < T0 && state.bike.x > 0) { returning = true; half = createHalfPilot(inward); }
    return half(returning ? twinSnapshot(state) : state);
  };
}
