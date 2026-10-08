import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { createHuygensPilot, HUYGENS as H, huygensReturnLevel as level } from '../src/levels/huygens-return';
import { levels } from '../src/levels';
import { createReplayPilot } from '../src/dev/replay';
import type { Controls, Level, Snapshot } from '../src/types';

const swingOf = (state: Snapshot) => state.bodies.find(body => body.id === H.swing)!;
async function ride(pilot: (state: Snapshot) => Controls, seconds = 75, map: Level = level, watch?: (state: Snapshot) => void) {
  const game = await createPhysics(); game.load(map);
  let state = game.snapshot();
  for (let i = 0; i < 120 * seconds && state.status === 'playing'; i++) { state = game.step(1 / 120, pilot(state)); watch?.(state); }
  game.destroy();
  return state;
}

it('lines the plank up with the start shelf at rest and with the tower when swung a quarter turn', () => {
  const [swing] = level.swings!;
  expect(level.swings).toHaveLength(1);
  // At rest (θ = 0) the plank's top face is the shelf's top, its underside the shelf's underside.
  expect(swing.anchor.y - swing.length + .12).toBeCloseTo(H.shelf.top, 6);
  expect(swing.anchor.y - swing.length - .12).toBeCloseTo(H.shelf.bottom, 6);
  // At θ = 90° the top face is the tower's west face, the underside the fin's east face.
  expect(swing.anchor.x + swing.length - .12).toBeCloseTo(H.westFace, 6);
  expect(swing.anchor.x + swing.length + .12).toBeCloseTo(H.westFace + H.course.fin, 6);
  // The door is under the start shelf: only the underside ride reaches it.
  expect(level.exit.y).toBeLessThan(H.shelf.bottom);
  expect(level.surfaces.filter(surface => surface.kind === 'hazard').length).toBeGreaterThanOrEqual(12);
});

it('completes Huygens’ Return: out on the swing, over the saw-teeth, home beneath the plank', async () => {
  let maxTheta = 0, minLater = Infinity, crossedSpikes = false, rodeUnder = false;
  const state = await ride(createHuygensPilot(), 75, level, s => {
    const theta = swingOf(s).angle;
    maxTheta = Math.max(maxTheta, theta);
    const z = s.bike.x - H.westFace, along = H.crown - s.bike.y;
    if (along > H.course.trench[0] && along < H.course.trench[1] && z > 0) crossedSpikes = true;
    if (crossedSpikes) minLater = Math.min(minLater, theta);
    // Beneath the plank: the bike is farther from the anchor than the plank.
    const r = Math.hypot(s.bike.x - H.anchor.x, s.bike.y - H.anchor.y);
    if (theta > .3 && theta < 1.2 && r > H.length + .3) rodeUnder = true;
  });
  expect(state.status).toBe('complete');
  expect(state.collected.sort()).toEqual(level.apples.map(apple => apple.id).sort());
  expect(maxTheta).toBeGreaterThan(Math.PI / 2 - .02);
  expect(crossedSpikes).toBe(true);
  expect(rodeUnder).toBe(true);
  expect(minLater).toBeLessThan(.05);
  expect(state.bike.y).toBeLessThan(H.shelf.bottom);
  expect(state.elapsed).toBeLessThan(70);
}, 120_000);

it.each([6.7, 7.4])('the jump tolerates a %f m/s run-up target', async jump => {
  const state = await ride(createHuygensPilot(jump));
  expect(state.status).toBe('complete');
}, 120_000);

it.each([.4, .9])('re-parking the plank tolerates tipping the world %f rad past level', async park => {
  const state = await ride(createHuygensPilot(7, 0, park));
  expect(state.status).toBe('complete');
}, 120_000);

it('a rider who reaches the lip slowly falls onto the saw-teeth', async () => {
  const state = await ride(createHuygensPilot(3), 45);
  expect(state.status).toBe('crashed');
  expect(state.collected).not.toContain('huygens-underside');
  const along = H.crown - state.bike.y;
  expect(along).toBeGreaterThan(H.course.trench[0] - 1); expect(along).toBeLessThan(H.course.trench[1] + 1);
}, 120_000);

it.each<Controls>([{ tilt: 0, brake: false }, { tilt: 1, brake: true }, { tilt: -1, brake: false }])('is not completed by fixed controls (%o)', async control => {
  const state = await ride(() => control, 30);
  expect(state.status).not.toBe('complete');
}, 60_000);

it('the campaign replay table drives Huygens’ Return at its own index', async () => {
  const index = levels.indexOf(level);
  expect(index).toBeGreaterThan(0);
  expect((await ride(createReplayPilot(index), 75)).status).toBe('complete');
}, 120_000);
