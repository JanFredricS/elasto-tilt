import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { eulersBridgesLevel as level, createEulersBridgesPilot, BRIDGES, EULER, EBB_L, FLOOD_L, bridgeTop } from '../src/levels/eulers-bridges';
import { levels } from '../src/levels';
import { createReplayPilot } from '../src/dev/replay';
import { paletteFor } from '../src/art-direction';
import type { Controls, Level, Snapshot } from '../src/types';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** Steps the pilot for `seconds` while playing. */
async function ride(pilot: (state: Snapshot) => Controls, seconds: number, map: Level = level) {
  const game = await createPhysics(); game.load(map);
  let state = game.snapshot(), braked = false;
  for (let i = 0; i < 120 * seconds && state.status === 'playing'; i++) {
    const control = pilot(state); braked ||= control.brake;
    state = game.step(1 / 120, control);
  }
  game.destroy();
  return { state, braked };
}
const allApples = level.apples.map(apple => apple.id).sort();

it('follows Spiral Sanctuary at 12.25 with seven vertical-only bridge lifts on one RIVER clock', () => {
  const index = levels.indexOf(level);
  expect(levels[index - 1].id).toBe('spiral-sanctuary');
  expect(level.difficulty).toBe(12.25);
  expect(level.subtitle).toBe('Cross each bridge only once.');
  expect(level.timeLabel).toBe('RIVER');
  expect(level.timeAxis).toEqual({ x: 1, y: 0 });
  expect(paletteFor(level.id)).toBe(paletteFor('eschers-orchard')); // rose
  const lifts = level.timePlatforms!;
  expect(lifts).toHaveLength(7);
  expect(level.apples).toHaveLength(7);
  for (const lift of lifts) expect(lift.to.x).toBe(lift.from.x); // vertical only: no along-axis carry
  for (const end of lifts.flatMap(lift => [lift.from, lift.to])) {
    expect(end.x).toBeGreaterThan(level.bounds.min.x); expect(end.x).toBeLessThan(level.bounds.max.x);
    expect(end.y).toBeGreaterThan(level.bounds.min.y); expect(end.y).toBeLessThan(level.bounds.max.y);
  }
  // Distinct travels and flush readings: every bridge has its own phase.
  expect(new Set(BRIDGES.map(b => b.travel)).size).toBe(7);
  expect(new Set(BRIDGES.map(b => b.flush.toFixed(3))).size).toBe(7);
  // At the clock's empty reading (the spawn) every canal bridge is below its banks: no bridge is free.
  for (const b of BRIDGES.filter(b => b.rise)) expect(bridgeTop(b, 0)).toBeLessThan(b.deck - .2);
  // Compact town; the camera sees about ±7.7 m, so the turns are marked.
  expect(level.bounds.max.x - level.bounds.min.x).toBeLessThanOrEqual(60);
  expect(level.routeHints!.map(hint => hint.label)).toEqual(['EBB', 'FLOOD']);
  expect(EULER.lip).toBeGreaterThan(2.3); // headroom to ride home beneath the chute lip
});

/** A bridge's deck top relative to its banks as the leading wheel (axle .7 m from the frame
 *  centre) reaches its near edge, riding its own way, with the window's west end at L. */
const arrival = (b: typeof BRIDGES[number], L: number) => {
  const frame = b.rise ? b.m - EULER.gap / 2 - .7 : b.m + EULER.gap / 2 + .7;
  return bridgeTop(b, Math.max(0, Math.min(1, (frame - L) / EULER.T))) - b.deck;
};
it('a bridge that is still down is under water (a splash, not a sunken deck to be stuck on)', () => {
  // Pinned as designed, every bridge is clear of the water as the rider reaches it.
  for (const b of BRIDGES) expect(arrival(b, b.rise ? EBB_L : FLOOD_L)).toBeGreaterThan(-EULER.water.depth + .15);
  // Set off from the spawn without ebbing, and the first canal bridge is still under water.
  expect(arrival(BRIDGES[0], EULER.upper.spawn)).toBeLessThan(-EULER.water.depth - .2);
  // Turn home 3 m short of the far-wall pin, and the first river bridge is still under water.
  expect(arrival(BRIDGES[4], FLOOD_L - 3)).toBeLessThan(-EULER.water.depth);
});

it('the pilot ebbs, crosses the four canal bridges, drops, floods and crosses the three river bridges home, never braking', async () => {
  const { state, braked } = await ride(createEulersBridgesPilot(), 80);
  expect(state.status).toBe('complete');
  expect([...state.collected].sort()).toEqual(allApples);
  expect(braked).toBe(false);
});

it('the campaign replay table drives Euler’s Bridges at its own index', async () => {
  const { state } = await ride(createReplayPilot(levels.indexOf(level)), 80);
  expect(state.status).toBe('complete');
  expect([...state.collected].sort()).toEqual(allApples);
});

it.each([
  ['idle', () => ({ tilt: 0, brake: false })],
  ['held right', (s: Snapshot) => ({ tilt: clamp((.3 - s.worldAngle) * 8, -1, 1), brake: false })],
  ['held left', (s: Snapshot) => ({ tilt: clamp((-.3 - s.worldAngle) * 8, -1, 1), brake: false })],
] as const)('fixed controls (%s) do not complete the map', async (_name, pilot) => {
  const { state } = await ride(pilot, 60);
  expect(state.status).not.toBe('complete');
  expect(state.collected.length).toBeLessThan(level.apples.length);
});

it('setting off east without ebbing to the wall first splashes at the first canal', async () => {
  const { state } = await ride(createEulersBridgesPilot({ ebb: false }), 80);
  expect(state.status).toBe('crashed');
  expect(state.collected).toEqual([]);
  expect(state.bike.x).toBeLessThan(BRIDGES[0].m);
});

it('the drop floods the clock by itself: even tilting a full radian back on landing, the rider reaches the far wall', async () => {
  // Documents the known weakness: FLOOD is execution, not a decision (see docs/eulers-bridges.md).
  const route = createEulersBridgesPilot(), home = createEulersBridgesPilot({ river: true, floodTo: -Infinity });
  let landed = 0, turned = false, previous = 0, farthest = 0;
  const { state } = await ride(s => {
    const vx = (s.bike.x - previous) * 120; previous = s.bike.x;
    if (s.bike.x > EULER.upper.end + 6 && s.bike.y < 1.2) landed++;
    if (!landed) return route(s);
    farthest = Math.max(farthest, s.bike.x);
    if (!turned && landed < 30) return route(s);
    if (!turned && vx > 0) return { tilt: clamp((-1 - s.worldAngle) * 8, -1, 1), brake: false };
    turned = true;
    return home(s);
  }, 80);
  expect(farthest).toBeGreaterThan(EULER.river.wall - EULER.reach - .3);
  expect(state.status).toBe('complete');
});

it('with the river clock frozen (every bridge fixed where it starts), the same route cannot take all seven apples', async () => {
  const frozen: Level = { ...level, id: 'eulers-frozen', timePlatforms: level.timePlatforms!.map(lift => ({ ...lift, to: lift.from })) };
  const { state } = await ride(createEulersBridgesPilot(), 80, frozen);
  expect(state.status).not.toBe('complete');
  expect(state.collected.length).toBeLessThan(level.apples.length);
});
