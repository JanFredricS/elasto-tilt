import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { BERNOULLI, bernoulliUpdraftLevel as level, createBernoulliPilot } from '../src/levels/bernoulli-updraft';
import { levels } from '../src/levels';
import { createReplayPilot } from '../src/dev/replay';
import type { Controls, Level, Snapshot } from '../src/types';

const frameOf = (state: Snapshot) => state.bodies.find(body => body.kind === 'frame')!;
async function ride(pilot: (state: Snapshot) => Controls, seconds = 30, map: Level = level, watch?: (state: Snapshot) => void) {
  const game = await createPhysics(); game.load(map);
  let state = game.snapshot();
  for (let i = 0; i < 120 * seconds && state.status === 'playing'; i++) { state = game.step(1 / 120, pilot(state)); watch?.(state); }
  game.destroy();
  return state;
}
const isPad = (id: string) => id.startsWith('bernoulli-pad-');

it('sits between Spiral Sanctuary and Switchback Scaffold, a chimney 6 to 9 m wide with a brass pad on each wall', () => {
  const index = levels.indexOf(level);
  expect(levels[index - 1].id).toBe('spiral-sanctuary');
  expect(levels[index + 1].id).toBe('switchback-scaffold');
  expect(level.difficulty).toBe(12.75);
  const pads = level.surfaces.filter(surface => surface.kind === 'spring');
  expect(pads.map(surface => surface.id).sort()).toEqual(['bernoulli-pad-left', 'bernoulli-pad-right']);
  expect(pads.map(surface => Math.abs(surface.angle!))).toEqual([Math.PI / 2, Math.PI / 2]);
  expect(BERNOULLI.right - BERNOULLI.left).toBeGreaterThan(6);
  expect(BERNOULLI.right - BERNOULLI.left).toBeLessThan(9);
  expect(BERNOULLI.roof).toBeGreaterThanOrEqual(28);
});

it('completes Bernoulli’s Updraft with actual Rapier controls, bouncing off alternating walls upside down', async () => {
  const walls: string[] = [];
  let previous: Snapshot | undefined, heading = 0, minPitchInChimney = Infinity, swingMin = Infinity, swingMax = -Infinity;
  const state = await ride(createReplayPilot(levels.indexOf(level)), 30, level, s => {
    const vx = previous ? (s.bike.x - previous.bike.x) * 120 : 0; previous = s;
    // A wall throw: inside the chimney the fast horizontal flight reverses.
    if (Math.abs(vx) > 4 && s.bike.y > BERNOULLI.lintelTop.y && s.bike.y < BERNOULLI.roof - 2) {
      if (heading && Math.sign(vx) !== heading) walls.push(heading < 0 ? 'left' : 'right');
      heading = Math.sign(vx);
    }
    if (s.bike.y > BERNOULLI.lintelTop.y + 1 && s.bike.y < BERNOULLI.roof - 2 && s.bike.x > BERNOULLI.left && s.bike.x < BERNOULLI.right) {
      minPitchInChimney = Math.min(minPitchInChimney, Math.abs(Math.cos(frameOf(s).angle) + 1));
      swingMin = Math.min(swingMin, s.worldAngle); swingMax = Math.max(swingMax, s.worldAngle);
    }
  });
  expect(state.status).toBe('complete');
  expect(state.collected.sort()).toEqual(level.apples.map(apple => apple.id).sort());
  expect(walls).toEqual(['left', 'right']);
  // Upside down the whole climb, the world near straight up but swung about 40° between the walls.
  expect(minPitchInChimney).toBeLessThan(.2);
  expect(swingMax - swingMin).toBeGreaterThan(.6);
  expect(swingMin).toBeGreaterThan(Math.PI - 1.2);
  expect(swingMax).toBeLessThan(Math.PI + 1.2);
  expect(state.elapsed).toBeLessThan(25);
});

it.each([1.75, 2])('a lead of %f rad round the loop also completes', async lead => {
  expect((await ride(createBernoulliPilot({ lead }))).status).toBe('complete');
});

it.each([.4, .7])('a chimney swing of %f rad either side of straight up also completes', async sway => {
  expect((await ride(createBernoulliPilot({ sway }))).status).toBe('complete');
});

it.each([1, 1.25])('leading the loop by only %f rad leaves the lintel spinning: the head meets the left wall', async lead => {
  const state = await ride(createBernoulliPilot({ lead }));
  expect(state.status).toBe('crashed');
  expect(state.bike.x).toBeLessThan(BERNOULLI.left + 1.5);
  expect(state.bike.y).toBeLessThan(BERNOULLI.leftTop);
  expect(state.collected).not.toContain('bernoulli-core-2');
});

it('without the wall pads the same ride fails: plain walls stop the throw and the head strikes', async () => {
  const plain: Level = { ...level, surfaces: level.surfaces.map(surface => isPad(surface.id) ? { ...surface, kind: 'ground' } : surface) };
  const flat = await ride(createBernoulliPilot(), 30, plain);
  expect(flat.status).toBe('crashed');
  expect(flat.collected).not.toContain('bernoulli-core-2');
  const open: Level = { ...level, surfaces: level.surfaces.filter(surface => !isPad(surface.id)) };
  const missing = await ride(createBernoulliPilot(), 30, open);
  expect(missing.status).not.toBe('complete');
});

it.each<Controls>([
  { tilt: 0, brake: false }, { tilt: 1, brake: false }, { tilt: -1, brake: false }, { tilt: .3, brake: false }, { tilt: -.3, brake: false },
  { tilt: 0, brake: false, worldAngle: -Math.PI / 2 }, { tilt: 0, brake: false, worldAngle: .2 },
  { tilt: 0, brake: false, worldAngle: Math.PI / 2 }, { tilt: 0, brake: false, worldAngle: Math.PI },
])('is not completed by fixed controls (%o)', async control => {
  const state = await ride(() => control, 45);
  expect(state.status).not.toBe('complete');
});
