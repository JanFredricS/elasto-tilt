import type { Apple, Controls, Level, Prop, RouteHint, Snapshot, Surface, Vec } from '../types';

const p = (x: number, y: number): Vec => ({ x, y });
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const DEG = Math.PI / 180;
const THICK = .5;
const STEP = .3;

/**
 * Torricelli's Well: a deep cistern under the spawn deck's edge.
 *
 *   - The way down is Newton's Ouroboros' fall: brake to a creep, tip over a rounded edge and drop
 *     past a sheer, slightly undercut wall onto a curved catcher and a sloping run-out.
 *   - Water fills a pool on the cistern floor. A short, lightly damped pendulum deck ferries the
 *     rider across it once.
 *   - Two floats (inverted props) rest under low beams on the far bank, each against a lip. Pushed
 *     off its beam's open end, a float rises to the vaulted roof and rolls up its slope until the
 *     first open socket swallows it: a round-capped well cut into the vault, which seats it as gold
 *     stone. Each beam sits just down-slope of its own well, so each float finds its own socket.
 *   - The return is the vault itself. A half-pipe at the far end turns the floor into the end wall
 *     and the end wall into the vault; with the world turned over, the vault is a long slope down to
 *     the door, hung in a pocket under the well-head beside the shaft, a few metres from the spawn.
 *     The two seated floats are its footholds: an empty socket is a pit the wheels drop into.
 */
export interface TorricelliShape {
  /** Spawn deck (top y = 0) from `deck` to the edge at x = 0. */
  deck: number;
  /** The way down (Ouroboros' grammar): edge radius, wall angle (deg), shaft depth below the deck,
   *  catcher radius, run-out angle (deg), bend radius, cistern floor depth below the deck. */
  edgeRadius: number; wall: number; shaft: number; catchRadius: number; runout: number; bendRadius: number; floor: number;
  /** The pool's near edge and the water's depth below the floor. */
  pool: number; poolDepth: number;
  /** Pendulum: length, deck width, mass and damping. Its deck hangs at rest flush with the near bank,
   *  touching it; swung `dock` radians it meets the far bank's wall, which is built where its end
   *  then is: across the pool and higher, so the deck is a ferry and not a bridge. */
  swing: { length: number; width: number; mass: number; damping: number; dock: number };
  /** The half-pipe at the far end: centre x and radius (floor to vault is twice the radius). */
  turnX: number; turnRadius: number;
  /** Vault: radius of the crest rounding the half-pipe onto the slope, and the slope (deg). */
  crestRadius: number; slope: number;
  /** Door pocket: back-bend x (the stub that hangs under the well-head), pocket length, bend radii, lip. */
  stub: number; pocketLength: number; pocketBend: number; backRadius: number; lip: number;
  /** Floats: radius, crown (how far a seated float stands proud of the vault), density and damping. */
  float: { radius: number; crown: number; density: number; damping: number };
  /** Sockets' x along the vault (A down-slope, B up-slope), and the float beams beneath them:
   *  [lip x, open end x]; the beam's underside height above the far bank, and its lip's depth. */
  sockets: [number, number]; beams: [[number, number], [number, number]]; beamHeight: number; beamLip: number;
}
export const TORRICELLI_SHAPE: TorricelliShape = {
  deck: -9,
  edgeRadius: .4, wall: -92, shaft: 9.4, catchRadius: 3, runout: -12, bendRadius: 6, floor: 14,
  pool: 14, poolDepth: 3,
  swing: { length: 4.2, width: 2.8, mass: 20, damping: 1.5, dock: .45 },
  turnX: 35.5, turnRadius: 4,
  crestRadius: 6, slope: 8,
  stub: 7.6, pocketLength: 3.4, pocketBend: 3, backRadius: 1.2, lip: 2.2,
  float: { radius: 1, crown: .4, density: .1, damping: 2 },
  sockets: [31.5, 25], beams: [[28, 31.5], [21.5, 25]], beamHeight: 2.95, beamLip: .5,
};

/** Points along an arc about centre (radians), every ~STEP metres, including both ends. */
const arc = (centre: Vec, radius: number, from: number, to: number) => {
  const n = Math.max(1, Math.ceil(Math.abs(to - from) * radius / STEP));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = from + (to - from) * i / n;
    return p(centre.x + radius * Math.cos(t), centre.y + radius * Math.sin(t));
  });
};
/** Appends points, dropping a first point that duplicates the current last one. */
const extend = (into: Vec[], points: Vec[]) => {
  for (const q of points) if (into.length === 0 || Math.hypot(q.x - into.at(-1)!.x, q.y - into.at(-1)!.y) > 1e-6) into.push(q);
  return into;
};
/** One rideable plank between two top-face points in travel order; the face left of travel is ridden. */
const plank = (id: string, a: Vec, b: Vec, chain?: string, thick = THICK, kind: Surface['kind'] = 'ground'): Surface => {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  return { id, x: (a.x + b.x) / 2 + Math.sin(angle) * thick / 2, y: (a.y + b.y) / 2 - Math.cos(angle) * thick / 2,
    w: Math.hypot(b.x - a.x, b.y - a.y), h: thick, angle, kind, ...(chain ? { chain } : {}) };
};
/** Planks through top-face points in travel order, as one seam-free chain. */
const chainOf = (id: string, points: Vec[], thick = THICK) =>
  points.slice(1).map((q, i) => plank(`${id}-${i}`, points[i], q, id, thick));
/** An axis-aligned block spanning x0..x1 and y0..y1. */
const block = (id: string, x0: number, x1: number, y0: number, y1: number, kind: Surface['kind'] = 'ground'): Surface =>
  ({ id, x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0, kind });

export interface TorricelliGeometry {
  /** Near cistern floor, far bank, the pool between them; the edge's tip, and where the run-out's
   *  bend lays onto the floor. */
  floorY: number; bankY: number; pool: [number, number]; tip: Vec; edgeEnd: Vec; wallEnd: Vec; catchEnd: Vec; floorFrom: number;
  /** Swing anchor, the deck's centre when docked at the far bank, and the half-pipe's centre. */
  anchor: Vec; docked: Vec; turn: Vec;
  /** The vault: the crest's end, a unit vector up its slope (travel direction home) and its height at x. */
  crestEnd: Vec; up: Vec; vaultAt: (x: number) => number;
  /** Each socket's mouth centre on the vault, half-width, and the seated float's centre (the socket point). */
  sockets: { mouth: Vec; half: number; seat: Vec }[];
  /** Door pocket: its face height, its x span and the door. */
  pocketY: number; pocket: [number, number]; door: Vec;
}

export function buildTorricelli(shape: TorricelliShape = TORRICELLI_SHAPE, apples: Apple[] = [], routeHints: RouteHint[] = [],
  withFloats = true): { level: Level; geometry: TorricelliGeometry } {
  const F = -shape.floor, r = shape.edgeRadius, w = shape.wall * DEG, a = shape.runout * DEG;
  const tip = p(0, 0);
  // The way down, exactly as Ouroboros builds it (with no kicker): a convex edge, a sheer wall,
  // a curved catcher onto a sloping run-out and a wide bend onto the floor.
  const wallDir = p(Math.cos(w), Math.sin(w)), dir = p(Math.cos(a), Math.sin(a));
  const edge = p(tip.x, tip.y - r);
  const edgeEnd = p(edge.x + r * Math.cos(w + Math.PI / 2), edge.y + r * Math.sin(w + Math.PI / 2));
  const wallEnd = p(edgeEnd.x + wallDir.x * (edgeEnd.y + shape.shaft) / -wallDir.y, -shape.shaft);
  const R = shape.catchRadius;
  const catcher = p(wallEnd.x - wallDir.y * R, wallEnd.y + wallDir.x * R);
  const catchEnd = p(catcher.x + R * Math.cos(a - Math.PI / 2), catcher.y + R * Math.sin(a - Math.PI / 2));
  const centreY = F + shape.bendRadius, normal = p(-dir.y, dir.x);
  const along = (centreY - shape.bendRadius * normal.y - catchEnd.y) / dir.y;
  if (!(along > 0)) throw new RangeError('Torricelli run-out is too short');
  const bendStart = p(catchEnd.x + dir.x * along, catchEnd.y + dir.y * along);
  const bend = p(bendStart.x + normal.x * shape.bendRadius, centreY);
  const poolL = shape.pool;
  if (!(poolL > bend.x + 1)) throw new RangeError('Torricelli pool starts inside the bend');
  // The ferry hangs at rest flush with the near floor, its end a hand's breadth from the near wall.
  // Swung `dock` radians, its far top corner fixes the far bank's edge and height.
  const { length: L, width: W, mass, damping, dock } = shape.swing;
  const anchor = p(poolL + W / 2 + .05, F - .12 + L);
  const docked = p(anchor.x + L * Math.sin(dock), anchor.y - L * Math.cos(dock));
  const corner = p(docked.x + W / 2 * Math.cos(dock) - .12 * Math.sin(dock), docked.y + W / 2 * Math.sin(dock) + .12 * Math.cos(dock));
  const poolR = corner.x + .03, F2 = corner.y;
  const down: Vec[] = [p(shape.deck, 0), tip];
  extend(down, arc(edge, r, Math.PI / 2, w + Math.PI / 2));
  extend(down, [wallEnd]);
  extend(down, arc(catcher, R, w - Math.PI / 2, a - Math.PI / 2));
  extend(down, [bendStart]);
  extend(down, arc(bend, shape.bendRadius, a - Math.PI / 2, -Math.PI / 2));
  extend(down, [p(poolL, F)]);

  // The far bank, the half-pipe, the crest and the vault up to the first socket; then the vault
  // between the sockets; then the vault to the pocket, the pocket and its back lip.
  const T = shape.turnRadius, turn = p(shape.turnX, F2 + T), s = shape.slope * DEG, Rc = shape.crestRadius;
  const up = p(-Math.cos(s), Math.sin(s)), into = p(Math.sin(s), Math.cos(s));
  const crestCentre = p(turn.x, turn.y + T + Rc);
  const crestEnd = p(crestCentre.x - Rc * Math.sin(s), crestCentre.y - Rc * Math.cos(s));
  const vaultAt = (x: number) => crestEnd.y + (crestEnd.x - x) * Math.tan(s);
  const Rb = shape.pocketBend, pocketEnd = shape.stub + shape.backRadius + shape.pocketLength;
  const pocketStart = p(pocketEnd + Rb * Math.sin(s), 0);
  pocketStart.y = vaultAt(pocketStart.x);
  const pocketCentre = p(pocketStart.x - Rb * Math.sin(s), pocketStart.y - Rb * Math.cos(s));
  const pocketY = pocketCentre.y + Rb;
  const f = shape.float, half = f.radius + .03;
  const sockets = shape.sockets.map(x => {
    const mouth = p(x, vaultAt(x));
    // The cap's centre: a seated float, pressed up into the cap, sits just above it.
    const cap = p(mouth.x + into.x * (f.radius - f.crown), mouth.y + into.y * (f.radius - f.crown));
    return { mouth, half, cap, seat: p(cap.x, cap.y + half - f.radius) };
  });
  const edgeOf = (i: number, side: -1 | 1) => p(sockets[i].mouth.x + up.x * half * side, sockets[i].mouth.y + up.y * half * side);
  const far: Vec[] = [p(poolR, F2)];
  extend(far, arc(turn, T, -Math.PI / 2, Math.PI / 2));
  extend(far, arc(crestCentre, Rc, -Math.PI / 2, -Math.PI / 2 - s));
  extend(far, [edgeOf(0, -1)]);
  const between = [edgeOf(0, 1), edgeOf(1, -1)];
  const home: Vec[] = [edgeOf(1, 1), pocketStart];
  extend(home, arc(pocketCentre, Rb, Math.PI / 2 - s, Math.PI / 2));
  const backCentre = p(shape.stub + shape.backRadius, pocketY - shape.backRadius);
  extend(home, [p(backCentre.x, pocketY)]);
  extend(home, arc(backCentre, shape.backRadius, Math.PI / 2, Math.PI));
  extend(home, [p(shape.stub, backCentre.y - shape.lip)]);
  // Each socket: a wall up each side of its mouth and a round cap, ridden on the inside.
  const socketSurfaces = sockets.flatMap(({ cap }, i) => {
    const id = `torricelli-socket-${'ab'[i]}`, near = edgeOf(i, -1), farEdge = edgeOf(i, 1);
    const pts: Vec[] = [near];
    extend(pts, arc(cap, half, -s, Math.PI - s));
    extend(pts, [farEdge]);
    return chainOf(id, pts, .3);
  });
  // Float beams: a flat underside `beamHeight` above the floor, a lip hanging at the left end.
  const beamSurfaces = shape.beams.flatMap(([lip, end], i) => {
    const id = `torricelli-beam-${'ab'[i]}`, under = F2 + shape.beamHeight;
    return [block(id, lip, end, under, under + .5), block(`${id}-lip`, lip - .4, lip, under - shape.beamLip, under + .5)];
  });
  const pool: Surface[] = [
    block('torricelli-pool-west', poolL - .5, poolL, F - shape.poolDepth - .5, F),
    block('torricelli-pool-east', poolR, poolR + .5, F - shape.poolDepth - .5, F2),
    block('torricelli-water', poolL, poolR, F - shape.poolDepth - .5, F - shape.poolDepth, 'hazard'),
  ];
  const right = turn.x + T + THICK;
  const floats: Prop[] = shape.beams.map(([lip], i) => ({
    id: `torricelli-float-${'ab'[i]}`, shape: 'ball', w: 2 * f.radius, h: 2 * f.radius, inverted: true,
    x: lip + f.radius + .02, y: F2 + shape.beamHeight - f.radius - .02, density: f.density, friction: .3, damping: f.damping,
    socket: { x: sockets[i].seat.x, y: sockets[i].seat.y, tolerance: .12, speed: .15 },
  }));
  const door = p(shape.stub + shape.backRadius + shape.pocketLength * .45, pocketY - .9);
  const level: Level = {
    id: 'torricellis-well', name: 'Torricelli’s Well', subtitle: 'Nature abhors a vacuum.', difficulty: 8.25, accent: '#6f9fc4',
    mechanic: 'Drop down the well, ferry across the cistern on the pendulum, and push each rising float off its beam: it fills a hollow in the vault and turns to gold stone. Then turn the world over and ride the vault home, stepping on the floats.',
    hint: 'Brake to a creep and tip over the edge. Roll gently onto the resting deck, hold BRAKE and tip the world forward until it docks at the far bank. Roll under each beam: your head pushes the float off its end and it rises into its socket. When both are gold, follow the end wall round and keep turning until the vault is your floor, then roll down it to the door.',
    spawn: p(shape.deck + 4, .72), initialAngle: 0,
    bounds: { min: p(shape.deck - 3, F - shape.poolDepth - 4), max: p(right + 4, 6) },
    surfaces: [
      ...chainOf('torricelli-way', down), ...chainOf('torricelli-vault', far),
      plank('torricelli-vault-mid', between[0], between[1]), ...chainOf('torricelli-home', home),
      ...socketSurfaces, ...beamSurfaces, ...pool,
      block('torricelli-back', shape.deck - .5, shape.deck, -.5, 3),
      // The well-head over the cistern and the shaft's far wall above the door pocket.
      block('torricelli-shaft-east', shape.stub - .5, shape.stub, pocketY, 0),
      block('torricelli-wellhead', shape.stub - .5, right, 0, .6),
    ],
    swings: [{ id: 'torricelli-ferry', anchor, length: L, width: W, mass, damping }],
    props: withFloats ? floats : [],
    apples, exit: door, routeHints,
  };
  return { level, geometry: { floorY: F, bankY: F2, pool: [poolL, poolR], tip, edgeEnd, wallEnd, catchEnd, floorFrom: bend.x, anchor, docked, turn, crestEnd, up, vaultAt,
    sockets: sockets.map(({ mouth, half, seat }) => ({ mouth, half, seat })), pocketY, pocket: [shape.stub, pocketEnd], door } };
}

const g0 = buildTorricelli().geometry;
const S = TORRICELLI_SHAPE;
export const TORRICELLI_APPLES: Apple[] = [
  { id: 'torricelli-landing', x: (g0.floorFrom + g0.pool[0]) / 2, y: g0.floorY + .9 },
  { id: 'torricelli-pool', x: (g0.pool[0] + g0.pool[1]) / 2, y: g0.docked.y + 1.2 },
  { id: 'torricelli-bank', x: (S.beams[1][1] + S.beams[0][0]) / 2, y: g0.bankY + .9 },
  { id: 'torricelli-wall', x: S.turnX + S.turnRadius - .9, y: g0.turn.y },
  { id: 'torricelli-vault', x: (S.sockets[0] + S.sockets[1]) / 2, y: g0.vaultAt((S.sockets[0] + S.sockets[1]) / 2) - .9 },
];
export const TORRICELLI_HINTS: RouteHint[] = [
  { x: S.beams[1][0] + 1.6, y: g0.bankY + S.beamHeight + 1.4, angle: 0, label: 'PUSH' },
  { x: S.turnX - 1, y: g0.turn.y, angle: 0, label: 'TURN OVER', spin: 1 },
  { x: (S.sockets[1] + S.pocketLength + S.stub) / 2, y: g0.vaultAt((S.sockets[1] + S.pocketLength + S.stub) / 2) - 2, angle: Math.PI - S.slope * DEG, label: 'HOME' },
];
const built = buildTorricelli(TORRICELLI_SHAPE, TORRICELLI_APPLES, TORRICELLI_HINTS);
export const torricelliGeometry = built.geometry;
export const torricelliLevel: Level = built.level;

export interface TorricelliPilotTuning {
  /** Creep speed over the edge (m/s) and how far (rad) to tip the world forward there. */
  creep: number; nudge: number;
  /** Riding speed on the floor and on the vault (m/s). */
  floor: number; vault: number;
  /** Speed (m/s) to ride aboard the resting deck, and the world tilt (rad) that swings it, loaded, across. */
  board: number; carry: number;
}
export const TORRICELLI_PILOT: TorricelliPilotTuning = { creep: .6, nudge: .1, floor: 1.5, vault: 1.8, board: 1, carry: .5 };

/**
 * Observation-only pilot (normal tilt and brake). Creeps over the edge and falls with the world held
 * upright; rides gently aboard the deck resting at the near bank and brakes while tilting it
 * across to the far bank; rides along the far bank, its head pushing each float off its beam, and
 * waits by the end wall until both floats are gold; follows the half-pipe round, turning the world
 * with the bike until the vault is underfoot; rides down the vault over both floats and brakes at the door.
 */
export function torricelliPilotFor(level: Level, geometry: TorricelliGeometry, shape: TorricelliShape = TORRICELLI_SHAPE,
  tuning: TorricelliPilotTuning = TORRICELLI_PILOT): (state: Snapshot) => Controls {
  const G = geometry, F = G.floorY, [poolL, poolR] = G.pool;
  const vaultHeading = Math.PI - shape.slope * DEG, swingId = level.swings![0].id;
  let previous: Vec | undefined, lastTime = 0, bike = 0, lastRaw = 0, v = p(0, 0), deckLast: Vec | undefined, deckV = p(0, 0);
  let stage: 'edge' | 'fall' | 'land' | 'board' | 'carry' | 'off' | 'bank' | 'wait' | 'turn' | 'vault' | 'door' = 'edge';
  return state => {
    const raw = state.bodies.find(body => body.id === 'frame')!.angle;
    bike += Math.atan2(Math.sin(raw - lastRaw), Math.cos(raw - lastRaw)); lastRaw = raw;
    const dt = state.elapsed - lastTime;
    if (previous && dt > 0) v = p((state.bike.x - previous.x) / dt, (state.bike.y - previous.y) / dt);
    previous = state.bike; lastTime = state.elapsed;
    const { x, y } = state.bike;
    const along = (heading: number) => v.x * Math.cos(heading) + v.y * Math.sin(heading);
    const steer = (target: number, brake = false): Controls => ({ tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake });
    const cruise = (heading: number, speed: number, lean = .3) => heading + clamp((speed - along(heading)) * .23, -lean, lean);
    const deck = state.bodies.find(body => body.id === swingId)!;
    if (deckLast && dt > 0) deckV = p((deck.x - deckLast.x) / dt, (deck.y - deckLast.y) / dt);
    deckLast = p(deck.x, deck.y);
    const floats = state.bodies.filter(body => body.kind === 'prop');
    // Stage changes.
    if (stage === 'edge' && (y < -.3 || x > G.tip.x + .3)) stage = 'fall';
    if (stage === 'fall' && x > G.catchEnd.x && y < F + 1.6 && Math.abs(v.y) < 3) stage = 'land';
    if (stage === 'land' && x > poolL - 1.2) stage = 'board';
    if (stage === 'board' && x > deck.x) stage = 'carry';
    if (stage === 'carry' && deck.x > G.docked.x - .15 && Math.abs(deckV.x) < .3) stage = 'off';
    if (stage === 'off' && x > poolR + 1) stage = 'bank';
    if (stage === 'bank' && x > G.turn.x - 2) stage = 'wait';
    if (stage === 'wait' && floats.every(body => body.settled) && Math.abs(v.x) < .1) stage = 'turn';
    if (stage === 'turn' && y > G.turn.y + 2.5 && x < G.turn.x - .5) stage = 'vault';
    if (stage === 'vault' && x < shape.stub + shape.backRadius + shape.pocketLength + .5) stage = 'door';
    switch (stage) {
      case 'edge': {
        // Creep up to the edge; tip the world forward so the bike rolls over it.
        const near = x > G.tip.x - 1.5;
        const target = near ? clamp(tuning.nudge + (tuning.creep - along(0)) * .5, 0, .45) : cruise(0, 1.5);
        return steer(target, along(0) > (near ? tuning.creep + .3 : 2) && x < G.tip.x - .3);
      }
      case 'fall': return steer(0);
      case 'land': return steer(cruise(0, clamp((poolL - .6 - x) * .9, .8, 2.5)), along(0) > 6);
      case 'board': return steer(cruise(raw, tuning.board), along(0) > tuning.board + .3);
      case 'carry': return steer(tuning.carry, true);
      case 'off': return steer(tuning.carry + .1);
      case 'bank': return steer(cruise(0, tuning.floor));
      case 'wait': return steer(-.15 * Math.sign(v.x), true);
      case 'turn': {
        // Round the half-pipe with gravity pointing out from its centre.
        const heading = x < G.turn.x ? 0 : Math.atan2(y - G.turn.y, x - G.turn.x) + Math.PI / 2;
        return steer(Math.min(cruise(heading, 1.8), vaultHeading + .3));
      }
      case 'vault': return steer(cruise(vaultHeading, tuning.vault));
      default: {
        // In the pocket: slow to a stop on the door.
        const speed = clamp((x - G.door.x) * .8, 0, 1.5);
        return steer(cruise(Math.PI, speed), along(Math.PI) > speed + .3);
      }
    }
  };
}

/** Replay pilot for the campaign map. */
export function createTorricelliPilot(): (state: Snapshot) => Controls {
  return torricelliPilotFor(torricelliLevel, torricelliGeometry);
}
