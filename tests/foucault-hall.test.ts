import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import {
  createFoucaultPilot, FOUCAULT as F, FOUCAULT_LAYOUT as LAYOUT, foucaultHallLevel as level, type FoucaultStage,
} from '../src/levels/foucault-hall';
import { levels } from '../src/levels';
import { createReplayPilot } from '../src/dev/replay';
import type { Controls, Level, Snapshot } from '../src/types';

async function ride(pilot: (state: Snapshot) => Controls, seconds = 75, map: Level = level, watch?: (state: Snapshot) => void) {
  const game = await createPhysics(); game.load(map);
  let state = game.snapshot();
  for (let i = 0; i < 120 * seconds && state.status === 'playing'; i++) { state = game.step(1 / 120, pilot(state)); watch?.(state); }
  game.destroy();
  return state;
}

/** The deck's west top corner when it is turned `theta`. */
const westCorner = (swing: { anchor: { x: number; y: number }; length: number; width: number }, theta: number) => ({
  x: swing.anchor.x + Math.sin(theta) * swing.length - Math.sin(theta) * .12 - Math.cos(theta) * swing.width / 2,
  y: swing.anchor.y - Math.cos(theta) * swing.length + Math.cos(theta) * .12 - Math.sin(theta) * swing.width / 2,
});

it('hangs three free cradle decks of 4, 6 and 8 m over water, between Hanging Garden and Clockwork Apple', () => {
  expect(levels[12]).toBe(level);
  expect(levels[11].id).toBe('hanging-garden');
  expect(levels[13].id).toBe('clockwork-apple');
  expect(typeof createReplayPilot(12)).toBe('function');
  expect(level.swings!.map(s => s.length)).toEqual([4, 6, 8]);
  for (const swing of level.swings!) {
    expect(swing.width).toBeGreaterThanOrEqual(2.7); expect(swing.width).toBeLessThanOrEqual(3);
    expect(Math.abs(swing.angle!)).toBeCloseTo(.6, 9);
  }
  expect(level.surfaces.filter(s => s.kind === 'hazard')).toHaveLength(3);
  expect(level.apples).toHaveLength(3);
  expect(level.spawn).toEqual({ x: 0, y: .72 });
});

it('builds each stop so a deck lying against it continues the bank with a 2 cm joint', () => {
  LAYOUT.swings.forEach((swing, i) => {
    const corner = westCorner(swing, -F.reach), lip = LAYOUT.lips[i].depart;
    expect(Math.hypot(corner.x - lip.x, corner.y - lip.y)).toBeCloseTo(F.gap, 6);
    // The stop's top block is pitched like the deck at the stop.
    const stop = level.surfaces.find(s => s.id === `foucault-stop-${i}`)!;
    expect(stop.angle).toBeCloseTo(-F.reach, 6);
    // The apple hangs above the deck's far apex.
    const apple = level.apples[i];
    expect(apple.x).toBeGreaterThan(swing.anchor.x);
  });
});

it('completes Foucault’s Hall: boarding each deck against its stop and stepping off at its far apex', async () => {
  const stages: string[] = [];
  const pilot = createFoucaultPilot({}, (stage: FoucaultStage, leg: number) => stages.push(`${stage}/${leg}`));
  const state = await ride(pilot, 75);
  expect(state.status).toBe('complete');
  expect(state.collected.sort()).toEqual(level.apples.map(apple => apple.id).sort());
  expect(state.elapsed).toBeLessThan(60);
  for (const leg of [0, 1, 2]) for (const stage of ['board', 'ride', 'catch', 'leave', 'land']) expect(stages).toContain(`${stage}/${leg}`);
  expect(createReplayPilot(12)).toBeTypeOf('function');
}, 120_000);

it('needs input: idle or holding the brake never reaches the door', async () => {
  const idle = await ride(() => ({ tilt: 0, brake: false }), 60);
  expect(idle.status).not.toBe('complete');
  const braked = await ride(() => ({ tilt: 0, brake: true }), 60);
  expect(braked.status).not.toBe('complete');
  expect(braked.collected).toHaveLength(0);
}, 120_000);

it('needs timing: boarding the first deck half a period late drops the bike into the water', async () => {
  const state = await ride(createFoucaultPilot({ lead: [.347, 2.4, 2.4] }), 30);
  expect(state.status).toBe('crashed');
  expect(state.collected).toHaveLength(0);
}, 120_000);

it('needs the swings: without them, or with them frozen against their stops, the same pilot fails', async () => {
  // With no deck there is nothing to board: the pilot waits at the first ramp for a swing that never comes.
  const bare = await ride(createFoucaultPilot(), 60, { ...level, swings: [] });
  expect(bare.status).not.toBe('complete');
  expect(bare.collected).toHaveLength(0);
  const frozen = await ride(createFoucaultPilot(), 60,
    { ...level, swings: level.swings!.map(s => ({ ...s, angle: -F.reach, damping: 1000 })) });
  expect(frozen.status).not.toBe('complete');
  expect(frozen.collected.length).toBeLessThan(level.apples.length);
}, 120_000);

it('keeps usable amplitude for a minute: every deck left alone still swings out to its stop', async () => {
  const ids = level.swings!.map(s => s.id);
  const late = ids.map(() => 0);
  await ride(() => ({ tilt: 0, brake: true }), 60, { ...level, spawn: { x: -3, y: .72 } }, s => {
    if (s.elapsed < 52) return;
    ids.forEach((id, i) => { late[i] = Math.max(late[i], Math.abs(s.bodies.find(b => b.id === id)!.angle)); });
  });
  for (const amplitude of late) {
    expect(amplitude).toBeGreaterThan(F.reach - .02);
    expect(amplitude).toBeLessThan(F.reach + .02);
  }
}, 120_000);
