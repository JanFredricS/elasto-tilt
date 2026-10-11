import { expect, test } from '@playwright/test';
import { levels } from '../src/levels';

// Looked up by id, so inserting a map does not shift this test onto a neighbour.
const ESCHER = levels.findIndex(level => level.id === 'eschers-orchard');

test.use({ hasTouch: true });
test('Escher shows its low tunnel and completes the four curved gravity faces on phone', async ({ page }) => {
  test.setTimeout(105_000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).__NEWTON__));
  await page.evaluate(index => (window as any).__NEWTON__.load(index), ESCHER);
  await page.waitForTimeout(150);
  await page.screenshot({ path: 'test-results/escher-tunnel-portrait.png' });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(async index => {
    const { createReplayPilot } = await import('/src/dev/replay.ts');
    const api = (window as any).__NEWTON__;
    api.load(index);
    api.drive(createReplayPilot(index));
  }, ESCHER);
  await page.screenshot({ path: 'test-results/escher-tunnel-landscape.png' });
  for (const [name, angle] of [['first-bend', .8], ['ceiling', 3.2], ['return-bend', 5.5]] as const) {
    await page.waitForFunction(target => {
      const api = (window as any).__NEWTON__;
      return api.snapshot().worldAngle >= target || api.state().status !== 'playing';
    }, angle, { timeout: 85_000 });
    expect(await page.evaluate(() => (window as any).__NEWTON__.state().status)).toBe('playing');
    await page.screenshot({ path: `test-results/escher-tunnel-${name}.png` });
  }
  await expect.poll(() => page.evaluate(() => (window as any).__NEWTON__.state().status), { timeout: 40_000 }).toBe('complete');
  expect(await page.evaluate(() => (window as any).__NEWTON__.snapshot().collected.length)).toBe(8);
  expect(errors).toEqual([]);
});
