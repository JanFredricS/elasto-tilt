import { expect, it } from 'vitest';
import { carriedTravel, RouteClock } from '../src/physics-time';
it('preserves equal route distance at unequal speeds and settles back to its initial phase', () => {
  const slow = new RouteClock(), fast = new RouteClock();
  for (const clock of [slow, fast]) { clock.advance(2, 10, 10, 1 / 120); for (let i = 0; i < 120; i++) clock.advance(0, 10, 10, 1 / 120); }
  for (let i = 0; i < 300; i++) slow.advance(.01, 10, 10, 1 / 120);
  for (let i = 0; i < 30; i++) fast.advance(.1, 10, 10, 1 / 120);
  expect(fast.target).toBeCloseTo(slow.target, 8);
  expect(fast.phase).toBeLessThan(fast.target); // Explicit bounded catchup after stopping.
  for (let i = 0; i < 300; i++) fast.advance(-.01, 10, 10, 1 / 120);
  for (let i = 0; i < 30; i++) slow.advance(-.1, 10, 10, 1 / 120);
  for (let i = 0; i < 500; i++) for (const clock of [slow, fast]) clock.advance(0, 10, 10, 1 / 120);
  expect(fast.phase).toBeCloseTo(.2, 8); expect(slow.phase).toBeCloseTo(.2, 8);
});
it('does not fabricate reverse travel during first contact, slipping, or opposite rider motion', () => {
  expect(carriedTravel(.01, .02, false)).toBe(0);
  expect(carriedTravel(0, .02, true)).toBe(0);
  expect(carriedTravel(.005, .02, true)).toBe(.005);
  expect(carriedTravel(-.005, .02, true)).toBe(0);
  expect(carriedTravel(.03, .02, true)).toBe(.02);
});
