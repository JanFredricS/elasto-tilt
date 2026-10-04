import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { lateLevels } from '../src/levels/late';
import type { Level, Snapshot } from '../src/types';
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export async function replayLate(level: Level, reverse = true) {
  const game = await createPhysics(); game.load(level);
  let state = game.snapshot(), previous = state.bike, angle = 0, lastRawAngle = 0;
  let distance = 0, peakPhase = 0, sawReverse = false, wall = false, ceiling = false;
  let highAppleAt: Snapshot | undefined;
  let lowestLiftAfterPeak = Infinity, maximumGravity = 0, swingCrossed = false, swingSupported = false, atticWeightMoved = false, inverseWeightRose = false;
  const collectedAngles: Record<string, number> = {};
  const trail: string[] = [];
  for (let k = 0; k < 120 * 130 && state.status === 'playing'; k++) {
    const dx = state.bike.x - previous.x, dy = state.bike.y - previous.y;
    distance += Math.hypot(dx, dy); previous = state.bike;
    const raw = state.bodies.find(b => b.id === 'frame')!.angle;
    angle += Math.atan2(Math.sin(raw - lastRawAngle), Math.cos(raw - lastRawAngle)); lastRawAngle = raw;
    const velocity = (dx * Math.cos(angle) + dy * Math.sin(angle)) * 120;
    const returning = reverse && ((level.id === 'newtons-attic' && state.collected.includes('attic-e') && !state.collected.includes('attic-f')) ||
      (level.id === 'clockwork-apple' && state.collected.includes('clock-b')) ||
      (level.id === 'eschers-orchard' && state.collected.includes('escher-h')) ||
      (level.id === 'contrary-conservatory' && state.collected.includes('contrary-g')));
    const desired = returning ? -1.6 : 1.6;
    const target = angle + clamp((desired - velocity) * .22, -.3, .3);
    state = game.step(1 / 120, { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake: false });
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
    atticWeightMoved ||= (state.bodies.find(b => b.id === 'attic-weight')?.x ?? 6) > 7;
    inverseWeightRose ||= (state.bodies.find(b => b.id === 'contrary-weight')?.y ?? 0) > 4;
    if (highAppleAt) lowestLiftAfterPeak = Math.min(lowestLiftAfterPeak, state.bodies.find(b => b.id === 'clock-lift')?.y ?? Infinity);
    peakPhase = Math.max(peakPhase, state.timeline); sawReverse ||= state.timeDirection < 0;
    wall ||= state.worldAngle > 1.35; ceiling ||= state.worldAngle > 2.9;
    if (state.collected.includes('clock-b') && !highAppleAt) highAppleAt = structuredClone(state);
    if (k % 600 === 0) trail.push(`${(k/120).toFixed(0)}:${state.bike.x.toFixed(1)},${state.bike.y.toFixed(1)}@${state.worldAngle.toFixed(2)}`);
  }
  game.destroy(); return { state, distance, peakPhase, sawReverse, wall, ceiling, highAppleAt, trail, maximumGravity, collectedAngles, swingCrossed, swingSupported, atticWeightMoved, inverseWeightRose, lowestLiftAfterPeak };
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

it('retains the moving weights, inverted weights and compact swing crossing', async () => {
  expect((await replayLate(lateLevels[0])).atticWeightMoved).toBe(true);
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
