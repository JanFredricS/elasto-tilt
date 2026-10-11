import { expect, it } from 'vitest';
import { createPhysics, SPRING_RESTITUTION } from '../src/physics';
import { createGalileoPilot, GALILEO, GALILEO_RESTITUTION, galileosRampLevel as level } from '../src/levels/galileos-ramp';
import { createReplayPilot } from '../src/dev/replay';
import { levels } from '../src/levels';
import type { Controls, Level, Snapshot } from '../src/types';

async function ride(pilot: (state: Snapshot) => Controls, seconds = 45, map: Level = level, watch?: (state: Snapshot, control: Controls) => void) {
  const game = await createPhysics(); game.load(map);
  let state = game.snapshot();
  for (let i = 0; i < 120 * seconds && state.status === 'playing'; i++) {
    const control = pilot(state); state = game.step(1 / 120, control); watch?.(state, control);
  }
  game.destroy();
  return state;
}
/** Counts pad tosses (falling fast, then rising fast within a few steps) and brake steps. */
function tally() {
  let previous: Snapshot | undefined, recent: number[] = [];
  const out = { tosses: 0, brakes: 0, maxLean: 0, watch: (s: Snapshot, c: Controls) => {
    const vy = previous ? (s.bike.y - previous.bike.y) * 120 : 0; previous = s;
    out.brakes += Number(c.brake); out.maxLean = Math.max(out.maxLean, Math.abs(s.worldAngle));
    if (vy > 1.5 && recent.some(v => v < -2)) { out.tosses++; recent = []; } else recent = [...recent.slice(-3), vy];
  } };
  return out;
}
const tossApples = level.apples.filter(apple => apple.id.startsWith('galileo-toss-')).map(apple => apple.id);
const soft = level.surfaces.filter(surface => surface.kind === 'spring');

it('sits between Newton’s Orchard and One Wheel Wonder: a crash-free beginner map with three soft pads', () => {
  const index = levels.indexOf(level);
  expect(levels[index - 1].id).toBe('newtons-orchard');
  expect(levels[index + 1].id).toBe('one-wheel-wonder');
  expect(level.difficulty).toBe(1.5);
  expect(level.surfaces.some(surface => surface.kind === 'hazard')).toBe(false);
  expect(soft).toHaveLength(3);
  // The first authored restitution: well below the springboard's default.
  for (const pad of soft) expect(pad.restitution).toBe(GALILEO_RESTITUTION);
  expect(GALILEO_RESTITUTION).toBeLessThan(SPRING_RESTITUTION);
  expect(GALILEO_RESTITUTION).toBeCloseTo(.5, 5);
  expect(level.brakeScale).toBe(.6);
  expect(level.hint).toMatch(/brake on the brass/i);
  expect(tossApples).toHaveLength(3);
});

it('brings the rider home through a gallery with real headroom to a door below the spawn', () => {
  expect(GALILEO.roof - GALILEO.floor).toBeGreaterThanOrEqual(2.4);
  expect(Math.abs(level.exit.x - level.spawn.x)).toBeLessThan(2);
  expect(level.exit.y).toBeLessThan(GALILEO.roof);
  // Each terrace sits lower than the last: three inclined planes down the hill.
  expect(GALILEO.T2.y).toBeLessThan(GALILEO.T1.y - 2);
  expect(GALILEO.T3.y).toBeLessThan(GALILEO.T2.y - 2);
  // Every multi-segment ridden face is one chain.
  const chained = level.surfaces.filter(surface => surface.angle && surface.kind !== 'spring');
  expect(chained.every(surface => surface.chain)).toBe(true);
});

it('completes Galileo’s Ramp with actual Rapier controls: three tosses, never braking', async () => {
  const t = tally();
  const state = await ride(createGalileoPilot(), 45, level, t.watch);
  expect(state.status).toBe('complete');
  expect([...state.collected].sort()).toEqual(level.apples.map(apple => apple.id).sort());
  expect(t.tosses).toBeGreaterThanOrEqual(3);
  expect(t.brakes).toBe(0);
  expect(t.maxLean).toBeLessThan(.5);
  expect(state.elapsed).toBeLessThan(40);
});

it('the campaign replay table drives Galileo’s Ramp at its own index', async () => {
  expect((await ride(createReplayPilot(levels.indexOf(level)))).status).toBe('complete');
});

it.each([1.4, 2.6, 3.2])('is forgiving: a %f m/s cruise also catches every toss apple and completes', async cruise => {
  const state = await ride(createGalileoPilot(cruise));
  expect(state.status).toBe('complete');
});

it.each<Controls>([
  { tilt: 0, brake: false }, { tilt: 1, brake: false }, { tilt: -1, brake: false },
  { tilt: 0, brake: false, worldAngle: .3 }, { tilt: 0, brake: true, worldAngle: .3 },
])('is not completed by idle or held controls (%o)', async control => {
  const state = await ride(() => control, 40);
  expect(state.status).not.toBe('complete');
});

it('without the pads’ toss (brass replaced by stone) the same pilot misses every toss apple and cannot finish', async () => {
  const stone: Level = { ...level, surfaces: level.surfaces.map(surface => surface.kind === 'spring' ? { ...surface, kind: 'ground' } : surface) };
  const t = tally();
  const state = await ride(createGalileoPilot(), 45, stone, t.watch);
  expect(state.status).not.toBe('complete');
  expect(t.tosses).toBe(0);
  for (const id of tossApples) expect(state.collected).not.toContain(id);
});

it('the brake is ignored for the instant of a toss: held through the first one, the ride still completes', async () => {
  let previous: Snapshot | undefined, recent: number[] = [], at = -1;
  await ride(createGalileoPilot(), 10, level, s => {
    const vy = previous ? (s.bike.y - previous.bike.y) * 120 : 0; previous = s;
    if (at < 0 && vy > 1.5 && recent.some(v => v < -2)) at = s.elapsed; recent = [...recent.slice(-3), vy];
  });
  expect(at).toBeGreaterThan(0);
  const pilot = createGalileoPilot();
  const state = await ride(s => {
    const control = pilot(s);
    return { ...control, brake: s.elapsed > at - .03 && s.elapsed < at + .08 };
  });
  expect(state.status).toBe('complete');
});
