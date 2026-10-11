import type { Apple, Controls, Level, Snapshot, Surface, Swing, Vec } from '../types';

const p = (x: number, y: number): Vec => ({ x, y });
const g = (id: string, x: number, y: number, w: number, h = .6): Surface => ({ id, x, y, w, h, kind: 'ground' });
const a = (id: string, x: number, y: number): Apple => ({ id, x, y });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** An axis-aligned block spanning x0..x1 and y0..y1. */
const block = (id: string, x0: number, x1: number, y0: number, y1: number): Surface =>
  g(id, (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0);
/** A slab whose ridden face runs from `from` to `to`; the stone lies to the right of that direction. */
const slab = (id: string, from: Vec, to: Vec, h = .5): Surface => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  return { ...g(id, (from.x + to.x) / 2 + Math.sin(angle) * h / 2, (from.y + to.y) / 2 - Math.cos(angle) * h / 2,
    Math.hypot(to.x - from.x, to.y - from.y), h), angle };
};

/**
 * Foucault’s Hall. A long mill hall over water, crossed on three free cradles
 * (4, 6 and 8 m) that keep their own time: their periods are about 4.1, 5.0
 * and 5.7 s, so no single rhythm crosses the hall.
 *
 *   - Each departure bank ends in a stop: a wall square to the deck's end when
 *     the deck has swung out to `reach`. The stop's top block is pitched like
 *     the deck there, so a deck lying against it continues the bank's surface
 *     with a 2 cm joint. The decks are released from 0.6 rad on the far side;
 *     their first swing west strikes the stop and loses the excess, so from
 *     then on each deck swings out just as far as its stop.
 *   - Wait braked at the top of the ramp, and roll down it (about 2.3 s) to
 *     arrive as the deck comes in against the stop: let go as the deck tops
 *     out on the far side, a moment sooner for the slow 8 m deck. The window
 *     is about a second wide on every deck; outside it the bike drops into
 *     the water. Turning the floor back as the front wheel crosses is
 *     optional and does not change the window.
 *   - Level the floor: the deck swings out over the water with you aboard.
 *     Brake to ease to rest just east of its middle.
 *   - As it rises to the far bank, turn the floor under it so it comes to rest
 *     there with its end over the arrival lip. Hold it there: your weight east
 *     of the middle tips the deck down toward the bank and you roll off.
 *
 * Rapier applies a swing's damping to both its linear and angular velocity.
 * At 0.3–0.6 the decks die out within about 20 s, so they use .001: a deck
 * left alone still swings to within a hundredth of a radian of its stop after
 * a minute. Turning the floor shifts every deck's equilibrium and pumps the
 * decks you are not riding; the stops absorb any surplus on the west side.
 */

/** Deck plank: width × .24, hung `length` below its anchor (physics.ts). */
const W = 3, HALF = .12;
/** Distance from the anchor of the deck's top (or bottom) corners. */
const bottomRadius = (L: number) => Math.hypot(L + HALF, W / 2);
/** Offset from the anchor of the deck's west or east top corner when the deck is turned `theta`. */
const corner = (L: number, theta: number, side: -1 | 1) => {
  const c = p(Math.sin(theta) * L, -Math.cos(theta) * L), n = p(-Math.sin(theta), Math.cos(theta)), t = p(Math.cos(theta), Math.sin(theta));
  return p(c.x + n.x * HALF + side * t.x * W / 2, c.y + n.y * HALF + side * t.y * W / 2);
};
/** A point on the swept circle (bottom-corner radius plus `margin`) at height `y` from the anchor, on `side`. */
const onCircle = (L: number, y: number, side: -1 | 1, margin: number) => side * Math.sqrt((bottomRadius(L) + margin) ** 2 - y * y);

export const FOUCAULT = {
  width: W,
  /** Each deck's west end comes to rest against a stop on its departure bank at this angle (rad). */
  reach: .38,
  /** Clearance between a deck's end and its stop when the deck lies against the stop. */
  gap: .02,
  /** How far below the deck's top corner the arrival lip sits (a step down off the deck). */
  drop: .12,
  /** The arrival lip sits where the deck's east corner is at reach − overhang, so a full swing carries the deck's end over it. */
  overhang: .1,
  /** Clearance from every arrival bank to the circle swept by the deck's bottom corners. */
  margin: .03,
  lengths: [4, 6, 8] as const,
  damping: .001, mass: 10,
  angles: [.6, .6, .6] as const,
  /** Each bank declines gently (`slope`, rad) to a waiting spot, then a ramp (`ramp` long,
   *  `steep` rad) and a short stop block (`stop` long, at the deck's own pitch) run down to the lip. */
  slope: .03, bank: 4, ramp: 3, steep: .24, stop: .6,
  start: { x0: -5, flat: 1, wait: 4 },
};
const F = FOUCAULT;
const along = (from: Vec, length: number, slope: number) => p(from.x + length * Math.cos(slope), from.y - length * Math.sin(slope));

/** Lay out the hall from west to east: start bank, then swing, bank, swing, bank, swing, door bank. */
function layout() {
  const swings: Swing[] = [], lips: { wait: Vec; brow: Vec; depart: Vec; arrive: Vec }[] = [];
  let wait = p(F.start.wait, -(F.start.wait - F.start.flat) * Math.tan(F.slope));
  F.lengths.forEach((L, i) => {
    const brow = along(wait, F.ramp, F.steep), lip = along(brow, F.stop, F.reach);
    // Departure lip: the deck's west top corner when the deck lies against the stop, less the gap.
    const west = corner(L, -F.reach, -1);
    const anchor = p(lip.x - west.x + F.gap * Math.cos(F.reach), lip.y - west.y - F.gap * Math.sin(F.reach));
    swings.push({ id: `foucault-swing-${i}`, anchor, length: L, width: W, damping: F.damping, angle: F.angles[i], mass: F.mass });
    const east = corner(L, F.reach - F.overhang, 1), y = east.y - F.drop;
    const arrive = p(anchor.x + onCircle(L, y, 1, F.margin), anchor.y + y);
    lips.push({ wait, brow, depart: lip, arrive });
    wait = along(arrive, F.bank, F.slope);
  });
  return { swings, lips };
}
const { swings, lips } = layout();
const last = lips[2].arrive;
const lowest = Math.min(...swings.map(s => s.anchor.y - bottomRadius(s.length)));
const floor = lowest - 1.2;

/** The stop: a wall under each departure lip, square to the deck when the deck lies against it.
 *  Every other pose of the deck lies east of this wall's line, so the deck can only touch its face. */
const stopFoot = (lip: Vec) => p(lip.x - (lip.y - floor) * Math.tan(F.reach), floor);
const departure = (i: number, id: string) => {
  const { wait, brow, depart } = lips[i], foot = stopFoot(depart);
  return [
    slab(`foucault-ramp-${id}`, wait, brow),
    slab(`foucault-stop-${id}`, brow, depart),
    slab(`foucault-wall-${id}`, depart, foot, .6),
  ];
};
const banks: Surface[] = [
  // The hall's west end: a rider who tilts back from the spawn comes to rest here instead of falling off the map.
  block('foucault-west-wall', F.start.x0 - .4, F.start.x0, floor, 1.8),
  slab('foucault-start', p(F.start.x0, 0), p(F.start.flat, 0)),
  slab('foucault-start-walk', p(F.start.flat, 0), lips[0].wait),
  ...departure(0, '0'),
  block('foucault-start-pier', F.start.x0 + .1, stopFoot(lips[0].depart).x - .05, floor, lips[0].brow.y - .4),
  ...[0, 1].flatMap(i => [
    slab(`foucault-bank-${i}`, lips[i].arrive, lips[i + 1].wait),
    ...departure(i + 1, `${i + 1}`),
    block(`foucault-pier-${i}`, lips[i].arrive.x + .2, stopFoot(lips[i + 1].depart).x - .05, floor, lips[i + 1].brow.y - .4),
  ]),
  slab('foucault-door-bank', last, p(last.x + 8, last.y)),
  block('foucault-door-pier', last.x + .2, last.x + 7.9, floor, last.y - .4),
];
const water = swings.map((s, i) => {
  const x0 = stopFoot(lips[i].depart).x, x1 = lips[i].arrive.x;
  return { id: `foucault-water-${i}`, kind: 'hazard' as const, x: (x0 + x1) / 2, y: floor + .2, w: x1 - x0, h: .35 };
});

export const FOUCAULT_LAYOUT = { swings, lips, floor };

export const foucaultHallLevel: Level = {
  id: 'foucaults-hall', name: 'Foucault’s Hall', subtitle: 'The floor turns beneath the swing.',
  mechanic: 'Three free cradles of different lengths keep their own time over the water, each swinging out to a stop at its bank. Time each boarding to its own swing, and turn the floor to hold the deck.',
  hint: 'Wait braked at the top of each ramp. Let go as the deck tops out on the far side (a moment sooner for the long last deck), so you reach the lip as it swings back against its stop. Ride it out braked, and as it rises to the far bank, tilt forward to hold it there and roll off.',
  spawn: p(0, .72), initialAngle: 0,
  // Tall enough for a deck swung right over its anchor.
  bounds: { min: p(F.start.x0 - 2, floor - 2), max: p(last.x + 10, Math.max(...swings.map(s => s.anchor.y + bottomRadius(s.length))) + .5) },
  surfaces: [...banks, ...water],
  swings,
  // Zoomed out so a rider waiting at a ramp top can see the deck reach its far side (the 8 m deck tops out 10.5 m away).
  camera: { zoom: .8 },
  routeHints: lips.map(l => ({ x: l.wait.x + .3, y: l.wait.y + 2, angle: 0, label: 'WAIT' })),
  // One apple above each deck where it tops out by the far bank, over the rider's seat.
  apples: swings.map((s, i) => {
    const t = F.reach - F.overhang / 2, u = .6, v = 1.2;
    return a(`foucault-apex-${i}`, s.anchor.x + Math.sin(t) * s.length + Math.cos(t) * u - Math.sin(t) * v,
      s.anchor.y - Math.cos(t) * s.length + Math.sin(t) * u + Math.cos(t) * v);
  }),
  exit: p(last.x + 6, last.y + .8), difficulty: 9.75, accent: '#d6b47a',
};

export interface FoucaultTuning {
  /** Waiting spot past the top of each ramp (m). */ wait: number;
  /** Release the brake this long (s) before each deck next strikes its stop. */ lead: number[];
  /** Floor-rocking gain and limit (rad) that keep the waited-for deck swinging `target` past its stop. */ pump: number; pumpMax: number; target: number;
  /** Floor angle that pins the deck against its stop while the bike rolls aboard, once the front wheel passes `boardFrom` (deck-local m). */ boardTilt: number; boardFrom: number;
  /** Resting spot east of the deck's middle (m), and the braking deceleration used to ease there (m/s²). */ seat: number; ease: number;
  /** Servo gains holding the deck at the far bank. */ damp: number; hold: number;
}
export const FOUCAULT_TUNING: FoucaultTuning = { wait: .3, lead: [2.4, 2.4, 2.4], pump: 3, pumpMax: .15, target: .03, boardTilt: -.3, boardFrom: -1.9, seat: .6, ease: 1.5, damp: .5, hold: 3 };
export type FoucaultStage = 'approach' | 'wait' | 'board' | 'ride' | 'catch' | 'leave' | 'land' | 'door';

/**
 * Observation-only demonstration. For each deck: rolls to the top of its ramp
 * and brakes, rocking the floor gently to keep the deck swinging just past its
 * stop; reads the deck's phase from its angle and rate and releases the brake
 * `lead` s before the deck next strikes its stop; tilts the floor back to pin
 * the deck while the bike rolls aboard; levels and eases to rest east of the
 * deck's middle; leans the floor so the deck decelerates to rest beside the far
 * bank, holds it there until the bike rolls off, then levels and stops.
 */
export function createFoucaultPilot(tune: Partial<FoucaultTuning> = {}, log?: (stage: FoucaultStage, leg: number) => void): (state: Snapshot) => Controls {
  const T = { ...FOUCAULT_TUNING, ...tune };
  let previous: Vec | undefined, stage: FoucaultStage = 'approach', leg = 0, lastTheta: number[] | undefined, previousToStop = 0, lastLocal = 0;
  return state => {
    const v = previous ? p((state.bike.x - previous.x) * 120, (state.bike.y - previous.y) * 120) : p(0, 0);
    previous = state.bike;
    const steer = (target: number, brake = false): Controls => ({ tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake });
    const go = (next: FoucaultStage) => { stage = next; log?.(stage, leg); };
    if (stage === 'door') return steer(clamp((1.5 - v.x) * .25, -.25, .25));
    // A deck missing from the map (the counterfactual tests remove them) reads as hanging at rest.
    const pose = (s: Swing) => state.bodies.find(b => b.id === s.id) ?? { x: s.anchor.x, y: s.anchor.y - s.length, angle: 0 };
    const swing = swings[leg], deck = pose(swing);
    const thetas = swings.map(s => pose(s).angle);
    const theta = thetas[leg], omega = lastTheta ? (theta - lastTheta[leg]) * 120 : 0; lastTheta = thetas;
    const { arrive } = lips[leg];
    const local = (b: Vec) => {
      const dx = b.x - deck.x, dy = b.y - deck.y;
      return p(dx * Math.cos(theta) + dy * Math.sin(theta), -dx * Math.sin(theta) + dy * Math.cos(theta));
    };
    const wheels = state.bodies.filter(b => b.kind === 'wheel').map(local);
    const aboard = wheels.every(w => Math.abs(w.x) < W / 2 && Math.abs(w.y - .46) < .12);
    const pitch = state.bodies.find(b => b.id === 'frame')!.angle;
    const x = state.bike.x, waitX = lips[leg].wait.x + T.wait;
    if (stage === 'approach' && Math.abs(waitX - x) < .12 && Math.abs(v.x) < .15) go('wait');
    // Free swing about the world's down: amplitude from its energy, and time until the deck next
    // swings west into its stop (the free swing would pass −reach heading west).
    const rate = Math.sqrt(9.81 / (swing.length + .755 / swing.length));
    const amplitude = Math.acos(clamp(Math.cos(theta - state.worldAngle) - omega * omega / (2 * rate * rate), -1, 1));
    const now = Math.acos(clamp((theta - state.worldAngle) / amplitude, -1, 1)), phase = omega <= 0 ? now : 2 * Math.PI - now;
    const strike = Math.PI - Math.acos(clamp(F.reach / amplitude, -1, 1));
    const toStop = (((strike - phase) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / rate, lastToStop = previousToStop;
    previousToStop = toStop;
    if (stage === 'wait' && toStop < T.lead[leg] && lastToStop >= T.lead[leg] && amplitude > F.reach + T.target - .02) go('board');
    const seat = local(state.bike).x, slide = (seat - lastLocal) * 120; lastLocal = seat;
    if (stage === 'board' && aboard) go('ride');
    if (stage === 'ride' && omega > 0 && theta > 0) go('catch');
    if (stage === 'catch' && Math.abs(omega) < .03 && theta > F.reach - F.overhang) go('leave');
    if (stage === 'leave' && Math.min(...state.bodies.filter(b => b.kind === 'wheel').map(b => b.x)) > arrive.x + .1) go('land');
    if (stage === 'land' && Math.abs(v.x) < .1 && Math.abs(state.worldAngle) < .02) {
      leg++; if (leg > 2) { go('door'); } else go('approach');
    }
    // On the deck, brake only to ease the bike to rest at `seat` (east of the middle).
    const want = Math.sign(T.seat - seat) * Math.sqrt(2 * T.ease * Math.abs(T.seat - seat));
    const settle = slide * Math.sign(slide - want) > 0 || Math.abs(slide) > Math.abs(want) + .1;
    const hold = F.reach - F.overhang / 2;
    switch (stage) {
      case 'approach': {
        const want = clamp((waitX - x) * 1.2, -1, 1);
        return steer(clamp((want - v.x) * .1, -.08, .08), Math.abs(waitX - x) < .12);
      }
      // Rock the floor in step with the swing to pump it up (or against it to calm it) to the lip.
      case 'wait': return steer(clamp(T.pump * (F.reach + T.target - amplitude) * omega, -T.pumpMax, T.pumpMax), true);
      case 'board': return steer(Math.max(...wheels.map(w => w.x)) > T.boardFrom ? T.boardTilt : 0);
      // Ease to a stop on the deck, east of its middle, and ride the swing out.
      case 'ride': return steer(0, settle);
      // Turn the floor under the swing as it rises: the deck comes to rest beside the far bank.
      case 'catch': {
        // Lean the floor so the deck decelerates to rest at `hold`: θ'' = −rate²·(θ − floor).
        const room = hold - theta;
        const lean = room > .02 ? theta - omega * Math.max(omega, 0) / (2 * rate * rate * room) : theta - T.damp * omega;
        return steer(clamp(lean, -.2, .9), settle);
      }
      // Hold the deck at the bank by turning the floor beneath it: the rider's weight east of
      // the middle tilts the held deck down toward the bank, and the bike rolls off.
      case 'leave': return steer(clamp(hold + T.hold * (hold - theta) - T.damp * omega, -.2, 1.1));
      // Level the floor, braking in short dabs so the bike never pitches over the bars.
      case 'land': return steer(0, pitch > -.12 && Math.hypot(v.x, v.y) > .05);
      default: return steer(0, true);
    }
  };
}
