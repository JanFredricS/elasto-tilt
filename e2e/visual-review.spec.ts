import { expect, test } from '@playwright/test';

test('Clockwork timeline and utilities occupy separate rows on narrow landscape', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto('/?debug');
  await page.waitForFunction(() => Boolean((window as any).__NEWTON__));
  await page.evaluate(() => (window as any).__NEWTON__.load(11));
  const timeline = page.locator('[data-ui="timeline-wrap"]');
  const utility = page.locator('[data-ui="utility"]');
  await expect(timeline).toBeVisible();
  await expect(utility).toBeVisible();
  const a = await timeline.boundingBox();
  const b = await utility.boundingBox();
  expect(a && b).toBeTruthy();
  if (a && b) expect(a.y + a.height).toBeLessThanOrEqual(b.y);
});

test('renderer disposes its canvas after repeated annotated map loads', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).__NEWTON__));
  const result = await page.evaluate(async () => {
    const { createRenderer } = await import('/src/renderer.ts');
    const { createPhysics } = await import('/src/physics.ts');
    const { levels } = await import('/src/levels.ts');
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;width:320px;height:200px;right:0;bottom:0;opacity:0;pointer-events:none';
    document.body.appendChild(host);
    const before = document.querySelectorAll('canvas').length;
    const renderer = await createRenderer(host);
    const created = host.querySelectorAll('canvas').length;
    const physics = await createPhysics();
    for (const index of [11, 13, 11]) {
      physics.load(levels[index]);
      renderer.load(levels[index]);
      renderer.render(physics.snapshot(), 1 / 60);
    }
    renderer.resize();
    renderer.destroy();
    physics.destroy();
    const removed = host.querySelectorAll('canvas').length;
    const after = document.querySelectorAll('canvas').length;
    host.remove();
    return { before, created, removed, after };
  });
  expect(result).toEqual({ before: 1, created: 1, removed: 0, after: 1 });
});
