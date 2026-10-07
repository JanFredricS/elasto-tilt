import { expect, test } from '@playwright/test';

// Drive only the game's normal control path; inspect the rendered simulation.
test('One Wheel Wonder completes with a braked single-wheel pivot', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?debug');
  await page.waitForFunction(() => Boolean((window as any).__NEWTON__));
  await page.evaluate(async () => {
    const replayPath = '/src/dev/replay.ts', levelPath = '/src/levels/early.ts';
    const { createReplayPilot } = await import(/* @vite-ignore */ replayPath);
    const { earlyLevels } = await import(/* @vite-ignore */ levelPath);
    const api = (window as any).__NEWTON__;
    api.load(2);
    const pilot = createReplayPilot(2), level = earlyLevels[1];
    const trace = { singleWheelFrames: 0, pivotRotation: 0, witnessed: false, highApple: null as null | { supportedWheels: number; onCatch: boolean; angle: number } };
    let segmentFrames = 0, segmentRotation = 0, previousAngle = 0;
    (window as any).__wheelTrace = trace;
    api.drive((state: any) => {
      const controls = pilot(state);
      const wheels = state.bodies.filter((body: any) => body.kind === 'wheel');
      // Distance to authored rectangles measures support proximity without
      // exposing production physics internals or changing any body positions.
      const nearby = (wheel: any, surface: any) => {
        if (surface.kind === 'hazard') return false;
        const angle = surface.angle ?? 0, dx = wheel.x - surface.x, dy = wheel.y - surface.y;
        const x = dx * Math.cos(angle) + dy * Math.sin(angle);
        const y = -dx * Math.sin(angle) + dy * Math.cos(angle);
        return Math.hypot(Math.max(0, Math.abs(x) - surface.w / 2),
          Math.max(0, Math.abs(y) - surface.h / 2)) < wheel.w / 2 + .04;
      };
      const supported = wheels.filter((wheel: any) => level.surfaces.some((surface: any) => nearby(wheel, surface)));
      const onCatch = supported.length === 1 && level.surfaces.some((surface: any) =>
        surface.kind === 'cradle' && nearby(supported[0], surface));
      if (state.collected.includes('wonder-1') && trace.highApple === null) {
        trace.highApple = { supportedWheels: supported.length, onCatch,
          angle: state.bodies.find((body: any) => body.id === 'frame').angle };
      }
      if (controls.brake && onCatch) {
        const angle = state.bodies.find((body: any) => body.id === 'frame').angle;
        if (segmentFrames) segmentRotation += Math.atan2(Math.sin(angle - previousAngle), Math.cos(angle - previousAngle));
        previousAngle = angle; segmentFrames++;
        trace.singleWheelFrames = Math.max(trace.singleWheelFrames, segmentFrames);
        trace.pivotRotation = Math.max(trace.pivotRotation, Math.abs(segmentRotation));
        trace.witnessed ||= segmentFrames > 12 && Math.abs(segmentRotation) > .3;
      } else { segmentFrames = 0; segmentRotation = 0; }
      return controls;
    });
  });
  await page.waitForFunction(() => (window as any).__wheelTrace.witnessed ||
    (window as any).__NEWTON__.snapshot().status !== 'playing', undefined, { timeout: 120_000 });
  expect(await page.evaluate(() => (window as any).__wheelTrace.witnessed)).toBe(true);
  await page.screenshot({ path: 'docs/evidence/one-wheel-pivot.png' });
  await page.waitForFunction(() => (window as any).__NEWTON__.snapshot().status !== 'playing',
    undefined, { timeout: 150_000 });
  const result = await page.evaluate(() => ({ state: (window as any).__NEWTON__.snapshot(),
    trace: (window as any).__wheelTrace }));
  expect(result.state.status).toBe('complete');
  expect(result.state.collected).toHaveLength(6);
  expect(result.trace.highApple?.supportedWheels).toBe(1);
  expect(result.trace.highApple?.onCatch).toBe(true);
  expect(result.trace.highApple?.angle).toBeGreaterThan(.3);
  expect(errors).toEqual([]);
  console.log('One-wheel browser evidence', JSON.stringify({ elapsed: result.state.elapsed, trace: result.trace }));
});
