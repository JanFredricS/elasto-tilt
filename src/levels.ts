import type { Apple, Level, Surface, Vec } from './types';

// All coordinates are metres in the fixed, y-up map. The bike's chassis starts
// 0.70 m above a floor top; its head reaches about 1.60 m above that floor.
const ground = (id: string, x: number, y: number, w: number, h = 0.6): Surface =>
  ({ id, x, y, w, h, kind: 'ground' });
const cradle = (id: string, x: number, y: number, w: number, h: number): Surface =>
  ({ id, x, y, w, h, kind: 'cradle' });
const hazard = (id: string, x: number, y: number, w: number, h: number): Surface =>
  ({ id, x, y, w, h, kind: 'hazard' });
const apple = (id: string, x: number, y: number): Apple => ({ id, x, y });
const point = (x: number, y: number): Vec => ({ x, y });
const box = (minX: number, minY: number, maxX: number, maxY: number) =>
  ({ min: point(minX, minY), max: point(maxX, maxY) });
// Four short tangent colliders form a wheel-friendly concave corner. Their inner
// faces meet a floor, wall or ceiling at radius r; the centre lines sit half a
// thickness farther out, so the first segment does not present a curb.
const corner = (id: string, cx: number, cy: number, r: number, start: number): Surface[] => {
  const thickness = 0.42;
  const step = Math.PI / 8;
  return Array.from({ length: 4 }, (_, i) => {
    const a = start + (i + 0.5) * step;
    const radius = r + thickness / 2;
    return { id: `${id}-${i}`, x: cx + Math.cos(a) * radius,
      y: cy + Math.sin(a) * radius, w: 2 * radius * Math.sin(step / 2) + 0.18,
      h: thickness, angle: a + Math.PI / 2, kind: 'ground' as const };
  });
};

/** Campaign order is saved by index; keep IDs and ordering stable. */
export const levels: Level[] = [
  {
    id: 'newtons-orchard', name: "Newton’s Orchard", subtitle: 'The first falling apple',
    mechanic: 'Steer gravity gently, coast, and use the brake to settle beside the exit.',
    hint: 'Tilt a little to roll right. Release to hold the world angle; brake to slow down.',
    spawn: point(0, 0.7), bounds: box(-3, -2, 17, 6),
    surfaces: [ground('orchard-floor', 6.5, -0.35, 19)],
    apples: [apple('orchard-a', 3.2, 0.9), apple('orchard-b', 8.2, 0.9)],
    exit: point(13.4, 0.75), difficulty: 1, accent: '#eaa75c',
  },
  {
    id: 'one-wheel-wonder', name: 'One Wheel Wonder', subtitle: 'A pause at the lip',
    mechanic: 'A short ramp and narrow lip let you practice controlling wheel speed.',
    hint: 'Roll up the ramp and use the brake near the lip to settle on the upper terrace.',
    spawn: point(0, 0.7), bounds: box(-3, -3, 18, 9),
    surfaces: [
      ground('wonder-start', 2.5, -0.35, 8),
      { ...ground('wonder-ramp', 6.5, 0.18, 4.0, 0.25), angle: 0.11 },
      ground('wonder-step', 8.65, -0.25, 0.7, 1.4),
      cradle('wonder-lip', 8.9, 0.4, 0.20, 0.24),
      ground('wonder-terrace', 12.4, 0.15, 6.8),
      hazard('wonder-pit', 8.4, -2.3, 2.0, 0.3),
    ],
    apples: [apple('wonder-a', 3.0, 0.95), apple('wonder-b', 10.5, 1.55)],
    exit: point(14.8, 1.35), difficulty: 2, accent: '#e9b866',
  },
  {
    id: 'hanging-garden', name: 'The Hanging Garden', subtitle: 'A moving place to land',
    mechanic: 'Cross the gap on a broad swing and land on the far floor.',
    hint: 'Roll gently onto the swing; brake if you need to adjust your timing.',
    spawn: point(0, 0.7), bounds: box(-3, -5, 19, 10),
    surfaces: [
      ground('garden-left', 2.1, -0.35, 7.2),
      cradle('garden-lip', 6.0, -0.5, 0.24, 0.26),
      ground('garden-right', 13.4, -0.35, 8.0),
      hazard('garden-pit', 8.9, -4.0, 6.4, 0.4),
    ],
    swings: [{ id: 'garden-swing', anchor: point(8.4, 5.7), length: 5.95, width: 4.6, damping: 0.22 }],
    apples: [apple('garden-a', 2.6, 0.95), apple('garden-b', 8.8, 1.6), apple('garden-c', 13.7, 0.95)],
    exit: point(15.9, 0.75), difficulty: 3, accent: '#8dc68c',
  },
  {
    id: 'pendulum-mill', name: 'The Pendulum Mill', subtitle: 'Two different rhythms',
    mechanic: 'Use the quick short swing and the slower long swing to cross the mill.',
    hint: 'The shorter swing comes back sooner. Pause on its platform before the second transfer.',
    spawn: point(0, 0.7), bounds: box(-3, -5, 23, 11),
    surfaces: [
      ground('mill-left', 2.0, -0.35, 7.0),
      cradle('mill-lip', 5.8, -0.5, 0.24, 0.26),
      ground('mill-island', 10.4, -0.35, 2.3),
      ground('mill-right', 17.9, -0.35, 8.0),
      hazard('mill-water-a', 7.9, -4.0, 4.9, 0.4),
      hazard('mill-water-b', 14.0, -4.0, 4.8, 0.4),
    ],
    swings: [
      { id: 'mill-short', anchor: point(7.65, 4.5), length: 4.75, width: 3.3, damping: 0.08 },
      { id: 'mill-long', anchor: point(13.7, 7.2), length: 7.45, width: 4.6, damping: 0.16 },
    ],
    apples: [apple('mill-a', 4.4, 0.9), apple('mill-b', 10.4, 1.0), apple('mill-c', 18.6, 0.9)],
    exit: point(20.1, 0.75), difficulty: 4, accent: '#c6a56a',
  },
  {
    id: 'room-on-its-side', name: 'The Room on Its Side', subtitle: 'A floor on every face',
    mechanic: 'Turn through ninety and one hundred eighty degrees to ride the wall and ceiling.',
    hint: 'Roll to the right wall, turn until it becomes the floor, then turn again for the ceiling.',
    spawn: point(1.5, 0.7), bounds: box(-2, -2, 17, 10),
    surfaces: [
      ground('side-floor', 5.5, -0.35, 14),
      ...corner('side-lower-turn', 12, 3, 3, -Math.PI / 2),
      ground('side-right-wall', 15.35, 4, 0.7, 2.4),
      ...corner('side-upper-turn', 12, 5, 3, 0),
      ground('side-ceiling', 5.5, 8.35, 14, 0.7),
      ground('side-left-wall', -0.75, 3.8, 0.6, 8.8),
    ],
    apples: [apple('side-a', 7.0, 0.9), apple('side-b', 14.2, 4.2), apple('side-c', 8.0, 7.1)],
    exit: point(3.0, 7.1), difficulty: 5, accent: '#a99cdb',
  },
  {
    id: 'newtons-attic', name: "Newton’s Attic", subtitle: 'A weight on the way',
    mechanic: 'A loose ball can be nudged along the narrow static bridge.',
    hint: 'Nudge the loose ball aside, then follow the narrow bridge to the next apple.',
    spawn: point(0, 0.7), bounds: box(-3, -4, 19, 9),
    surfaces: [
      ground('attic-left', 2.6, -0.35, 8.2),
      ground('attic-bridge', 8.3, -0.45, 3.1, 0.9),
      ground('attic-right', 13.7, -0.35, 7.8),
      hazard('attic-drop', 8.3, -3.0, 3.5, 0.3),
    ],
    props: [{ id: 'attic-weight', shape: 'ball', x: 4.0, y: 0.5, w: 0.5, h: 0.5 }],
    apples: [apple('attic-a', 2.4, 1.0), apple('attic-b', 9.0, 1.1), apple('attic-c', 14.8, 0.9)],
    exit: point(16.1, 0.75), difficulty: 6, accent: '#c9a982',
  },
  {
    id: 'eschers-orchard', name: "Escher’s Orchard", subtitle: 'The stairs tell a story',
    mechanic: 'Continuous planar floor, wall, and ceiling support a real quarter turn and half turn.',
    hint: 'Follow the apples: floor, right wall, then ceiling. Turn the room at each corner.',
    spawn: point(1.5, 0.7), bounds: box(-2, -2, 19, 12),
    surfaces: [
      ground('escher-floor', 6.0, -0.35, 15),
      ...corner('escher-lower-turn', 12, 4, 4, -Math.PI / 2),
      ground('escher-right-wall', 16.35, 5, 0.7, 2.4),
      ...corner('escher-upper-turn', 12, 6, 4, 0),
      ground('escher-ceiling', 6.0, 10.35, 15, 0.7),
      ground('escher-left-wall', -0.75, 6.8, 0.6, 6.8),
    ],
    apples: [apple('escher-a', 3.1, 0.95), apple('escher-b', 15.2, 5.0), apple('escher-c', 9.4, 9.1)],
    exit: point(3.0, 9.1), difficulty: 7, accent: '#d49db8',
  },
  {
    id: 'contrary-conservatory', name: 'The Contrary Conservatory', subtitle: 'One thing falls upward',
    mechanic: 'The marked weight has inverted gravity while the bicycle obeys ordinary gravity.',
    hint: 'Rotate gently and watch the marked weight rise; give it room before crossing.',
    spawn: point(0, 0.7), bounds: box(-3, -2, 20, 9),
    surfaces: [
      ground('contrary-floor', 8.0, -0.35, 19),
      ground('contrary-ceiling', 8.0, 7.2, 19, 0.6),
      ground('contrary-gate', 9.0, 0.05, 0.42, 0.10),
    ],
    props: [{ id: 'contrary-weight', shape: 'ball', x: 5.0, y: 3.3, w: 1.0, h: 1.0, inverted: true }],
    apples: [apple('contrary-a', 3.1, 0.9), apple('contrary-b', 10.7, 0.9), apple('contrary-c', 15.7, 0.9)],
    exit: point(17.4, 0.75), difficulty: 8, accent: '#77c9c3',
  },
  {
    id: 'gravity-engine', name: 'The Gravity Engine', subtitle: 'Bring the skills together',
    mechanic: 'Cross a swing gap, then turn along a curved wall to reach the upper exit.',
    hint: 'Use the swing to cross the center, then turn the far wall into a landing.',
    spawn: point(0, 0.7), bounds: box(-3, -5, 23, 11),
    surfaces: [
      ground('engine-left', 2.2, -0.35, 7.4),
      cradle('engine-lip', 6.1, -0.5, 0.24, 0.26),
      ground('engine-right', 14.0, -0.35, 8.4),
      ...corner('engine-lower-turn', 18, 2, 2, -Math.PI / 2),
      ground('engine-wall', 20.35, 2.5, 0.7, 1.4),
      ...corner('engine-upper-turn', 18, 3, 2, 0),
      ground('engine-top', 16.0, 5.35, 5.0, 0.7),
      hazard('engine-pit', 9.2, -4.0, 6.3, 0.4),
    ],
    swings: [{ id: 'engine-swing', anchor: point(8.4, 6.0), length: 6.25, width: 4.8, damping: 0.11 }],
    apples: [apple('engine-a', 3.5, 0.9), apple('engine-b', 9.1, 1.5), apple('engine-c', 19.2, 2.5)],
    exit: point(15.3, 4.1), difficulty: 9, accent: '#f18f73',
  },
  {
    id: 'clockwork-apple', name: 'The Clockwork Apple', subtitle: 'A path that remembers',
    mechanic: 'Ride right to raise the moving floor, then reverse it to return to the door.',
    hint: 'The lift follows your distance from the start. Ride right for the high apple, then ride left to lower it and return.',
    spawn: point(0, 0.7), bounds: box(-3, -5, 13, 8),
    surfaces: [
      ground('clock-start', 1.1, -0.35, 6.8),
      ground('clock-end', 9.1, -1.6, 2.6),
      hazard('clock-pit', 6.6, -4.0, 7.4, 0.35),
    ],
    timePlatforms: [
      { id: 'clock-lift', from: point(6.8, -1.8), to: point(6.8, 2.2), w: 5.8, h: 0.42 },
    ],
    timeAxis: point(1, 0), timeTravel: 12,
    apples: [apple('clock-a', 2.6, 0.9), apple('clock-b', 8.1, 2.65)],
    exit: point(-0.8, 0.75), difficulty: 10, accent: '#e9b85c',
  },
];
