import { test, expect } from '@playwright/test';

test.use({ hasTouch: true });

for (const [width, height] of [[390, 844], [844, 390], [1280, 800]]) {
  test(`whole-map view pauses the ride and returns safely at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.getByRole('button', { name: /LET’S RIDE/ }).click();
    await page.getByRole('button', { name: 'View whole map' }).click();
    const before = await page.evaluate(() => (window as any).__NEWTON__.snapshot().elapsed);
    await expect(page.getByRole('button', { name: 'Hold to brake' })).toBeHidden();
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => (window as any).__NEWTON__.snapshot().elapsed)).toBe(before);
    await page.getByRole('button', { name: 'Return to riding' }).click();
    await expect(page.getByRole('button', { name: 'Hold to brake' })).toBeVisible();
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => (window as any).__NEWTON__.snapshot().elapsed)).toBeGreaterThan(before);
    // Ignore keyboard auto-repeat; a held shortcut must not advance a paused ride.
    await page.keyboard.press('KeyM');
    const stopped = await page.evaluate(() => (window as any).__NEWTON__.snapshot().elapsed);
    await page.evaluate(() => {
      for (let n = 0; n < 3; n++) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM', repeat: true }));
    });
    await page.waitForTimeout(150);
    await expect(page.getByRole('button', { name: 'Return to riding' })).toBeVisible();
    expect(await page.evaluate(() => (window as any).__NEWTON__.snapshot().elapsed)).toBe(stopped);
  });
}

test('Escher overview shows the nested route without covering controls', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).__NEWTON__));
  await page.evaluate(() => (window as any).__NEWTON__.load(6));
  await page.getByRole('button', { name: 'View whole map' }).click();
  await page.screenshot({ path: 'docs/evidence/v2-escher-overview.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /KEEP RIDING/ }).click();
  await expect(page.getByRole('button', { name: 'View whole map' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hold to brake' })).toBeVisible();
});
