import type { Apple, Controls, Level, RouteHint, Snapshot, Surface, Vec } from '../types';

const p = (x: number, y: number): Vec => ({ x, y });
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const DEG = Math.PI / 180;
const THICK = .5;

/** Shape of the cannonball zigzag. Exported so the tuning tests can probe neighbouring layouts. */
export interface CannonShape {
  /** Ledge slant against neutral gravity, degrees. */
  slant: number;
  /** Length of each slanted plank (the first one is shorter, behind a kinked breech). */
  length: number; firstLength: number;
  /** Inner lips sit `column` either side of the centre line and step down by `step`. */
  column: number; step: number;
  /** Each lip ends in a shallow concave kicker (degrees of bend, radius) and a short run-out. */
  kick: number; kickRadius: number; runOut: number;
  ledges: number;
}
export const CANNON_SHAPE: CannonShape = {
  slant: 22, length: 5.5, firstLength: 3, column: 1.9, step: 2.2, kick: 26, kickRadius: 2.5, runOut: 2, ledges: 6,
};

/** Ledge k is ridden downhill toward the centre in direction dir (+1: a "\" plank in the left column). */
export interface CannonLedge { dir: 1 | -1; upper: Vec; lip: Vec; faces: Vec[] }

/** One rideable plank between two top-face points (any order); the +y face is ridden. */
const plank = (id: string, a: Vec, b: Vec, chain?: string): Surface => {
  const [l, r] = a.x < b.x ? [a, b] : [b, a], angle = Math.atan2(r.y - l.y, r.x - l.x);
  return { id, x: (l.x + r.x) / 2 + Math.sin(angle) * THICK / 2, y: (l.y + r.y) / 2 - Math.cos(angle) * THICK / 2,
    w: Math.hypot(r.x - l.x, r.y - l.y), h: THICK, angle, kind: 'ground', ...(chain ? { chain } : {}) };
};

export function cannonLedgesFor(shape: CannonShape): CannonLedge[] {
  const slant = shape.slant * DEG, kick = shape.kick * DEG, segments = 6;
  return Array.from({ length: shape.ledges }, (_, k) => {
    const dir = (k % 2 === 0 ? 1 : -1) as 1 | -1, lip = p(-dir * shape.column, -k * shape.step);
    // Built backwards from the lip: run-out, kicker arc, then the slanted plank up to its outer end.
    const out = -slant + kick, pts = [lip];
    let last = p(lip.x - dir * shape.runOut * Math.cos(out), lip.y - shape.runOut * Math.sin(out)); pts.push(last);
    const step = kick / segments, chord = 2 * shape.kickRadius * Math.sin(step / 2);
    for (let i = segments - 1; i >= 0; i--) {
      const heading = -slant + (i + .5) * step;
      last = p(last.x - dir * chord * Math.cos(heading), last.y - chord * Math.sin(heading)); pts.push(last);
    }
    const length = k === 0 ? shape.firstLength : shape.length;
    pts.push(p(last.x - dir * length * Math.cos(slant), last.y + length * Math.sin(slant)));
    const faces = pts.reverse();
    return { dir, lip, upper: faces[0], faces };
  });
}

/** Builds the playable level for a shape; the campaign build passes its apples and hints. */
export function buildCannonball(shape: CannonShape, apples: Apple[] = [], routeHints: RouteHint[] = []): { level: Level; ledges: CannonLedge[] } {
  const ledges = cannonLedgesFor(shape);
  const breech = ledges[0].upper, last = ledges.at(-1)!;
  const pocketFloor = last.lip.y - 2.4;
  const surfaces: Surface[] = [
    // The breech: a near-level start that kinks gently into the first slant.
    plank('cannon-breech', p(breech.x - 3.5, breech.y + .35), p(breech.x - .9, breech.y + .2), 'cannon-ledge-0'),
    plank('cannon-breech-kink', p(breech.x - .9, breech.y + .2), breech, 'cannon-ledge-0'),
    ...ledges.flatMap((ledge, k) => ledge.faces.slice(1).map((q, i) =>
      plank(i === 0 ? `cannon-ledge-${k}` : `cannon-ledge-${k}-lip-${i}`, ledge.faces[i], q, `cannon-ledge-${k}`))
      // Chains run left to right.
      .sort((a, b) => a.x - b.x)),
    // The walled L-pocket under the last left-hand ledge.
    { id: 'cannon-pocket-floor', x: -3.5, y: pocketFloor - .25, w: 7, h: .5, kind: 'ground' },
    { id: 'cannon-pocket-wall', x: -7.25, y: pocketFloor + 2.5, w: .5, h: 5.5, kind: 'ground' },
  ];
  const level: Level = {
    id: 'newtons-cannonball', name: 'Newton’s Cannonball', subtitle: 'Every fall is a curve', difficulty: 7.25, accent: '#d6a86c',
    mechanic: 'Leap between alternating slanted ledges, twisting gravity in flight to meet each slope.',
    hint: 'Leap, turn the world to meet the slope, land rolling.',
    spawn: p(breech.x - 2.6, breech.y + .3 + .78), initialAngle: 0,
    bounds: { min: p(-14, pocketFloor - 4), max: p(14, breech.y + 8) },
    surfaces, apples, exit: p(-5.8, pocketFloor + .9), routeHints,
  };
  return { level, ledges };
}

export interface CannonPilotTuning {
  /** Lean (degrees) toward the centre while riding a ledge down. */
  ride: number;
  /** Within `approach` metres of a lip, lean `forward` degrees instead. */
  approach: number; forward: number;
  /** In flight, pull gravity this far toward the next ledge's downhill. */
  pull: number;
}
export const CANNON_PILOT: CannonPilotTuning = { ride: 20, approach: 1, forward: 30, pull: 55 };

/** Observation-only pilot for any cannonball shape, using tilt only. */
export function cannonPilotFor(ledges: CannonLedge[], tuning: CannonPilotTuning): (state: Snapshot) => Controls {
  let previous: Vec | undefined, lastTime = 0, vx = 0, j = 0, flying = false;
  return state => {
    const dt = state.elapsed - lastTime;
    if (previous && dt > 0) vx = (state.bike.x - previous.x) / dt;
    previous = state.bike; lastTime = state.elapsed;
    const ledge = ledges[j];
    if (ledge && !flying && (state.bike.x - ledge.lip.x) * ledge.dir > 0) flying = true;
    let target = 0;
    if (ledge && flying) {
      // Swing gravity toward the next ledge's downhill so the bike lands, turns and rolls back down it.
      const dir = ledges[j + 1]?.dir ?? -ledge.dir;
      target = dir * tuning.pull * DEG;
      if (vx * dir > 2 && state.bike.y < ledge.lip.y) { j++; flying = false; }
    } else if (ledge) {
      const near = (ledge.lip.x - state.bike.x) * ledge.dir < tuning.approach;
      target = ledge.dir * (near ? tuning.forward : tuning.ride) * DEG;
    }
    return { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake: false };
  };
}

/** One apple at the middle of each of the first five flight arcs, plus two bonus apples
 *  at the high turn-backs of the third and fourth ledges. */
const CANNON_APPLES: Apple[] = [
  { id: 'cannon-arc-0', x: .25, y: .45 },
  { id: 'cannon-arc-1', x: -.8, y: -1.9 },
  { id: 'cannon-arc-2', x: .35, y: -3.95 },
  { id: 'cannon-arc-3', x: -.75, y: -6.25 },
  { id: 'cannon-arc-4', x: .25, y: -8.35 },
  { id: 'cannon-bonus-left', x: -9.1, y: -1.75 },
  { id: 'cannon-bonus-right', x: 9.1, y: -3.95 },
];
const CANNON_HINTS: RouteHint[] = [
  { x: -3.4, y: 1.9, angle: .2, label: 'LEAP' },
  { x: 4.8, y: 1.5, angle: Math.PI - .4, label: 'TWIST' },
  { x: -3, y: -12.2, angle: Math.PI, label: 'HOME' },
];

const built = buildCannonball(CANNON_SHAPE, CANNON_APPLES, CANNON_HINTS);
export const cannonLedges = built.ledges;
export const cannonballLevel: Level = built.level;

/** Replay pilot for the campaign map. */
export function createCannonballPilot(): (state: Snapshot) => Controls {
  return cannonPilotFor(cannonLedges, CANNON_PILOT);
}
