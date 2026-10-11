import { expect, it } from 'vitest';
import { createPhysics, SPRING_RESTITUTION } from '../src/physics';
import { createGalileoPilot, GALILEO, GALILEO_RESTITUTION, galileosRampLevel as level } from '../src/levels/galileos-ramp';
import { createReplayPilot } from '../src/dev/replay';
import { levels } from '../src/levels';
import type { Controls, Level, Snapshot } from '../src/types';

async function ride(pilot: (state: Snapshot) => Controls, seconds = 60, map: Level = level, watch?: (state: Snapshot, control: Controls) => void) {
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

it('sits between Newton’s Orchard and One Wheel Wonder: a hazard-free beginner map with three soft pads', () => {
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
  // A very soft brake: braking down a slide slows the rider without pitching them over.
  expect(level.brakeScale).toBe(.1);
  expect(level.hint).toMatch(/never brake in the air/i);
  expect(level.hint).toMatch(/↺/);
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
  // The catcher stops short of vertical, so tilting home while high on it keeps the rider on its face.
  const catcher = level.surfaces.filter(surface => surface.chain === 'galileo-catch');
  expect(Math.max(...catcher.map(surface => surface.angle ?? 0))).toBeLessThanOrEqual(55 * Math.PI / 180 + 1e-9);
  // An over-tilted rider leaves pad 3 fast: 20 m of landing before the catcher's bend, and a
  // catcher 9 m tall, so they neither land on the bend nor fly off its top.
  expect(GALILEO.landing.x1 - GALILEO.landing.x0).toBeGreaterThanOrEqual(20);
  expect(GALILEO.catchTop.y - GALILEO.floor).toBeGreaterThanOrEqual(9);
  // The whole gallery is roofed, door end included, and every part of the map lies inside its bounds.
  expect(level.surfaces.some(surface => surface.id === 'galileo-hill-west')).toBe(true);
  for (const surface of level.surfaces) {
    expect(surface.x).toBeGreaterThan(level.bounds.min.x); expect(surface.x).toBeLessThan(level.bounds.max.x);
    expect(surface.y).toBeGreaterThan(level.bounds.min.y); expect(surface.y).toBeLessThan(level.bounds.max.y);
  }
});

it('completes Galileo’s Ramp with actual Rapier controls: three tosses, never braking', async () => {
  const t = tally();
  const state = await ride(createGalileoPilot(), 55, level, t.watch);
  expect(state.status).toBe('complete');
  expect([...state.collected].sort()).toEqual(level.apples.map(apple => apple.id).sort());
  expect(t.tosses).toBeGreaterThanOrEqual(3);
  expect(t.brakes).toBe(0);
  expect(t.maxLean).toBeLessThan(.5);
  expect(state.elapsed).toBeLessThan(50);
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

it.each([2, 3.2, 5])('without the pads’ toss (brass replaced by stone) the same pilot at a %f m/s cruise misses every toss apple and cannot finish', async cruise => {
  // The pilot levels the world from each incline on, so it reaches every kicker at the slide's own
  // speed (about 6 m/s) whatever its terrace cruise. A rider who HOLDS the world tilted down the
  // hill arrives faster and can reach the toss apples off bare stone: see docs/galileos-ramp.md.
  const stone: Level = { ...level, surfaces: level.surfaces.map(surface => surface.kind === 'spring' ? { ...surface, kind: 'ground' } : surface) };
  const t = tally();
  const state = await ride(createGalileoPilot(cruise), 45, stone, t.watch);
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

/** A beginner who does not level the world: keyboard taps take it to `lean` and leave it there all
 *  the way down the hill; a second after dropping into the gallery they tilt left to `home` and
 *  hold it until the door is close, where they straighten up and brake. */
function holder(lean: number, home: number, brakeWhen?: (state: Snapshot) => boolean) {
  let since = -1;
  return (state: Snapshot): Controls => {
    if (state.bike.y < GALILEO.roof && since < 0) since = state.elapsed;
    const homeward = since >= 0 && state.elapsed > since + 1, near = state.bike.x < GALILEO.door.x + 3;
    const target = homeward ? (near ? 0 : -home) : lean;
    return { tilt: Math.max(-1, Math.min(1, (target - state.worldAngle) * 8)), brake: (homeward && near) || (!homeward && !!brakeWhen?.(state)) };
  };
}

it.each([[.05, .15], [.12, .4], [.2, .15], [.2, .4], [.26, .15], [.28, .4], [.3, .15]])('forgives a held lean: world held at %f rad down the hill, then %f rad home', async (lean, home) => {
  const state = await ride(holder(lean, home));
  expect(state.status).toBe('complete');
  expect(state.collected).toHaveLength(level.apples.length);
});

it('forgives braking down every slide: a scared rider who brakes until each foot still catches every toss', async () => {
  const onSlide = (s: Snapshot) => s.bike.y > GALILEO.roof &&
    GALILEO.stages.some(stage => s.bike.x > stage.start.x + 1 && s.bike.x < stage.foot.x - .3);
  for (const lean of [.1, .2]) {
    let brakes = 0;
    const state = await ride(holder(lean, .15, onSlide), 60, level, (_, control) => { brakes += Number(control.brake); });
    expect(brakes).toBeGreaterThan(120);
    expect(state.status).toBe('complete');
  }
});

it('every pit is escapable: stopped dead at the foot of a slide, tilting right climbs the brass onto the next terrace', async () => {
  for (const stage of GALILEO.stages) {
    const pit: Level = { ...level, spawn: { x: stage.foot.x - .2, y: stage.foot.y + .9 } };
    // Tilt right until over the brass, then level the world again and roll on.
    let reached = false;
    const state = await ride(s => ({ tilt: Math.max(-1, Math.min(1, ((reached ? 0 : .45) - s.worldAngle) * 8)), brake: false }), 4, pit,
      s => { reached ||= s.status === 'playing' && s.bike.x > stage.kick.x + .5 && s.bike.y > stage.kick.y; });
    expect(reached).toBe(true);
    expect(state.status).toBe('playing');
  }
});

it('the hint is honest: braking through the gallery fall crashes, a tap or a late brake does not', async () => {
  const run = async (from: number, length: number) => {
    const pilot = createGalileoPilot(); let at = -1;
    return (await ride(s => {
      if (at < 0 && Math.abs(s.bike.x - GALILEO.stages[2].foot.x) < .4) at = s.elapsed;
      return { ...pilot(s), brake: at > 0 && s.elapsed > at + from && s.elapsed < at + from + length };
    })).status;
  };
  expect(await run(.1, .5)).toBe('crashed');
  expect(await run(.1, .1)).toBe('complete');
  expect(await run(1, .5)).toBe('complete');
});
