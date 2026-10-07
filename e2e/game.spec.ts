import { levels } from '../src/levels';
import { test, expect } from '@playwright/test';

test('boots, runs real physics, pauses, and resets without browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?debug');
  await page.waitForFunction(() => Boolean((window as any).__NEWTON__));
  await expect(page.locator('canvas')).toBeVisible();
  await page.evaluate(() => (window as any).__NEWTON__.load(0));
  await page.waitForTimeout(300);
  const initial = await page.evaluate(() => (window as any).__NEWTON__.snapshot());
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(550);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(900);
  const moved = await page.evaluate(() => (window as any).__NEWTON__.snapshot());
  expect(moved.worldAngle).toBeGreaterThan(initial.worldAngle + 0.2);
  expect(moved.bike.x).toBeGreaterThan(initial.bike.x + 0.15);
  await page.keyboard.press('Escape');
  const paused = await page.evaluate(() => (window as any).__NEWTON__.snapshot().elapsed);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).__NEWTON__.snapshot().elapsed)).toBe(paused);
  await page.keyboard.press('KeyR');
  expect(await page.evaluate(() => (window as any).__NEWTON__.snapshot().collected.length)).toBe(0);
  expect(errors).toEqual([]);
});

test('each map loads with finite bodies and survives an idle second', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).__NEWTON__));
  for (let i = 0; i < levels.length; i++) {
    await page.evaluate(index => (window as any).__NEWTON__.load(index), i);
    await page.waitForTimeout(1000);
    const state = await page.evaluate(() => (window as any).__NEWTON__.snapshot());
    expect(state.status, `map ${i + 1} idle spawn`).toBe('playing');
    for (const body of state.bodies) expect(Number.isFinite(body.x + body.y + body.angle)).toBe(true);
  }
});

test.describe('touch controls', () => {
  test.use({ hasTouch: true });
test('visible start, touch release, campaign return and debug toggle work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /LET’S RIDE/ }).click();
  await expect(page.getByRole('button', { name: 'Hold to brake' })).toBeVisible();
  const right = page.getByRole('button', { name: 'Tilt world right' });
  await right.hover();
  await page.mouse.down();
  await page.waitForTimeout(200);
  await right.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => (window as any).__NEWTON__.snapshot().worldAngle);
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => (window as any).__NEWTON__.snapshot().worldAngle);
  expect(Math.abs(after - before)).toBeLessThan(.01);
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.getByRole('button', { name: 'CHOOSE MAP' }).click();
  await expect(page.getByRole('heading', { name: /Newton’s/ })).toBeVisible();
  await page.getByRole('button', { name: /LET’S RIDE/ }).click();
  await page.keyboard.press('KeyF');
  await expect(page.getByText('PERFORMANCE', { exact: true })).toBeVisible();
});

});

test('finishing the First Lesson unlocks Newton’s Orchard and persists across reload', async ({ page }) => {
  test.setTimeout(110_000);
  await page.goto('/');
  await page.getByRole('button', { name: /LET’S RIDE/ }).click();
  // The first map alone states the objective for its first 8 s.
  await expect(page.locator('[data-ui="mechanic"]')).toHaveText('Collect every apple, then return to the door.');
  await page.evaluate(async () => {
    const path = '/src/dev/replay.ts';
    const { createReplayPilot } = await import(/* @vite-ignore */ path);
    const api = (window as any).__NEWTON__;
    api.drive(createReplayPilot(0));
  });
  await expect(page.getByRole('button', { name: /NEXT ROOM/ })).toBeVisible({ timeout: 100_000 });
  const complete = await page.evaluate(() => (window as any).__NEWTON__.snapshot());
  expect(complete.status).toBe('complete');
  expect(complete.collected).toHaveLength(3);
  expect(complete.elapsed).toBeGreaterThan(8);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('newtons-ride.progress.v1')!).unlocked)).toBe(2);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Play Newton’s Orchard', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'One Wheel Wonder, locked', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Play Newton’s Orchard', exact: true }).click();
  await page.waitForTimeout(300);
  await expect(page.locator('[data-ui="mechanic"]')).toBeHidden(); // later maps: no objective line
});

for (const [name, width, height] of [['landscape', 844, 390], ['portrait', 390, 844], ['desktop', 1440, 900]] as const) {
  test(`${name} layout keeps controls within viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/?debug');
    await page.waitForFunction(() => Boolean((window as any).__NEWTON__));
    await page.screenshot({ path: `test-results/${name}-menu.png` });
    await page.evaluate(() => (window as any).__NEWTON__.load(0));
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/${name}-game.png` });
    const buttons = page.getByRole('button');
    for (let i = 0; i < await buttons.count(); i++) {
      if (!await buttons.nth(i).isVisible()) continue;
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(-1);
        expect(box.y).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
        expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
      }
    }
  });
}
