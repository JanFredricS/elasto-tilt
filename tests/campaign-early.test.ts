import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { earlyLevels, createEarlyReplayPilot } from '../src/levels/early';
import type { Controls } from '../src/types';


it.each(earlyLevels.map((level, index) => ({ level, index })))('completes the authored route in $level.name with actual Rapier controls', async ({ level, index }) => {
  const game = await createPhysics(); game.load(level);
  const pilot = createEarlyReplayPilot(index);
  let state = game.snapshot(), distance = 0, last = state.bike;
  let brakes = 0, minY = state.bike.y, maxY = state.bike.y;
  const touchedSwings = new Set<string>();
  for (let i = 0; i < 120 * 160 && state.status === 'playing'; i++) {
    const control = pilot(state); brakes += Number(control.brake);
    state = game.step(1 / 120, control);
    minY = Math.min(minY, state.bike.y); maxY = Math.max(maxY, state.bike.y);
    for (const deck of state.bodies.filter(body => body.kind === 'swing')) {
      for (const wheel of state.bodies.filter(body => body.kind === 'wheel')) {
        const dx = wheel.x - deck.x, dy = wheel.y - deck.y;
        const localX = dx * Math.cos(deck.angle) + dy * Math.sin(deck.angle);
        const localY = -dx * Math.sin(deck.angle) + dy * Math.cos(deck.angle);
        if (Math.abs(localX) < deck.w / 2 && Math.abs(localY - .46) < .07) touchedSwings.add(deck.id);
      }
    }
    distance += Math.hypot(state.bike.x - last.x, state.bike.y - last.y); last = state.bike;
  }
  game.destroy();
  expect(state.status).toBe('complete');
  expect(state.collected).toHaveLength(level.apples.length);
  expect(distance).toBeGreaterThan(60);
  expect(state.elapsed).toBeGreaterThan(index === 0 ? 30 : 45);
  expect(state.elapsed).toBeLessThan(100);
  expect(maxY - minY).toBeGreaterThan(4);
  if (index < 3) expect(brakes).toBeGreaterThan(0);
  expect([...touchedSwings].sort()).toEqual((level.swings ?? []).map(swing => swing.id).sort());
});

it.each(earlyLevels)('$name cannot be completed by doing nothing or holding full tilt', async level => {
  const inputs: Controls[] = [
    { tilt: 0, brake: false }, { tilt: 1, brake: false }, { tilt: -1, brake: false },
    { tilt: 0, brake: false, worldAngle: Math.PI / 2 },
    { tilt: 0, brake: false, worldAngle: -Math.PI / 2 },
    { tilt: 0, brake: false, worldAngle: .5 },
  ];
  for (const controls of inputs) {
    const game = await createPhysics(); game.load(level);
    let state = game.snapshot();
    for (let i = 0; i < 120 * 20 && state.status === 'playing'; i++) state = game.step(1 / 120, controls);
    game.destroy(); expect(state.status).not.toBe('complete');
  }
});
