import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { eulersBridgesLevel as level, createEulersBridgesPilot, BRIDGES, EULER, bridgeTop } from '../src/levels/eulers-bridges';
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

it('setting off east without ebbing to the wall first fails at the canals', async () => {
  const { state } = await ride(createEulersBridgesPilot({ ebb: false }), 80);
  expect(state.status).not.toBe('complete');
  expect(state.collected.length).toBeLessThan(level.apples.length);
});

it('braking on the river landing and turning home short of the far wall fails at the river bridges', async () => {
  const route = createEulersBridgesPilot();
  const home = createEulersBridgesPilot({ river: true, floodTo: -Infinity });
  let landed = false, stopped = false, previous: Snapshot | undefined, turnedAt = 0;
  const { state } = await ride(s => {
    const vx = previous ? (s.bike.x - previous.bike.x) * 120 : 0; previous = s;
    landed ||= s.bike.x > EULER.upper.end + 6 && s.bike.y < EULER.river.y + 1.5;
    if (!landed) return route(s);
    if (!stopped && vx > .05) return { tilt: clamp(-s.worldAngle * 8, -1, 1), brake: true };
    if (!stopped) turnedAt = s.bike.x;
    stopped = true;
    return home(s);
  }, 80);
  expect(turnedAt).toBeLessThan(EULER.river.wall - EULER.reach - 1.5);
  expect(state.collected.length).toBeGreaterThanOrEqual(4); // the canals went as designed
  expect(state.status).not.toBe('complete');
  expect(state.collected.length).toBeLessThan(level.apples.length);
});

it('with the river clock frozen (every bridge fixed where it starts), the same route cannot take all seven apples', async () => {
  const frozen: Level = { ...level, id: 'eulers-frozen', timePlatforms: level.timePlatforms!.map(lift => ({ ...lift, to: lift.from })) };
  const { state } = await ride(createEulersBridgesPilot(), 80, frozen);
  expect(state.status).not.toBe('complete');
  expect(state.collected.length).toBeLessThan(level.apples.length);
});
