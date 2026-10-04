import type { Controls, Level, Snapshot, Surface, Vec } from '../types';

const p = (x: number, y: number): Vec => ({ x, y });
const box = (minX: number, minY: number, maxX: number, maxY: number) => ({ min: p(minX, minY), max: p(maxX, maxY) });
/** A sampled cosine grade has horizontal, wheel-friendly joins to every terrace. */
export type Terrace = readonly [number, number];
export const orchardProfile: Terrace[] = [[-5, 0], [5, 0], [14, 4], [21, 4], [30, -1.5], [35, -1.5], [45, 3], [50, 3]];
export const wonderProfile: Terrace[] = [[-5, 0], [4, 0], [13, 5], [19, 5], [31, -5], [36, -5], [48, 3], [55, 3]];
export const gardenProfile: Terrace[] = [[-5, 0], [4, 0], [14, 4], [19, 4], [26, 1], [38, 1], [48, -3], [51, -3]];
export const millProfile: Terrace[] = [[-5, 0], [4, 0], [12, 3], [36, 3], [44, 3]];
export const roomProfile: Terrace[] = [[-5, 0], [4, 0], [13, -3], [20, -3], [29, 0], [38, 0]];
export function profileAt(profile: Terrace[], x: number): { y: number; angle: number } {
  const i = profile.findIndex((pt, index) => index > 0 && x <= pt[0]);
  if (i < 1) return { y: profile[x < profile[0][0] ? 0 : profile.length - 1][1], angle: 0 };
  const [ax, ay] = profile[i - 1], [bx, by] = profile[i];
  const t = Math.max(0, Math.min(1, (x - ax) / (bx - ax)));
  return { y: ay + (by - ay) * (1 - Math.cos(t * Math.PI)) / 2,
    angle: Math.atan((by - ay) * Math.PI * Math.sin(t * Math.PI) / (2 * (bx - ax))) };
}
function beam(id: string, a: Vec, b: Vec, kind: Surface['kind'] = 'ground', thickness = .45): Surface {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  return { id, x: (a.x + b.x) / 2 + Math.sin(angle) * thickness / 2,
    y: (a.y + b.y) / 2 - Math.cos(angle) * thickness / 2,
    w: Math.hypot(b.x - a.x, b.y - a.y) + .025, h: thickness, angle, kind };
}
function terrain(id: string, profile: Terrace[], gaps: [number, number][] = []): Surface[] {
  const surfaces: Surface[] = [];
  for (let i = 1; i < profile.length; i++) {
    const [x0] = profile[i - 1], [x1] = profile[i];
    const count = Math.ceil((x1 - x0) * 2);
    for (let j = 0; j < count; j++) {
      const a = x0 + (x1 - x0) * j / count, b = x0 + (x1 - x0) * (j + 1) / count;
      if (gaps.some(([lo, hi]) => a >= lo - .01 && b <= hi + .01)) continue;
      surfaces.push(beam(`${id}-${i}-${j}`, p(a, profileAt(profile, a).y), p(b, profileAt(profile, b).y)));
    }
  }
  return surfaces;
}
function arc(id: string, cx: number, cy: number, radius: number): Surface[] {
  return Array.from({ length: 48 }, (_, i) => {
    const a = -Math.PI / 2 + Math.PI * i / 48, b = -Math.PI / 2 + Math.PI * (i + 1) / 48;
    return beam(`${id}-${i}`, p(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius),
      p(cx + Math.cos(b) * radius, cy + Math.sin(b) * radius));
  });
}
const fruit = (id: string, profile: Terrace[], x: number) => ({ id, x, y: profileAt(profile, x).y + .9 });
const hazard = (id: string, x: number, y: number, w: number): Surface => ({ id, x, y, w, h: .35, kind: 'hazard' });

/** Campaign indices and IDs are save-game data. These first five remain stable. */
export const earlyLevels: Level[] = [
  {
    id: 'newtons-orchard', name: 'Newton’s Orchard', subtitle: 'Over the hill and home again',
    mechanic: 'Climb the orchard terraces, dip into the hollow, then brake and bring every apple home.',
    hint: 'Small tilts build speed. Brake before the far apple, then tilt left to return to the door.',
    spawn: p(0, .72), bounds: box(-7, -5, 53, 10), surfaces: terrain('orchard', orchardProfile),
    apples: [5, 15.5, 26, 34, 46.5].map((x, i) => fruit(`orchard-${i}`, orchardProfile, x)),
    exit: p(-1.5, .8), difficulty: 1, accent: '#eaa75c',
  },
  {
    id: 'one-wheel-wonder', name: 'One Wheel Wonder', subtitle: 'Catch a wheel, reach the high apple',
    mechanic: 'Catch your rear wheel against the gold stop. Hold brake and tilt left to lift the front wheel toward the high apple.',
    hint: 'Roll just past the gold stop, hold BRAKE, then tilt left. Tilt back right to lower the front wheel; release once both wheels land.',
    spawn: p(0, .72), bounds: box(-7, -9, 58, 11), surfaces: [
      ...terrain('wonder', wonderProfile),
      // A shallow approach lets the rider pass the stop. Its vertical return face
      // catches a braked rear tyre while the high apple requires a genuine lift.
      beam('wonder-catch-ramp', p(12.9, 5), p(13.83, 5.2), 'cradle', .18),
      { id: 'wonder-wheel-stop', x: 13.9, y: 5, w: .14, h: .4, kind: 'cradle' },
    ],
    apples: [fruit('wonder-0', wonderProfile, 6), { id: 'wonder-1', x: 14.3, y: 7.2 },
      ...[26, 34, 43, 52].map((x, i) => fruit(`wonder-${i + 2}`, wonderProfile, x))],
    exit: p(-1.5, .8), difficulty: 2, accent: '#e9b866',
  },
  {
    id: 'hanging-garden', name: 'The Hanging Garden', subtitle: 'Ride the cradle across and back',
    mechanic: 'Board the cradle, hold BRAKE and tilt to swing across the chasm. Bring every apple back to the door.',
    hint: 'Stop at the edge and tilt toward your bank to call the cradle. Roll aboard gently, hold BRAKE, then tilt toward the far bank. Release to ride off; repeat on the way home.',
    spawn: p(0, .72), bounds: box(-7, -8, 54, 11), surfaces: [
      ...terrain('garden', gardenProfile, [[27, 34]]), hazard('garden-water', 30.5, -4, 8),
    ],
    swings: [{ id: 'garden-swing', anchor: p(30.5, 7.16), length: 7, width: 2.8, mass: 20, damping: 10, angle: -.3 }],
    apples: [6, 17, 27, 36, 47.5].map((x, i) => fruit(`garden-${i}`, gardenProfile, x)),
    exit: p(-1.5, .8), difficulty: 3, accent: '#8dc68c',
  },
  {
    id: 'pendulum-mill', name: 'The Pendulum Mill', subtitle: 'Across the mill, around the wheel',
    mechanic: 'Ride two hanging cradles across the mill, then follow the curved wall to the upper return gallery.',
    hint: 'Call each cradle with a small tilt, roll aboard and hold BRAKE to swing across. The longer second cradle responds more slowly. Release near the bank, then follow the apples up the round wall.',
    spawn: p(0, .72), bounds: box(-7, -4, 53, 19), surfaces: [
      ...terrain('mill', millProfile, [[16, 21], [28, 33]]),
      hazard('mill-water-a', 18.5, -2, 6), hazard('mill-water-b', 30.5, -2, 6),
      ...arc('mill-turn', 44, 9, 6), beam('mill-upper-gallery', p(44, 15), p(-3, 15)),
    ],
    // Lowered seats meet the banks as their ends rise; damping gives time to board.
    swings: [
      { id: 'mill-short', anchor: p(18.5, 8.5), length: 6, width: 2.8, mass: 20, damping: 15, angle: -.12 },
      { id: 'mill-long', anchor: p(30.5, 10), length: 7.5, width: 2.8, mass: 20, damping: 16, angle: -.12 },
    ],
    apples: [fruit('mill-0', millProfile, 8), fruit('mill-1', millProfile, 24), fruit('mill-2', millProfile, 39),
      { id: 'mill-3', x: 49.1, y: 9 }, { id: 'mill-4', x: 34, y: 14.1 }, { id: 'mill-5', x: 16, y: 14.1 }],
    exit: p(1, 14.15), difficulty: 4, accent: '#c6a56a',
  },
  {
    id: 'room-on-its-side', name: 'The Room on Its Side', subtitle: 'The long way round the room',
    mechanic: 'Explore the sunken floor, climb the rounded end wall, and ride the ceiling all the way home.',
    hint: 'Follow the bowl before turning up the right wall. Keep rotating as the wall becomes the ceiling.',
    spawn: p(0, .72), bounds: box(-7, -7, 48, 17), surfaces: [
      ...terrain('room', roomProfile), ...arc('room-turn', 38, 6, 6),
      beam('room-ceiling', p(38, 12), p(-3, 12)),
      // An island in the room makes the two routes legible and catches careless free falls.
      beam('room-divider', p(10, 5), p(28, 5), 'ground', .65),
    ],
    apples: [fruit('room-0', roomProfile, 7), fruit('room-1', roomProfile, 18), fruit('room-2', roomProfile, 32),
      { id: 'room-3', x: 43.1, y: 6 }, { id: 'room-4', x: 30, y: 11.1 }, { id: 'room-5', x: 13, y: 11.1 }],
    exit: p(0, 11.15), difficulty: 5, accent: '#a99cdb',
  },
];

// Deterministic input-only route demonstration, also available to browser QA.
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const profiles = [orchardProfile, wonderProfile, gardenProfile, millProfile, roomProfile];
/** Only observes snapshots and supplies the same angle/brake inputs available to a phone player. */
export function createEarlyReplayPilot(index: number) {
  let previous: Snapshot | undefined, returning = false, stage = 0, catchStage = 0, gardenStage = 0;
  let previousBikeAngle = 0, gardenBoardingReleased = false;
  let millCrossing = 0, millStage = 0, millBoardingReleased = false;
  const turnX = [0, 0, 0, 44, 38][index], turnY = [0, 0, 0, 9, 6][index];
  return (state: Snapshot): Controls => {
    const vx = previous ? (state.bike.x - previous.bike.x) * 120 : 0;
    const vy = previous ? (state.bike.y - previous.bike.y) * 120 : 0;
    previous = state;
    const bikeAngle = state.bodies.find(body => body.id === 'frame')!.angle;
    const angularSpeed = (bikeAngle - previousBikeAngle) * 120;
    previousBikeAngle = bikeAngle;
    let theta = profileAt(profiles[index], state.bike.x).angle;
    let speed = index === 4 ? 2.3 : 2.4, brake = false;
    if (index < 3) {
      const far = earlyLevels[index].apples.at(-1)!.x;
      if (state.collected.length === earlyLevels[index].apples.length) returning = true;
      const direction = returning ? -1 : 1;
      speed = direction * Math.min(2.4, Math.max(.5, (returning ? state.bike.x + 1.5 : far - state.bike.x + .5) * .9));
      brake = returning && vx > .7;
      // Board gently before locking the wheels; call the empty cradle back from each bank.
      if (index === 2) {
        const deck = state.bodies.find(body => body.id === 'garden-swing')!;
        const control = (angle: number, hold = false): Controls => ({ tilt: clamp((angle - state.worldAngle) * 8, -1, 1), brake: hold });
        if (gardenStage === 0 && state.bike.x > 26) gardenStage = .5;
        if (gardenStage === .5 && deck.x < 28.45 && Math.abs(vx) < .15) gardenStage = 1;
        if (gardenStage === 1 && state.bike.x > deck.x - .45) gardenStage = 2;
        if (gardenStage === 2 && deck.x > 32.45) gardenStage = 3;
        if (gardenStage === 3 && state.bike.x > 35) gardenStage = 4;
        if (gardenStage === 4 && returning && state.bike.x < 34.9) gardenStage = 5;
        if (gardenStage === 5 && deck.x > 32.59 && Math.abs(vx) < .15) {
          gardenStage = 6; gardenBoardingReleased = false;
        }
        if (gardenStage === 6 && state.bike.x < deck.x + .45) gardenStage = 7;
        if (gardenStage === 7 && deck.x < 28.55) gardenStage = 8;
        if (gardenStage === 8 && state.bike.x < 26) gardenStage = 9;
        if (gardenStage === .5) return control(-.5, true);
        if (gardenStage === 1 || gardenStage === 6) {
          const boardingDirection = gardenStage === 1 ? 1 : -1;
          // Level the world before releasing the bank-side brake. Then ease
          // onto the sloped deck at a controlled speed, avoiding a hard stop
          // that pitches a wheel up when the cradle starts its loaded trip.
          if (state.worldAngle * boardingDirection >= 0) gardenBoardingReleased = true;
          const target = bikeAngle + clamp((boardingDirection * 2 - vx) * .4, -.3, .3);
          return control(target, !gardenBoardingReleased);
        }
        if (gardenStage === 2) return control(.5, true);
        if (gardenStage === 3) return control(.55);
        if (gardenStage === 5) return control(.5, true);
        if (gardenStage === 7) return control(-.5, true);
        if (gardenStage === 8) return control(-.55);
      }
    } else {
      if (stage === 0 && state.bike.x >= turnX - .3) stage = 1;
      if (stage === 1) theta = Math.atan2(state.bike.x - turnX, turnY - state.bike.y);
      if (stage === 1 && state.bike.y > turnY + 5 && state.bike.x < turnX) stage = 2;
      if (stage === 2) theta = Math.PI;
      if (stage === 1) speed = 1.8;
      if (index === 3 && stage === 0 && ((state.bike.x > 14 && state.bike.x < 22) || (state.bike.x > 26 && state.bike.x < 34))) speed = 1.5;
    }
    // Board and carry the rider across each mill gap before resuming the wall route.
    if (index === 3 && millCrossing < 2) {
      const centre = millCrossing === 0 ? 18.5 : 30.5;
      const deck = state.bodies.find(body => body.id === (millCrossing === 0 ? 'mill-short' : 'mill-long'))!;
      const control = (angle: number, hold = false): Controls => ({ tilt: clamp((angle - state.worldAngle) * 8, -1, 1), brake: hold });
      if (millStage === 0 && state.bike.x > centre - 3.7) millStage = 1;
      if (millStage === 1 && deck.x < centre - 1.05 && Math.abs(vx) < .15) millStage = 2;
      if (millStage === 2 && state.bike.x > deck.x - .45) millStage = 3;
      if (millStage === 3 && deck.x > centre + 1.05) millStage = 4;
      if (millStage === 4 && state.bike.x > centre + 3.5) {
        millCrossing++; millStage = 0; millBoardingReleased = false;
      }
      if (millStage === 1) return control(-.4, true);
      if (millStage === 2) {
        if (state.worldAngle >= 0) millBoardingReleased = true;
        return control(bikeAngle + clamp((2 - vx) * .4, -.3, .3), !millBoardingReleased);
      }
      if (millStage === 3) return control(.4, true);
      if (millStage === 4) return control(.45);
    }
    // Map 2: approach the stop, hold a rear-wheel pivot, lower, then resume riding.
    // This demonstration only supplies normal controls; it never modifies bodies.
    if (index === 1 && !returning && catchStage < 3) {
      if (catchStage === 0 && state.bike.x > 11.5) {
        speed = clamp((15.02 - state.bike.x) * 1.2, .1, 1);
        if (state.bike.x < 14.8) theta = Math.max(theta, .35);
        if (state.bike.x > 14.98) catchStage = 1;
      }
      if (catchStage === 1 && state.collected.includes('wonder-1')) catchStage = 2;
      if (catchStage === 2 && Math.abs(bikeAngle) < .08 && Math.abs(angularSpeed) < .4) catchStage = 3;
      if (catchStage === 1 || catchStage === 2) {
        const target = catchStage === 1
          ? clamp(bikeAngle - 1.03 + 2 * (bikeAngle - .6) + 2 * angularSpeed, -1.3, .6)
          : .15;
        return { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake: true };
      }
    }
    const along = vx * Math.cos(theta) + vy * Math.sin(theta);
    const target = theta + clamp((speed - along) * .23, -.3, .3);
    return { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake };
  };
}
