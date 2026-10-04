import { test, expect, type Page } from '@playwright/test';

const boot = async (page: Page) => {
  await page.goto('/');
  await page.getByRole('button', { name: /LET’S RIDE/ }).click();
};
const status = (page: Page) => page.evaluate(() => (window as any).__NEWTON__.state().status);

test('desktop hides touch buttons and keeps keyboard riding at narrow widths', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 650 });
  await boot(page);
  for (const selector of ['[data-hold="brake"]', '[data-hold="left"]', '[data-hold="right"]', '[data-action="motion"]', '[data-action="calibrate"]']) {
    await expect(page.locator(selector)).toBeHidden();
  }
  await expect(page.locator('.control-hint')).toBeVisible();
  await expect(page.getByRole('button', { name: 'View whole map' })).toBeVisible();
  await page.keyboard.down('KeyD');
  await expect.poll(() => page.evaluate(() => (window as any).__NEWTON__.snapshot().worldAngle)).toBeGreaterThan(.15);
  await page.keyboard.up('KeyD');
});

test.describe('iPhone landscape', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 844, height: 390 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1' });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(document, 'fullscreenEnabled', { value: false, configurable: true }));
  });
  test('native scroll guide pauses, permits swiping and resumes without repeating', async ({ page }) => {
    await boot(page);
    await expect(page.getByRole('heading', { name: 'Swipe up for more screen' })).toBeVisible();
    await expect.poll(() => status(page)).toBe('paused');
    expect(await page.locator('#ui').evaluate(el => el.inert)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 100)).toBe(true);
    // Exercise Chromium's native touch scrolling, not an injected scroll position.
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 100, y: 280 }] });
    for (const y of [240, 190, 140, 80]) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 100, y }] });
      await page.waitForTimeout(30);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
    await page.screenshot({ path: 'test-results/iphone-screen-guide.png' });
    await page.getByRole('button', { name: 'CONTINUE', exact: true }).click();
    await expect.poll(() => status(page)).toBe('playing');
    await expect(page.getByRole('button', { name: 'Hold to brake' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ENABLE MOTION' })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('html')).not.toHaveClass(/iphone-screen-scroll/);
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('.screen-guide')).toBeHidden();
    await page.getByRole('button', { name: 'SCREEN', exact: true }).click();
    await expect(page.locator('.screen-guide')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect.poll(() => status(page)).toBe('playing');
    await page.screenshot({ path: 'test-results/iphone-screen-game.png' });
  });
  test('installed web app skips Safari guidance', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
    await boot(page);
    await expect(page.locator('.screen-guide')).toBeHidden();
    await expect(page.getByRole('button', { name: 'SCREEN', exact: true })).toBeHidden();
    await expect.poll(() => status(page)).toBe('playing');
  });
  for (const rejected of [false, true]) {
    test(`fullscreen API ${rejected ? 'failure offers escape' : 'success resumes'}`, async ({ page }) => {
      await page.addInitScript(fail => {
        Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
        Element.prototype.requestFullscreen = async () => {
          (window as any).fullscreenCalls = ((window as any).fullscreenCalls || 0) + 1;
          if (fail) throw new Error('not supported');
        };
      }, rejected);
      await boot(page);
      await page.getByRole('button', { name: 'CONTINUE', exact: true }).click();
      expect(await page.evaluate(() => (window as any).fullscreenCalls)).toBe(1);
      if (rejected) {
        await expect.poll(() => status(page)).toBe('paused');
        await page.getByRole('button', { name: 'KEEP PLAYING', exact: true }).click();
      }
      await expect.poll(() => status(page)).toBe('playing');
    });
  }
});
