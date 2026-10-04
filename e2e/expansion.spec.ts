import { levels } from '../src/levels';
import { expect, test } from '@playwright/test';

const maps = [
  [10, 'underside-return'], [11, 'spiral-sanctuary'],
  [12, 'switchback-scaffold'], [13, 'the-hidden-way-home'], [14, 'stairway-to-heaven'],
] as const;
for (const [index, id] of maps) {
  test(`${id} completes through the rendered campaign`, async ({ page }) => {
    test.setTimeout(360_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.waitForFunction(() => Boolean((window as any).__NEWTON__));
    await page.evaluate(i => (window as any).__NEWTON__.load(i), index);
    await page.getByRole('button', { name: 'View whole map' }).click();
    await page.waitForTimeout(250); // Allow Pixi text textures and the overview transform to settle.
    await page.screenshot({ path: `docs/evidence/${id}-overview.png` });
    await page.getByRole('button', { name: 'Return to riding' }).click();
    await page.evaluate(async campaignIndex => {
      const replayPath = '/src/dev/replay.ts', levelsPath = '/src/levels.ts';
      const { createReplayPilot } = await import(/* @vite-ignore */ replayPath);
      const { levels } = await import(/* @vite-ignore */ levelsPath);
      const api = (window as any).__NEWTON__, level = levels[campaignIndex];
      api.load(campaignIndex);
      const pilot = createReplayPilot(campaignIndex);
      const surfaces = level.surfaces.map((s: any) => ({ ...s,
        cos: Math.cos(s.angle ?? 0), sin: Math.sin(s.angle ?? 0) }));
      const trace = { distance: 0, minGravity: 0, maxGravity: 0, maxAirborne: 0,
        flights: [] as { seconds: number; rotation: number; landingAngle: number }[],
        apples: {} as Record<string, { x: number; y: number; gravity: number; bikeAngle: number }>,
        total: level.apples.length, maxPhysicsMs: 0 };
      (window as any).__expansionTrace = trace;
      let previous = api.snapshot(), bikeAngle = 0, lastRaw = 0;
      let airStart: number | undefined, takeoffAngle = 0;
      api.drive((state: any) => {
        trace.distance += Math.hypot(state.bike.x - previous.bike.x, state.bike.y - previous.bike.y);
        trace.minGravity = Math.min(trace.minGravity, state.worldAngle);
        trace.maxGravity = Math.max(trace.maxGravity, state.worldAngle);
        trace.maxPhysicsMs = Math.max(trace.maxPhysicsMs, state.physicsMs);
        const raw = state.bodies.find((b: any) => b.id === 'frame').angle;
        bikeAngle += Math.atan2(Math.sin(raw - lastRaw), Math.cos(raw - lastRaw)); lastRaw = raw;
        const supported = state.bodies.filter((b: any) => b.kind === 'wheel').some((wheel: any) =>
          surfaces.some((s: any) => {
            if (s.kind === 'hazard') return false;
            const dx = wheel.x - s.x, dy = wheel.y - s.y;
            const x = dx * s.cos + dy * s.sin, y = -dx * s.sin + dy * s.cos;
            return Math.hypot(Math.max(0, Math.abs(x) - s.w / 2), Math.max(0, Math.abs(y) - s.h / 2)) < .39;
          }));
        if (!supported) {
          if (airStart === undefined) { airStart = state.elapsed; takeoffAngle = bikeAngle; }
          trace.maxAirborne = Math.max(trace.maxAirborne, state.elapsed - airStart);
        } else if (airStart !== undefined) {
          if (state.elapsed - airStart > .12) trace.flights.push({ seconds: state.elapsed - airStart,
            rotation: bikeAngle - takeoffAngle, landingAngle: bikeAngle });
          airStart = undefined;
        }
        for (const apple of state.collected) trace.apples[apple] ??= { ...state.bike,
          gravity: state.worldAngle, bikeAngle };
        previous = state;
        return pilot(state);
      });
    }, index);
    if (index === 14) {
      await page.waitForFunction(() => {
        const state = (window as any).__NEWTON__.snapshot();
        return state.bike.y > 3 && state.bike.y < 8 &&
          state.bodies.some((body: any) => body.id === 'frame' && body.angle > 1.2);
      }, undefined, { timeout: 60_000 });
      await page.screenshot({ path: 'docs/evidence/stairway-wall-climb.png' });
    }
    if (index > 10 && index < 14) {
      await page.waitForFunction(() => (window as any).__expansionTrace.maxAirborne > .15 ||
        (window as any).__NEWTON__.snapshot().status !== 'playing', undefined, { timeout: 240_000 });
      await page.screenshot({ path: `docs/evidence/${id}-flight.png` });
    }
    await page.waitForFunction(() => (window as any).__NEWTON__.snapshot().status !== 'playing',
      undefined, { timeout: 300_000 });
    const { state, trace } = await page.evaluate(() => ({ state: (window as any).__NEWTON__.snapshot(),
      trace: (window as any).__expansionTrace }));
    expect(state.status, JSON.stringify({ state, trace })).toBe('complete');
    expect(state.collected).toHaveLength(trace.total);
    expect(trace.distance).toBeGreaterThan(30);
    if (index > 10 && index < 14) expect(trace.maxAirborne).toBeGreaterThan(.15);
    expect(errors).toEqual([]);
    console.log(`${id} rendered evidence`, JSON.stringify({ elapsed: state.elapsed, ...trace }));
  });
}

test('campaign menu and route instructions fit a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(count => localStorage.setItem('newtons-ride.progress.v1', JSON.stringify({ unlocked: count })), levels.length);
  await page.goto('/');
  await expect(page.locator('.level-tile')).toHaveCount(levels.length);
  await page.locator('.level-tile').last().click();
  await expect(page.locator('[data-ui="level-number"]')).toHaveText(`${levels.length} / ${levels.length}`);
  await page.getByRole('button', { name: 'View whole map' }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'docs/evidence/stairway-phone-overview.png' });
  await page.getByRole('button', { name: 'Return to riding' }).click();
  await page.getByRole('button', { name: 'Pause game' }).click();
  await expect(page.locator('[data-ui="state-copy"]')).not.toBeEmpty();
  await expect(page.getByRole('button', { name: /KEEP RIDING/ })).toBeVisible();
});
