import type { Apple, Controls, Level, Snapshot, Surface, Vec } from '../types';

const p = (x: number, y: number): Vec => ({ x, y });
const g = (id: string, x: number, y: number, w: number, h = .6): Surface => ({ id, x, y, w, h, kind: 'ground' });
const a = (id: string, x: number, y: number): Apple => ({ id, x, y });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** A block whose top face is at `top`, spanning x0..x1 and reaching down to `bottom`. */
const block = (id: string, x0: number, x1: number, top: number, bottom: number): Surface =>
  g(id, (x0 + x1) / 2, (top + bottom) / 2, x1 - x0, top - bottom);
/** A pad whose ridden face runs from `from` to `to` (left to right). */
const pad = (id: string, from: Vec, to: Vec, h = .5): Surface => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  return { id, kind: 'spring', angle, w: Math.hypot(to.x - from.x, to.y - from.y), h,
    x: (from.x + to.x) / 2 + Math.sin(angle) * h / 2, y: (from.y + to.y) / 2 - Math.cos(angle) * h / 2 };
};
/** A ground slab whose top face runs from `from` to `to`. */
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
/** A plateau edge rounded over a knee into a straight slide at `angle` below
 *  horizontal, down to `floor`. Riding straight down a slide adds no pitch spin;
 *  a square edge would pivot the bike nose-over before a drop this deep. */
const chute = (id: string, top: Vec, floor: number, angle: number, knee: number) => {
  const bend = arc(`${id}-knee`, top, 0, -angle, knee);
  const bottom = p(bend.end.x + (bend.end.y - floor) / Math.tan(angle), floor);
  return { surfaces: [...bend.surfaces, { ...slab(`${id}-slide`, bend.end, bottom), chain: `${id}-knee` }], bottom };
};
const spikes = (id: string, x0: number, x1: number, y: number): Surface => ({ id, x: (x0 + x1) / 2, y, w: x1 - x0, h: .35, kind: 'hazard' });

/**
 * Hooke's Springboard. Spring pads return a landing at SPRING_RESTITUTION (.9)
 * of its normal speed: a straight drop of h rebounds ≈ .8 h. Each pit is
 * entered down a steep slide that meets the brass pad at its foot, so the
 * pad reflects the downward half of the slide speed into a high, forward
 * throw. The throw alone falls short of the far ledge; what carries the
 * rider over the spikes is leaning gravity forward in flight
 * (gravity = g·(sin a, −cos a)), then levelling it again to land.
 *
 *   - Plateau y = 0 to x = 6, rounded over a knee into a 50° slide down to
 *     pad 1 (y −5, to x 15); spikes to x 19; ledge 1 (top −3.5) x 19 … 34.
 *   - The same slide from ledge 1 to pad 2 (y −8.5, to x 43); spikes to
 *     x 49; the door ledge (top −7) x 49 … 59 ends in a catching quarter-pipe.
 *   - The throw leaves at ≈ (6.4, 6.8) m/s. With the world level it comes
 *     down at x ≈ 17.6, in the spikes. A forward lean begun on the slide (the
 *     world turns at most .95 rad/s) and held to a metre and a half short of
 *     the ledge carries it onto ledge 1 for any lean from ≈ .35 to .8 rad
 *     (landing x ≈ 20 … 26): the first jump teaches the move generously.
 *     The second, with the same 6 m spike gap as before, needs ≥ .5 rad.
 *   - The rider arrives fast (up to ≈ 13 m/s) and must scrub speed on the
 *     15 m ledge 1 before the second slide: lean the world back and feather
 *     the brake.
 *   - The slides add no pitch spin (a square edge this deep would pivot the
 *     bike nose-over), so the rider bounces and lands nose-down at the
 *     slide's own 50° and rocks back onto both wheels.
 */
const DEG = Math.PI / 180;
const SLIDE = 50 * DEG, KNEE = 1.5;
const plateau = { x0: -4, x1: 6, y: 0 }, ledge1 = { x0: 19, x1: 34, y: -3.5 };
const ledge2 = { x0: 49, x1: 59, y: -7 };
const chute1 = chute('spring-chute-1', p(plateau.x1, plateau.y), -5, SLIDE, KNEE);
const chute2 = chute('spring-chute-2', p(ledge1.x1, ledge1.y), -8.5, SLIDE, KNEE);
const catcher = arc('spring-catch', p(ledge2.x1, ledge2.y), 0, Math.PI / 2, 2.5);
export const SPRING = {
  plateau, ledge1, ledge2, slide: SLIDE,
  /** Pad faces (left to right) and the spike floors between pad and ledge: gaps of 4 and 6 m. */
  pit1: { pad: [chute1.bottom, p(15, -5)] as const, spikes: [15, ledge1.x0] as const, floor: -5 },
  pit2: { pad: [chute2.bottom, p(43, -8.5)] as const, spikes: [43, ledge2.x0] as const, floor: -8.5 },
  door: p(54, -6.2),
};
const S = SPRING;

export const springboardLevel: Level = {
  id: 'hookes-springboard', name: 'Hooke’s Springboard', subtitle: 'As the stretch, so the force',
  mechanic: 'Brass spring pads throw you back up. Lean gravity forward in flight to carry over the spikes.',
  hint: 'Drop onto the brass, lean the world forward in the air, level it to land. Don’t brake on the pads or in the air: locked wheels pitch you over on landing.',
  spawn: p(-1, .72), initialAngle: 0,
  bounds: { min: p(-8, -12), max: p(65, 5) },
  surfaces: [
    block('spring-plateau', S.plateau.x0, S.plateau.x1, S.plateau.y, S.pit1.floor - .5),
    ...chute1.surfaces,
    g('spring-back-wall', S.plateau.x0 - .3, 2, .6, 4.6),
    pad('spring-pad-1', ...S.pit1.pad),
    block('spring-pit-1-floor', S.pit1.spikes[0], S.pit1.spikes[1], S.pit1.floor - .2, S.pit1.floor - .8),
    spikes('spring-spikes-1', S.pit1.spikes[0], S.pit1.spikes[1], S.pit1.floor - .02),
    block('spring-ledge-1', S.ledge1.x0, S.ledge1.x1, S.ledge1.y, S.pit2.floor - .5),
    ...chute2.surfaces,
    pad('spring-pad-2', ...S.pit2.pad),
    block('spring-pit-2-floor', S.pit2.spikes[0], S.pit2.spikes[1], S.pit2.floor - .2, S.pit2.floor - .8),
    spikes('spring-spikes-2', S.pit2.spikes[0], S.pit2.spikes[1], S.pit2.floor - .02),
    block('spring-ledge-2', S.ledge2.x0, S.ledge2.x1, S.ledge2.y, S.pit2.floor - .5),
    // A quarter-pipe catches a rider who reaches the door short of an apple.
    ...catcher.surfaces,
    g('spring-end-wall', catcher.end.x + .3, catcher.end.y + 1.5, .6, 3),
  ],
  apples: [
    a('spring-start', 4, .9),
    a('spring-arc-1', 17, -1.2),
    a('spring-ledge', 26, -2.6),
    a('spring-arc-2', 45, -4.9),
  ],
  routeHints: [
    { x: 7.2, y: 1.2, angle: -SLIDE, label: 'DROP' },
    { x: 15.5, y: .2, angle: 0, label: 'LEAN' },
  ],
  exit: S.door, difficulty: 14.5, accent: '#c99a4e',
};

/**
 * Observation-only demonstration. On the ground it holds a steady ride speed.
 * Once it is on a slide below the knee it starts leaning gravity forward by
 * `lean` (`secondLean` over the second pit; the world turns at most .95 rad/s,
 * so the lean must start before the throw), keeps the lean through the flight until it is nearly over the next
 * ledge, then levels the world to land. On the door ledge it eases to a stop.
 */
export function createSpringboardPilot(lean = .6, cruise = 2.5, secondLean = lean): (state: Snapshot) => Controls {
  let previous: Vec | undefined, pit = 0;
  const pits = [{ top: S.plateau, pad: S.pit1.pad, ledge: S.ledge1 }, { top: S.ledge1, pad: S.pit2.pad, ledge: S.ledge2 }];
  return state => {
    const vx = previous ? (state.bike.x - previous.x) * 120 : 0;
    previous = state.bike;
    const { x, y } = state.bike, next = pits[pit];
    // Landed and rolling on the far ledge: that pit is done.
    if (next && x > next.ledge.x0 + .5 && y > next.ledge.y && y < next.ledge.y + 1) pit++;
    // Riding: hold the cruise speed. Landing fast, lean the world back and feather the brake:
    // released whenever the nose starts to dip, or a hard stop pitches the rider over the bars.
    const pitch = state.bodies.find(body => body.kind === 'frame')?.angle ?? 0;
    let target = clamp((cruise - vx) * .22, -.6, .3);
    let brake = !!next && x < next.top.x1 - .5 && vx > cruise + .5 && pitch > -.06;
    if (next && x > next.top.x1 && y < next.top.y - 1) target = x < next.ledge.x0 - 1.5 ? (pit === 0 ? lean : secondLean) : 0;
    else if (next && x > next.top.x1 - .5) target = 0; // over the knee: let it run, the pad needs the speed
    else if (!next) target = clamp((2 - vx) * .22, -.6, .3); // the door completes on contact
    return { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake };
  };
}
