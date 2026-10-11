import type { Apple, Controls, Level, RouteHint, Snapshot, Surface, Vec } from '../types';

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
/** A plateau edge rounded over a knee into a straight slide at `angle` below horizontal, down to `floor`. */
const chute = (id: string, top: Vec, floor: number, angle: number, knee: number) => {
  const bend = arc(`${id}-knee`, top, 0, -angle, knee);
  const bottom = p(bend.end.x + (bend.end.y - floor) / Math.tan(angle), floor);
  return { surfaces: [...bend.surfaces, { ...slab(`${id}-slide`, bend.end, bottom), chain: `${id}-knee` }], bend: bend.end, bottom };
};
/** Unridden filler stone behind a straight face running `from` → `to`: `depth` thick, set 5 cm under the
 *  face, covering the stretch t0..t1 of it. It only closes a see-through cavity in the overview. */
const backing = (id: string, from: Vec, to: Vec, depth: number, t0 = 0, t1 = 1): Surface => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x), at = (t: number) =>
    p(from.x + (to.x - from.x) * t + Math.sin(angle) * .05, from.y + (to.y - from.y) * t - Math.cos(angle) * .05);
  return slab(id, at(t0), at(t1), depth);
};
const spikes = (id: string, x0: number, x1: number, y: number): Surface => ({ id, x: (x0 + x1) / 2, y, w: x1 - x0, h: .35, kind: 'hazard' });
/** Half a turn about the map origin: (x, y) → (−x, −y). Ridden +y faces end up facing map-down. */
const flip = (v: Vec): Vec => p(-v.x, -v.y);
const turn = (s: Surface): Surface => ({ ...s, ...flip(s), angle: (s.angle ?? 0) + Math.PI });
/** An apple placed in the rider's turned frame. */
const fa = (id: string, x: number, y: number): Apple => a(id, -x, -y);

/**
 * Hooke's Ceiling, the sequel to Hooke's Springboard. The world starts turned
 * over (initialAngle π: gravity points map-up) and the rider starts upright
 * against it (spawnAngle π) on the underside of one long slab.
 *
 *   - First half, on the ceiling. It is Hooke's Springboard exactly, authored in
 *     the rider's own turned frame (X = −x, Y = −y; the numbers below are that
 *     frame's) and then given half a turn: a plateau (Y 0) rounded over a knee
 *     into 50° slides that rise into the stone to two ceiling-mounted brass
 *     pads, Y −5 and −8.5, with spike pits of 4 m and 6 m set into the ceiling
 *     between pad and next ledge. A pad reflects about its contact normal, so a
 *     ceiling pad throws exactly as a floor pad does. The world leans forward
 *     from π (world angle π + a gives the rider's frame gravity g·(sin a, −cos a)),
 *     begun on the slide since the world turns at most .95 rad/s.
 *   - Halfway the second ledge (Y −7, so map y 7; 19 m long to scrub the landing) runs out to a convex rounded
 *     nose, radius 3 m, at the slab's far (map-left) end: the underside-return
 *     grammar. Slow down, then turn the world from π back to 0 as the wheels
 *     curl round it onto the slab's top face (map y 13).
 *   - Second half, right-way-up in map space: 35 m of top face to a last knee
 *     and slide down into an ordinary floor pad (y 8), a 5 m spike pit and the
 *     door ledge (top 9.5), which ends in a catching quarter-pipe.
 */
const DEG = Math.PI / 180;
const SLIDE = 50 * DEG, KNEE = 1.5, NOSE = 3;
// The ceiling half, in the rider's turned frame (identical to Hooke's Springboard).
const plateau = { x0: -4, x1: 6, y: 0 }, ledge1 = { x0: 19, x1: 34, y: -3.5 }, ledge2 = { x0: 49, x1: 68, y: -7 };
const chute1 = chute('ceiling-chute-1', p(plateau.x1, plateau.y), -5, SLIDE, KNEE);
const chute2 = chute('ceiling-chute-2', p(ledge1.x1, ledge1.y), -8.5, SLIDE, KNEE);
// The top half, in map space.
// The last pit drops 5 m from the top face, as Hooke's pits do, wherever the nose puts that face.
const top = { x0: -ledge2.x1, x1: -33, y: -ledge2.y + 2 * NOSE }, pit3Floor = top.y - 5;
const landing = { x0: -19, x1: -9, y: pit3Floor + 1.5 };
const chute3 = chute('ceiling-chute-3', p(top.x1, top.y), pit3Floor, SLIDE, KNEE);
const catcher = arc('ceiling-catch', p(landing.x1, landing.y), 0, Math.PI / 2, 2.5);
export const CEILING = {
  /** Underside half in the rider's turned frame: map point = flip(point). */
  plateau, ledge1, ledge2, slide: SLIDE,
  pit1: { pad: [chute1.bottom, p(15, -5)] as const, spikes: [15, ledge1.x0] as const, floor: -5 },
  pit2: { pad: [chute2.bottom, p(43, -8.5)] as const, spikes: [43, ledge2.x0] as const, floor: -8.5 },
  /** Centre of the rounded nose (map space) and the top half. */
  nose: p(top.x0, top.y - NOSE), radius: NOSE, top, landing,
  pit3: { pad: [chute3.bottom, p(-24, pit3Floor)] as const, spikes: [-24, landing.x0] as const, floor: pit3Floor },
  door: p(-14, landing.y + .8),
};
const C = CEILING;

/** The nose as a convex chain from the underside (map y 7) round the left end to the top (map y 13). */
const nose = Array.from({ length: 32 }, (_, i): Surface => {
  const theta = 1.5 * Math.PI - (i + .5) * Math.PI / 32, r = NOSE - .3;
  return { id: `ceiling-nose-${i}`, x: C.nose.x + r * Math.cos(theta), y: C.nose.y + r * Math.sin(theta),
    w: 2 * r * Math.tan(Math.PI / 64) + .045, h: .6, angle: theta - Math.PI / 2, chain: 'ceiling-nose' };
});
/** Filler stone inside the nose ribbon (the overview showed it hollow): rings of short facets, like the
 *  ribbon's, out to its inner face, read as a coiled spring cut through. Nothing here reaches the ridden face. */
const noseCore: Surface[] = [
  g('ceiling-nose-core', C.nose.x - .3, C.nose.y, .62, 1.2),
  ...[.9, 1.5, 2.1].flatMap(r => Array.from({ length: 16 }, (_, i): Surface => {
    const theta = .5 * Math.PI + (i + .5) * Math.PI / 16;
    return { id: `ceiling-nose-core-${r}-${i}`, x: C.nose.x + r * Math.cos(theta), y: C.nose.y + r * Math.sin(theta),
      w: 2 * r * Math.tan(Math.PI / 32) + .045, h: .62, angle: theta - Math.PI / 2 };
  })),
];
// Filler stone between ceiling slide 2 and the top half's last slide (parallel 50° faces), drawn first so the
// ridden stone covers its seams: a backing under each slide and one slab spanning the faces where they overlap.
const slide2 = [flip(chute2.bottom), flip(chute2.bend)] as const, slide3 = [chute3.bend, chute3.bottom] as const;
const along = (v: Vec) => v.x * Math.cos(SLIDE) - v.y * Math.sin(SLIDE), across = (v: Vec) => v.x * Math.sin(SLIDE) + v.y * Math.cos(SLIDE);
const cavity: Surface[] = [
  turn(backing('ceiling-chute-2-backing', chute2.bend, chute2.bottom, 3)),
  backing('ceiling-chute-3-backing', ...slide3, 3),
  backing('ceiling-cavity', ...slide3, across(slide3[0]) - across(slide2[0]) - .1, 0,
    (along(slide2[1]) - along(slide3[0])) / (along(slide3[1]) - along(slide3[0]))),
  // Behind ceiling pad 2, up to the slab.
  block('ceiling-pad-2-cap', -C.pit2.pad[1].x, slide2[0].x + 1.4, -C.pit2.floor + .85, -C.pit2.floor + .45),
];
/** Ids of the cosmetic filler stone, which no ride should ever touch. */
export const CEILING_FILLER = [...noseCore, ...cavity].map(s => s.id);

/** The ceiling half as Hooke's Springboard laid out in the rider's turned frame. */
const ceiling: Surface[] = [
  block('ceiling-plateau', C.plateau.x0, C.plateau.x1, C.plateau.y, C.pit1.floor - .5),
  ...chute1.surfaces,
  g('ceiling-back-wall', C.plateau.x0 - .3, 2, .6, 4.6),
  pad('ceiling-pad-1', ...C.pit1.pad),
  block('ceiling-pit-1-floor', C.pit1.spikes[0], C.pit1.spikes[1], C.pit1.floor - .2, C.pit1.floor - .8),
  spikes('ceiling-spikes-1', C.pit1.spikes[0], C.pit1.spikes[1], C.pit1.floor - .02),
  // Ledge 1 stops short of the top half's pit, which is cut into the stone above it.
  block('ceiling-ledge-1', C.ledge1.x0, C.ledge1.x1, C.ledge1.y, -C.pit3.floor + .5),
  ...chute2.surfaces,
  pad('ceiling-pad-2', ...C.pit2.pad),
  block('ceiling-pit-2-floor', C.pit2.spikes[0], C.pit2.spikes[1], C.pit2.floor - .2, C.pit2.floor - .8),
  spikes('ceiling-spikes-2', C.pit2.spikes[0], C.pit2.spikes[1], C.pit2.floor - .02),
  block('ceiling-ledge-2', C.ledge2.x0, C.ledge2.x1, C.ledge2.y, C.pit2.floor - .8),
];

export const hookesCeilingLevel: Level = {
  id: 'hookes-ceiling', name: 'Hooke’s Ceiling', subtitle: 'What falls up must come down',
  mechanic: 'Start upside down under the slab: ride its ceiling pads, curl round its nose, and finish with one more throw on top.',
  hint: 'You start upside down, riding under the slab: the world is turned over, so the ceiling looks like a floor (the map overview shows it). Drop up onto the brass, lean the world forward in the air and level it to land. Don’t brake on brass. After the second landing lean back and feather the brake: take the nose at walking pace and turn the world back as you curl onto the top.',
  spawn: flip(p(-1, .72)), spawnAngle: Math.PI, initialAngle: Math.PI,
  // Room left of the nose for the CURL OVER label, so the overview shows it whole.
  bounds: { min: p(-81, -6), max: p(9, 18) },
  surfaces: [
    // Cosmetic fillers first: everything drawn after them hides their seams.
    ...noseCore, ...cavity,
    ...ceiling.map(turn),
    ...nose,
    block('ceiling-slab-top', C.top.x0, C.top.x1, C.top.y, -C.pit2.floor + .8),
    ...chute3.surfaces,
    pad('ceiling-pad-3', ...C.pit3.pad),
    block('ceiling-pit-3-floor', C.pit3.spikes[0], C.pit3.spikes[1], C.pit3.floor - .2, C.pit3.floor - .8),
    spikes('ceiling-spikes-3', C.pit3.spikes[0], C.pit3.spikes[1], C.pit3.floor - .02),
    block('ceiling-landing', C.landing.x0, C.landing.x1, C.landing.y, C.landing.y - 2.5),
    // A quarter-pipe catches a rider who reaches the door short of an apple.
    ...catcher.surfaces,
    g('ceiling-end-wall', catcher.end.x + .3, catcher.end.y + 1.5, .6, 3),
  ],
  apples: [
    fa('ceiling-start', 4, .9),
    fa('ceiling-arc-1', 17, -1.2),
    fa('ceiling-ledge', 26, -2.6),
    fa('ceiling-arc-2', 45, -4.9),
    a('ceiling-nose', C.nose.x - NOSE - .8, C.nose.y),
    // Halfway along the long top face: a beat between the curl and the last throw.
    a('ceiling-top', (C.top.x0 + C.top.x1) / 2, C.top.y + .9),
    a('ceiling-arc-3', -22, C.top.y - 1.2),
  ],
  routeHints: [
    // Turned frame. SLOW sits just past the second landing: the nose (below) only turns at walking pace.
    ...([{ x: 7.2, y: 1.2, angle: -SLIDE, label: 'DROP UP' }, { x: 15.5, y: .2, angle: 0, label: 'LEAN' },
      { x: C.ledge2.x0 + 5, y: C.ledge2.y + 1.3, angle: 0, label: 'SLOW' }] satisfies RouteHint[])
      .map(hint => ({ ...hint, ...flip(hint), angle: hint.angle + Math.PI })),
    { x: C.nose.x - NOSE - 2, y: C.nose.y, angle: Math.PI / 2, label: 'CURL OVER', spin: -1 },
    { x: C.top.x1 + 1.2, y: C.top.y + 1.2, angle: -SLIDE, label: 'DROP' },
  ],
  exit: C.door, difficulty: 14.6, accent: '#c99a4e',
};

/**
 * Observation-only demonstration. Over the ceiling it flies Hooke's Springboard's
 * own pilot in the rider's turned frame (world angle π + its lean). After the
 * second ceiling throw it scrubs speed on ledge 2, then rounds the nose keeping
 * gravity square to the frame. On top it repeats the springboard drill once
 * (`lastLean`) and eases into the door. `noseSpeed` is the pace it scrubs to
 * and holds round the nose; `noseBias` makes it lead (+) or lag (−) the frame's
 * heading by that many radians there, as a less exact rider would.
 */
export function createHookesCeilingPilot(lean = .6, secondLean = lean, lastLean = lean, cruise = 2.5, noseSpeed = 1.8, noseBias = 0): (state: Snapshot) => Controls {
  let previous: Vec | undefined, last: Vec | undefined, stage = 0, heading = Math.PI, lastRaw = Math.PI;
  type Pit = { top: { x1: number; y: number }; ledge: { x0: number; y: number }; lean: number };
  const pits: Pit[] = [
    { top: C.plateau, ledge: C.ledge1, lean },
    { top: C.ledge1, ledge: C.ledge2, lean: secondLean },
  ];
  const final: Pit = { top: C.top, ledge: C.landing, lean: lastLean };
  return state => {
    const frame = state.bodies.find(body => body.kind === 'frame')!;
    heading += Math.atan2(Math.sin(frame.angle - lastRaw), Math.cos(frame.angle - lastRaw)); lastRaw = frame.angle;
    // Speed along the frame's own heading, for the curl round the nose.
    const along = last ? ((state.bike.x - last.x) * Math.cos(heading) + (state.bike.y - last.y) * Math.sin(heading)) * 120 : 0;
    last = state.bike;
    const ceilingHalf = stage < 3;
    // The ceiling half reads positions, pitch and world angle in the rider's turned frame.
    const at = ceilingHalf ? flip(state.bike) : state.bike, base = ceilingHalf ? Math.PI : 0;
    const vx = previous ? (at.x - previous.x) * 120 : 0;
    previous = at;
    const pitch = heading - base, world = state.worldAngle - base;
    const steer = (target: number, brake = false): Controls => ({ tilt: clamp((target - world) * 8, -1, 1), brake });
    const drill = (pit: Pit | undefined, landed: () => void): Controls => {
      if (pit && at.x > pit.ledge.x0 + .5 && at.y > pit.ledge.y && at.y < pit.ledge.y + 1) landed();
      let target = clamp((cruise - vx) * .22, -.6, .3);
      const brake = !!pit && at.x < pit.top.x1 - .5 && vx > cruise + .5 && pitch > -.06;
      if (pit && at.x > pit.top.x1 && at.y < pit.top.y - 1) target = at.x < pit.ledge.x0 - 1.5 ? pit.lean : 0;
      else if (pit && at.x > pit.top.x1 - .5) target = 0;
      return steer(target, brake);
    };
    if (stage < 2) return drill(pits[stage], () => stage++);
    if (stage === 2) {
      // Scrub the landing speed on ledge 2, then creep up to the nose.
      if (at.x > C.ledge2.x1 - 1.5) stage = 3;
      else return steer(clamp((noseSpeed - vx) * .22, -.6, .3), vx > noseSpeed + .7 && pitch > -.06);
    }
    if (stage === 3) {
      // Round the nose: keep gravity square to the frame, with a little lean for speed.
      if (heading < .15 && state.bike.y > C.top.y) { stage = 4; previous = undefined; }
      else return { tilt: clamp((heading + noseBias + clamp((noseSpeed - along) * .22, -.3, .3) - state.worldAngle) * 8, -1, 1), brake: false };
    }
    if (stage === 4) return drill(final, () => stage++);
    return steer(clamp((2 - vx) * .22, -.6, .3)); // the door completes on contact
  };
}
