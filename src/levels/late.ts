import type { Apple, Controls, Level, Snapshot, Surface, Vec } from '../types';
const p = (x: number, y: number): Vec => ({ x, y });
const g = (id: string, x: number, y: number, w: number, h = .6): Surface => ({ id, x, y, w, h, kind: 'ground' });
const a = (id: string, x: number, y: number): Apple => ({ id, x, y });
const bounds = (x: number, y: number) => ({ min: p(-4, -5), max: p(x, y) });
// Tangent faces join without a curb. Four-metre radii leave room for the rigid rider.
const turn = (id: string, x: number, y: number, radius: number, start: number): Surface[] => {
  const thickness = .42, step = Math.PI / 16;
  return Array.from({ length: 8 }, (_, i) => {
    const angle = start + (i + .5) * step, r = radius + thickness / 2;
    return { ...g(`${id}-${i}`, x + Math.cos(angle) * r, y + Math.sin(angle) * r,
      2 * r * Math.sin(step / 2) + .12, thickness), angle: angle + Math.PI / 2 };
  });
};
const slope = (id: string, from: Vec, to: Vec): Surface => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  return { ...g(id, (from.x + to.x) / 2 + Math.sin(angle) * .3,
    (from.y + to.y) / 2 - Math.cos(angle) * .3, Math.hypot(to.x - from.x, to.y - from.y) + .12), angle };
};

// Newton's Attic: a slick 9.8 kg barrel (≈2.4× the bike) rests in a notched
// cradle on the ridge. Pushed over the lip it drops into a well whose round
// floor matches its radius, locks there and becomes the bridge. A small
// teaser barrel rehearses the same verb in its own floor socket.
const ATTIC = (() => {
  const barrel = 1.25, lip = 35 * Math.PI / 180, cradleX = 27;
  return {
    barrel,
    teaser: { x: 9.5, half: .5 },
    // The barrel's right lip is 35° from its lowest point, so it holds against
    // tilt alone until about 34°, but leaning the bike's weight into it pops it
    // at about 26–28°. The left back lip is 68°: it survives a held 1.1 rad tilt.
    cradle: { x: cradleX, half: barrel * Math.sin(lip), lip, floor: 2.2 - barrel * (1 - Math.cos(lip)) - .04,
      barrelY: 2.2 + barrel * Math.cos(lip) + .01, back: 68 * Math.PI / 180 },
    // A circle cannot sit flush in a hole it fell through: seated, the barrel
    // crowns .45 m above the floor so the joints stay shallow enough to roll
    // over (.35–.55 m all work; .3 m traps a slow wheel in the joint).
    well: { x: 31, y: 2.2 + .45 - barrel, half: 1.3, radius: barrel + .02 },
  };
})();
/** A thin box whose underside follows from→to: a ceiling beam. */
const beam = (id: string, from: Vec, to: Vec, h = .4): Surface => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  return { ...g(id, (from.x + to.x) / 2 - Math.sin(angle) * h / 2, (from.y + to.y) / 2 + Math.cos(angle) * h / 2,
    Math.hypot(to.x - from.x, to.y - from.y) + .04, h), angle };
};
/**
 * Asymmetric cradle. Right: a 35° chamfered lip the barrel can be pushed over.
 * Left: a bowl concentric with the barrel rising to a steep back lip (BACK° from
 * the bottom), reached by a gentle ramp, so no sane leftward tilt spills it
 * back down the climb towards the door.
 */
const cradle = (): Surface[] => {
  const { x, half, lip, floor, barrelY, back } = ATTIC.cradle, run = (2.2 - floor) / Math.tan(lip);
  const radius = ATTIC.barrel + .02, start = Math.PI * 1.5 - back;
  const crest = p(x + Math.cos(start) * radius, barrelY + Math.sin(start) * radius);
  return [...turn('attic-cradle-bowl', x, barrelY, radius, start),
    slope('attic-cradle-ramp', p(crest.x - 3.4, 2.2), crest),
    slope('attic-cradle-right', p(x + half - run, floor), p(x + half, 2.2))];
};
const wellWalls = (): Surface[] => {
  const { x, y, half } = ATTIC.well, height = 2.2 - y;
  return [g('attic-well-wall-left', x - half - .2, y + height / 2, .4, height),
    g('attic-well-wall-right', x + half + .2, y + height / 2, .4, height)];
};
/** The two facets nearest the bottom of the well are a visible hazard. */
const hazardAtBottom = (index: number) => (s: Surface, i: number): Surface =>
  i === index || i === index + 1 ? { ...s, kind: 'hazard' } : s;

/** Saved campaign IDs and order intentionally match the original last five maps. */
export const lateLevels: Level[] = [
  {
    id: 'newtons-attic', name: 'Newton’s Attic', subtitle: 'Set the mass in motion',
    mechanic: 'Push the small barrel into its floor socket, then push the great barrel off its ridge cradle so it plugs the well and becomes your bridge.',
    hint: 'Roll into the barrels: they move when you push. Shove the ridge barrel over its lip, wait for it to seat in the well, cross, then return past the door to the storage apple.',
    spawn: p(0, .7), bounds: { min: p(-13, -5), max: p(53, 12) }, difficulty: 6, accent: '#c9a982',
    surfaces: [
      g('attic-entry', (-10 + ATTIC.teaser.x - ATTIC.teaser.half) / 2, -.3, ATTIC.teaser.x - ATTIC.teaser.half + 10),
      g('attic-entry-step', (11 + ATTIC.teaser.x + ATTIC.teaser.half) / 2, -.3, 11 - ATTIC.teaser.x - ATTIC.teaser.half),
      g('attic-teaser-socket', ATTIC.teaser.x, -.75, 2.4, .3),
      slope('attic-up', p(11, 0), p(21, 2.2)),
      g('attic-ridge', 23, 1.9, 4),
      ...cradle(),
      g('attic-ridge-lip', (ATTIC.cradle.x + ATTIC.cradle.half + ATTIC.well.x - ATTIC.well.half) / 2, 1.9,
        ATTIC.well.x - ATTIC.well.half - ATTIC.cradle.x - ATTIC.cradle.half),
      ...wellWalls(),
      ...turn('attic-well-left', ATTIC.well.x, ATTIC.well.y, ATTIC.well.radius, Math.PI).map(hazardAtBottom(6)),
      ...turn('attic-well-right', ATTIC.well.x, ATTIC.well.y, ATTIC.well.radius, Math.PI * 1.5).map(hazardAtBottom(0)),
      g('attic-ridge-far', (ATTIC.well.x + ATTIC.well.half + 33.5) / 2, 1.9, 33.5 - ATTIC.well.x - ATTIC.well.half),
      slope('attic-down', p(33.5, 2.2), p(43.5, 0)),
      g('attic-far-pocket', 47, -.3, 7), g('attic-far-wall', 50.8, 1, .6, 3.2),
      // Low roof beams sit inside the riding frame: the attic reads as a room.
      beam('attic-roof-entry', p(-12, 4.4), p(10, 4.4)), beam('attic-roof-rise', p(10, 4.4), p(20, 6.6)),
      beam('attic-roof-ridge', p(20, 6.6), p(36, 6.6)), beam('attic-roof-fall', p(36, 6.6), p(43, 4.4)),
      beam('attic-roof-far', p(43, 4.4), p(51.1, 4.4)),
    ],
    props: [
      // Teaser: the same verb at small scale, with its own rhyming socket.
      { id: 'attic-weight', shape: 'ball', x: 7.8, y: .4, w: .8, h: .8,
        socket: { x: ATTIC.teaser.x, y: -.2, tolerance: .15, speed: .1 } },
      { id: 'attic-barrel', shape: 'ball', x: ATTIC.cradle.x, y: ATTIC.cradle.barrelY, w: ATTIC.barrel * 2, h: ATTIC.barrel * 2,
        density: 2, friction: .05, socket: { x: ATTIC.well.x, y: ATTIC.well.y - .02, tolerance: .06, speed: .1 } },
    ],
    apples: [a('attic-a', 4, .9), a('attic-b', 16, 2), a('attic-c', 24, 3.1),
      a('attic-d', 38.5, 2), a('attic-e', 47, .9), a('attic-f', -8, .9)],
    exit: p(-1, .75),
  },
  {
    id: 'eschers-orchard', name: 'Escher’s Orchard', subtitle: 'The room above is the room below',
    mechanic: 'A low spiral tunnel turns floor into wall and ceiling, then returns above the entrance.',
    hint: 'Trace the outer apples clockwise. After the left wall, collect both terrace apples, then reverse to the inner door.',
    spawn: p(4, .7), bounds: bounds(38, 18), difficulty: 7, accent: '#d49db8',
    camera: { zoom: .9, verticalOffset: .04 },
    surfaces: [
      g('escher-lower-gallery', 15, -.3, 30),
      ...turn('escher-southeast', 30, 4, 4, -Math.PI / 2), g('escher-east-room', 34.3, 7, .6, 6),
      ...turn('escher-northeast', 30, 10, 4, 0), g('escher-upper-gallery', 17, 14.3, 26),
      ...turn('escher-northwest', 4, 10, 4, Math.PI / 2), g('escher-west-room', -.3, 9, .6, 2),
      ...turn('escher-inner-return', 4, 8, 4, Math.PI),
      // The same slab is the low entrance roof and the final terrace floor.
      // A continuous inner lining keeps the 2.4m tunnel visible through every bend.
      g('escher-shared-floor-ceiling', 17, 3.2, 26, 1.6),
      ...turn('escher-lining-southeast', 30, 4, 1.18, -Math.PI / 2),
      g('escher-inner-east-wall', 31.39, 7, .42, 6),
      ...turn('escher-lining-northeast', 30, 10, 1.18, 0),
      g('escher-inner-ceiling', 17, 11.39, 26, .42),
      ...turn('escher-lining-northwest', 4, 10, 1.18, Math.PI / 2),
      g('escher-inner-west-wall', 2.61, 9, .42, 2),
      ...turn('escher-lining-return', 4, 8, 1.18, Math.PI),
      g('escher-terrace-ceiling', 15, 6.61, 22, .42),
    ],
    apples: [a('escher-a', 8, .9), a('escher-b', 23, .9), a('escher-c', 33.1, 7),
      a('escher-d', 23, 13.1), a('escher-e', 9, 13.1), a('escher-f', .9, 9),
      a('escher-g', 12, 4.9), a('escher-h', 22, 4.9)],
    exit: p(7, 4.8),
  },
  {
    id: 'contrary-conservatory', name: 'The Contrary Conservatory', subtitle: 'Two orchards, opposite skies',
    mechanic: 'Cross the lower greenhouse, turn around its end, and ride home on the roof beside rising weights.',
    hint: 'The striped balls fall opposite to you. Follow the lower apples, the end wall, then the ceiling apples. Reverse from the far roof pocket to the door.',
    spawn: p(0, .7), bounds: bounds(48, 18), difficulty: 8, accent: '#77c9c3',
    surfaces: [g('contrary-lower', 19, -.3, 42),
      ...turn('contrary-lower-turn', 40, 4, 4, -Math.PI / 2),
      g('contrary-end-wall', 44.3, 7, .6, 6), ...turn('contrary-upper-turn', 40, 10, 4, 0),
      g('contrary-roof', 19, 14.3, 42), g('contrary-left', -2.3, 7, .6, 14),
      g('contrary-first-nursery', 10, 5, 12), g('contrary-second-nursery', 28, 9, 13),
      g('contrary-planter-a', 5, 6.4, .6, 2.2), g('contrary-planter-b', 33, 7.7, .6, 2),
    ],
    props: [{ id: 'contrary-weight', shape: 'ball', x: 16, y: 3.3, w: .55, h: .55, inverted: true },
      { id: 'contrary-second-weight', shape: 'ball', x: 35, y: 6, w: .55, h: .55, inverted: true }],
    apples: [a('contrary-a', 6, .9), a('contrary-b', 21, .9), a('contrary-c', 35, .9),
      a('contrary-d', 43.1, 7), a('contrary-e', 33, 13.1), a('contrary-f', 18, 13.1), a('contrary-g', 5, 13.1)],
    exit: p(18, 13.2),
  },
  {
    id: 'gravity-engine', name: 'The Gravity Engine', subtitle: 'The long way round the flywheel',
    mechanic: 'Cross a compact hanging bridge, climb the engine wall, and return on the overhead gallery.',
    hint: 'Settle on the short swing. Keep rolling to the rounded wall and rotate through to the roof.',
    spawn: p(0, .7), bounds: bounds(43, 18), difficulty: 9, accent: '#f18f73',
    surfaces: [g('engine-left', 6, -.3, 16), g('engine-right', 26.2, -.3, 19.6),
      ...turn('engine-lower-turn', 36, 4, 4, -Math.PI / 2), g('engine-wall', 40.3, 7, .6, 6),
      ...turn('engine-upper-turn', 36, 10, 4, 0), g('engine-top', 19, 14.3, 34),
      g('engine-inner-axle', 22, 7, 15, .8), g('engine-axle-support', 22, 9.5, .8, 4.2),
      { ...g('engine-pit', 15.2, -3.8, 3.4, .4), kind: 'hazard' }],
    swings: [{ id: 'engine-swing', anchor: p(15.2, 3), length: 3.12, width: 2.7, damping: .18 }],
    apples: [a('engine-a', 7, .9), a('engine-b', 15.2, .95), a('engine-c', 28, .9),
      a('engine-d', 39.1, 7), a('engine-e', 31, 13.1), a('engine-f', 18, 13.1), a('engine-g', 6, 13.1)],
    exit: p(3, 13.2),
  },
  {
    id: 'clockwork-apple', name: 'The Clockwork Apple', subtitle: 'Wind the orchard, unwind the bridge',
    mechanic: 'Ride the long approach to raise the bridge, collect the high apple, then reverse the journey to lower it.',
    hint: 'The bridge remembers your forward distance. Roll right to the far apple, then ride all the way back to the door.',
    spawn: p(0, .7), bounds: { min: p(-4, -9), max: p(45, 13) }, difficulty: 10, accent: '#e9b85c',
    surfaces: [g('clock-start', 14.1, -.3, 32.8), g('clock-end', 38.5, -1.6, 3),
      g('clock-upper-room', 29, 8, 19, .6), g('clock-room-column', 20, 10, .6, 4),
      { ...g('clock-pit', 35.3, -4, 10, .35), kind: 'hazard' }],
    timePlatforms: [{ id: 'clock-lift', from: p(34.8, -6.9), to: p(34.8, 2.2), w: 9.8, h: .42 }],
    timeAxis: p(1, 0), timeTravel: 40,
    apples: [a('clock-a', 5, .9), a('clock-c', 14, .9), a('clock-d', 23, .9),
      a('clock-e', 30, .95), a('clock-b', 37.8, 2.65)],
    exit: p(-.8, .75),
  },
];
export const [newtonsAtticLevel, eschersOrchardLevel, contraryConservatoryLevel, gravityEngineLevel, clockworkAppleLevel] = lateLevels;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * Input-only replay pilot for the five late maps (fixed 1/120 s steps).
 * target = trackAngle + clamp((speed − v)·0.22, ±0.3). In Newton’s Attic it
 * leans harder into the ridge barrel to pop it over the cradle lip, holds
 * still while the barrel drops into the well, and crosses once it is seated.
 */
export function createLateReplayPilot(index: number, reverse = true): (state: Snapshot) => Controls {
  const level = lateLevels[index];
  if (!level) throw new RangeError('Late campaign index must be 0–4');
  let previous: Vec | undefined, angle = 0, lastRawAngle = 0;
  return state => {
    const dx = previous ? state.bike.x - previous.x : 0, dy = previous ? state.bike.y - previous.y : 0;
    previous = state.bike;
    const raw = state.bodies.find(body => body.id === 'frame')!.angle;
    angle += Math.atan2(Math.sin(raw - lastRawAngle), Math.cos(raw - lastRawAngle)); lastRawAngle = raw;
    const velocity = (dx * Math.cos(angle) + dy * Math.sin(angle)) * 120;
    const has = (id: string) => state.collected.includes(id);
    const returning = reverse && ((level.id === 'newtons-attic' && has('attic-e') && !has('attic-f')) ||
      (level.id === 'clockwork-apple' && has('clock-b')) ||
      (level.id === 'eschers-orchard' && has('escher-h')) ||
      (level.id === 'contrary-conservatory' && has('contrary-g')));
    let desired = returning ? -1.6 : 1.6, lean = .3;
    const barrel = level.id === 'newtons-attic' ? state.bodies.find(body => body.id === 'attic-barrel') : undefined;
    if (barrel && !barrel.settled && !returning && state.bike.x > ATTIC.cradle.x - 4) {
      // Still in the cradle: lean into it so the bike's weight adds to the tilt.
      // Once it starts to roll, brake on the crest so the bike does not follow it in.
      if (barrel.x < ATTIC.cradle.x + ATTIC.cradle.half + .3)
        return { tilt: clamp((.48 - state.worldAngle) * 8, -1, 1), brake: barrel.x > ATTIC.cradle.x + .25 };
      // Over the lip: brake, keep a gentle rightward tilt and let it drop into the well.
      else return { tilt: clamp((.2 - state.worldAngle) * 8, -1, 1), brake: true };
    }
    // Rolling out of the empty cradle notch or over the plug joints needs a
    // firm absolute lean when the bike has slowed, either way.
    if (barrel && state.bike.x > ATTIC.cradle.x - 1.6 && state.bike.x < ATTIC.well.x + 4) {
      // Heading home, the steep back of the cradle bowl needs the world tipped hard.
      const firm = returning && Math.abs(state.bike.x - ATTIC.cradle.x) < 2 ? 1 : .55;
      if (Math.abs(velocity) < 1) return { tilt: clamp((Math.sign(desired) * firm - state.worldAngle) * 8, -1, 1), brake: false };
      // Carry speed over the plug joints; homeward, enough to ride up out of the cradle bowl.
      desired *= returning ? 2.2 : 1.6; lean = .45;
    }
    const target = angle + clamp((desired - velocity) * .22, -lean, lean);
    return { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake: false };
  };
}
