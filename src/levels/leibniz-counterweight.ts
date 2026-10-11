import type { Apple, Controls, Level, Snapshot, Surface, Vec } from '../types';

const p = (x: number, y: number): Vec => ({ x, y });
const g = (id: string, x: number, y: number, w: number, h = .6): Surface => ({ id, x, y, w, h, kind: 'ground' });
const a = (id: string, x: number, y: number): Apple => ({ id, x, y });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const deg = Math.PI / 180;
/** A block spanning x0..x1 with its top at `top`, reaching down to `bottom`. */
const block = (id: string, x0: number, x1: number, top: number, bottom: number): Surface =>
  g(id, (x0 + x1) / 2, (top + bottom) / 2, x1 - x0, top - bottom);
/** A slab whose ridden face runs from `from` to `to`; the stone lies to the right of that
 * direction (ridden eastward, its top; ridden westward, its underside). */
const slab = (id: string, from: Vec, to: Vec, h = .6): Surface => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  return { ...g(id, (from.x + to.x) / 2 + Math.sin(angle) * h / 2, (from.y + to.y) / 2 - Math.cos(angle) * h / 2,
    Math.hypot(to.x - from.x, to.y - from.y), h), angle };
};
/** A quarter arc ridden on its inside (as in late.ts): eight tangent faces. Used only for the
 * well's cap, which the ball seats in and a rider touches only by falling into it. */
const turn = (id: string, x: number, y: number, radius: number, start: number): Surface[] => {
  const thickness = .42, step = Math.PI / 16;
  return Array.from({ length: 8 }, (_, i) => {
    const angle = start + (i + .5) * step, r = radius + thickness / 2;
    return { ...g(`${id}-${i}`, x + Math.cos(angle) * r, y + Math.sin(angle) * r,
      2 * r * Math.sin(step / 2) + .12, thickness), angle: angle + Math.PI / 2 };
  });
};

/**
 * A ridden run built leg by leg from `start`: straight legs and arcs (chords of `radius`
 * turning the heading from h0 to h1). Every face carries the leg's chain id, so the
 * seams of each concave or convex run are buried (see chainBoxes in src/physics.ts).
 */
type Leg = { chain: string } & ({ heading: number; length: number } | { h0: number; h1: number; radius: number; pieces?: number });
function run(id: string, start: Vec, legs: Leg[]) {
  const surfaces: Surface[] = [];
  let at = start, n = 0;
  const piece = (to: Vec, chain: string) => { surfaces.push({ ...slab(`${id}-${n++}`, at, to), chain }); at = to; };
  for (const leg of legs) {
    if ('length' in leg) { piece(p(at.x + leg.length * Math.cos(leg.heading), at.y + leg.length * Math.sin(leg.heading)), leg.chain); continue; }
    const pieces = leg.pieces ?? 8, step = (leg.h1 - leg.h0) / pieces, chord = 2 * leg.radius * Math.sin(Math.abs(step) / 2);
    for (let i = 0; i < pieces; i++) {
      const heading = leg.h0 + (i + .5) * step;
      piece(p(at.x + chord * Math.cos(heading), at.y + chord * Math.sin(heading)), leg.chain);
    }
  }
  return { surfaces, end: at };
}
const shift = (surfaces: Surface[], by: Vec) => surfaces.map(s => ({ ...s, x: s.x + by.x, y: s.y + by.y }));

/**
 * Leibniz's Counterweight. Geometry (metres, y up):
 *
 *   - The LEDGER is the route clock read along a VERTICAL axis (timeAxis (0, 1), the first map
 *     to do so): it counts the rider's altitude. The bridge over the pit east of the tower is
 *     its counterweight, hung so every metre the rider climbs lowers it a metre (timeTravel =
 *     its 6 m path) and every metre the rider descends raises it. The ledger cannot go below
 *     empty or above full: descending with an empty ledger costs nothing, climbing with a full
 *     one earns nothing. It starts empty, so the bridge starts at its top stop, 6 m above the
 *     tower floor, and riding straight east drops the rider into the pit.
 *   - West of the spawn the floor rounds over a knee into the cellar: a 20° ramp down to a
 *     floor 6.5 m below the tower's, and a quarter-pipe up the west wall. The ride down is free
 *     (the ledger is already empty); the climb back out fills it — full .5 m below the crest,
 *     so a rider back on the tower floor has parked the bridge exactly flush with it, however
 *     they rode the cellar. Any net descent after that would raise it again; the floor from
 *     the cellar's crest to the pit is level.
 *   - The bridge only moves while the rider's altitude changes, so it is still whenever the
 *     rider is on it (the floors either side are level). Its path is vertical, along the
 *     ledger's axis, and the rider never rides it while it moves: that keeps the route clear of
 *     the known passive-carry defect (docs/physics-residuals.md).
 *   - East of the pit a corridor (floor 0, ceiling 2.6) holds a light, heavily damped ball
 *     that falls UP (inverted, gravityScale −1), pressed against the ceiling. It fills the
 *     corridor: the rider has to push it east along the ceiling (the front wheel meets it
 *     below its middle, so the push rolls it forward along the stone) until it is under the
 *     well, a round pocket up into the ceiling as wide as the ball (plus .1 m). There it rises,
 *     seats against the pocket's round top (socket) and becomes fixed stone, crowning .45 m
 *     below the ceiling. A lintel at the corridor's west end keeps a drifting ball from
 *     floating away over the pit; the damping keeps world tilts elsewhere from carrying it far.
 *   - The corridor runs on east over a knee and a 22° ramp into a hall whose east end is a
 *     half loop (radius 4) up onto the ceiling's underside. Upside down, the rider rides the
 *     ceiling back west, over the seated ball, to the last apple and the door at the
 *     corridor's west end. Without the plug the inverted rider falls up into the well, whose
 *     top is a hazard.
 */
export const LEIBNIZ = {
  floor: { x0: -4, x1: 20, y: 0 }, spawnX: 2,
  cellar: { depth: 6.5, ramp: 20 * deg, knee: 3, valley: 4, pipe: 4, bottom: 5, wall: 4 },
  pit: { x0: 20, x1: 28, hazard: -5 },
  bridge: { x: 24, w: 7.9, h: .42, top: 6, low: 0 },
  timeTravel: 6,
  corridor: { x0: 28, x1: 56, ceiling: 2.6, roof: 5.2, lintel: { x1: 28.6, bottom: 2.1 } },
  ball: { r: 1.25, x: 33, density: .3, damping: 4, friction: .9 },
  well: { x: 42, half: 1.3, crown: .45 },
  hall: { knee: 3, ramp: 22 * deg, valley: 4, floor: 3, loop: 4 },
  exit: p(31, 1.8),
};
const L = LEIBNIZ;
/** The seated ball's centre (the pocket's round top is concentric, .02 wider). */
export const WELL_Y = L.corridor.ceiling - L.well.crown + L.ball.r;

/** The cellar, built eastward from the top of its west wall and moved so it ends at the floor's west end. */
const cellar = (() => {
  const C = L.cellar;
  const rise = (r: number) => r * (1 - Math.cos(C.ramp));
  const ramp = (C.depth - rise(C.valley) - rise(C.knee)) / Math.sin(C.ramp);
  const built = run('ledger-cellar', p(0, 0), [
    { chain: 'ledger-cellar', heading: -Math.PI / 2, length: C.wall + C.depth - C.pipe },
    { chain: 'ledger-cellar', h0: -Math.PI / 2, h1: 0, radius: C.pipe },
    { chain: 'ledger-cellar', heading: 0, length: C.bottom },
    { chain: 'ledger-cellar', h0: 0, h1: C.ramp, radius: C.valley, pieces: 4 },
    { chain: 'ledger-cellar', heading: C.ramp, length: ramp },
    { chain: 'ledger-cellar-knee', h0: C.ramp, h1: 0, radius: C.knee, pieces: 4 },
  ]);
  const by = p(L.floor.x0 - built.end.x, L.floor.y - built.end.y);
  const wallX = by.x;
  return { surfaces: shift(built.surfaces, by), wallX, bottomX0: wallX + C.pipe, bottomX1: wallX + C.pipe + C.bottom };
})();
export const CELLAR = { wallX: cellar.wallX, bottomX0: cellar.bottomX0, bottomX1: cellar.bottomX1, floor: -L.cellar.depth };

/** The corridor's east end: knee, ramp, hall floor, half loop and the ceiling's underside back
 * west to the well's east lip, one run. */
const hall = (() => {
  const H = L.hall, ceiling = L.corridor.ceiling, floorY = ceiling - 2 * H.loop;
  const drop = (r: number) => r * (1 - Math.cos(H.ramp));
  const ramp = (L.floor.y - floorY - drop(H.knee) - drop(H.valley)) / Math.sin(H.ramp);
  const loop = run('ledger-hall', p(L.corridor.x1, L.floor.y), [
    { chain: 'ledger-hall-knee', h0: 0, h1: -H.ramp, radius: H.knee, pieces: 4 },
    { chain: 'ledger-hall', heading: -H.ramp, length: ramp },
    { chain: 'ledger-hall', h0: -H.ramp, h1: 0, radius: H.valley, pieces: 4 },
    { chain: 'ledger-hall', heading: 0, length: H.floor },
    { chain: 'ledger-hall', h0: 0, h1: Math.PI, radius: H.loop, pieces: 16 },
  ]);
  const ceilingRun = run('ledger-ceiling', loop.end, [
    { chain: 'ledger-hall', heading: Math.PI, length: loop.end.x - (L.well.x + L.well.half) },
  ]);
  const floorX0 = loop.surfaces.find(s => s.id === 'ledger-hall-9')!;
  return { surfaces: [...loop.surfaces, ...ceilingRun.surfaces], floorY, top: loop.end, floorX0: floorX0.x - floorX0.w / 2 };
})();
export const HALL = { floorY: hall.floorY, loopTop: hall.top };

export const leibnizCounterweightLevel: Level = {
  id: 'leibniz-counterweight', name: 'Leibniz’s Counterweight', subtitle: 'Every action has its reckoning.',
  mechanic: 'The LEDGER counts your altitude: every metre you climb lowers the bridge a metre, every metre you descend raises it. Fill it in the cellar, cross, push the rising ball up into its well, then loop onto the ceiling and ride home upside down.',
  hint: 'The bridge starts high. Ride down into the cellar and climb back out: the climb lowers the bridge flush with the floor. In the corridor push the ball east until it rises into the well, then loop through the hall and ride the ceiling back west over it to the door.',
  spawn: p(L.spawnX, L.floor.y + .72), bounds: { min: p(-36, -10), max: p(82, 10) },
  surfaces: [
    // The tower: its floor, the cellar to the west and the pit to the east.
    block('ledger-floor', L.floor.x0, L.floor.x1, L.floor.y, L.pit.hazard),
    ...cellar.surfaces,
    block('ledger-cellar-fill', cellar.bottomX0, L.floor.x0, -L.cellar.depth - .6, L.pit.hazard - 3),
    block('ledger-west-wall', cellar.wallX - .6, cellar.wallX, L.cellar.wall + 4, -L.cellar.depth - .6),
    { ...block('ledger-pit', L.pit.x0, L.pit.x1, L.pit.hazard, L.pit.hazard - .4), kind: 'hazard' as const },
    // The corridor, its ceiling split by the well, and the lintel at its west end.
    block('ledger-corridor', L.pit.x1, L.corridor.x1, L.floor.y, L.pit.hazard),
    block('ledger-ceiling-west', L.pit.x1, L.well.x - L.well.half, L.corridor.roof, L.corridor.ceiling),
    block('ledger-lintel', L.pit.x1, L.corridor.lintel.x1, L.corridor.ceiling, L.corridor.lintel.bottom),
    ...turn('ledger-well-right', L.well.x, WELL_Y, L.ball.r + .02, 0).map((s, i) => i >= 6 ? { ...s, kind: 'hazard' as const } : s),
    ...turn('ledger-well-left', L.well.x, WELL_Y, L.ball.r + .02, Math.PI / 2).map((s, i) => i <= 1 ? { ...s, kind: 'hazard' as const } : s),
    ...hall.surfaces,
    block('ledger-ceiling-east', L.well.x + L.well.half, hall.top.x, L.corridor.roof, L.corridor.ceiling + .6),
  ],
  props: [{ id: 'ledger-ball', shape: 'ball', inverted: true, x: L.ball.x, y: L.corridor.ceiling - L.ball.r - .01,
    w: 2 * L.ball.r, h: 2 * L.ball.r, density: L.ball.density, damping: L.ball.damping, friction: L.ball.friction,
    socket: { x: L.well.x, y: WELL_Y + .02, tolerance: .06, speed: .1 } }],
  timePlatforms: [{ id: 'ledger-bridge', from: p(L.bridge.x, L.bridge.top - L.bridge.h / 2), to: p(L.bridge.x, L.bridge.low - L.bridge.h / 2),
    w: L.bridge.w, h: L.bridge.h }],
  timeAxis: p(0, 1), timeTravel: L.timeTravel, timeLabel: 'LEDGER',
  apples: [
    a('ledger-apple-floor', 10, .9),
    a('ledger-apple-cellar', (cellar.bottomX0 + cellar.bottomX1) / 2, -L.cellar.depth + .9),
    a('ledger-apple-corridor', 50, .9),
    a('ledger-apple-hall', hall.floorX0 + L.hall.floor / 2, hall.floorY + .9),
    // Hung against the ceiling: only an upside-down rider reaches it.
    a('ledger-apple-ceiling', 36, L.corridor.ceiling - .4),
  ],
  routeHints: [
    { x: -2, y: 1.6, angle: Math.PI, label: 'DESCEND' },
    { x: -14, y: -2, angle: L.cellar.ramp, label: 'CLIMB' },
    { x: 30, y: .9, angle: 0, label: 'PUSH' },
    { x: 66, y: -1, angle: 0, label: 'LOOP' },
  ],
  exit: L.exit, difficulty: 10.25, accent: '#d8b06a',
};

/**
 * Observation-only demonstration (fixed 1/120 s steps), heading-relative like the late pilots:
 * target = trackAngle + clamp((speed − v)·0.22, ±lean). It rides west down into the cellar, turns
 * at its bottom apple and climbs back out (filling the ledger, which parks the bridge), crosses,
 * pushes the ball slowly east until it seats in the well, then rides on through the hall's loop
 * and back west along the ceiling, upside down, to the door. It never brakes.
 */
export function createLeibnizPilot(): (state: Snapshot) => Controls {
  let previous: Vec | undefined, angle = 0, lastRawAngle = 0;
  let stage: 'west' | 'east' | 'push' | 'ride' = 'west';
  return state => {
    const dx = previous ? state.bike.x - previous.x : 0, dy = previous ? state.bike.y - previous.y : 0;
    previous = state.bike;
    const raw = state.bodies.find(body => body.id === 'frame')!.angle;
    angle += Math.atan2(Math.sin(raw - lastRawAngle), Math.cos(raw - lastRawAngle)); lastRawAngle = raw;
    const velocity = (dx * Math.cos(angle) + dy * Math.sin(angle)) * 120;
    const follow = (desired: number, lean = .3) =>
      ({ tilt: clamp((angle + clamp((desired - velocity) * .22, -lean, lean) - state.worldAngle) * 8, -1, 1), brake: false });
    const ball = state.bodies.find(body => body.id === 'ledger-ball');
    if (stage === 'west' && state.collected.includes('ledger-apple-cellar')) stage = 'east';
    if (stage === 'east' && state.bike.x > L.pit.x1 - 1) stage = 'push';
    if (stage === 'push' && (!ball || ball.settled)) stage = 'ride';
    switch (stage) {
      case 'west': return follow(-2.5);
      case 'east': return follow(2.5);
      case 'push': return follow(1.2, .45);
      case 'ride': return follow(2.5);
    }
  };
}
