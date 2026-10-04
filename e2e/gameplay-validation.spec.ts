import { expect, test } from '@playwright/test';

const names = [
  'Newton’s Orchard', 'One Wheel Wonder', 'The Hanging Garden', 'The Pendulum Mill',
  'The Room on Its Side', 'Newton’s Attic', 'Escher’s Orchard',
  'The Contrary Conservatory', 'The Gravity Engine', 'The Clockwork Apple',
];

type Trace = {
  distance: number; minY: number; maxY: number; maxAngle: number; minAngle: number;
  peakPhase: number; reversed: boolean; highAppleY: number | null; lowestLiftAfterHigh: number;
  collectedAngles: Record<string, number>; touchedSwings: string[]; crossedSwingGaps: string[];
};

async function startReplay(page: import('@playwright/test').Page, index: number) {
  await page.goto('/?debug');
  await page.waitForFunction(() => Boolean((window as any).__NEWTON__));
  await page.evaluate(async campaignIndex => {
    const path = '/src/dev/replay.ts';
    const { createReplayPilot } = await import(/* @vite-ignore */ path);
    const api = (window as any).__NEWTON__;
    api.load(campaignIndex);
    const pilot = createReplayPilot(campaignIndex);
    let previous = api.snapshot();
    const touchedSwings = new Set<string>(), crossedSwingGaps = new Set<string>();
    const trace = {
      distance: 0, minY: previous.bike.y, maxY: previous.bike.y,
      maxAngle: previous.worldAngle, minAngle: previous.worldAngle,
      peakPhase: 0, reversed: false, highAppleY: null as number | null,
      lowestLiftAfterHigh: Infinity, collectedAngles: {} as Record<string, number>,
      touchedSwings: [] as string[], crossedSwingGaps: [] as string[],
    };
    (window as any).__replayTrace = trace;
    api.drive((state: typeof previous) => {
      trace.distance += Math.hypot(state.bike.x - previous.bike.x, state.bike.y - previous.bike.y);
      trace.minY = Math.min(trace.minY, state.bike.y);
      trace.maxY = Math.max(trace.maxY, state.bike.y);
      trace.maxAngle = Math.max(trace.maxAngle, state.worldAngle);
      trace.minAngle = Math.min(trace.minAngle, state.worldAngle);
      trace.peakPhase = Math.max(trace.peakPhase, state.timeline);
      trace.reversed ||= state.timeDirection < 0;
      for (const id of state.collected) trace.collectedAngles[id] ??= state.worldAngle;
      if (state.collected.includes('clock-b') && trace.highAppleY === null) trace.highAppleY = state.bike.y;
      if (trace.highAppleY !== null) trace.lowestLiftAfterHigh = Math.min(trace.lowestLiftAfterHigh,
        state.bodies.find((body: any) => body.id === 'clock-lift')?.y ?? Infinity);
      for (const swing of state.bodies.filter((body: any) => body.kind === 'swing')) {
        if (Math.abs(state.bike.x - swing.x) < swing.w / 2 + .3) crossedSwingGaps.add(swing.id);
        for (const wheel of state.bodies.filter((body: any) => body.kind === 'wheel')) {
          const dx = wheel.x - swing.x, dy = wheel.y - swing.y;
          const localX = dx * Math.cos(swing.angle) + dy * Math.sin(swing.angle);
          const localY = -dx * Math.sin(swing.angle) + dy * Math.cos(swing.angle);
          if (Math.abs(localX) < swing.w / 2 && Math.abs(localY - .46) < .07)
            touchedSwings.add(swing.id);
        }
      }
      trace.touchedSwings = [...touchedSwings];
      trace.crossedSwingGaps = [...crossedSwingGaps];
      previous = state;
      return pilot(state);
    });
  }, index);
}

async function finishReplay(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => (window as any).__NEWTON__.snapshot().status !== 'playing',
    undefined, { timeout: 160_000 });
  return page.evaluate(() => ({ state: (window as any).__NEWTON__.snapshot(),
    trace: (window as any).__replayTrace as Trace }));
}

test.describe.configure({ mode: 'parallel' });

for (const [index, name] of names.entries()) {
  test(`${name} completes through the rendered browser game`, async ({ page }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await startReplay(page, index);
    if (index === 6) {
      await page.waitForFunction(() => (window as any).__replayTrace.collectedAngles['escher-c'] > 1.3,
        undefined, { timeout: 95_000 });
      await page.screenshot({ path: 'docs/evidence/v2-escher-wall.png' });
      await page.waitForFunction(() => (window as any).__replayTrace.collectedAngles['escher-d'] > 2.9,
        undefined, { timeout: 50_000 });
      await page.screenshot({ path: 'docs/evidence/v2-escher-ceiling.png' });
    }
    if (index === 9) {
      await page.waitForFunction(() => (window as any).__replayTrace.highAppleY !== null,
        undefined, { timeout: 100_000 });
      await page.screenshot({ path: 'docs/evidence/v2-clockwork-high-apple.png' });
    }
    const { state, trace } = await finishReplay(page);
    expect(state.status, `${name}: ${JSON.stringify({ state, trace })}`).toBe('complete');
    expect(state.collected, name).toHaveLength(index < 5 ? [5, 6, 5, 6, 6][index] : [6, 8, 7, 7, 5][index - 5]);
    expect(trace.distance, name).toBeGreaterThan(60);
    expect(state.elapsed, name).toBeGreaterThan(index === 0 ? 30 : 45);
    expect(state.elapsed, name).toBeLessThan(105);
    if (index === 5) expect(trace.maxY - trace.minY, name).toBeGreaterThan(2);
    else if (index !== 9) expect(trace.maxY - trace.minY, name).toBeGreaterThan(4);
    if (index === 2) expect(trace.touchedSwings).toContain('garden-swing');
    if (index === 3) expect(trace.touchedSwings.sort()).toEqual(['mill-long', 'mill-short']);
    if (index === 8) {
      expect(trace.crossedSwingGaps).toContain('engine-swing');
      expect(trace.touchedSwings).toContain('engine-swing');
    }
    if (index === 6) {
      expect(trace.collectedAngles['escher-c']).toBeGreaterThan(1.3);
      expect(trace.collectedAngles['escher-d']).toBeGreaterThan(2.9);
      expect(trace.collectedAngles['escher-f']).toBeGreaterThan(4.4);
      expect(trace.collectedAngles['escher-g']).toBeGreaterThan(6);
      expect(trace.maxAngle).toBeGreaterThan(6);
      expect(state.bike.y).toBeGreaterThan(4);
    }
    if (index === 9) {
      expect(trace.highAppleY).toBeGreaterThan(1.5);
      expect(trace.peakPhase).toBeGreaterThan(.9);
      expect(trace.reversed).toBe(true);
      expect(trace.lowestLiftAfterHigh).toBeLessThan(-5);
      expect(state.timeline).toBeLessThan(.1);
    }
    expect(errors).toEqual([]);
  });
}

test('landscape touch holds release and warm frame samples stay finite', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/?debug');
  await page.waitForFunction(() => Boolean((window as any).__NEWTON__));
  await page.evaluate(() => (window as any).__NEWTON__.load(0));
  const brake = page.getByRole('button', { name: 'Hold to brake' });
  await brake.hover();
  await page.mouse.down();
  await expect(brake).toHaveClass(/pressed/);
  await page.mouse.up();
  await expect(brake).not.toHaveClass(/pressed/);
  const before = await page.evaluate(() => (window as any).__NEWTON__.snapshot().worldAngle);
  const right = page.getByRole('button', { name: 'Tilt world right' });
  await right.hover();
  await page.mouse.down();
  await page.waitForTimeout(450);
  await page.mouse.up();
  const after = await page.evaluate(() => (window as any).__NEWTON__.snapshot().worldAngle);
  expect(after).toBeGreaterThan(before + .2);
  await page.waitForTimeout(200);
  const settled = await page.evaluate(() => (window as any).__NEWTON__.snapshot().worldAngle);
  await page.waitForTimeout(200);
  expect(Math.abs((await page.evaluate(() => (window as any).__NEWTON__.snapshot().worldAngle)) - settled)).toBeLessThan(.01);
  const sample = await page.evaluate(() => new Promise<{ p95: number; median: number; physicsMax: number; frames: number }>(resolve => {
    const frames: number[] = [], physics: number[] = [];
    let previous = performance.now();
    const tick = (now: number) => {
      if (frames.length > 0) frames.push(now - previous);
      else frames.push(0);
      previous = now;
      physics.push((window as any).__NEWTON__.snapshot().physicsMs);
      if (frames.length < 121) requestAnimationFrame(tick);
      else {
        const sorted = frames.slice(1).sort((a, b) => a - b);
        resolve({ p95: sorted[Math.floor(sorted.length * .95)], median: sorted[Math.floor(sorted.length * .5)],
          physicsMax: Math.max(...physics), frames: sorted.length });
      }
    };
    requestAnimationFrame(tick);
  }));
  console.log('landscape warm frame sample', sample);
  expect(sample.frames).toBe(120);
  expect(Number.isFinite(sample.p95 + sample.median + sample.physicsMax)).toBe(true);
  expect(sample.p95).toBeLessThan(50);
});
