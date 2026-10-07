import { expect, it } from 'vitest';
import { createPhysics, SPRING_RESTITUTION } from '../src/physics';
import { createSpringboardPilot, SPRING, springboardLevel as level } from '../src/levels/springboard';
import { levels } from '../src/levels';
import type { Controls, Level, Snapshot } from '../src/types';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const frameOf = (state: Snapshot) => state.bodies.find(body => body.kind === 'frame')!;
async function ride(pilot: (state: Snapshot) => Controls, seconds = 40, map: Level = level, watch?: (state: Snapshot) => void) {
  const game = await createPhysics(); game.load(map);
  let state = game.snapshot();
  for (let i = 0; i < 120 * seconds && state.status === 'playing'; i++) { state = game.step(1 / 120, pilot(state)); watch?.(state); }
  game.destroy();
  return state;
}

it('sits late in the campaign, just before Stairway to Heaven, with two brass pads', () => {
  const index = levels.indexOf(level);
  expect(levels[index + 1].id).toBe('stairway-to-heaven');
  expect(level.surfaces.filter(surface => surface.kind === 'spring')).toHaveLength(2);
  expect(level.difficulty).toBeGreaterThan(levels[index - 1].difficulty);
  expect(level.difficulty).toBeLessThan(levels[index + 1].difficulty);
});

it('a straight drop onto a pad rebounds to about e² of its height, upright and without spin', async () => {
  const test: Level = { ...level, id: 'pad-drop', spawn: { x: 12.5, y: -5 + .72 + 4 }, apples: [] };
  // After the first impact the highest point reached is the first rebound's apex.
  let apex = -Infinity, bounced = false, maxTilt = 0;
  await ride(() => ({ tilt: 0, brake: false }), 1.8, test, state => {
    const y = state.bike.y; maxTilt = Math.max(maxTilt, Math.abs(frameOf(state).angle));
    if (y < -4.1) bounced = true;
    if (bounced) apex = Math.max(apex, y);
  });
  expect(bounced).toBe(true);
  const rebound = apex - (-5 + .72);
  expect(rebound).toBeGreaterThan(4 * SPRING_RESTITUTION ** 2 * .8);
  expect(rebound).toBeLessThan(4);
  expect(maxTilt).toBeLessThan(.1);
});

it('completes Hooke’s Springboard with actual Rapier controls, leaning gravity in flight', async () => {
  let maxLean = 0, bounces = 0, recent: number[] = [], previous: Snapshot | undefined;
  const state = await ride(createSpringboardPilot(), 40, level, s => {
    maxLean = Math.max(maxLean, s.worldAngle);
    const vy = previous ? (s.bike.y - previous.bike.y) * 120 : 0; previous = s;
    // A pad throw: fast downward to fast upward within a few steps.
    if (vy > 3 && recent.some(v => v < -3)) { bounces++; recent = []; } else recent = [...recent.slice(-3), vy];
  });
  expect(state.status).toBe('complete');
  expect(state.collected.sort()).toEqual(level.apples.map(apple => apple.id).sort());
  expect(bounces).toBe(2);
  expect(maxLean).toBeGreaterThan(.45);
  expect(state.elapsed).toBeLessThan(20);
});

it.each([0, .3])('a throw with only %f rad of lean falls into the first spike pit', async lean => {
  const state = await ride(createSpringboardPilot(lean), 15);
  expect(state.status).toBe('crashed');
  expect(state.collected).not.toContain('spring-ledge');
  expect(state.bike.x).toBeLessThan(SPRING.ledge1.x0 + 2);
});

it.each([.35, .45, .55, .65, .7, .8])('the first jump tolerates a %f rad lean: it lands on ledge 1 and the ride completes', async lean => {
  const state = await ride(createSpringboardPilot(lean, 2.5, .6), 40);
  expect(state.collected).toContain('spring-ledge');
  expect(state.status).toBe('complete');
});

it.each([.35, .45])('the second jump stays tighter: a %f rad lean there falls into pit 2', async lean => {
  const state = await ride(createSpringboardPilot(.55, 2.5, lean), 40);
  expect(state.collected).toContain('spring-ledge');
  expect(state.status).toBe('crashed');
  expect(state.bike.x).toBeGreaterThan(SPRING.ledge1.x1); expect(state.bike.x).toBeLessThan(SPRING.ledge2.x0 + 1);
});

it.each<Controls>([{ tilt: 0, brake: false }, { tilt: 1, brake: false }, { tilt: -1, brake: false }])('is not completed by fixed controls (%o)', async control => {
  const state = await ride(() => control, 30);
  expect(state.status).not.toBe('complete');
});

it('keeping the world level past the knee never reaches ledge 1', async () => {
  // Rides at a steady speed with gravity kept level: the slide and pad alone never reach ledge 1.
  let previous: Snapshot | undefined;
  const state = await ride(s => {
    const vx = previous ? (s.bike.x - previous.bike.x) * 120 : 0; previous = s;
    const target = s.bike.x < SPRING.plateau.x1 - .5 ? clamp((2.5 - vx) * .22, -.3, .3) : 0;
    return { tilt: clamp((target - s.worldAngle) * 8, -1, 1), brake: false };
  }, 15);
  expect(state.status).toBe('crashed');
  expect(state.bike.x).toBeLessThan(SPRING.ledge1.x0);
});

it('the brake is ignored for the instant of a pad throw: held through it, the ride is unchanged and completes', async () => {
  // Find the first throw (fast downward to fast upward) on a clean run.
  const throwTime = async (pilot: (state: Snapshot) => Controls) => {
    let previous: Snapshot | undefined, recent: number[] = [], at = -1;
    const state = await ride(pilot, 25, level, s => {
      const vy = previous ? (s.bike.y - previous.bike.y) * 120 : 0; previous = s;
      if (at < 0 && vy > 3 && recent.some(v => v < -3)) at = s.elapsed; recent = [...recent.slice(-3), vy];
    });
    return { at, state };
  };
  const clean = await throwTime(createSpringboardPilot());
  expect(clean.at).toBeGreaterThan(0);
  // Brake pressed on the pad just before the throw and held 100 ms into the air.
  const pilot = createSpringboardPilot();
  const braked = await throwTime(s => {
    const control = pilot(s);
    return { ...control, brake: control.brake || (s.elapsed > clean.at - .02 && s.elapsed < clean.at + .1) };
  });
  expect(braked.state.status).toBe('complete');
  expect(braked.state.elapsed).toBeCloseTo(clean.state.elapsed, 0);
  expect(level.hint).toMatch(/brake/i);
});
