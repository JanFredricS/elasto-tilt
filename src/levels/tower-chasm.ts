import type { Controls, Level, Snapshot, Surface, Vec } from '../types';
const p = (x: number, y: number): Vec => ({ x, y });
const slab = (id: string, x: number, y: number, w: number, h = .5): Surface => ({ id, x, y, w, h, kind: 'ground' });
const apple = (id: string, x: number, y: number) => ({ id, x, y });
const arc = (id: string, x: number, y: number, radius: number, start: number, end: number, outside = true): Surface[] => {
  const count = Math.ceil(Math.abs(end - start) / (Math.PI / 40)), step = (end - start) / count;
  const r = radius + (outside ? .25 : -.25);
  return Array.from({ length: count }, (_, i) => {
    const a = start + (i + .5) * step;
    return { ...slab(`${id}-${i}`, x + r * Math.cos(a), y + r * Math.sin(a), 2 * r * Math.sin(Math.abs(step) / 2) + .07), angle: a + Math.PI / 2 };
  });
};
const pi = Math.PI;
export const towerChasmLevels: Level[] = [
  {
    id: 'switchback-scaffold', name: 'Switchback Scaffold', subtitle: 'Air between the storeys', difficulty: 13,
    mechanic: 'Climb the scaffold wall, leave its curved lip, and rotate gravity in the air to catch the next tier on your wheels.',
    hint: 'The open gaps are jumps. Keep the wheel side toward each landing, then return along the upper storeys. On phone, pause and resume to recenter your grip between turns.',
    spawn: p(0, .7), bounds: { min: p(-12, -6), max: p(63, 31) }, accent: '#bfabc9',
    surfaces: [slab('scaffold-ground', 13, -.25, 30),
      ...arc('scaffold-wall-foot', 28, 4, 4, -pi / 2, 0), slab('scaffold-wall', 32.25, 8, .5, 8),
      ...arc('scaffold-launch', 28, 12, 4, 0, pi / 2 - .35),
      slab('scaffold-landing-tier', 47, 15.75, 15),
      ...arc('scaffold-east-turn', 54.5, 20, 4, -pi / 2, pi / 2),
      slab('scaffold-upper-tier', 27.25, 24.25, 54.5),
      ...arc('scaffold-west-turn', 0, 20, 4, pi / 2, 3 * pi / 2),
      slab('scaffold-middle-tier', 12.5, 15.75, 25),
    ],
    apples: [apple('scaffold-a', 8, .9), apple('scaffold-b', 31.1, 8), apple('scaffold-c', 47, 16.9), apple('scaffold-d', 45, 23.1), apple('scaffold-e', 7, 23.1), apple('scaffold-f', 21, 16.9)],
    exit: p(5, 16.8),
    routeHints: [{ x: 35, y: 20, angle: 0, label: 'FLIP' }],
  },
  {
    id: 'the-hidden-way-home', name: 'The Hidden Way Home', subtitle: 'Down is only the beginning', difficulty: 14,
    mechanic: 'Edge around the drop, launch between opposing walls, then leave the half-loop upside down and float up to the hidden return ledge.',
    hint: 'Ease over the first edge. Cross both open chasms wheels-first. After the half-loop, turn gravity UP; the way home is above your starting door. On phone, pause and resume to recenter your grip between turns.',
    spawn: p(4, 20.7), bounds: { min: p(-6, -60), max: p(84, 33) }, accent: '#a8c6ba',
    surfaces: [
      slab('home-start', 5, 19.75, 6),
      ...arc('home-cliff-lip', 8, 16, 4, 0, pi / 2, false),
      slab('home-first-descent', 11.75, 10, .5, 12),
      ...arc('home-first-launch', 16, 4, 4, pi, 3 * pi / 2 + .4),
      slab('home-opposite-wall', 78.25, -6, .5, 28),
      ...arc('home-second-launch', 74, -20, 4, -pi / 2 - .4, 0),
      slab('home-final-wall', 21.75, -28, .5, 24),
      ...arc('home-half-loop', 37, -40, 15, pi, 5 * pi / 2),
      slab('home-air-release', 35, -24.75, 4),
      slab('home-hidden-ledge', 19, 28.25, 34),
      ...arc('home-return-bend', 2, 24, 4, pi / 2, 3 * pi / 2),
    ],
    apples: [apple('home-edge', 12.9, 16), apple('home-descent', 12.9, 12), apple('home-first', 12.9, 7),
      apple('home-arrival', 77.1, -5), apple('home-opposite', 77.1, -12), apple('home-final', 22.9, -31)],
    exit: p(4, 20.8),
    routeHints: [{ x: 15, y: 14, angle: -pi / 2, label: 'EDGE' },
      { x: 43, y: 6, angle: 0, label: 'TURN' }, { x: 55, y: -18, angle: pi, label: 'TURN' },
      { x: 31, y: -12, angle: pi / 2, label: 'ROTATE' }, { x: 31, y: 19, angle: pi / 2, label: 'UP' }],
  },
];
export const [switchbackScaffoldLevel, hiddenWayHomeLevel] = towerChasmLevels;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** Phone-target reference route, sampled at 120 Hz. Inputs never mutate bodies.
 * Launch momentum comes from the ramp and wheel contact. Gravity redirects the
 * flight; it does not directly rotate the rider. Pause/resume recenters the
 * phone anchor when a full-turn bank approaches its ±2π range limit.
 */
export function createTowerChasmPilot(index: 0 | 1): (state: Snapshot) => Controls {
  let previous: Vec | undefined, bodyAngle = 0, lastRaw = 0;
  let firstLanded = false, secondLanded = false, release = 0, scaffoldPeak = false, scaffoldRelease = -1, scaffoldLanded = false, loopEntered = false;
  return state => {
    const raw = state.bodies.find(b => b.id === 'frame')!.angle;
    bodyAngle += Math.atan2(Math.sin(raw - lastRaw), Math.cos(raw - lastRaw)); lastRaw = raw;
    const vx = previous ? (state.bike.x - previous.x) * 120 : 0;
    const vy = previous ? (state.bike.y - previous.y) * 120 : 0;
    previous = state.bike;
    const velocity = vx * Math.cos(bodyAngle) + vy * Math.sin(bodyAngle);
    let desired = 1.6;
    if (index === 0 && state.collected.includes('scaffold-f')) desired = -1.6;
    let target = bodyAngle + clamp((desired - velocity) * .22, -.3, .3);
    if (index === 0) {
      // A brief upward pulse releases the rear wheel from the lip. The bike's
      // physical clockwise momentum completes a somersault over the open gap.
      scaffoldPeak ||= raw > 2.35;
      if (scaffoldPeak && scaffoldRelease < 0 && raw < 2) scaffoldRelease = state.elapsed;
      if (scaffoldRelease >= 0 && !scaffoldLanded) {
        target = state.elapsed - scaffoldRelease < .28 ? 2.8 : .2;
        scaffoldLanded = state.bike.x > 42 && state.bike.y < 17;
      }
      if (scaffoldLanded && !state.collected.includes('scaffold-c')) target = bodyAngle + clamp((1.6 - velocity) * .22, -.6, .6);
    }
    if (index === 1) {
      const { x, y } = state.bike;
      loopEntered ||= state.collected.includes('home-final') && x > 50 && y > -40;
      if (!state.collected.includes('home-first')) {
        target = bodyAngle + clamp((1.5 - velocity) * .25, -.3, .3);
      } else if (!state.collected.includes('home-opposite')) {
        firstLanded ||= x > 76.5;
        if (firstLanded) target = bodyAngle + clamp((-3 - velocity) * .25, -.4, .4);
        else if (y > 4) target = bodyAngle + clamp((5 - velocity) * .25, -.5, .5);
        else if (x < 14.8) target = bodyAngle + clamp((5 - velocity) * .25, -.45, .45);
        else target = pi / 2;
      } else if (!state.collected.includes('home-final')) {
        desired = -5;
        target = bodyAngle + clamp((desired - velocity) * .25, -.45, .45);
        if (x < 75.2) target = -pi / 2;
        secondLanded ||= x < 23.5;
        if (secondLanded) target = bodyAngle + clamp((1.5 - velocity) * .25, -.35, .35);
      } else if (!loopEntered) {
        target = bodyAngle + clamp((1.4 - velocity) * .22, -.3, .3);
      } else {
        if (y > -26 && x < 36.5 && release === 0) release = 1;
        // Rotate away from the release shelf before turning gravity upward.
        // This frees both wheels together instead of pivoting around its edge.
        if (release === 1) {
          target = 2 * pi;
          if (state.worldAngle > 5.8) release = 2;
        }
        if (release === 2) {
          target = 3 * pi - clamp((31 - x) * .18 - vx * .4, -.6, .6);
          if (y > 27.15) release = 3;
        }
      }
    }
    if (index === 1 && release > 0 && release < 3) return { tilt: 0, worldAngle: target, brake: release === 2 && state.bike.y > 0 };
    return { tilt: 0, worldAngle: state.worldAngle + Math.atan2(Math.sin(target - state.worldAngle), Math.cos(target - state.worldAngle)), brake: false };
  };
}

/** Slower keyboard/touch alternative for the scaffold; no phone target required. */
export function createScaffoldKeyboardPilot(): (state: Snapshot) => Controls {
  let previous: Vec | undefined, angle = 0, lastRaw = 0, launched = false, landed = false;
  return state => {
    const raw = state.bodies.find(body => body.id === 'frame')!.angle;
    angle += Math.atan2(Math.sin(raw - lastRaw), Math.cos(raw - lastRaw));
    lastRaw = raw;
    const velocity = previous ? ((state.bike.x - previous.x) * Math.cos(angle) + (state.bike.y - previous.y) * Math.sin(angle)) * 120 : 0;
    previous = state.bike;
    const desired = state.collected.includes('scaffold-f') ? -1.6
      : state.collected.includes('scaffold-b') && !state.collected.includes('scaffold-c') ? 3 : 1.6;
    let target = angle + clamp((desired - velocity) * .22, -.3, .3);
    launched ||= state.bike.y > 13 && raw > 2.6;
    landed ||= launched && state.bike.x > 40 && state.bike.y < 17.1 && Math.cos(raw) > .8;
    if (launched && !landed) target = .2;
    // The slower input path can land beyond the tier apple. Backtrack to it
    // before taking the east turn, rather than skipping an essential pickup.
    if (landed && !state.collected.includes('scaffold-c')) target = angle + clamp((-1.6 - velocity) * .22, -.8, .8);
    const difference = Math.atan2(Math.sin(target - state.worldAngle), Math.cos(target - state.worldAngle));
    return { tilt: clamp(difference * 8, -1, 1), brake: launched && !landed && state.bike.x > 30 };
  };
}
