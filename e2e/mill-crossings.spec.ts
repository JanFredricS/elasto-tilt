import { expect, test } from '@playwright/test';

test.use({ hasTouch: true, viewport: { width: 844, height: 390 } });
test('Mill carries the braked rider on both cradles before the ceiling return', async ({ page }) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).__NEWTON__));
  await page.evaluate(async () => {
    const { createReplayPilot } = await import('/src/dev/replay.ts');
    const api = (window as any).__NEWTON__;
    api.load(2);
    const pilot = createReplayPilot(2);
    const trace = Object.fromEntries(['mill-short', 'mill-long'].map(id => [id,
      { start: null as number | null, travel: 0, brakeSeconds: 0 }]));
    (window as any).__millTrace = trace;
    api.drive((state: any) => {
      const controls = pilot(state);
      for (const [id, entry] of Object.entries(trace)) {
        const deck = state.bodies.find((body: any) => body.id === id);
        const onDeck = state.bodies.filter((body: any) => body.kind === 'wheel').every((wheel: any) => {
          const dx = wheel.x - deck.x, dy = wheel.y - deck.y;
          const localX = dx * Math.cos(deck.angle) + dy * Math.sin(deck.angle);
          const localY = -dx * Math.sin(deck.angle) + dy * Math.cos(deck.angle);
          return Math.abs(localX) < deck.w / 2 && Math.abs(localY - .46) < .09;
        });
        if (onDeck) {
          entry.start ??= deck.x;
          entry.travel = Math.max(entry.travel, deck.x - entry.start);
          if (controls.brake) entry.brakeSeconds += 1 / 120;
        } else entry.start = null;
      }
      return controls;
    });
  });
  for (const id of ['mill-short', 'mill-long']) {
    await page.waitForFunction(id => (window as any).__millTrace[id].brakeSeconds > .3 ||
      (window as any).__NEWTON__.state().status !== 'playing', id, { timeout: 90_000 });
    expect(await page.evaluate(() => (window as any).__NEWTON__.state().status)).toBe('playing');
    await page.screenshot({ path: `docs/evidence/${id}-crossing.png` });
  }
  await page.waitForFunction(() => (window as any).__NEWTON__.state().status !== 'playing', undefined, { timeout: 90_000 });
  const result = await page.evaluate(() => ({ state: (window as any).__NEWTON__.snapshot(), trace: (window as any).__millTrace }));
  expect(result.state.status).toBe('complete');
  expect(result.state.collected).toHaveLength(6);
  for (const entry of Object.values(result.trace) as { travel: number; brakeSeconds: number }[]) {
    expect(entry.travel).toBeGreaterThan(1.2);
    expect(entry.brakeSeconds).toBeGreaterThan(.5);
  }
  expect(errors).toEqual([]);
  console.log('Rendered mill crossings', JSON.stringify({ elapsed: result.state.elapsed, trace: result.trace }));
});
