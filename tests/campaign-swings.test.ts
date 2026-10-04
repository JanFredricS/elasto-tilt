import { expect, it } from 'vitest';
import { levels } from '../src/levels';
import { createPhysics } from '../src/physics';
import { createReplayPilot } from '../src/dev/replay';

// The ordinary campaign replays prove these pilots complete with the decks.
// Removing one deck changes geometry only; the same input policy must fail.
it.each([
  { index: 2, id: 'garden-swing' },
  { index: 3, id: 'mill-short' },
  { index: 3, id: 'mill-long' },
  { index: 8, id: 'engine-swing' },
])('the demonstrated route needs the $id seat to cross its gap', async ({ index, id }) => {
  const level = levels[index];
  const removed = level.swings!.find(s => s.id === id)!;
  const game = await createPhysics();
  game.load({ ...level, swings: level.swings!.filter(s => s.id !== id) });
  const pilot = createReplayPilot(index);
  let state = game.snapshot();
  for (let n = 0; n < 120 * 100 && state.status === 'playing'; n++) {
    state = game.step(1 / 120, pilot(state));
  }
  game.destroy();
  expect(state.status).toBe('crashed');
  expect(Math.abs(state.bike.x - removed.anchor.x)).toBeLessThan(3);
  expect(state.collected.length).toBeLessThan(level.apples.length);
});
