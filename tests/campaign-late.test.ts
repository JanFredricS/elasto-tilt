import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { createLateReplayPilot, lateLevels } from '../src/levels/late';
import type { Level, Snapshot } from '../src/types';

export async function replayLate(level: Level, reverse = true) {
  const game = await createPhysics(); game.load(level);
  let state = game.snapshot(), previous = state.bike;
  let distance = 0, peakPhase = 0, sawReverse = false, wall = false, ceiling = false;
  let highAppleAt: Snapshot | undefined;
  let lowestLiftAfterPeak = Infinity, maximumGravity = 0, swingCrossed = false, swingSupported = false, inverseWeightRose = false;
  let barrelSeatedAt: number | undefined, crossedAt: number | undefined;
  const pilot = createLateReplayPilot(lateLevels.findIndex(l => l.id === level.id), reverse);
  const collectedAngles: Record<string, number> = {};
  const trail: string[] = [];
  for (let k = 0; k < 120 * 130 && state.status === 'playing'; k++) {
    const dx = state.bike.x - previous.x, dy = state.bike.y - previous.y;
    distance += Math.hypot(dx, dy); previous = state.bike;
    state = game.step(1 / 120, pilot(state));
    maximumGravity = Math.max(maximumGravity, state.worldAngle);
    for (const id of state.collected) collectedAngles[id] ??= state.worldAngle;
    swingCrossed ||= level.id === 'gravity-engine' && state.bike.x > 14.5 && state.bike.x < 15.8 && state.bike.y > .2;
    const seat = state.bodies.find(b => b.id === 'engine-swing');
    if (seat) for (const wheel of state.bodies.filter(b => b.kind === 'wheel')) {
      const dx = wheel.x - seat.x, dy = wheel.y - seat.y;
      const localX = dx * Math.cos(seat.angle) + dy * Math.sin(seat.angle);
      const localY = -dx * Math.sin(seat.angle) + dy * Math.cos(seat.angle);
      swingSupported ||= Math.abs(localX) < seat.w / 2 && localY > .42 && localY < .50;
    }
    if (state.bodies.find(b => b.id === 'attic-barrel')?.settled) barrelSeatedAt ??= state.elapsed;
    if (level.id === 'newtons-attic' && state.bike.x > 33) crossedAt ??= state.elapsed;
    inverseWeightRose ||= (state.bodies.find(b => b.id === 'contrary-weight')?.y ?? 0) > 4;
    if (highAppleAt) lowestLiftAfterPeak = Math.min(lowestLiftAfterPeak, state.bodies.find(b => b.id === 'clock-lift')?.y ?? Infinity);
    peakPhase = Math.max(peakPhase, state.timeline); sawReverse ||= state.timeDirection < 0;
    wall ||= state.worldAngle > 1.35; ceiling ||= state.worldAngle > 2.9;
    if (state.collected.includes('clock-b') && !highAppleAt) highAppleAt = structuredClone(state);
    if (k % 600 === 0) trail.push(`${(k/120).toFixed(0)}:${state.bike.x.toFixed(1)},${state.bike.y.toFixed(1)}@${state.worldAngle.toFixed(2)}`);
  }
  game.destroy(); return { state, distance, peakPhase, sawReverse, wall, ceiling, highAppleAt, trail, maximumGravity, collectedAngles, swingCrossed, swingSupported, barrelSeatedAt, crossedAt, inverseWeightRose, lowestLiftAfterPeak };
}

it.each(lateLevels)('completes the substantial $name route in real Rapier', async level => {
  const result = await replayLate(level);
  expect(result.state.status, result.trail.join(' → ')).toBe('complete');
  expect(result.state.collected).toHaveLength(level.apples.length);
  expect(result.distance).toBeGreaterThan(60);
  expect(result.state.elapsed).toBeGreaterThan(45);
  expect(result.state.elapsed).toBeLessThan(100);
});


it('makes Escher revisit the entrance slab from above after four real gravity faces', async () => {
  const result = await replayLate(lateLevels[1]);
  expect(result.collectedAngles['escher-a']).toBeLessThan(.3);
  expect(result.collectedAngles['escher-c']).toBeGreaterThan(1.3);
  expect(result.collectedAngles['escher-d']).toBeGreaterThan(2.9);
  expect(result.collectedAngles['escher-f']).toBeGreaterThan(4.4);
  expect(result.collectedAngles['escher-g']).toBeGreaterThan(6);
  expect(result.maximumGravity).toBeGreaterThan(6);
  expect(result.state.bike.y).toBeGreaterThan(4);
});

it('seats the Attic barrel in its well before the bike crosses, and it stays fixed', async () => {
  const level = lateLevels[0], result = await replayLate(level);
  const socket = level.props!.find(p => p.id === 'attic-barrel')!.socket!;
  const barrel = result.state.bodies.find(b => b.id === 'attic-barrel')!;
  expect(result.state.status, result.trail.join(' → ')).toBe('complete');
  expect(barrel.settled).toBe(true);
  expect(Math.hypot(barrel.x - socket.x, barrel.y - socket.y)).toBeLessThan(socket.tolerance);
  expect(result.barrelSeatedAt).toBeDefined();
  expect(result.crossedAt).toBeGreaterThan(result.barrelSeatedAt!);
  expect(result.state.bodies.find(b => b.id === 'attic-weight')!.settled).toBe(true);
});

it('keeps the Attic barrel in its cradle under a held hard-left tilt, but lets a hard-right tilt spill it', async () => {
  const level = lateLevels[0], game = await createPhysics();
  const hold = (worldAngle: number) => {
    game.load(level); let state = game.snapshot();
    for (let k = 0; k < 120 * 5; k++) state = game.step(1 / 120, { tilt: 0, worldAngle, brake: false });
    return state.bodies.find(b => b.id === 'attic-barrel')!;
  };
  for (const worldAngle of [-.65, -1]) {
    const barrel = hold(worldAngle);
    expect(barrel.x, `held ${worldAngle}`).toBeGreaterThan(25.5);
    expect(barrel.x, `held ${worldAngle}`).toBeLessThan(28.5);
  }
  expect(hold(.5).x).toBeLessThan(28.5);
  expect(hold(.65).x).toBeGreaterThan(29.5);
  game.destroy();
});

it('blocks the Attic far side when the barrel is pinned in its cradle', async () => {
  const level = lateLevels[0];
  const pinned = await replayLate({ ...level, props: level.props!.filter(p => p.id !== 'attic-barrel'),
    surfaces: [...level.surfaces, { id: 'pinned-barrel', x: 27, y: 3.2, w: 2, h: 2, kind: 'ground' }] });
  expect(pinned.state.status).not.toBe('complete');
  expect(pinned.state.collected).not.toContain('attic-d');
});

it('retains the inverted weights and compact swing crossing', async () => {
  expect((await replayLate(lateLevels[2])).inverseWeightRose).toBe(true);
  const engine = await replayLate(lateLevels[3]);
  expect(engine.swingCrossed).toBe(true);
  expect(engine.swingSupported).toBe(true);
  const swing = lateLevels[3].swings![0];
  expect(swing.width).toBeGreaterThanOrEqual(2.3);
  expect(swing.width).toBeLessThanOrEqual(3);
  expect(swing.length).toBeGreaterThanOrEqual(2.5);
  expect(swing.length).toBeLessThanOrEqual(4);
});

it('requires Clockwork to raise then lower its lift along the return journey', async () => {
  const result = await replayLate(lateLevels[4]);
  expect(result.highAppleAt?.bike.y).toBeGreaterThan(1.5);
  expect(result.peakPhase).toBeGreaterThan(.9);
  expect(result.sawReverse).toBe(true);
  expect(result.lowestLiftAfterPeak).toBeLessThan(-5);
  expect(result.state.timeline).toBeLessThan(.1);
});

it('cannot solve Clockwork with its lift frozen or without the backward leg', async () => {
  const level = lateLevels[4], lift = level.timePlatforms![0];
  const frozen = await replayLate({ ...level, timePlatforms: [], surfaces: [...level.surfaces,
    { id: 'frozen-lift', ...lift.from, w: lift.w, h: lift.h, kind: 'ground' }] });
  expect(frozen.state.status).not.toBe('complete');
  expect(frozen.state.collected).not.toContain('clock-b');
  const forwardOnly = await replayLate(level, false);
  expect(forwardOnly.highAppleAt).toBeDefined();
  expect(forwardOnly.state.status).not.toBe('complete');
});

it.each(lateLevels)('does not reduce $name to constant tilt or a straight fall to the exit', async level => {
  const game = await createPhysics();
  for (const tilt of [-1, -.3, 0, .1, .3, 1]) {
    game.load(level); let state = game.snapshot();
    for (let k = 0; k < 120 * 35 && state.status === 'playing'; k++)
      state = game.step(1 / 120, { tilt, brake: false });
    expect(state.status, `constant tilt ${tilt}`).not.toBe('complete');
  }
  for (const worldAngle of [-Math.PI / 2, .18, Math.PI / 2, Math.PI]) {
    game.load(level); let state = game.snapshot();
    for (let k = 0; k < 120 * 35 && state.status === 'playing'; k++)
      state = game.step(1 / 120, { tilt: 0, worldAngle, brake: false });
    expect(state.status, `fixed gravity ${worldAngle}`).not.toBe('complete');
  }
  game.destroy();
});

const propFixture = (props: Level['props']): Level => ({
  id: 'prop-fixture', name: 'Prop fixture', subtitle: '', mechanic: '', hint: '', difficulty: 1,
  spawn: { x: 0, y: .7 }, exit: { x: 8, y: .75 }, apples: [{ id: 'far', x: 8, y: .9 }],
  bounds: { min: { x: -10, y: -6 }, max: { x: 10, y: 10 } }, props,
  surfaces: [{ id: 'floor', x: -2, y: -.3, w: 12, h: .6, kind: 'ground' },
    { id: 'pit-floor', x: 5, y: -1.5, w: 2, h: .4, kind: 'ground' },
    { id: 'far-floor', x: 7.5, y: -.3, w: 3, h: .6, kind: 'ground' }],
});

it('lets a loose prop land on the helmet without crashing the rider', async () => {
  const game = await createPhysics();
  game.load(propFixture([{ id: 'falling', shape: 'ball', x: .13, y: 2.6, w: .6, h: .6 }]));
  let state = game.snapshot(), lowest = Infinity;
  for (let k = 0; k < 120 && state.status === 'playing'; k++) {
    state = game.step(1 / 120, { tilt: 0, brake: true });
    lowest = Math.min(lowest, state.bodies.find(b => b.id === 'falling')!.y);
  }
  game.destroy();
  expect(lowest).toBeLessThan(2.0);
  expect(state.status).toBe('playing');
});

it('freezes a prop that comes to rest in its socket, after which tilt cannot move it', async () => {
  const game = await createPhysics();
  game.load(propFixture([{ id: 'plug', shape: 'ball', x: 5, y: .8, w: 1.6, h: 1.6, density: 2, friction: .05,
    socket: { x: 5, y: -.5, tolerance: .1 } }]));
  let state = game.snapshot();
  for (let k = 0; k < 240; k++) state = game.step(1 / 120, { tilt: 0, worldAngle: .05, brake: true });
  const seated = state.bodies.find(b => b.id === 'plug')!;
  expect(seated.settled).toBe(true);
  for (let k = 0; k < 240; k++) state = game.step(1 / 120, { tilt: 0, worldAngle: -.8, brake: true });
  const after = state.bodies.find(b => b.id === 'plug')!;
  game.destroy();
  expect(Math.hypot(after.x - seated.x, after.y - seated.y)).toBeLessThan(1e-6);
});
