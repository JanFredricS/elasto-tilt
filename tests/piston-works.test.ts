import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { cyclePhase } from '../src/physics-time';
import { BOWL, createPistonWorksPilot, liftSchedule, PISTON, pistonWorksLevel as level } from '../src/levels/piston-works';
import { levels } from '../src/levels';
import { createReplayPilot } from '../src/dev/replay';
import type { BodyView, Controls, Level, Snapshot } from '../src/types';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const body = (state: Snapshot, id: string) => state.bodies.find(b => b.id === id)!;
const top = (piston: BodyView) => piston.y + piston.h / 2;
const lift = (id: string) => level.timePlatforms!.filter(platform => platform.id.startsWith(`${id}-`));
async function ride(pilot: (state: Snapshot) => Controls, seconds: number, map: Level = level, watch?: (state: Snapshot) => void | boolean) {
  const game = await createPhysics(); game.load(map);
  let state = game.snapshot();
  for (let i = 0; i < 120 * seconds && state.status === 'playing'; i++) { state = game.step(1 / 120, pilot(state)); if (watch?.(state) === true) break; }
  game.destroy();
  return state;
}
/** Ride along x at a steady speed with the world kept within ±.3 rad of level. */
const cruise = (speed: number) => {
  let previous: Snapshot | undefined;
  return (state: Snapshot): Controls => {
    const vx = previous ? (state.bike.x - previous.bike.x) * 120 : 0; previous = state;
    return { tilt: clamp((clamp((speed - vx) * .22, -.3, .3) - state.worldAngle) * 8, -1, 1), brake: false };
  };
};

it('a self-running platform swings from → to → from once a period, dwelling at both ends', () => {
  expect(cyclePhase(0, 10)).toBeCloseTo(0, 9);
  expect(cyclePhase(5, 10)).toBeCloseTo(1, 9);
  expect(cyclePhase(10, 10)).toBeCloseTo(0, 9);
  expect(cyclePhase(0, 10, .5)).toBeCloseTo(1, 9);
  expect(cyclePhase(2.5, 10)).toBeCloseTo(.5, 9);
  // Eased: within half a second of an end it has moved under 3 % of the way.
  expect(cyclePhase(.5, 10)).toBeLessThan(.03);
  // The pilot's schedule matches the pistons' own: B1 bottoms out as B2 tops out.
  expect(liftSchedule(PISTON.liftB1, 0).top).toBeCloseTo(PISTON.liftB1.low - PISTON.over.low, 9);
  expect(liftSchedule(PISTON.liftB2, 0).top).toBeCloseTo(PISTON.liftB2.high + PISTON.over.high, 9);
});

it('four lifts, each a pair of tyre-wide pistons a wheelbase apart, on their own clocks; the double lift runs in antiphase', () => {
  expect(level.timePlatforms).toHaveLength(8);
  const ids = [...level.surfaces, ...level.apples, ...level.timePlatforms!].map(item => item.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ['piston-a', 'piston-b1', 'piston-b2', 'piston-c']) {
    const [left, right] = lift(id);
    for (const piston of [left, right]) {
      expect(piston.w).toBeGreaterThanOrEqual(.6); expect(piston.w).toBeLessThanOrEqual(.9); // about a tyre (.68)
      expect(piston.period).toBeGreaterThan(0);
      expect(piston.from.x).toBe(piston.to.x); // straight up and down
    }
    // A pair: same cycle and travel, one under each axle (±.7 from the frame's centre).
    expect(left.period).toBe(right.period); expect(left.offset).toBe(right.offset);
    expect(left.from.y).toBe(right.from.y); expect(left.to.y).toBe(right.to.y);
    expect(Math.abs((right.from.x - left.from.x) - 1.4)).toBeLessThan(.2);
  }
  const B1 = lift('piston-b1')[0], B2 = lift('piston-b2')[0];
  expect(B1.period).toBe(B2.period);
  expect(Math.abs((B2.offset ?? 0) - (B1.offset ?? 0))).toBe(.5);
  expect(PISTON.liftB1.high).toBe(PISTON.liftB2.low); // their tops meet as B1 peaks
  // Lifts join the floors: A from the start to deck 1, B from deck 2 to the upper floor, C the upper floor to the door floor.
  expect(PISTON.liftA.low).toBe(PISTON.start.y); expect(PISTON.liftA.high).toBe(PISTON.deck1.y);
  expect(PISTON.liftB1.low).toBe(PISTON.deck1.y); expect(PISTON.liftB2.high).toBe(PISTON.upper.y);
  expect(PISTON.liftC.high).toBe(PISTON.upper.y); expect(PISTON.door.y).toBe(PISTON.upper.y);
  // The shaft apple is out of reach from the floors: only riding C down collects it.
  const shaft = level.apples.find(apple => apple.id === 'piston-shaft')!;
  expect(shaft.x).toBe(PISTON.liftC.x);
  expect(PISTON.upper.y - shaft.y).toBeGreaterThan(2.5);
  // The half-pipe's apple sits in its bowl.
  expect(level.apples.find(apple => apple.id === 'piston-bowl')!.y).toBeLessThan(PISTON.deck1.y - 1.5);
  expect(BOWL.floor).toBeLessThan(PISTON.deck1.y - 2);
  // No route-clock timeline for a level whose platforms all keep their own time.
  expect(level.timePlatforms!.every(platform => platform.period)).toBe(true);
  expect(level.difficulty).toBeGreaterThan(14.5); expect(level.difficulty).toBeLessThan(15);
});

it('completes the Piston Works with player controls: up A, through the half-pipe, across the double lift, down C for its apple and up to the door', async () => {
  let seamGap = Infinity, shaftLow = Infinity, liftedOnA = false, peakOnB2 = -Infinity, crossedAt = -1;
  const state = await ride(createPistonWorksPilot(), 120, level, s => {
    const { x, y } = s.bike;
    // Carried up A: the frame above the start floor while still over A's shaft.
    if (Math.abs(x - PISTON.liftA.x) < .4 && y > PISTON.deck1.y) liftedOnA = true;
    // Crossing the double lift's seam: how far apart are the two tops right there?
    if (crossedAt < 0 && x > (PISTON.liftB1.x + PISTON.liftB2.x) / 2 && y > PISTON.deck1.y + 1.5) {
      crossedAt = s.elapsed; seamGap = Math.abs(top(body(s, 'piston-b1-1')) - top(body(s, 'piston-b2-0')));
    }
    if (Math.abs(x - PISTON.liftB2.x) < .4) peakOnB2 = Math.max(peakOnB2, y);
    if (s.collected.includes('piston-shaft') && shaftLow === Infinity) shaftLow = y;
  });
  expect(state.status).toBe('complete');
  expect(state.collected.sort()).toEqual(level.apples.map(apple => apple.id).sort());
  expect(liftedOnA).toBe(true);
  expect(crossedAt).toBeGreaterThan(0);
  expect(seamGap).toBeLessThan(.35); // crossed as the tops met
  expect(peakOnB2).toBeGreaterThan(PISTON.upper.y); // carried up to the upper floor on B2
  expect(shaftLow).toBeLessThan(PISTON.upper.y - 2); // the apple was taken deep in C's shaft
  expect(Math.hypot(state.bike.x - level.exit.x, state.bike.y - level.exit.y)).toBeLessThan(2);
}, 60000);

it.each([[1.1, .6, .6], [1.4, 1.2, 1.4], [1.6, .9, 1]])('tolerates the pilot’s timing (lead %f s, leave %f s, cross %f s)', async (lead, leave, cross) => {
  const state = await ride(createPistonWorksPilot({ lead, leave, cross }), 120);
  expect(state.status).toBe('complete');
}, 60000);

it('the lifts need timing: boarding A or crossing to B2 too early ends the ride', async () => {
  // Setting off 2 s before A bottoms out: the still-sinking pistons pin the front wheel at the shaft's lip.
  const early = await ride(createPistonWorksPilot({ lead: 2 }), 40);
  expect(early.status).toBe('crashed');
  expect(early.collected).toHaveLength(0);
  // Crossing 2.2 s before B1 crests, while B2 still stands well above it: the rider drops into the pit.
  const late = await ride(createPistonWorksPilot({ cross: 2.2 }), 60);
  expect(late.status).not.toBe('complete');
  expect(late.collected).not.toContain('piston-ledge');
}, 60000);

it('crossing lift C at the top reaches the door one apple short', async () => {
  // C held at the top (a period too long to move), the rider on the upper floor with only the shaft apple left.
  const held: Level = { ...level, id: 'piston-held', spawn: { x: 37, y: PISTON.upper.y + .72 },
    apples: level.apples.filter(apple => apple.id === 'piston-shaft'),
    timePlatforms: level.timePlatforms!.map(platform => platform.id.startsWith('piston-c-') ? { ...platform, period: 1e9 } : platform) };
  let east = -Infinity;
  const state = await ride(cruise(2), 15, held, s => { east = Math.max(east, s.bike.x); });
  expect(east).toBeGreaterThan(level.exit.x);
  expect(state.status).not.toBe('complete');
  expect(state.collected).not.toContain('piston-shaft');
});

it.each<Controls>([{ tilt: 0, brake: false }, { tilt: 1, brake: false }, { tilt: -1, brake: false }])('is not completed by fixed controls (%o)', async control => {
  const state = await ride(() => control, 40);
  expect(state.status).not.toBe('complete');
});

it('the campaign replay table drives the Piston Works at its own index', async () => {
  const index = levels.indexOf(level);
  expect(index).toBeGreaterThan(0);
  expect((await ride(createReplayPilot(index), 120)).status).toBe('complete');
}, 120_000);
