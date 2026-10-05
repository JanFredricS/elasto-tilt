import type { Controls, Level, Snapshot, Surface, Vec } from '../types';
const p = (x: number, y: number): Vec => ({ x, y });
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

const cap = Array.from({ length: 32 }, (_, i): Surface => {
  const theta = Math.PI / 2 - (i + .5) * Math.PI / 32;
  return { id: `return-nose-${i}`, x: 24 + 3.7 * Math.cos(theta), y: 3.7 * Math.sin(theta),
    w: 2 * 3.7 * Math.tan(Math.PI / 64) + .045, h: .6, angle: theta - Math.PI / 2, chain: 'return-nose' };
});
export const spiralPoint = (t: number, inward = 0): Vec => {
  const theta = t - Math.PI / 2, r = 26 - 1.65 * t - inward;
  return p(r * Math.cos(theta), r * Math.sin(theta));
};
export const spiralGaps = [{ from: 2.1, to: 2.22 }, { from: 6.7, to: 6.91 }];
const spiralEnd = 14;
const spiralSurfaces: Surface[] = [];
for (let t = -.1, i = 0; t < spiralEnd; t += .025, i++) {
  const end = Math.min(t + .025, spiralEnd);
  if (spiralGaps.some(gap => end > gap.from && t < gap.to)) continue;
  // Each unbroken stretch between gaps is one physics chain, so its seams are buried.
  const run = spiralGaps.filter(gap => t >= gap.to).length;
  const lift = (u: number) => {
    const gap = spiralGaps.find(g => u <= g.from && u > g.from - 4 / (26 - 1.65 * g.from));
    if (!gap) return 0;
    const q = 1 - (gap.from - u) * (26 - 1.65 * gap.from) / 4;
    // Finish with a steady incline: continued curvature at takeoff throws the rider into a somersault.
    return (1.1 / .75) * (q < .5 ? q * q : q - .25);
  };
  const a = spiralPoint(t, lift(t)), b = spiralPoint(end, lift(end)), angle = Math.atan2(b.y - a.y, b.x - a.x);
  spiralSurfaces.push({ id: `spiral-ribbon-${i}`, x: (a.x + b.x) / 2 + Math.sin(angle) * .24,
    y: (a.y + b.y) / 2 - Math.cos(angle) * .24, w: Math.hypot(b.x - a.x, b.y - a.y) + .03, h: .48, angle, chain: `spiral-run-${run}` });
}
export const flipSpiralLevels: Level[] = [
  {
    id: 'underside-return', name: 'The Other Side', subtitle: 'One stone, two roads', difficulty: 11, accent: '#cda18f',
    mechanic: 'Ride out across the top of one monumental stone, turn around its exposed rounded nose, and return on its underside.',
    hint: 'Slow down at the nose. Turn gravity inward as the wheels curl around the end, then keep it upward for the journey underneath.',
    spawn: p(0, 4.7), bounds: { min: p(-6, -10), max: p(34, 10) },
    surfaces: [{ id: 'return-shared-strip', x: 11, y: 0, w: 26, h: 8 }, ...cap],
    apples: [{ id: 'return-top-a', x: 6, y: 4.9 }, { id: 'return-top-b', x: 19, y: 4.9 },
      { id: 'return-nose', x: 28.9, y: 0 }, { id: 'return-under-b', x: 19, y: -4.9 }, { id: 'return-under-a', x: 7, y: -4.9 }],
    exit: p(0, -4.8),
    routeHints: [{ x: 11, y: 6.3, angle: 0, label: 'OUTWARD' },
      { x: 30.5, y: 1, angle: -Math.PI / 2, label: 'TURN UNDER' },
      { x: 15, y: -6.3, angle: Math.PI, label: 'SAME STONE' }],
  },
  {
    id: 'spiral-sanctuary', name: 'Spiral Sanctuary', subtitle: 'Beyond the broken arcs', difficulty: 12, accent: '#94b8c8',
    mechanic: 'Follow a circular stone spiral inward through more than two revolutions. Its two missing sections require airborne gravity steering.',
    hint: 'Begin turning early before each break. Ease gravity along the gap, then back toward the stone for landing. The door waits in the centre. On phone, keep turning steadily hand over hand like a steering wheel.',
    spawn: spiralPoint(0, .84), initialAngle: Math.atan2(1.65, 26),
    bounds: { min: p(-32, -32), max: p(32, 32) }, surfaces: spiralSurfaces,
    apples: [0.5, 1.8, 3.2, 5.2, 6.4, 8.1, 10.3, 12, 13.6].map((t, i) => ({ id: `spiral-apple-${i}`, ...spiralPoint(t, .9) })),
    exit: spiralPoint(14, .8),
    routeHints: [
      ...[1, 4.4, 8.8, 12.5].map((t, i) => ({ ...spiralPoint(t, 2.8), angle: t + Math.atan2(1.65, 26 - 1.65 * t), label: i === 3 ? 'CENTRE' : 'INWARD' })),
      ...spiralGaps.map((gap, i) => {
        const t = gap.from - 6.5 / (26 - 1.65 * gap.from);
        return { ...spiralPoint(t, 2.6), angle: t + .25, label: i === 1 ? 'EASE · TURN' : 'TURN EARLY' };
      }),
    ],
  },
];
export const [undersideReturnLevel, spiralSanctuaryLevel] = flipSpiralLevels;

/** Observation-only pilot: issues exactly the controls available to a phone player. */
export function createFlipSpiralPilot(index: 0 | 1): (state: Snapshot) => Controls {
  let previous: Vec | undefined, lastTime = 0, angle = 0, lastRaw = 0, progress = 0, previousPolar = 0;
  return state => {
    const raw = state.bodies.find(body => body.id === 'frame')!.angle;
    angle += Math.atan2(Math.sin(raw - lastRaw), Math.cos(raw - lastRaw)); lastRaw = raw;
    const dt = state.elapsed - lastTime;
    const velocity = previous && dt > 0 ? ((state.bike.x - previous.x) * Math.cos(angle) + (state.bike.y - previous.y) * Math.sin(angle)) / dt : 0;
    previous = state.bike; lastTime = state.elapsed;
    if (index === 0) {
      const target = angle + clamp((2 - velocity) * .22, -.3, .3);
      return { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake: false };
    }
    const polar = Math.atan2(state.bike.x, -state.bike.y);
    progress += Math.atan2(Math.sin(polar - previousPolar), Math.cos(polar - previousPolar)); previousPolar = polar;
    const radius = 26 - 1.65 * progress;
    // Start turning six metres before a lip so keyboard/touch's .95 rad/s
    // rotation has time to settle. Begin restoring gravity just after takeoff.
    const gap = spiralGaps.find(g => progress > g.from - 6.5 / radius && progress < g.to - 2.5 / radius);
    const landing = spiralGaps.some(g => progress > g.to - 2.5 / radius && progress < g.to + .7);
    const trackAngle = progress + Math.atan2(1.65, radius);
    const target = gap ? trackAngle + (gap.from < 3 ? 1.25 : 1.3)
      : (landing ? trackAngle : angle) + clamp((1.8 - velocity) * .22, -.3, .3);
    return { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake: false };
  };
}
