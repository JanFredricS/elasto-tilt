import { expect, test } from '@playwright/test';

test('Hanging Garden carries the rider across the widened gap and back', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?debug');
  await page.waitForFunction(() => Boolean((window as any).__NEWTON__));
  await page.evaluate(async () => {
    const { createReplayPilot } = await import('/src/dev/replay.ts');
    const api = (window as any).__NEWTON__;
    api.load(10);
    const pilot = createReplayPilot(10);
    const trace = { supportedMinX: Infinity, supportedMaxX: -Infinity, brakeSeconds: 0,
      outboundTravel: 0, returnTravel: 0, peakPhysicsMs: 0 };
    (window as any).__gardenTrace = trace;
    let rideStartX: number | undefined;
    let returnRide = false;
    api.drive((state: any) => {
      const controls = pilot(state);
      const deck = state.bodies.find((body: any) => body.id === 'garden-swing');
      const onDeck = deck && state.bodies.filter((body: any) => body.kind === 'wheel').every((wheel: any) => {
        const dx = wheel.x - deck.x, dy = wheel.y - deck.y;
        const x = dx * Math.cos(deck.angle) + dy * Math.sin(deck.angle);
        const y = -dx * Math.sin(deck.angle) + dy * Math.cos(deck.angle);
        return Math.abs(x) < deck.w / 2 && Math.abs(y - .46) < .09;
      });
      if (onDeck) {
        trace.supportedMinX = Math.min(trace.supportedMinX, deck.x);
        trace.supportedMaxX = Math.max(trace.supportedMaxX, deck.x);
        if (controls.brake) trace.brakeSeconds += 1 / 120;
        const returning = state.collected.length === 5;
        if (rideStartX === undefined || returning !== returnRide) rideStartX = deck.x;
        returnRide = returning;
        if (returning) trace.returnTravel = Math.max(trace.returnTravel, rideStartX - deck.x);
        else trace.outboundTravel = Math.max(trace.outboundTravel, deck.x - rideStartX);
      } else rideStartX = undefined;
      trace.peakPhysicsMs = Math.max(trace.peakPhysicsMs, state.physicsMs);
      return controls;
    });
  });
  await page.waitForFunction(() => (window as any).__gardenTrace.brakeSeconds > .3 ||
    (window as any).__NEWTON__.snapshot().status !== 'playing', undefined, { timeout: 90_000 });
  await page.screenshot({ path: 'docs/evidence/garden-swing-crossing.png' });
  await page.waitForFunction(() => (window as any).__NEWTON__.snapshot().status !== 'playing',
    undefined, { timeout: 150_000 });
  const { state, trace } = await page.evaluate(() => ({ state: (window as any).__NEWTON__.snapshot(),
    trace: (window as any).__gardenTrace }));
  expect(state.status, JSON.stringify(trace)).toBe('complete');
  expect(state.collected).toHaveLength(5);
  expect(trace.supportedMaxX - trace.supportedMinX).toBeGreaterThan(3);
  expect(trace.outboundTravel).toBeGreaterThan(3);
  expect(trace.returnTravel).toBeGreaterThan(3);
  expect(trace.brakeSeconds).toBeGreaterThan(1);
  expect(errors).toEqual([]);
  console.log('Hanging Garden rendered crossing', JSON.stringify({ elapsed: state.elapsed, ...trace }));
});
