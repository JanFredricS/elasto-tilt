import type { Apple, Controls, Level, RouteHint, Snapshot, Surface, TimePlatform, Vec } from '../types';

const p = (x: number, y: number): Vec => ({ x, y });
const g = (id: string, x: number, y: number, w: number, h = .6): Surface => ({ id, x, y, w, h, kind: 'ground' });
const a = (id: string, x: number, y: number): Apple => ({ id, x, y });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** A block spanning x0..x1 with its top at `top`, reaching down to `bottom`. */
const block = (id: string, x0: number, x1: number, top: number, bottom: number): Surface =>
  g(id, (x0 + x1) / 2, (top + bottom) / 2, x1 - x0, top - bottom);
/** A ground slab whose top face runs from `from` to `to` (ridden on its left side: left to right, its top). */
const slab = (id: string, from: Vec, to: Vec, h = .6): Surface => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  return { ...g(id, (from.x + to.x) / 2 + Math.sin(angle) * h / 2, (from.y + to.y) / 2 - Math.cos(angle) * h / 2,
    Math.hypot(to.x - from.x, to.y - from.y), h), angle };
};

/**
 * Euler's Bridges. Königsberg in two storeys (metres, y up):
 *
 *   - The upper town (deck top 4.6) runs east from a wall at x 0 over four canals; the river
 *     quays (top 0) run back west under it over three river channels to the door, beneath the
 *     spawn. Every canal and channel is 3 m wide with water (a hazard) below its banks, and is
 *     spanned by a bridge lift: a time platform keyed to the shared RIVER clock that only moves
 *     up and down (never along the route axis, so passive carry never feeds the clock).
 *   - The clock (route axis x, `timeTravel` T) fills riding east and drains riding west, and it
 *     saturates: once full, further eastward riding drags the whole window east; once empty,
 *     westward riding drags it west. So the reading at a bridge is (m − L)/T, where L is the
 *     window's west end, and L only moves when the clock is pinned full or empty.
 *   - Each bridge lies flush with its banks at one clock reading. An upper bridge rises as the
 *     clock fills, so ridden east it comes up to meet the rider (both of its steps are down
 *     steps); a river bridge sinks as the clock fills, so ridden west (draining) it rises to
 *     meet the rider. Ridden back the other way each exit edge is a step up (up to about .3 m):
 *     a soft one-way that a fast rider can sometimes climb, which is harmless, because riding
 *     back and forth never moves L. The route crosses each bridge once.
 *   - The water lies only `water.depth` below the banks, so a bridge that has not come up far
 *     enough is still under it: riding onto it is a splash (a crash and a restart card with the
 *     hint), never an alive-but-stuck rider on a sunken deck.
 *   - The puzzle is where to pin the window. The upper bridges line up only if the rider first
 *     ebbs (backs west) to within about 2.5 m of the wall behind the spawn; set off from the
 *     spawn and the first canal bridge (the most sensitive, `travel` 3.4) is still under water.
 *     The river bridges line up only if, after the drop, the clock is flooded to within about
 *     2 m of the far east wall (b5, `travel` 4.2, is the gate). The drop lands at 7-10 m/s;
 *     tilting back to turn home at once stops a rider 2-7 m short, and b5 is then still under
 *     water. Leaning forward off the chute lands faster, and that momentum alone nearly
 *     reaches the wall, so FLOOD asks less of that rider. Hitting the wall hard crashes, so the
 *     hint says to roll into it gently.
 *   - The upper town ends in a knee-and-slide chute (as in the Clockwork Wedge) whose lip, 2.4 m
 *     above the river quay, leaves headroom to ride back west beneath it.
 */
export const EULER = {
  /** Route clock length (m) and platform speed along the paths (m/s). */
  T: 34, timeSpeed: 3,
  upper: { y: 4.6, wall: 0, spawn: 7, end: 33 },
  river: { y: 0, west: -1.4, wall: 52 },
  /** Canal/channel width; a bridge leaves 2 cm either side. */
  gap: 3,
  /** Water surface below the banks (shallow, so a bridge that is still down is under water), and its thickness. */
  water: { depth: .4, h: .3 },
  /** The rider's frame centre when a wheel rests against a wall (wheel radius + half wheelbase). */
  reach: 1.04,
  /** Canal bridges (thin: the river rider passes beneath them) and river bridges (deep piers). */
  upperBridge: { h: .9 },
  riverBridge: { h: 2.4 },
  lip: 2.4,
};
const E = EULER;
/** The window's west end after ebbing to the upper wall, and after flooding into the river wall. */
export const EBB_L = E.upper.wall + E.reach;
export const FLOOD_L = E.river.wall - E.reach - E.T;

/** One bridge: its centre x, the clock reading at which its top lies flush, and its path length
 *  (its vertical travel over the whole clock). `rise`: the deck rises as the clock fills. */
interface Bridge { id: string; m: number; flush: number; travel: number; rise: boolean; deck: number; h: number }
/** Design: the clock reading at a bridge's centre on the intended route, nudged by `lead` m of
 *  clock travel so the deck is a touch low as the leading wheel arrives and a touch high as the
 *  trailing wheel leaves (both steps down). */
const lead = .5;
const upperBridge = (id: string, m: number, travel: number): Bridge =>
  ({ id, m, flush: Math.min(1, (m - EBB_L - lead) / E.T), travel, rise: true, deck: E.upper.y, h: E.upperBridge.h });
const riverBridge = (id: string, m: number, travel: number): Bridge =>
  ({ id, m, flush: Math.max(0, (m - FLOOD_L + lead) / E.T), travel, rise: false, deck: E.river.y, h: E.riverBridge.h });
export const BRIDGES: Bridge[] = [
  upperBridge('euler-b1', 10.5, 3.4), // the gate: most sensitive to an incomplete ebb
  upperBridge('euler-b2', 16.5, 2.2),
  upperBridge('euler-b3', 22.5, 2),
  upperBridge('euler-b4', 28.5, 1.8),
  riverBridge('euler-b5', 35.5, 4.2), // the flood gate: turn home 2 m short of the far wall and it is still down
  riverBridge('euler-b6', 29.5, 3.2),
  riverBridge('euler-b7', 23.5, 2.8),
];
/** Top of a bridge's deck at clock reading c. */
export const bridgeTop = (b: Bridge, c: number) => b.deck + (b.rise ? 1 : -1) * b.travel * (c - b.flush);
const platform = (b: Bridge): TimePlatform => ({
  id: b.id, w: E.gap - .04, h: b.h,
  from: p(b.m, bridgeTop(b, 0) - b.h / 2), to: p(b.m, bridgeTop(b, 1) - b.h / 2),
});

/** The upper town's east end, ridden eastward: its edge rounded over a knee into a straight slide
 *  down to the right, bent back up towards `kick` (a heading in radians), then an optional short
 *  table; its lip ends near `lip` above the quay. */
export function eastChute(top: Vec, lip: number, angle: number, knee: number, bend: number, kick = 0, table = 1.2) {
  const surfaces: Surface[] = [];
  let at = top, n = 0;
  const piece = (to: Vec, chain: string) => { surfaces.push({ ...slab(`euler-chute-${n++}`, at, to, .3), chain }); at = to; };
  const arc = (h0: number, h1: number, radius: number, chain: string) => {
    const pieces = 6, step = (h1 - h0) / pieces, chord = 2 * radius * Math.sin(Math.abs(step) / 2);
    for (let i = 0; i < pieces; i++) {
      const heading = h0 + (i + .5) * step;
      piece(p(at.x + chord * Math.cos(heading), at.y + chord * Math.sin(heading)), chain);
    }
  };
  arc(0, -angle, knee, 'euler-chute-knee');
  const drop = at.y - (lip + bend * (1 - Math.cos(angle)));
  piece(p(at.x + drop / Math.tan(angle), at.y - drop), 'euler-chute-run');
  arc(-angle, kick, bend, 'euler-chute-run');
  if (table > 0) piece(p(at.x + table * Math.cos(kick), at.y + table * Math.sin(kick)), 'euler-chute-run');
  return { surfaces, end: at };
}
/* A wide knee (3 m) keeps a fast rider low over the slide, and the launch leaves straight off a
 * tight bend (1.1 m) while still heading .2 rad down, with no flat table. On a level table the
 * rear wheel stays on as the front drops off the lip, which pitched every rider about 1 rad nose
 * down by touchdown: survival then hung on how that stoppie fell, so it flickered with the lean
 * (.22 crashed between .2 and .24) and failed at most speeds. Leaving the bend carries its
 * nose-up spin into the flight, cancelling that tip. */
const chute = eastChute(p(E.upper.end, E.upper.y), E.lip, 50 * Math.PI / 180, 3, 1.1, -.2, 0);
export const LIP = chute.end;

/** Banks between the bridges of one storey, west to east, from x0 to x1 at deck top y. */
function banks(prefix: string, x0: number, x1: number, y: number, gaps: number[]): Surface[] {
  const edges = [x0, ...gaps.flatMap(m => [m - E.gap / 2, m + E.gap / 2]), x1];
  const out: Surface[] = [];
  for (let i = 0; i < edges.length; i += 2) out.push(block(`${prefix}-bank-${i / 2}`, edges[i], edges[i + 1], y, y - .6));
  for (const m of gaps) out.push({ ...block(`${prefix}-water-${m}`, m - E.gap / 2, m + E.gap / 2,
    y - E.water.depth, y - E.water.depth - E.water.h), kind: 'hazard' });
  return out;
}
const upper = BRIDGES.filter(b => b.rise), river = BRIDGES.filter(b => !b.rise);

export const eulersBridgesLevel: Level = {
  id: 'eulers-bridges', name: 'Euler’s Bridges', subtitle: 'Cross each bridge only once.',
  mechanic: 'Seven bridge lifts share one RIVER clock: riding east fills it, riding west drains it, and once full or empty it stops. Each bridge lies flush only at its own reading.',
  hint: 'Riding east fills the RIVER clock and riding west drains it, but it stops at full and at empty, so where you turn sets every bridge ahead. Ebb west into the wall before you set out over the canals. Drop off the chute without tilting back and roll on east into the far wall, gently, before you ride home over the river.',
  spawn: p(E.upper.spawn, E.upper.y + .72), bounds: { min: p(-3, -5.5), max: p(55, 10) },
  surfaces: [
    // The upper town: the wall behind the spawn, the canal banks, and the chute down to the river.
    block('euler-upper-wall', E.upper.wall - .6, E.upper.wall, E.upper.y + 3.4, E.upper.y - .6),
    ...banks('euler-upper', E.upper.wall, E.upper.end, E.upper.y, upper.map(b => b.m)),
    ...chute.surfaces,
    // The river quays: the door's west wall, the channel banks, and the far east wall.
    block('euler-river-west', E.river.west - .6, E.river.west, E.river.y + 3.4, E.river.y - .6),
    ...banks('euler-river', E.river.west, E.river.wall, E.river.y, river.map(b => b.m).sort((x, y) => x - y)),
    block('euler-river-wall', E.river.wall, E.river.wall + .6, E.river.y + 3.6, E.river.y - .6),
  ],
  timePlatforms: BRIDGES.map(platform),
  timeAxis: p(1, 0), timeTravel: E.T, timeSpeed: E.timeSpeed, timeLabel: 'RIVER',
  apples: BRIDGES.map((b, i) => a(`euler-a${i + 1}`, b.m, b.deck + .9)),
  routeHints: [
    { x: E.upper.wall + 2.2, y: E.upper.y + 1.6, angle: Math.PI, label: 'EBB' },
    { x: E.river.wall - 2.2, y: E.river.y + 1.6, angle: 0, label: 'FLOOD' },
  ] satisfies RouteHint[],
  exit: p(E.river.west + 2.4, E.river.y + .8), difficulty: 12.25, accent: '#d98a8f',
};

/**
 * Input-only demonstration (fixed 1/120 s steps, tilt only, never brakes). It ebbs back into
 * the upper wall and waits until still, rides east over the four canal bridges heading-relative
 * like the late pilots, lets gravity take it down the chute, leans the world forward in the
 * flight, floods east along the river quay into the far wall and waits there until still, then
 * rides home west over the three river bridges to the door. The options exist for the tests'
 * counterfactuals: `ebb: false` sets off east from the spawn at once, `river` starts at the
 * flood stage, and `floodTo` turns home once past that x instead of at the far wall. `canalSpeed` (m/s over the canals) and `chuteLean` (the world
 * angle held through the drop) sweep the landing window.
 */
export function createEulersBridgesPilot({ ebb = true, floodTo, river = false, canalSpeed = 2.5, chuteLean = .3 }:
  { ebb?: boolean; floodTo?: number; river?: boolean; canalSpeed?: number; chuteLean?: number } = {}): (state: Snapshot) => Controls {
  let previous: Vec | undefined, angle = 0, lastRawAngle = 0, still = 0;
  let stage: 'ebb' | 'upper' | 'chute' | 'flood' | 'home' = river ? 'flood' : ebb ? 'ebb' : 'upper';
  return state => {
    const dx = previous ? state.bike.x - previous.x : 0, dy = previous ? state.bike.y - previous.y : 0;
    previous = state.bike;
    const raw = state.bodies.find(body => body.id === 'frame')!.angle;
    angle += Math.atan2(Math.sin(raw - lastRawAngle), Math.cos(raw - lastRawAngle)); lastRawAngle = raw;
    const velocity = (dx * Math.cos(angle) + dy * Math.sin(angle)) * 120;
    const { x, y } = state.bike;
    const level = (target = 0) => ({ tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake: false });
    const follow = (desired: number) => level(angle + clamp((desired - velocity) * .22, -.3, .3));
    still = Math.abs(velocity) < .05 ? still + 1 : 0;
    if (stage === 'ebb' && x < EBB_L + .3 && still > 30) stage = 'upper';
    if (stage === 'upper' && x > E.upper.end) stage = 'chute';
    if (stage === 'chute' && y < E.river.y + 1.5) stage = 'flood';
    if (stage === 'flood' && (floodTo === undefined ? x > E.river.wall - E.reach - .3 && still > 30 : x > floodTo)) stage = 'home';
    switch (stage) {
      case 'ebb': return follow(-1.2);
      case 'upper': return follow(canalSpeed);
      // Past the knee, lean the world .3 rad right (forward). Anything from level to .6 lands
      // too (245 of 248 sampled leans at canal speeds 1-6 m/s); tilting back (left) at a slow
      // pace can still pitch over.
      case 'chute': return level(x > E.upper.end + 1 ? chuteLean : 0);
      case 'flood': return follow(x < E.river.wall - 5 ? 2 : .8);
      case 'home': return follow(-2.5);
    }
  };
}
