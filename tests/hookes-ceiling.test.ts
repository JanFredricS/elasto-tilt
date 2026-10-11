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

// Spikes made harmless stone: a crash that survives this is not the spikes' doing.
const inertSpikes: Level = { ...level, surfaces: level.surfaces.map(s => s.kind === 'hazard' ? { ...s, kind: 'ground' as const } : s) };
// Spike spans and far-ledge lips along the direction of travel (the ceiling half in its turned frame, X = −x).
const pits = [
  { name: 'first ceiling', pilot: (lean: number) => createHookesCeilingPilot(lean), seconds: 15, along: (x: number) => -x,
    spikes: [-CEILING.pit1.spikes[0], -CEILING.pit1.spikes[1]], lip: CEILING.ledge1.x0, before: 'ceiling-ledge' },
  { name: 'second ceiling', pilot: (lean: number) => createHookesCeilingPilot(.6, lean), seconds: 20, along: (x: number) => -x,
    spikes: [-CEILING.pit2.spikes[0], -CEILING.pit2.spikes[1]], lip: CEILING.ledge2.x0, before: 'ceiling-nose' },
  { name: 'last (floor)', pilot: (lean: number) => createHookesCeilingPilot(.6, .6, lean), seconds: 50, along: (x: number) => x,
    spikes: [...CEILING.pit3.spikes], lip: CEILING.landing.x0, before: undefined },
] as const;

it.each(pits)('with no lean, the $name throw drops into its spike pit, and the spikes are what kill', async pit => {
  const state = await ride(pit.pilot(0), pit.seconds);
  expect(state.status).toBe('crashed');
  if (pit.before) expect(state.collected).not.toContain(pit.before);
  const at = pit.along(state.bike.x), [near, far] = [Math.min(...pit.spikes.map(pit.along)), Math.max(...pit.spikes.map(pit.along))];
  expect(at).toBeGreaterThan(near); expect(at).toBeLessThan(far);
  // The same throw over harmless stone is still riding at the time limit.
  expect((await ride(pit.pilot(0), pit.seconds, inertSpikes)).status).toBe('playing');
});

it.each([[0, .3], [1, .35], [1, .45], [2, .3]] as const)('a short throw (pit %i, %f rad) clears the spikes but strikes the far ledge’s lip', async (index, lean) => {
  const pit = pits[index], state = await ride(pit.pilot(lean), pit.seconds);
  expect(state.status).toBe('crashed');
  if (pit.before) expect(state.collected).not.toContain(pit.before);
  const at = pit.along(state.bike.x);
  expect(at).toBeGreaterThan(pit.lip - 1); expect(at).toBeLessThan(pit.lip + 2.5);
  // Not the spikes: with them made stone, the rider still crashes, at the same place.
  const harmless = await ride(pit.pilot(lean), pit.seconds, inertSpikes);
  expect(harmless.status).toBe('crashed'); expect(harmless.bike.x).toBeCloseTo(state.bike.x, 1);
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
