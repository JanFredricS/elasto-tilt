import type { Apple, Level, Surface, Vec } from '../types';
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

/** Saved campaign IDs and order intentionally match the original last five maps. */
export const lateLevels: Level[] = [
  {
    id: 'newtons-attic', name: 'Newton’s Attic', subtitle: 'Over the ridge, back to storage',
    mechanic: 'Climb the attic ramps, nudge the loose weights, then cross back over the ridge to collect the storage apple.',
    hint: 'Visit the far ridge, then return past the door into the left storage pocket. Bring all six apples back to the door.',
    spawn: p(0, .7), bounds: { min: p(-13, -5), max: p(50, 12) }, difficulty: 6, accent: '#c9a982',
    surfaces: [
      g('attic-entry', .5, -.3, 21), slope('attic-up', p(11, 0), p(21, 2.2)),
      g('attic-ridge', 26, 1.9, 10), slope('attic-down', p(31, 2.2), p(41, 0)),
      g('attic-far-pocket', 44.5, -.3, 7),
      g('attic-rafter-left', 14, 7.2, 14, .5), g('attic-rafter-right', 33, 8.4, 15, .5),
      g('attic-post-left', 10, 8.8, .6, 3), g('attic-post-right', 39, 9.8, .6, 3),
      { ...g('attic-basement', 25, -3.8, 44, .4), kind: 'hazard' },
    ],
    props: [{ id: 'attic-weight', shape: 'ball', x: 6, y: .28, w: .5, h: .5 },
      { id: 'attic-weight-high', shape: 'ball', x: 26, y: 2.48, w: .5, h: .5 }],
    apples: [a('attic-a', 4, .9), a('attic-b', 16, 2), a('attic-c', 27, 3.1),
      a('attic-d', 36, 2), a('attic-e', 45, .9), a('attic-f', -8, .9)],
    exit: p(-1, .75),
  },
  {
    id: 'eschers-orchard', name: 'Escher’s Orchard', subtitle: 'The room above is the room below',
    mechanic: 'A spiral of nested rooms turns floor into wall and ceiling, then returns above the entrance.',
    hint: 'Trace the outer apples clockwise. After the left wall, collect both terrace apples, then reverse to the inner door.',
    spawn: p(4, .7), bounds: bounds(38, 22), difficulty: 7, accent: '#d49db8',
    surfaces: [
      g('escher-lower-gallery', 15, -.3, 30),
      ...turn('escher-southeast', 30, 4, 4, -Math.PI / 2), g('escher-east-room', 34.3, 9, .6, 10),
      ...turn('escher-northeast', 30, 14, 4, 0), g('escher-upper-gallery', 17, 18.3, 26),
      ...turn('escher-northwest', 4, 14, 4, Math.PI / 2), g('escher-west-room', -.3, 11, .6, 6),
      ...turn('escher-inner-return', 4, 8, 4, Math.PI),
      g('escher-shared-floor-ceiling', 15, 3.7, 22),
      g('escher-inner-east-wall', 26.3, 7.3, .6, 7.8),
      g('escher-inner-ceiling', 20, 11.5, 13.2, .6),
      // Staggered rooms and stair landings form a visible nested architectural spiral.
      g('escher-high-landing', 11, 14.4, 11, .5),
      g('escher-high-stair-1', 16.6, 14, 1.3, .5),
      g('escher-high-stair-2', 17.9, 13.5, 1.3, .5),
      g('escher-high-stair-3', 19.2, 13, 1.3, .5),
      g('escher-inner-column', 13.6, 10, .5, 3),
    ],
    apples: [a('escher-a', 8, .9), a('escher-b', 23, .9), a('escher-c', 33.1, 9),
      a('escher-d', 23, 17.1), a('escher-e', 9, 17.1), a('escher-f', .9, 11),
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
