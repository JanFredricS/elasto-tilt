import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { BERNOULLI, bernoulliUpdraftLevel as level, createBernoulliPilot } from '../src/levels/bernoulli-updraft';
import { levels } from '../src/levels';
import { createReplayPilot } from '../src/dev/replay';
import type { Controls, Level, Snapshot } from '../src/types';

const frameOf = (state: Snapshot) => state.bodies.find(body => body.kind === 'frame')!;
async function ride(pilot: (state: Snapshot) => Controls, seconds = 30, map: Level = level, watch?: (state: Snapshot) => void, dt = 1 / 120) {
  const game = await createPhysics(); game.load(map);
  let state = game.snapshot();
  for (let i = 0; i < seconds / dt && state.status === 'playing'; i++) { state = game.step(dt, pilot(state)); watch?.(state); }
  game.destroy();
  return state;
}
const isPad = (id: string) => id.startsWith('bernoulli-pad-');
const clamp = (n: number) => Math.max(-1, Math.min(1, n));

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

// The lead saturates (the world turns at its .95 rad/s cap from the loop on), so what a
// player controls is where they stop turning: 4.25 stops a little short of gravity along
// the lintel (3π/2 − 20° ≈ 4.36), 5 keeps turning until the launch.
it.each([4.25, 5])('stopping the world at %f rad round the loop also completes', async release => {
  expect((await ride(createBernoulliPilot({ lead: 3, release }))).status).toBe('complete');
});

it.each([.4, .7, 0])('a chimney swing of %f rad either side of straight up also completes', async sway => {
  expect((await ride(createBernoulliPilot({ sway }))).status).toBe('complete');
});

it('the chimney does demand turning gravity back up: holding the lintel’s lean, or turning on, never completes', async () => {
  const held = await ride(createBernoulliPilot({ chimney: 4.2 }));
  expect(held.status).toBe('crashed');
  expect(held.bike.x).toBeLessThan(BERNOULLI.left + 1.5);
  expect(held.collected).not.toContain('bernoulli-gallery');
  expect((await ride(createBernoulliPilot({ chimney: 4.4 }))).status).not.toBe('complete');
});

it.each([.55, 0])('also completes at 60 Hz (sway %f)', async sway => {
  expect((await ride(createBernoulliPilot({ sway }), 30, level, undefined, 1 / 60)).status).toBe('complete');
});

it.each([0, .55])('meets the hood at a glancing angle, not flat onto the roof (sway %f)', async sway => {
  let previous: Snapshot | undefined, v = { x: 0, y: 0 }, worst = 0;
  const state = await ride(createBernoulliPilot({ sway }), 30, level, s => {
    const next = previous ? { x: (s.bike.x - previous.bike.x) * 120, y: (s.bike.y - previous.bike.y) * 120 } : v;
    // Above the chimney's top third and past its left wall: the landing and the hood.
    if (previous && s.bike.y > 22 && s.bike.x < .5) worst = Math.max(worst, Math.hypot(next.x - v.x, next.y - v.y));
    previous = s; v = next;
  });
  expect(state.status).toBe('complete');
  // Meeting the flat roof at ≈ 19 m/s cost 6–12 m/s in a single step.
  expect(worst).toBeLessThan(6);
});

it('a rider who comes down short of an apple can turn the world back at the plateau and ride the route again', async () => {
  // First lap: keep gravity leaned on in the chimney; the rider bounces high, misses the top apple, and lives.
  const firstLap = createBernoulliPilot({ chimney: 4.4 });
  let lap = 0, settle = 0, turns = 0, short: string[] = [], again: ((state: Snapshot) => Controls) | undefined;
  const state = await ride(s => {
    if (lap === 0 && s.elapsed > 12 && s.bike.y < 4 && s.bike.x < BERNOULLI.far + 2) {
      lap = 1; settle = s.elapsed; turns = Math.round(s.worldAngle / (2 * Math.PI)) * 2 * Math.PI;
      short = level.apples.map(apple => apple.id).filter(id => !s.collected.includes(id));
    }
    if (lap === 0) return firstLap(s);
    // Turn gravity back down over the plateau, then ride a second lap from there.
    if (lap === 1 && s.elapsed - settle < 3) return { tilt: clamp((turns - s.worldAngle) * 8), brake: false };
    again ??= createBernoulliPilot();
    return again({ ...s, worldAngle: s.worldAngle - turns });
  }, 60);
  expect(lap).toBe(1);
  expect(short).toEqual(['bernoulli-core-3']);
  expect(state.status).toBe('complete');
  expect(state.elapsed).toBeGreaterThan(30);
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
