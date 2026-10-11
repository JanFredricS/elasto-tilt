import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { createReplayPilot } from '../src/dev/replay';
import { createLeibnizPilot, leibnizCounterweightLevel as level, LEIBNIZ, WELL_Y } from '../src/levels/leibniz-counterweight';
import { levels } from '../src/levels';
import { paletteFor } from '../src/art-direction';
import type { BodyView, Controls, Level, Snapshot } from '../src/types';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const bridge = (state: Snapshot) => state.bodies.find(body => body.id === 'ledger-bridge')!;
const ball = (state: Snapshot) => state.bodies.find(body => body.id === 'ledger-ball');
const top = (body: BodyView) => body.y + body.h / 2;
/** Steps the pilot for `seconds` while playing; `watch` sees every state. */
async function ride(pilot: (state: Snapshot) => Controls, seconds: number, map: Level = level, watch?: (state: Snapshot) => void) {
  const game = await createPhysics(); game.load(map);
  let state = game.snapshot();
  for (let i = 0; i < 120 * seconds && state.status === 'playing'; i++) { state = game.step(1 / 120, pilot(state)); watch?.(state); }
  game.destroy();
  return state;
}

it('sits between The Clockwork Apple and The Clockwork Wedge, a sand-palette LEDGER map on a vertical axis', () => {
  const index = levels.indexOf(level);
  expect(levels[index - 1].id).toBe('clockwork-apple');
  expect(levels[index + 1].id).toBe('clockwork-wedge');
  expect(level.difficulty).toBe(10.25);
  expect(level.timeLabel).toBe('LEDGER');
  expect(level.timeAxis).toEqual({ x: 0, y: 1 });
  expect(paletteFor(level.id)).toBe(paletteFor('clockwork-apple'));
  // A counterweight: the bridge's whole path is vertical and as long as the ledger, so it
  // moves a metre for every metre the rider climbs or descends.
  const platform = level.timePlatforms![0];
  expect(platform.from.x).toBe(platform.to.x);
  expect(platform.via).toBeUndefined();
  expect(platform.from.y - platform.to.y).toBeCloseTo(level.timeTravel!);
  // The ledger starts empty with the bridge at its top stop, 6 m above the floor; full, it is flush.
  expect(platform.from.y + platform.h / 2).toBeCloseTo(LEIBNIZ.floor.y + 6);
  expect(platform.to.y + platform.h / 2).toBeCloseTo(LEIBNIZ.floor.y);
  // The cellar is deeper than the ledger, so climbing out of it always fills it.
  expect(LEIBNIZ.cellar.depth).toBeGreaterThan(level.timeTravel!);
  // The ball falls up, fills the corridor and is a little narrower than its well.
  const prop = level.props![0];
  expect(prop.inverted).toBe(true);
  expect(prop.w).toBeGreaterThan(LEIBNIZ.corridor.ceiling - 1);
  expect(2 * LEIBNIZ.well.half - prop.w).toBeCloseTo(.1);
  expect(prop.socket!.y).toBeGreaterThan(LEIBNIZ.corridor.ceiling);
});

it('completes the cellar, bridge, ball, loop and inverted ceiling route (campaign replay), never braking', async () => {
  const index = levels.indexOf(level);
  const pilot = createReplayPilot(index);
  let braked = false, flushAtEdge: number | undefined, seated = -1, maxAngle = 0;
  let onBridge: { min: number; max: number } | undefined;
  const state = await ride(s => { const c = pilot(s); braked ||= c.brake; return c; }, 150, level, s => {
    maxAngle = Math.max(maxAngle, s.worldAngle);
    if (flushAtEdge === undefined && s.bike.x > LEIBNIZ.pit.x0 - 1.5 && s.bike.y < 2) flushAtEdge = top(bridge(s));
    // The bridge holds still (to a few cm) while the rider is over it: no passive carrying.
    if (s.bike.x > LEIBNIZ.pit.x0 && s.bike.x < LEIBNIZ.pit.x1 && s.bike.y < 2) {
      const y = bridge(s).y;
      onBridge = { min: Math.min(onBridge?.min ?? y, y), max: Math.max(onBridge?.max ?? y, y) };
    }
    if (seated < 0 && ball(s)?.settled) seated = s.elapsed;
  });
  expect(state.status).toBe('complete');
  expect(state.collected.sort()).toEqual(level.apples.map(apple => apple.id).sort());
  expect(braked).toBe(false);
  expect(Math.abs(flushAtEdge!)).toBeLessThan(.05);
  expect(onBridge!.max - onBridge!.min).toBeLessThan(.05);
  expect(seated).toBeGreaterThan(0);
  const plug = ball(state)!;
  expect(plug.x).toBeCloseTo(LEIBNIZ.well.x, 1); expect(plug.y).toBeCloseTo(WELL_Y, 1);
  expect(maxAngle).toBeGreaterThan(2.8); // upside down on the ceiling
  expect(state.elapsed).toBeGreaterThan(60);
}, 20000);

it('the ledger is altitude: a rider who turns back halfway down the cellar parks the bridge halfway', async () => {
  // Ride west into the cellar, turn back once 3 m below the floor, ride back out and stop.
  let previous: Snapshot | undefined, back = false, lowest = Infinity;
  const state = await ride(s => {
    const vx = previous ? (s.bike.x - previous.bike.x) * 120 : 0; previous = s;
    lowest = Math.min(lowest, s.bike.y);
    back ||= s.bike.y < LEIBNIZ.floor.y + .72 - 3;
    const speed = back ? (s.bike.x > 6 ? 0 : 2) : -2;
    const frame = s.bodies.find(body => body.id === 'frame')!.angle;
    return { tilt: clamp((frame + clamp((speed - vx) * .22, -.3, .3) - s.worldAngle) * 8, -1, 1), brake: back && s.bike.x > 8 };
  }, 40);
  expect(state.status).toBe('playing');
  expect(state.bike.x).toBeGreaterThan(6); expect(state.bike.x).toBeLessThan(LEIBNIZ.pit.x0 - 2);
  const climbed = LEIBNIZ.floor.y + .72 - lowest;
  expect(climbed).toBeGreaterThan(3); expect(climbed).toBeLessThan(4);
  // Every metre climbed out of the cellar lowered the bridge a metre from its 6 m stop.
  expect(top(bridge(state))).toBeCloseTo(6 - climbed, 1);
}, 20000);

it('a rider who rides straight east with an empty ledger falls into the pit under the raised bridge', async () => {
  let previous: Snapshot | undefined;
  const state = await ride(s => {
    const vx = previous ? (s.bike.x - previous.bike.x) * 120 : 0; previous = s;
    return { tilt: clamp((clamp((2.5 - vx) * .22, -.3, .3) - s.worldAngle) * 8, -1, 1), brake: false };
  }, 30);
  expect(state.status).toBe('crashed');
  expect(state.bike.x).toBeGreaterThan(LEIBNIZ.pit.x0); expect(state.bike.x).toBeLessThan(LEIBNIZ.pit.x1);
  expect(state.timeline).toBe(0);
  expect(top(bridge(state))).toBeCloseTo(6, 1);
});

it('counterfactual: with the bridge frozen at its top stop, the same pilot falls into the pit', async () => {
  const platform = level.timePlatforms![0];
  const frozen: Level = { ...level, timePlatforms: [{ ...platform, to: platform.from }] };
  const state = await ride(createLeibnizPilot(), 60, frozen);
  expect(state.status).toBe('crashed');
  expect(state.bike.x).toBeGreaterThan(LEIBNIZ.pit.x0 - 1); expect(state.bike.x).toBeLessThan(LEIBNIZ.pit.x1 + 1);
  expect(state.collected).not.toContain('ledger-apple-corridor');
}, 20000);

it('counterfactual: without the rising ball the well stays open and the upside-down rider falls into it', async () => {
  const state = await ride(createLeibnizPilot(), 150, { ...level, props: [] });
  expect(state.status).toBe('crashed');
  expect(Math.abs(state.bike.x - LEIBNIZ.well.x)).toBeLessThan(2);
  expect(state.bike.y).toBeGreaterThan(LEIBNIZ.corridor.ceiling - 1.5);
  expect(state.collected).not.toContain('ledger-apple-ceiling');
}, 20000);
