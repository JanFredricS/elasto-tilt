import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { levels } from '../src/levels';
import type { Level, Snapshot } from '../src/types';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const clockwork = levels[9];

async function replay(level: Level, reverseAfterHighApple: boolean) {
  const game = await createPhysics();
  game.load(level);
  let state = game.snapshot();
  let lastX = state.bike.x;
  let highAppleAt: Snapshot | undefined;
  let peakPhase = 0;
  let sawReverse = false;
  let lowestLiftAfterPeak = Infinity;
  for (let k = 0; k < 120 * 35 && state.status === 'playing'; k++) {
    const velocity = (state.bike.x - lastX) * 120;
    lastX = state.bike.x;
    const desired = reverseAfterHighApple && state.collected.includes('clock-b') ? -1.5 : 1.5;
    const target = clamp((desired - velocity) * .15, -.2, .2);
    state = game.step(1 / 120, { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake: false });
    if (!highAppleAt && state.collected.includes('clock-b')) highAppleAt = structuredClone(state);
    peakPhase = Math.max(peakPhase, state.timeline);
    if (highAppleAt && state.timeDirection < 0) sawReverse = true;
    const lift = state.bodies.find(body => body.id === 'clock-lift');
    if (highAppleAt && lift) lowestLiftAfterPeak = Math.min(lowestLiftAfterPeak, lift.y);
  }
  game.destroy();
  return { state, highAppleAt, peakPhase, sawReverse, lowestLiftAfterPeak };
}

it('completes Clockwork by riding right to lift and left to lower the platform', async () => {
  const result = await replay(clockwork, true);
  expect(result.state.status).toBe('complete');
  expect(result.state.collected).toEqual(['clock-a', 'clock-b']);
  expect(result.highAppleAt?.bike.x).toBeGreaterThan(7);
  expect(result.highAppleAt?.bike.y).toBeGreaterThan(1.3);
  expect(result.peakPhase).toBeGreaterThan(.6);
  expect(result.sawReverse).toBe(true);
  expect(result.lowestLiftAfterPeak).toBeLessThan(.1);
  expect(result.state.timeline).toBeLessThan(.15);
});

it('does not complete the same forward replay when the clock lift is frozen at its start', async () => {
  const lift = clockwork.timePlatforms![0];
  const result = await replay({ ...clockwork, timePlatforms: [],
    surfaces: [...clockwork.surfaces, { id: 'clock-lift-frozen', ...lift.from, w: lift.w, h: lift.h, kind: 'ground' }],
  }, true);
  expect(result.state.status).not.toBe('complete');
  expect(result.state.collected).not.toContain('clock-b');
});

it('does not complete the same replay without its backward leg', async () => {
  const result = await replay(clockwork, false);
  expect(result.state.status).not.toBe('complete');
  expect(result.highAppleAt).toBeDefined();
  expect(result.sawReverse).toBe(false);
});
