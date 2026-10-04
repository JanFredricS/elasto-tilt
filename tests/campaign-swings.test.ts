import { expect, it } from 'vitest';
import { levels } from '../src/levels';
import { createPhysics } from '../src/physics';
import { createReplayPilot } from '../src/dev/replay';
import type { Controls } from '../src/types';

// The ordinary campaign replays prove these pilots complete with the decks.
// Removing one deck changes geometry only; replay the exact successful inputs
// so a controller waiting for a missing object cannot fake a failed crossing.
it.each([
  { index: 2, id: 'garden-swing' },
  { index: 3, id: 'mill-short' },
  { index: 3, id: 'mill-long' },
  { index: 8, id: 'engine-swing' },
])('the demonstrated route needs the $id seat to cross its gap', async ({ index, id }) => {
  const level = levels[index];
  const removed = level.swings!.find(s => s.id === id)!;
  const game = await createPhysics();
  game.load(level);
  const pilot = createReplayPilot(index);
  const inputs: Controls[] = [];
  let state = game.snapshot();
  for (let n = 0; n < 120 * 100 && state.status === 'playing'; n++) {
    const input = pilot(state);
    inputs.push(input);
    state = game.step(1 / 120, input);
  }
  expect(state.status).toBe('complete');
  game.load({ ...level, swings: level.swings!.filter(s => s.id !== id) });
  state = game.snapshot();
  for (const input of inputs) {
    if (state.status !== 'playing') break;
    state = game.step(1 / 120, input);
  }
  game.destroy();
  expect(state.status).toBe('crashed');
  expect(Math.abs(state.bike.x - removed.anchor.x)).toBeLessThan(3);
  expect(state.collected.length).toBeLessThan(level.apples.length);
});
