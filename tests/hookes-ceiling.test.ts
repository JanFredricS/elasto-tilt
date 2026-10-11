import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { CEILING, createHookesCeilingPilot, hookesCeilingLevel as level } from '../src/levels/hookes-ceiling';
import { levels } from '../src/levels';
import { createReplayPilot } from '../src/dev/replay';
import type { Controls, Level, Snapshot } from '../src/types';

const frameOf = (state: Snapshot) => state.bodies.find(body => body.kind === 'frame')!;
async function ride(pilot: (state: Snapshot) => Controls, seconds = 50, map: Level = level, watch?: (state: Snapshot) => void) {
  const game = await createPhysics(); game.load(map);
  let state = game.snapshot();
  for (let i = 0; i < 120 * seconds && state.status === 'playing'; i++) { state = game.step(1 / 120, pilot(state)); watch?.(state); }
  game.destroy();
  return state;
}
/** A pad throw: fast toward one side to fast away within a few steps, along y. */
const throwCounter = () => {
  let previous: Snapshot | undefined, recent: number[] = [], throws = 0;
  return { watch(s: Snapshot) {
    const vy = previous ? (s.bike.y - previous.bike.y) * 120 : 0; previous = s;
    if (Math.abs(vy) > 3 && recent.some(v => v * vy < 0 && Math.abs(v) > 3)) { throws++; recent = []; } else recent = [...recent.slice(-3), vy];
  }, get throws() { return throws; } };
};

it('follows Hooke’s Springboard directly, before the Piston Works, with three brass pads', () => {
  const index = levels.indexOf(level);
  expect(levels[index - 1].id).toBe('hookes-springboard');
  expect(levels[index + 1].id).toBe('piston-works');
  expect(level.difficulty).toBe(14.6);
  expect(level.surfaces.filter(surface => surface.kind === 'spring')).toHaveLength(3);
  expect(level.hint).toMatch(/upside down/i);
  expect(level.hint).toMatch(/don’t brake on brass/i);
});

it('starts upside down under the slab, wheels against the ceiling, and holds there at rest', async () => {
  expect(level.initialAngle).toBe(Math.PI);
  expect(level.spawnAngle).toBe(Math.PI);
  const start = await ride(() => ({ tilt: 0, brake: true }), 1.5);
  expect(start.status).toBe('playing');
  expect(start.worldAngle).toBeCloseTo(Math.PI, 6);
  // Frame .72 below the ceiling face (map y 0), still turned over: gravity holds it up there.
  expect(start.bike.y).toBeGreaterThan(-.75); expect(start.bike.y).toBeLessThan(-.65);
  expect(Math.abs(Math.cos(frameOf(start).angle) + 1)).toBeLessThan(.01);
  // Spawned upright in map space instead, the same rider falls up onto its head.
  const unturned = await ride(() => ({ tilt: 0, brake: false }), 1.5, { ...level, spawnAngle: 0 });
  expect(unturned.status).toBe('crashed');
});

it('completes Hooke’s Ceiling with actual Rapier controls: two ceiling throws, the nose, one floor throw', async () => {
  const counter = throwCounter();
  let minWorld = Infinity, maxWorld = -Infinity, topSide = false;
  const state = await ride(createHookesCeilingPilot(), 50, level, s => {
    counter.watch(s);
    minWorld = Math.min(minWorld, s.worldAngle); maxWorld = Math.max(maxWorld, s.worldAngle);
    if (s.bike.y > CEILING.top.y) topSide = true;
  });
  expect(state.status).toBe('complete');
  expect(state.collected.sort()).toEqual(level.apples.map(apple => apple.id).sort());
  expect(counter.throws).toBe(3);
  // Leaned forward past π over the ceiling, then turned all the way back to a right-way-up world.
  expect(maxWorld).toBeGreaterThan(Math.PI + .45);
  expect(minWorld).toBeLessThan(.1);
  expect(topSide).toBe(true);
  expect(Math.abs(frameOf(state).angle)).toBeLessThan(1);
  expect(state.elapsed).toBeLessThan(45);
});

it('the campaign replay table drives Hooke’s Ceiling at its own index', async () => {
  const state = await ride(createReplayPilot(levels.indexOf(level)), 50);
  expect(state.status).toBe('complete');
});

it.each([0, .3])('a ceiling throw with only %f rad of lean falls into the first ceiling spike pit', async lean => {
  const state = await ride(createHookesCeilingPilot(lean), 15);
  expect(state.status).toBe('crashed');
  expect(state.collected).not.toContain('ceiling-ledge');
  // Turned frame: map x −ledge1.x0 is the pit's far edge.
  expect(state.bike.x).toBeGreaterThan(-(CEILING.ledge1.x0 + 2));
});

it.each([.35, .45])('the second ceiling jump stays tight: a %f rad lean there falls into pit 2', async lean => {
  const state = await ride(createHookesCeilingPilot(.6, lean), 20);
  expect(state.collected).toContain('ceiling-ledge');
  expect(state.status).toBe('crashed');
  expect(state.bike.x).toBeLessThan(-CEILING.ledge1.x1); expect(state.bike.x).toBeGreaterThan(-(CEILING.ledge2.x0 + 1));
});

it.each([0, .3])('right-way-up again, the last throw with only %f rad of lean falls into the floor spike pit', async lean => {
  const state = await ride(createHookesCeilingPilot(.6, .6, lean), 50);
  expect(state.collected).toContain('ceiling-nose');
  expect(state.status).toBe('crashed');
  expect(state.bike.x).toBeGreaterThan(CEILING.pit3.spikes[0] - 4); expect(state.bike.x).toBeLessThan(CEILING.landing.x0 + 1);
});

it.each([.35, .55, .8])('the first ceiling jump forgives a %f rad lean and the ride completes', async lean => {
  const state = await ride(createHookesCeilingPilot(lean, .6, .6), 50);
  expect(state.status).toBe('complete');
});

it('without the brass pads (plain stone in their place) the same pilot never leaves the first ceiling pit', async () => {
  const stone: Level = { ...level, surfaces: level.surfaces.map(s => s.kind === 'spring' ? { ...s, kind: 'ground' as const } : s) };
  const state = await ride(createHookesCeilingPilot(), 20, stone);
  expect(state.status).toBe('crashed');
  expect(state.collected).not.toContain('ceiling-ledge');
  expect(state.bike.x).toBeGreaterThan(-CEILING.ledge1.x0);
});

it.each<Controls>([{ tilt: 0, brake: false }, { tilt: 1, brake: false }, { tilt: -1, brake: false }])('is not completed by fixed controls (%o)', async control => {
  const state = await ride(() => control, 30);
  expect(state.status).not.toBe('complete');
});
