import { test, expect } from '@playwright/test';
import { bankOffset } from '../src/input';

test.use({ hasTouch: true });

test('phone tilt wakes a resting bike, holds an angle, and returns to level', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', { value: async () => 'granted', configurable: true });
    Object.defineProperty(screen.orientation, 'angle', { value: 0, configurable: true });
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /LET’S RIDE/ }).click();
  await page.getByRole('button', { name: 'Enable motion' }).click();
  // A phone held tilted back 30° from upright, turned `bank` degrees clockwise
  // about its screen normal like a steering wheel (flat poses freeze by design).
  const pose = (bank: number) => page.evaluate(b => {
    const deg = Math.PI / 180, p = 30 * deg, t = b * deg;
    const beta = Math.asin(Math.cos(p) * Math.cos(t)) / deg;
    const gamma = Math.atan2(Math.cos(p) * Math.sin(t), Math.sin(p)) / deg;
    window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta, gamma }));
  }, bank);
  await pose(0);
  // Reproduce the report: the player waits long enough for Rapier to sleep.
  await page.waitForTimeout(10_000);
  const resting = await page.evaluate(() => (window as any).__NEWTON__.snapshot());
  await pose(5);
  await page.waitForTimeout(1500);
  const tilted = await page.evaluate(() => (window as any).__NEWTON__.snapshot());
  expect(tilted.status).toBe('playing');
  expect(tilted.worldAngle).toBeCloseTo(bankOffset(5), 3);
  expect(tilted.bike.x - resting.bike.x).toBeGreaterThan(.1);
  // A single stable sample must hold its angle, even if the sensor goes quiet.
  await page.waitForTimeout(1500);
  const held = await page.evaluate(() => (window as any).__NEWTON__.snapshot());
  expect(held.worldAngle).toBeCloseTo(tilted.worldAngle, 3);
  expect(held.bike.x).toBeGreaterThan(tilted.bike.x + .2);
  await pose(0);
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => (window as any).__NEWTON__.snapshot().worldAngle)).toBeCloseTo(0, 3);
  await pose(5);
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'CALIBRATE', exact: true }).click();
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => (window as any).__NEWTON__.snapshot().worldAngle)).toBeCloseTo(0, 3);
  await page.screenshot({ path: 'test-results/motion-after-idle.png' });
  expect(errors).toEqual([]);
});
