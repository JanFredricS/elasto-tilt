import type { Apple, Controls, Level, Snapshot, Surface, Vec } from '../types';

const p = (x: number, y: number): Vec => ({ x, y });
const g = (id: string, x: number, y: number, w: number, h = .6): Surface => ({ id, x, y, w, h, kind: 'ground' });
const a = (id: string, at: Vec): Apple => ({ id, ...at });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** A block whose top face is at `top`, spanning x0..x1 and reaching down to `bottom`. */
const block = (id: string, x0: number, x1: number, top: number, bottom: number): Surface =>
  g(id, (x0 + x1) / 2, (top + bottom) / 2, x1 - x0, top - bottom);
/** A slab whose ridden face runs from `from` to `to` (left to right). */
const slab = (id: string, from: Vec, to: Vec, h = .6): Surface => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  return { id, kind: 'ground', angle, w: Math.hypot(to.x - from.x, to.y - from.y), h,
    x: (from.x + to.x) / 2 + Math.sin(angle) * h / 2, y: (from.y + to.y) / 2 - Math.cos(angle) * h / 2 };
};
/** An arc of chained slabs turning the ridden heading from h0 to h1 (radians) on `radius`. */
const arc = (id: string, from: Vec, h0: number, h1: number, radius: number, pieces: number, chain: string) => {
  const step = (h1 - h0) / pieces, chord = 2 * radius * Math.sin(Math.abs(step) / 2);
  let at = from;
  const surfaces = Array.from({ length: pieces }, (_, i) => {
    const heading = h0 + (i + .5) * step, to = p(at.x + chord * Math.cos(heading), at.y + chord * Math.sin(heading));
    const piece = { ...slab(`${id}-${i}`, at, to), chain };
    at = to; return piece;
  });
  return { surfaces, end: at };
};

/**
 * Galileo’s Ramp. Three inclined planes stepped down a hillside, each ending
 * the same way. The terrace tips over a gentle 5° incline and rounds a knee
 * (radius 2) into a 35° slide; at its foot a SOFT brass kicker pad
 * (restitution .5, the campaign's first authored value) rises 10° to the next
 * terrace. The pad hands back half the slide's speed across its face: a short,
 * low toss up and on along the next terrace, the bike still pitched at the
 * slide's angle and not spinning (the pad keeps a rider's spin, and riding
 * straight down a slide adds none), so it lands nose-first and rocks back.
 * The apple of each stage hangs over the top of its toss.
 *
 *   - Terrace 1, top 0: spawn at x 0, a back wall at −4.3, one road apple.
 *   - Pads 1 and 2 toss the rider onto terraces 2 and 3.
 *   - Pad 3 sits at the hillside's edge: its toss carries the rider out over
 *     the gallery to fall (all bodies fall alike) onto the gallery floor.
 *   - The gallery runs right to a catching quarter-pipe, then back left
 *     beneath the whole hillside (2.8 m of headroom) to the door below spawn.
 *
 * No hazards anywhere. Braking is ignored for the instant of each toss
 * (.12 s), but holding BRAKE into the landing after it pitches the bike over
 * the bars: the hint says so.
 */
const DEG = Math.PI / 180;
export const GALILEO_RESTITUTION = .5;
const INCLINE = 5 * DEG, SLIDE = 35 * DEG, KNEE = 2, RUN = 3, KICKER = 10 * DEG, PAD = 1.2;
/** Drop from a terrace to its slide's foot; the length of each lower terrace. */
const FALL = 2.5, TERRACE = 7;

/** Incline, knee and slide in one convex chain from (x0, top) down to the foot, then the kicker pad. */
const stage = (id: string, x0: number, top: number) => {
  const start = p(x0 + RUN * Math.cos(INCLINE), top - RUN * Math.sin(INCLINE));
  const knee = arc(`${id}-knee`, start, -INCLINE, -SLIDE, KNEE, 5, id);
  const foot = p(knee.end.x + (knee.end.y - (top - FALL)) / Math.tan(SLIDE), top - FALL);
  const kick = p(foot.x + PAD * Math.cos(KICKER), foot.y + PAD * Math.sin(KICKER));
  return {
    surfaces: [{ ...slab(`${id}-incline`, p(x0, top), start), chain: id }, ...knee.surfaces,
      { ...slab(`${id}-slide`, knee.end, foot), chain: id }, pad(`${id}-pad`, foot, kick)],
    /** Stone under the chain and the pad, kept below their ridden faces. */
    fill: (bottom: number) => block(`${id}-fill`, x0, kick.x, foot.y - .55, bottom),
    start, foot, kick,
  };
};
/** A soft pad whose ridden face runs from `from` to `to`. */
const pad = (id: string, from: Vec, to: Vec, h = .5): Surface =>
  ({ ...slab(id, from, to, h), kind: 'spring', restitution: GALILEO_RESTITUTION });

const T1 = { x0: -4, x1: 3, y: 0 };
const s1 = stage('galileo-stage-1', T1.x1, T1.y);
const T2 = { x0: s1.kick.x, x1: s1.kick.x + TERRACE, y: s1.kick.y };
const s2 = stage('galileo-stage-2', T2.x1, T2.y);
const T3 = { x0: s2.kick.x, x1: s2.kick.x + TERRACE, y: s2.kick.y };
const s3 = stage('galileo-stage-3', T3.x1, T3.y);
/** The gallery floor, and the underside of the hillside above it (2.8 m of headroom). */
const FLOOR = Math.floor(s3.kick.y - 3.8), ROOF = FLOOR + 2.8;
const LANDING = { x0: s3.kick.x, x1: s3.kick.x + 9 };
const catcher = arc('galileo-catch', p(LANDING.x1, FLOOR), 0, Math.PI / 2, 3, 8, 'galileo-catch');
const DOOR = p(.5, FLOOR + .8);

export const GALILEO = {
  T1, T2, T3, stages: [s1, s2, s3].map(({ start, foot, kick }) => ({ start, foot, kick })),
  floor: FLOOR, roof: ROOF, landing: LANDING, door: DOOR, catcher: catcher.end,
};
const G = GALILEO;
/** Over the top of a toss: `ahead` past its pad's upper end and `high` above it. */
const toss = (kick: Vec, ahead: number, high: number) => p(kick.x + ahead, kick.y + high);

export const galileosRampLevel: Level = {
  id: 'galileos-ramp', name: 'Galileo’s Ramp', subtitle: 'All bodies fall alike',
  mechanic: 'Roll down three inclined planes. A soft brass pad at the foot of each tosses you gently on to the next; the gallery below brings you home.',
  hint: 'Tilt right to roll and let each slide run. Don’t brake on the brass: let the pad toss you, land, then ride on. At the bottom, tilt left to come home.',
  spawn: p(0, .72), initialAngle: 0,
  bounds: { min: p(-8, FLOOR - 3), max: p(catcher.end.x + 4, 4) },
  surfaces: [
    // The hillside: three terraces on one mass of stone over the gallery roof.
    block('galileo-terrace-1', T1.x0, T1.x1, T1.y, ROOF),
    ...s1.surfaces, s1.fill(ROOF),
    block('galileo-terrace-2', T2.x0, T2.x1, T2.y, ROOF),
    ...s2.surfaces, s2.fill(ROOF),
    block('galileo-terrace-3', T3.x0, T3.x1, T3.y, ROOF),
    ...s3.surfaces, s3.fill(ROOF),
    g('galileo-back-wall', T1.x0 - .3, 1.6, .6, 3.2),
    // The gallery: one long floor from the door to the catching quarter-pipe.
    block('galileo-floor', -7, LANDING.x1, FLOOR, FLOOR - 1),
    ...catcher.surfaces,
    g('galileo-end-wall', catcher.end.x + .3, catcher.end.y + 1.5, .6, 3),
    block('galileo-gallery-back', -7, -6.4, ROOF, FLOOR),
  ],
  apples: [
    a('galileo-road', p(2, .9)),
    a('galileo-toss-1', toss(s1.kick, .3, 2.1)),
    a('galileo-toss-2', toss(s2.kick, .3, 2.1)),
    a('galileo-toss-3', toss(s3.kick, .3, 2.1)),
    a('galileo-gallery', p(T2.x0 + 2, FLOOR + .9)),
  ],
  routeHints: [
    { x: 1.5, y: 1.6, angle: 0, label: 'ROLL' },
    { x: G.catcher.x - 4, y: FLOOR + 1.6, angle: Math.PI, label: 'HOME' },
  ],
  brakeScale: .6,
  exit: DOOR, difficulty: 1.5, accent: '#7fb89a',
};

/**
 * Observation-only demonstration. On terraces it holds a gentle cruise; from
 * each incline on it keeps the world level and lets the slide and the pad's
 * toss do the work (never braking). After the last drop it rides up the
 * quarter-pipe, then tilts left and cruises home along the gallery, easing
 * into the door.
 */
export function createGalileoPilot(cruise = 2): (state: Snapshot) => Controls {
  let previous: Vec | undefined, homeward = false;
  return state => {
    const v = previous ? p((state.bike.x - previous.x) * 120, (state.bike.y - previous.y) * 120) : p(0, 0);
    previous = state.bike;
    const { x, y } = state.bike;
    const steer = (target: number, brake = false): Controls => ({ tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake });
    if (y < ROOF && (v.x < -.2 || x > G.catcher.x - 1.5)) homeward = true;
    if (homeward) {
      const speed = clamp((x - G.door.x + .3) * .8, .3, 3);
      return steer(clamp((-speed - v.x) * .25, -.35, .35));
    }
    // Terraces: a gentle cruise up to each incline; from there, let it run.
    const terrace = [G.T1, G.T2, G.T3].find(t => x > t.x0 + 2 && x < t.x1 && y > t.y && y < t.y + 1.2);
    if (terrace) return steer(clamp((cruise - v.x) * .22, -.3, .3));
    return steer(0);
  };
}
