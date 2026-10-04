import { afterEach, expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import type { Level, PhysicsGame, Snapshot } from '../src/types';
const games: PhysicsGame[] = [];
const fixture = (patch: Partial<Level> = {}): Level => ({
  id: 'controls', name: '', subtitle: '', mechanic: '', hint: '', difficulty: 1,
  spawn: { x: 0, y: .72 }, surfaces: [{ id: 'floor', x: 0, y: -.5, w: 200, h: 1 }],
  apples: [{ id: 'far', x: 500, y: 500 }], exit: { x: 510, y: 500 },
  bounds: { min: { x: -1000, y: -1000 }, max: { x: 1000, y: 1000 } }, ...patch,
});
async function game(level = fixture()) { const p = await createPhysics(); p.load(level); games.push(p); return p; }
const body = (state: Snapshot, id: string) => state.bodies.find(b => b.id === id)!;
function run(p: PhysicsGame, seconds: number, brake = false, angle?: number) {
  let state = p.snapshot();
  for (let i = 0; i < Math.round(seconds * 120); i++) state = p.step(1 / 120, { tilt: 0, brake, worldAngle: angle });
  return state;
}
afterEach(() => games.splice(0).forEach(p => p.destroy()));
const angleDifference = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
it.each([.4, .6])('holds a %s rad downhill slope with locked relative wheel angles, then releases', async angle => {
  const free = await game(fixture({ initialAngle: angle }));
  const held = await game(fixture({ initialAngle: angle }));
  const rolling = run(free, 2), stopped = run(held, 2, true);
  expect(rolling.status).toBe('playing'); expect(stopped.status).toBe('playing');
  expect(rolling.bike.x).toBeGreaterThan(6);
  expect(Math.abs(stopped.bike.x)).toBeLessThan(.07);
  const later = run(held, 2, true);
  expect(later.status).toBe('playing');
  expect(Math.abs(later.bike.x - stopped.bike.x)).toBeLessThan(.003);
  for (const id of ['wheel-0', 'wheel-1']) {
    const before = body(stopped, id).angle - body(stopped, 'frame').angle;
    const after = body(later, id).angle - body(later, 'frame').angle;
    expect(Math.abs(angleDifference(after, before))).toBeLessThan(.003);
  }
  const released = run(held, 1);
  expect(released.status).toBe('playing');
  expect(released.bike.x - later.bike.x).toBeGreaterThan(1);
});
it.each([.4, .6])('reduces actual stopping distance from a moving bike on a %s rad slope', async angle => {
  const free = await game(fixture({ initialAngle: angle }));
  const held = await game(fixture({ initialAngle: angle }));
  const start = run(held, .2); run(free, .2);
  expect(start.bike.x).toBeGreaterThan(.05);
  const stopped = run(held, 2, true), rolling = run(free, 2);
  expect(stopped.status).toBe('playing'); expect(rolling.status).toBe('playing');
  const stoppingDistance = stopped.bike.x - start.bike.x;
  expect(stoppingDistance).toBeGreaterThan(0);
  expect(stoppingDistance).toBeLessThan(.08);
  expect(stoppingDistance).toBeLessThan((rolling.bike.x - start.bike.x) * .02);
});
it.each([-1, 1])('wakes a loaded compact pendulum and carries its rider in gravity direction %s', async sign => {
  const p = await game(fixture({ spawn: { x: 0, y: 2.82 }, surfaces: [],
    swings: [{ id: 'seat', anchor: { x: 0, y: 5 }, length: 3, width: 2.6 }] }));
  const rest = run(p, 30, true), still = run(p, 1, true);
  expect(rest.status).toBe('playing'); expect(still.status).toBe('playing');
  expect(Math.abs(body(still, 'seat').x - body(rest, 'seat').x)).toBeLessThan(.001);
  expect(Math.abs(still.bike.x)).toBeLessThan(.02);
  const tilted = run(p, 1.5, true, sign * .5), seat = body(tilted, 'seat');
  expect(tilted.status).toBe('playing');
  expect(seat.x * sign).toBeGreaterThan(2);
  expect(tilted.bike.x * sign).toBeGreaterThan(1.5);
  expect(Math.hypot(seat.x, seat.y - 5)).toBeCloseTo(3, 2);
  const dx = tilted.bike.x - seat.x, dy = tilted.bike.y - seat.y;
  expect(Math.abs(dx * Math.cos(seat.angle) + dy * Math.sin(seat.angle))).toBeLessThan(.1);
  expect(-dx * Math.sin(seat.angle) + dy * Math.cos(seat.angle)).toBeCloseTo(.82, 1);
});
it('starts a compact displaced swing on its suspension circle and swings through vertical', async () => {
  const p = await game(fixture({ spawn: { x: 20, y: 10 }, surfaces: [],
    swings: [{ id: 'seat', anchor: { x: 0, y: 5 }, length: 2.5, width: 2.3, angle: .6 }] }));
  const first = body(p.snapshot(), 'seat');
  expect(first.x).toBeCloseTo(2.5 * Math.sin(.6), 5);
  expect(first.y).toBeCloseTo(5 - 2.5 * Math.cos(.6), 5);
  let crossed = false;
  for (let i = 0; i < 180; i++) {
    const state = p.step(1 / 120, { tilt: 0, brake: false }), seat = body(state, 'seat');
    expect(state.status).toBe('playing');
    expect(Math.hypot(seat.x, seat.y - 5)).toBeCloseTo(2.5, 2);
    if (seat.angle < -.2) crossed = true;
  }
  expect(crossed).toBe(true);
});
it('does not anchor airborne wheels or cancel falling velocity while braking through inversion', async () => {
  const level = fixture({ spawn: { x: 0, y: 50 }, surfaces: [] });
  const free = await game(level), held = await game(level);
  for (let i = 0; i < 480; i++) {
    const unbraked = free.step(1 / 120, { tilt: 1, brake: false });
    const braked = held.step(1 / 120, { tilt: 1, brake: true });
    expect(braked.status).toBe('playing');
    expect(Math.hypot(braked.bike.x - unbraked.bike.x, braked.bike.y - unbraked.bike.y)).toBeLessThan(.02);
  }
  expect(held.snapshot().worldAngle).toBeGreaterThan(Math.PI);
  expect(Math.hypot(held.snapshot().bike.x, held.snapshot().bike.y - 50)).toBeGreaterThan(20);
});
