import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { createScaffoldKeyboardPilot, createTowerChasmPilot, towerChasmLevels } from '../src/levels/tower-chasm';
import type { BodyView, Snapshot, Surface } from '../src/types';

// Oriented-rectangle separation is independent of the pilot's route decisions.
function wheelClearance(wheel: BodyView, surface: Surface) {
  const angle = surface.angle ?? 0, dx = wheel.x - surface.x, dy = wheel.y - surface.y;
  const x = dx * Math.cos(angle) + dy * Math.sin(angle);
  const y = -dx * Math.sin(angle) + dy * Math.cos(angle);
  return Math.hypot(Math.max(Math.abs(x) - surface.w / 2, 0), Math.max(Math.abs(y) - surface.h / 2, 0)) - wheel.w / 2;
}
const wheels = (state: Snapshot) => state.bodies.filter(body => body.kind === 'wheel');
const frameAngle = (state: Snapshot) => state.bodies.find(body => body.id === 'frame')!.angle;
const angleDifference = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const supportedBy = (state: Snapshot, surface: Surface) => wheels(state).every(wheel => Math.abs(wheelClearance(wheel, surface)) < .035);
function totalRotation(frames: Snapshot[]) {
  return frames.slice(1).reduce((sum, state, index) => sum + angleDifference(frameAngle(state), frameAngle(frames[index])), 0);
}

export async function replayTower(index: 0 | 1, pilot = createTowerChasmPilot(index)) {
  const game = await createPhysics(), level = towerChasmLevels[index];
  game.load(level);
  const frames: Snapshot[] = [], air: Snapshot[][] = [], trail: string[] = [];
  let state = game.snapshot(), flight: Snapshot[] = [];
  for (let k = 0; k < 120 * 180 && state.status === 'playing'; k++) {
    state = game.step(1 / 120, pilot(state));
    const clearance = Math.min(...wheels(state).map(wheel => Math.min(...level.surfaces.map(surface => wheelClearance(wheel, surface)))));
    if (clearance > .06) flight.push(state);
    else if (flight.length) { air.push(flight); flight = []; }
    frames.push(state);
    if (k % 600 === 0) trail.push(`${state.elapsed.toFixed(0)}s (${state.bike.x.toFixed(1)}, ${state.bike.y.toFixed(1)})`);
  }
  if (flight.length) air.push(flight);
  game.destroy();
  return { state, air, trail, frames };
}
const runs = new Map<number, ReturnType<typeof replayTower>>();
function replay(index: 0 | 1) {
  if (!runs.has(index)) runs.set(index, replayTower(index));
  return runs.get(index)!;
}

it.each([0, 1] as const)('completes new map %s with normal gravity and brake inputs', async index => {
  const { state, trail } = await replay(index), level = towerChasmLevels[index];
  expect(state.status, trail.join(' → ')).toBe('complete');
  expect(state.collected).toHaveLength(level.apples.length);
  expect(state.elapsed).toBeGreaterThan(80);
  expect(state.elapsed).toBeLessThan(150);
  expect(level.difficulty).toBe(index + 13);
  expect(level.portals ?? []).toHaveLength(0);
});

it('leaves the scaffold wall, somersaults in free air, and lands with both wheels on top of a horizontal tier', async () => {
  const { frames, air } = await replay(0);
  const wall = towerChasmLevels[0].surfaces.find(surface => surface.id === 'scaffold-wall')!;
  expect(frames.some(state => supportedBy(state, wall) && Math.abs(angleDifference(frameAngle(state), Math.PI / 2)) < .1)).toBe(true);
  const jump = air.find(flight => flight.at(-1)!.bike.x - flight[0].bike.x > 8)!;
  expect(jump).toBeDefined();
  expect(jump.length / 120).toBeGreaterThan(1.3);
  expect(totalRotation(jump)).toBeLessThan(-5);
  const landing = towerChasmLevels[0].surfaces.find(surface => surface.id === 'scaffold-landing-tier')!;
  const settled = frames.find(state => state.elapsed > jump.at(-1)!.elapsed && supportedBy(state, landing) && Math.abs(frameAngle(state)) < .08)!;
  expect(settled).toBeDefined();
  expect(wheels(settled).every(wheel => wheel.y > landing.y + landing.h / 2)).toBe(true);
});

it('crosses two large chasms in air before descending both opposing walls', async () => {
  const { frames, air } = await replay(1);
  const outward = air.find(flight => flight.at(-1)!.bike.x - flight[0].bike.x > 40)!;
  const backward = air.find(flight => flight[0].bike.x - flight.at(-1)!.bike.x > 40)!;
  expect(outward.length / 120).toBeGreaterThan(2.5);
  expect(backward.length / 120).toBeGreaterThan(2.2);
  expect(totalRotation(outward)).toBeLessThan(-4.5);
  expect(totalRotation(backward)).toBeGreaterThan(4);
  for (const [id, angle, lowY] of [['home-opposite-wall', Math.PI / 2, -8], ['home-final-wall', -Math.PI / 2, -28]] as const) {
    const wall = towerChasmLevels[1].surfaces.find(surface => surface.id === id)!;
    expect(frames.some(state => state.bike.y < lowY && supportedBy(state, wall) && Math.abs(angleDifference(frameAngle(state), angle)) < .08)).toBe(true);
  }
});

it('releases upside down, rises over fifty metres through open air, catches the hidden ledge, and returns to the start', async () => {
  const { frames, air, state } = await replay(1), level = towerChasmLevels[1];
  const rise = air.find(flight => flight.at(-1)!.bike.y - flight[0].bike.y > 45)!;
  expect(rise.length / 120).toBeGreaterThan(5);
  expect(Math.cos(frameAngle(rise[0]))).toBeLessThan(-.98);
  expect(rise[0].collected).toHaveLength(level.apples.length);
  expect(rise[0].collected.at(-1)).toBe('home-final');
  const lastApple = frames.find(frame => frame.collected.length === level.apples.length)!;
  expect(lastApple.bike.y).toBeGreaterThan(-33);
  expect(lastApple.elapsed).toBeLessThan(rise[0].elapsed - 30);
  expect(rise.some(frame => frame.bike.y > 0 && Math.cos(frame.worldAngle) < -.9)).toBe(true);
  const ledge = level.surfaces.find(surface => surface.id === 'home-hidden-ledge')!;
  expect(ledge.y).toBeGreaterThan(level.spawn.y + 7);
  expect(frames.some(frame => frame.elapsed > rise.at(-1)!.elapsed && supportedBy(frame, ledge) && Math.cos(frameAngle(frame)) < -.99)).toBe(true);
  expect(Math.hypot(state.bike.x - level.exit.x, state.bike.y - level.exit.y)).toBeLessThan(2);
  expect(level.routeHints?.some(hint => hint.label === 'ROTATE' && hint.angle === Math.PI / 2)).toBe(true);
});

it.each(towerChasmLevels)('does not solve $name with idle, constant tilt, or fixed gravity', async level => {
  const game = await createPhysics();
  for (const control of [
    ...[-1, -.3, 0, .3, 1].map(tilt => ({ tilt, brake: false })),
    ...[-Math.PI / 2, .2, Math.PI / 2, Math.PI].map(worldAngle => ({ tilt: 0, worldAngle, brake: false })),
  ]) {
    game.load(level); let state = game.snapshot();
    for (let k = 0; k < 120 * 45 && state.status === 'playing'; k++) state = game.step(1 / 120, control);
    expect(state.status, JSON.stringify(control)).not.toBe('complete');
  }
  game.destroy();
});


it('also completes the scaffold at the slower keyboard/touch rotation rate', async () => {
  const { state, air, trail } = await replayTower(0, createScaffoldKeyboardPilot());
  expect(state.status, trail.join(' → ')).toBe('complete');
  expect(state.collected).toHaveLength(towerChasmLevels[0].apples.length);
  expect(air.some(flight => flight.length > 120 && Math.abs(totalRotation(flight)) > 4)).toBe(true);
});
