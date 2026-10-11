import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { createReplayPilot } from '../src/dev/replay';
import { createLeibnizPilot, HALL, leibnizCounterweightLevel as level, LEIBNIZ, WELL_Y } from '../src/levels/leibniz-counterweight';
import { levels } from '../src/levels';
import { paletteFor } from '../src/art-direction';
import type { BodyView, Controls, Level, Snapshot, Vec } from '../src/types';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const body = (state: Snapshot, id: string) => state.bodies.find(item => item.id === id)!;
const bridge = (state: Snapshot) => body(state, 'ledger-bridge');
const ball = (state: Snapshot) => state.bodies.find(item => item.id === 'ledger-ball');
const top = (item: BodyView) => item.y + item.h / 2;
const kerbTop = LEIBNIZ.floor.y + LEIBNIZ.kerb.rise;
const kerbFoot = LEIBNIZ.pit.x0 - LEIBNIZ.kerb.top - LEIBNIZ.kerb.run;
/** Steps the pilot for `seconds` while playing; `watch` sees every state. */
async function ride(pilot: (state: Snapshot) => Controls, seconds: number, map: Level = level, watch?: (state: Snapshot) => void) {
  const game = await createPhysics(); game.load(map);
  let state = game.snapshot();
  for (let i = 0; i < 120 * seconds && state.status === 'playing'; i++) { state = game.step(1 / 120, pilot(state)); watch?.(state); }
  game.destroy();
  return state;
}
/** Heading-relative speed follower (as in the level's pilot); `plan` picks speed, lean and brake each step. */
function follower(plan: (state: Snapshot, speed: number) => { speed: number; lean?: number; brake?: boolean } | Controls) {
  let previous: Vec | undefined, angle = 0, lastRaw = 0;
  return (state: Snapshot): Controls => {
    const dx = previous ? state.bike.x - previous.x : 0, dy = previous ? state.bike.y - previous.y : 0;
    previous = state.bike;
    const raw = body(state, 'frame').angle;
    angle += Math.atan2(Math.sin(raw - lastRaw), Math.cos(raw - lastRaw)); lastRaw = raw;
    const velocity = (dx * Math.cos(angle) + dy * Math.sin(angle)) * 120;
    const step = plan(state, velocity);
    if ('tilt' in step) return step;
    const lean = step.lean ?? .3;
    return { tilt: clamp((angle + clamp((step.speed - velocity) * .22, -lean, lean) - state.worldAngle) * 8, -1, 1), brake: step.brake ?? false };
  };
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
  // The ledger starts empty with the bridge at its top stop, 6 m above the kerbs; full, it is flush with them.
  expect(platform.from.y + platform.h / 2).toBeCloseTo(kerbTop + 6);
  expect(platform.to.y + platform.h / 2).toBeCloseTo(kerbTop);
  // Climbing out of the cellar, or out of the hall, always fills it before the kerb.
  expect(LEIBNIZ.cellar.depth + LEIBNIZ.kerb.rise).toBeGreaterThan(level.timeTravel! + .5);
  expect(LEIBNIZ.floor.y - HALL.floorY + LEIBNIZ.kerb.rise).toBeGreaterThan(level.timeTravel! + .5);
  // Neither wheel can be on the bridge while the rider is still on a kerb's slope.
  expect(LEIBNIZ.kerb.top).toBeGreaterThan(1.4);
  // The ball falls up, fills the corridor and is a little narrower than its well.
  const prop = level.props![0];
  expect(prop.inverted).toBe(true);
  expect(prop.w).toBeGreaterThan(LEIBNIZ.corridor.ceiling - 1);
  expect(2 * LEIBNIZ.well.half - prop.w).toBeCloseTo(.1);
  expect(prop.socket!.y).toBeGreaterThan(LEIBNIZ.corridor.ceiling);
  // Over the east kerb the ball cannot fit under the ceiling, so it cannot drift over the pit.
  expect(LEIBNIZ.corridor.ceiling - kerbTop).toBeLessThan(prop.h - .2);
});

it('completes the cellar, bridge, ball, loop and inverted ceiling route (campaign replay), never braking', async () => {
  const index = levels.indexOf(level);
  const pilot = createReplayPilot(index);
  let braked = false, flushAtEdge: number | undefined, seated = -1, maxAngle = 0;
  let onBridge: { min: number; max: number } | undefined;
  const state = await ride(s => { const c = pilot(s); braked ||= c.brake; return c; }, 150, level, s => {
    maxAngle = Math.max(maxAngle, s.worldAngle);
    if (flushAtEdge === undefined && s.bike.x > LEIBNIZ.pit.x0 - 1.5 && s.bike.y < 2) flushAtEdge = top(bridge(s));
    // The bridge holds still (to a few cm) while either wheel is over it: no passive carrying.
    if (['wheel-0', 'wheel-1'].some(id => { const w = body(s, id); return w.x > LEIBNIZ.pit.x0 && w.x < LEIBNIZ.pit.x1 && w.y < 2; })) {
      const y = bridge(s).y;
      onBridge = { min: Math.min(onBridge?.min ?? y, y), max: Math.max(onBridge?.max ?? y, y) };
    }
    if (seated < 0 && ball(s)?.settled) seated = s.elapsed;
  });
  expect(state.status).toBe('complete');
  expect(state.collected.sort()).toEqual(level.apples.map(apple => apple.id).sort());
  expect(braked).toBe(false);
  expect(Math.abs(flushAtEdge! - kerbTop)).toBeLessThan(.05);
  expect(onBridge!.max - onBridge!.min).toBeLessThan(.05);
  expect(seated).toBeGreaterThan(0);
  const plug = ball(state)!;
  expect(plug.x).toBeCloseTo(LEIBNIZ.well.x, 1); expect(plug.y).toBeCloseTo(WELL_Y, 1);
  expect(maxAngle).toBeGreaterThan(2.8); // upside down on the ceiling
  expect(state.elapsed).toBeGreaterThan(60);
}, 20000);

it('the ledger is altitude: a rider who turns back halfway down the cellar parks the bridge halfway', async () => {
  // Ride west into the cellar, turn back once 3 m below the floor, ride back out and stop short of the kerb.
  let back = false, lowest = Infinity;
  const state = await ride(follower(s => {
    lowest = Math.min(lowest, s.bike.y);
    back ||= s.bike.y < LEIBNIZ.floor.y + .72 - 3;
    return { speed: back ? (s.bike.x > 6 ? 0 : 2) : -2, brake: back && s.bike.x > 8 };
  }), 40);
  expect(state.status).toBe('playing');
  expect(state.bike.x).toBeGreaterThan(6); expect(state.bike.x).toBeLessThan(kerbFoot - 1);
  const climbed = LEIBNIZ.floor.y + .72 - lowest;
  expect(climbed).toBeGreaterThan(3); expect(climbed).toBeLessThan(4);
  // Every metre climbed out of the cellar lowered the bridge a metre from its top stop.
  expect(top(bridge(state))).toBeCloseTo(LEIBNIZ.bridge.top - climbed, 1);
}, 20000);

it('a rider who rides straight east with an empty ledger falls into the pit under the raised bridge', async () => {
  const state = await ride(follower(() => ({ speed: 2.5 })), 30);
  expect(state.status).toBe('crashed');
  expect(state.bike.x).toBeGreaterThan(LEIBNIZ.pit.x0); expect(state.bike.x).toBeLessThan(LEIBNIZ.pit.x1);
  // The kerb's half metre was all the ledger held (the bridge still 5.5 m up), and the fall spent it.
  expect(state.timeline).toBe(0);
  expect(top(bridge(state)) - kerbTop).toBeGreaterThan(5.4);
});

it('a hard stop on the tower floor (the frame pitches up, which the full ledger forgets) is paid back on the kerb', async () => {
  // Fill the ledger, come back fast, brake hard in the middle of the tower floor, then ride on.
  let filled = false, brakeAt = -1, lifted = 0, crossed = false;
  const state = await ride(follower((s, speed) => {
    filled ||= s.collected.includes('ledger-apple-cellar');
    if (!filled) return { speed: -2.5 };
    if (brakeAt < 0 && s.bike.x > 9 && speed > 4.5) brakeAt = s.elapsed;
    if (brakeAt > 0 && s.elapsed < brakeAt + 2) {
      lifted = Math.max(lifted, s.bike.y - (LEIBNIZ.floor.y + .72));
      return { tilt: clamp(-s.worldAngle * 8, -1, 1), brake: true };
    }
    return { speed: brakeAt > 0 ? 2.5 : 5, lean: .5 };
  }), 45, level, s => { crossed ||= s.bike.x > LEIBNIZ.pit.x1 + 1; });
  expect(brakeAt).toBeGreaterThan(0);
  // The stoppie lifted the frame far enough that, on a level approach, the bridge would stand a
  // step above the floor; the kerb's climb refills the ledger, and the rider crosses.
  expect(lifted).toBeGreaterThan(.25);
  expect(crossed).toBe(true);
  expect(state.status).toBe('playing');
}, 20000);

it('no alive-but-stuck state: a rider who skipped the cellar apple rides back from the door, re-parks the bridge from the east and finishes', async () => {
  // Turn back on the cellar ramp above the apple (the ledger still fills), ride the whole route
  // to the door, then reverse: ceiling, loop, hall (which empties and refills the ledger),
  // corridor, bridge, cellar apple, and back to the door.
  let stage: 'west' | 'east' | 'push' | 'ride' | 'back' | 'home' = 'west';
  let crossedBack = false;
  const state = await ride(follower(s => {
    const plug = ball(s);
    if (stage === 'west' && s.bike.y < LEIBNIZ.floor.y + .72 - 5.7) stage = 'east';
    if (stage === 'east' && s.bike.x > LEIBNIZ.pit.x1 - 1) stage = 'push';
    if (stage === 'push' && plug?.settled) stage = 'ride';
    if (stage === 'ride' && s.worldAngle > 2.5 && s.bike.x < 33) stage = 'back';
    if (stage === 'back' && s.collected.includes('ledger-apple-cellar')) stage = 'home';
    crossedBack ||= stage === 'back' && s.bike.x < LEIBNIZ.pit.x0 - 2;
    return stage === 'west' || stage === 'back' ? { speed: -2.5 } : stage === 'push' ? { speed: 3, lean: .6 } : { speed: 2.5 };
  }), 220);
  expect(crossedBack).toBe(true);
  expect(state.status).toBe('complete');
}, 20000);

it('the ball cannot be lost: pushed or floated past the well into the hall, an east-down tilt floats it back to seat', async () => {
  const map: Level = { ...level, props: [{ ...level.props![0], x: 66 }] };
  let stage: 'west' | 'east' | 'wait' | 'ride' = 'west';
  const state = await ride(follower(s => {
    if (stage === 'west' && s.collected.includes('ledger-apple-cellar')) stage = 'east';
    if (stage === 'east' && s.bike.x > 36) stage = 'wait';
    if (stage === 'wait' && ball(s)!.settled) stage = 'ride';
    if (stage === 'wait') return { tilt: clamp((.35 - s.worldAngle) * 4, -1, 1), brake: true };
    return { speed: stage === 'west' ? -2.5 : 2.5 };
  }), 150, map);
  expect(state.status).toBe('complete');
  expect(ball(state)!.x).toBeCloseTo(LEIBNIZ.well.x, 1);
}, 20000);

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
