import { expect, test } from '@playwright/test';

test('Clockwork can be played through the browser with a real reversal', async ({ page }) => {
  test.setTimeout(35_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?debug');
  await page.waitForFunction(() => Boolean((window as any).__NEWTON__));
  await page.evaluate(() => (window as any).__NEWTON__.load(9));
  await page.evaluate(() => {
    const api = (window as any).__NEWTON__;
    const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
    let last = api.snapshot();
    (window as any).__clockworkObserved = { highApple: false, reversed: false, peak: 0, lowAfterPeak: Infinity };
    const interval = setInterval(() => {
      const state = api.snapshot();
      const observed = (window as any).__clockworkObserved;
      observed.highApple ||= state.collected.includes('clock-b');
      observed.peak = Math.max(observed.peak, state.timeline);
      if (observed.highApple && state.timeDirection < 0) observed.reversed = true;
      if (observed.highApple) observed.lowAfterPeak = Math.min(observed.lowAfterPeak,
        state.bodies.find((body: any) => body.id === 'clock-lift')?.y ?? Infinity);
      if (state.status !== 'playing') { clearInterval(interval); api.tilt(0); return; }
      const dt = state.elapsed - last.elapsed;
      if (dt <= 0) return;
      const velocity = (state.bike.x - last.bike.x) / dt;
      const desired = state.collected.includes('clock-b') ? -1.5 : 1.5;
      const target = clamp((desired - velocity) * .15, -.2, .2);
      api.tilt(clamp((target - state.worldAngle) * 8, -1, 1));
      last = state;
    }, 30);
  });
  await page.waitForFunction(() => {
    const state = (window as any).__NEWTON__.snapshot();
    return state.collected.includes('clock-b') && state.timeline > .55;
  }, undefined, { timeout: 20_000 });
  await page.screenshot({ path: 'docs/evidence/clockwork-lift.png' });
  await page.waitForFunction(() => (window as any).__NEWTON__.snapshot().status !== 'playing', undefined, { timeout: 25_000 });
  const result = await page.evaluate(() => ({ state: (window as any).__NEWTON__.snapshot(),
    observed: (window as any).__clockworkObserved }));
  expect(result.state.status).toBe('complete');
  expect(result.state.collected).toEqual(['clock-a', 'clock-b']);
  expect(result.observed.highApple).toBe(true);
  expect(result.observed.reversed).toBe(true);
  expect(result.observed.peak).toBeGreaterThan(.6);
  expect(result.observed.lowAfterPeak).toBeLessThan(.1);
  expect(errors).toEqual([]);
});

test('Escher reaches wall and ceiling apples through full browser rotation', async ({ page }) => {
  test.setTimeout(40_000);
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).__NEWTON__));
  await page.evaluate(() => (window as any).__NEWTON__.load(6));
  await page.evaluate(() => {
    const api = (window as any).__NEWTON__;
    const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
    let last = api.snapshot();
    let stage = 0;
    (window as any).__escherObserved = { wall: false, ceiling: false, maxAngle: 0 };
    const interval = setInterval(() => {
      const state = api.snapshot();
      const observed = (window as any).__escherObserved;
      observed.wall ||= state.worldAngle > 1.4 && state.collected.includes('escher-b');
      observed.ceiling ||= state.worldAngle > 2.8 && state.collected.includes('escher-c');
      observed.maxAngle = Math.max(observed.maxAngle, state.worldAngle);
      if (state.status !== 'playing') { clearInterval(interval); api.tilt(0); return; }
      const dt = state.elapsed - last.elapsed;
      if (dt <= 0) return;
      const velocity = (state.bike.x - last.bike.x) / dt;
      if (stage === 0 && state.bike.x > 11.8) stage = 1;
      if (stage === 1 && state.bike.y > 4) stage = 2;
      const target = stage === 0 ? clamp((1.8 - velocity) * .14, -.18, .18)
        : stage === 1 ? Math.PI / 2 : Math.PI;
      api.tilt(clamp((target - state.worldAngle) * 7, -1, 1));
      last = state;
    }, 30);
  });
  await page.waitForFunction(() => {
    const state = (window as any).__NEWTON__.snapshot();
    return state.worldAngle > 1.4 && state.collected.includes('escher-b');
  }, undefined, { timeout: 20_000 });
  await page.screenshot({ path: 'docs/evidence/escher-wall.png' });
  await page.waitForFunction(() => {
    const state = (window as any).__NEWTON__.snapshot();
    return state.worldAngle > 2.8 && state.collected.includes('escher-c');
  }, undefined, { timeout: 20_000 });
  await page.screenshot({ path: 'docs/evidence/escher-ceiling.png' });
  await page.waitForFunction(() => (window as any).__NEWTON__.snapshot().status !== 'playing', undefined, { timeout: 32_000 });
  const result = await page.evaluate(() => ({ state: (window as any).__NEWTON__.snapshot(),
    observed: (window as any).__escherObserved }));
  expect(result.state.status).toBe('complete');
  expect(result.state.collected).toEqual(['escher-a', 'escher-b', 'escher-c']);
  expect(result.observed.wall).toBe(true);
  expect(result.observed.ceiling).toBe(true);
  expect(result.observed.maxAngle).toBeGreaterThan(2.8);
});

test('Hanging Garden crosses the swing gap in the browser', async ({ page }) => {
  test.setTimeout(40_000);
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).__NEWTON__));
  await page.evaluate(() => (window as any).__NEWTON__.load(2));
  await page.evaluate(() => {
    const api = (window as any).__NEWTON__;
    const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
    let last = api.snapshot();
    (window as any).__gardenObserved = { crossedGap: false, nearSwing: false };
    const interval = setInterval(() => {
      const state = api.snapshot();
      const observed = (window as any).__gardenObserved;
      observed.crossedGap ||= state.bike.x > 6.2 && state.bike.x < 9 && state.bike.y > -1;
      const swing = state.bodies.find((body: any) => body.id === 'garden-swing');
      const wheels = state.bodies.filter((body: any) => body.kind === 'wheel');
      if (swing && state.bike.x > 6.2 && state.bike.x < 9) observed.nearSwing ||= wheels.some((wheel: any) =>
        Math.abs(wheel.x - swing.x) < swing.w / 2 + .4 && Math.abs(wheel.y - swing.y) < .8);
      if (state.status !== 'playing') { clearInterval(interval); api.tilt(0); return; }
      const dt = state.elapsed - last.elapsed;
      if (dt <= 0) return;
      const velocity = (state.bike.x - last.bike.x) / dt;
      const target = clamp((1.6 - velocity) * .14, -.25, .48);
      api.tilt(clamp((target - state.worldAngle) * 8, -1, 1));
      last = state;
    }, 30);
  });
  await page.waitForFunction(() => (window as any).__NEWTON__.snapshot().status !== 'playing', undefined, { timeout: 32_000 });
  const result = await page.evaluate(() => ({ state: (window as any).__NEWTON__.snapshot(),
    observed: (window as any).__gardenObserved }));
  expect(result.state.status).toBe('complete');
  expect(result.state.collected).toEqual(['garden-a', 'garden-b', 'garden-c']);
  expect(result.observed.crossedGap).toBe(true);
  expect(result.observed.nearSwing).toBe(true);
});

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

test('Pendulum Mill crosses both swing gaps in the browser', async ({ page }) => {
  test.setTimeout(40_000);
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).__NEWTON__));
  await page.evaluate(() => (window as any).__NEWTON__.load(3));
  await page.evaluate(() => {
    const api = (window as any).__NEWTON__;
    const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
    let last = api.snapshot();
    (window as any).__millObserved = { short: false, long: false };
    const interval = setInterval(() => {
      const state = api.snapshot();
      const observed = (window as any).__millObserved;
      observed.short ||= state.bike.x > 6.2 && state.bike.x < 9 && state.bike.y > -1;
      observed.long ||= state.bike.x > 12 && state.bike.x < 16 && state.bike.y > -1;
      if (state.status !== 'playing') { clearInterval(interval); api.tilt(0); return; }
      const dt = state.elapsed - last.elapsed;
      if (dt <= 0) return;
      const velocity = (state.bike.x - last.bike.x) / dt;
      const target = clamp((1.6 - velocity) * .14, -.25, .48);
      api.tilt(clamp((target - state.worldAngle) * 8, -1, 1));
      last = state;
    }, 30);
  });
  await page.waitForFunction(() => (window as any).__NEWTON__.snapshot().status !== 'playing', undefined, { timeout: 32_000 });
  const result = await page.evaluate(() => ({ state: (window as any).__NEWTON__.snapshot(),
    observed: (window as any).__millObserved }));
  expect(result.state.status).toBe('complete');
  expect(result.state.collected).toEqual(['mill-a', 'mill-b', 'mill-c']);
  expect(result.observed.short).toBe(true);
  expect(result.observed.long).toBe(true);
});

test('Gravity Engine combines swing crossing with the wall turn in the browser', async ({ page }) => {
  test.setTimeout(40_000);
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).__NEWTON__));
  await page.evaluate(() => (window as any).__NEWTON__.load(8));
  await page.evaluate(() => {
    const api = (window as any).__NEWTON__;
    const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
    let last = api.snapshot();
    let stage = 0;
    (window as any).__engineObserved = { swingGap: false, wall: false };
    const interval = setInterval(() => {
      const state = api.snapshot();
      const observed = (window as any).__engineObserved;
      observed.swingGap ||= state.bike.x > 6.5 && state.bike.x < 9.8 && state.bike.y > -1;
      observed.wall ||= state.worldAngle > 1.4 && state.collected.includes('engine-c');
      if (state.status !== 'playing') { clearInterval(interval); api.tilt(0); return; }
      const dt = state.elapsed - last.elapsed;
      if (dt <= 0) return;
      const velocity = (state.bike.x - last.bike.x) / dt;
      if (stage === 0 && state.bike.x > 17.4) stage = 1;
      if (stage === 1 && state.bike.y > 1.7) stage = 2;
      const target = stage === 0 ? clamp((1.6 - velocity) * .16, -.2, .25)
        : stage === 1 ? Math.PI / 2 : Math.PI;
      api.tilt(clamp((target - state.worldAngle) * 7, -1, 1));
      last = state;
    }, 30);
  });
  await page.waitForFunction(() => (window as any).__NEWTON__.snapshot().status !== 'playing', undefined, { timeout: 32_000 });
  const result = await page.evaluate(() => ({ state: (window as any).__NEWTON__.snapshot(),
    observed: (window as any).__engineObserved }));
  expect(result.state.status).toBe('complete');
  expect(result.state.collected).toEqual(['engine-a', 'engine-b', 'engine-c']);
  expect(result.observed.swingGap).toBe(true);
  expect(result.observed.wall).toBe(true);
});
