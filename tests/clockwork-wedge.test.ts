import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { pathPoint } from '../src/physics-time';
import { clockworkWedgeLevel as level, createClockworkWedgePilot, WEDGE, CAUGHT_X } from '../src/levels/clockwork-wedge';
import { levels } from '../src/levels';
import type { BodyView, Controls, Level, Snapshot } from '../src/types';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const weight = (state: Snapshot) => state.bodies.find(body => body.id === 'wedge-weight')!;
const wedge = (state: Snapshot) => state.bodies.find(body => body.id === 'wedge-ramp')!;
const seated = (body: BodyView) => Math.hypot(body.x - WEDGE.door.x, body.y - WEDGE.door.y) < .05;
/** Does the weight cover the exit sensor (ball .8)? */
const covers = (body: BodyView) => Math.abs(body.x - level.exit.x) < body.w / 2 + .8 && Math.abs(body.y - level.exit.y) < body.h / 2 + .8;
/** Hold the world at a fixed angle, as a held button does once it gets there. */
const hold = (angle: number) => (state: Snapshot): Controls => ({ tilt: clamp((angle - state.worldAngle) * 8, -1, 1), brake: false });
/** Ride along x at a steady speed with the world kept within ±max rad of level. */
const cruise = (speed: number, max = .3) => {
  let previous: Snapshot | undefined;
  return (state: Snapshot): Controls => {
    const vx = previous ? (state.bike.x - previous.bike.x) * 120 : 0; previous = state;
    return hold(clamp((speed - vx) * .22, -max, max))(state);
  };
};
const norm = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const frame = (state: Snapshot) => state.bodies.find(body => body.id === 'frame')!;
/** Steps the pilot for `seconds` while playing; `watch` returning true ends the ride early. */
async function ride(pilot: (state: Snapshot) => Controls, seconds: number, map: Level = level, watch?: (state: Snapshot) => void | boolean) {
  const game = await createPhysics(); game.load(map);
  let state = game.snapshot();
  for (let i = 0; i < 120 * seconds && state.status === 'playing'; i++) { state = game.step(1 / 120, pilot(state)); if (watch?.(state) === true) break; }
  game.destroy();
  return state;
}
const prop = level.props![0];
/** The wedge already in its seat (it becomes fixed on the first step), no apples. */
const wedgeSeated = (spawn: { x: number; y: number }, extra: Partial<Level> = {}): Level => ({ ...level, id: 'wedge-seated', spawn, apples: [],
  props: [{ ...prop, x: prop.socket!.x, y: prop.socket!.y }], ...extra });
/** The weight already lowered onto the door. */
const lowered: Partial<Level> = { timePlatforms: [{ ...level.timePlatforms![0], from: WEDGE.door, via: undefined, to: WEDGE.door }] };

it('follows The Clockwork Apple in the campaign; the wedge waits on the floor west of the spawn, under the deck', () => {
  const index = levels.indexOf(level);
  expect(levels[index - 1].id).toBe('clockwork-apple');
  expect(level.timeLabel).toBe('COUNTERWEIGHT');
  expect(prop.shape).toBe('wedge');
  // Light, grippy, heavily damped, with a bumper toe as deep as its seat.
  expect(prop.friction).toBeGreaterThanOrEqual(.7); expect(prop.friction).toBeLessThanOrEqual(.8);
  expect(prop.density).toBeLessThanOrEqual(.2);
  expect(prop.damping).toBeGreaterThanOrEqual(4);
  expect(prop.toe).toBeCloseTo(.35);
  expect(prop.socket!.y - prop.h / 2).toBeCloseTo(-prop.toe!); // seated, the slope starts flush with the floor
  expect(prop.x).toBeLessThan(level.spawn.x);
  expect(prop.y - prop.h / 2).toBeCloseTo(WEDGE.floor);
  expect(prop.y + prop.h / 2).toBeLessThan(WEDGE.deck.y - 2); // headroom under the deck
  expect(prop.x - prop.w / 2).toBeGreaterThan(WEDGE.westPipe.x + WEDGE.westPipe.r + 10); // room to turn and come back behind it
  // The PUSH mark sits at floor level on the approach behind the wedge, where the COUNTERWEIGHT panel never covers it.
  const push = level.routeHints!.find(hint => hint.label === 'PUSH')!;
  expect(push.x).toBeLessThan(prop.x - prop.w / 2); expect(prop.x - prop.w / 2 - push.x).toBeLessThan(8);
  expect(push.y).toBeLessThan(prop.y + prop.h / 2);
  expect(level.difficulty).toBeGreaterThanOrEqual(10); expect(level.difficulty).toBeLessThanOrEqual(11);
});

it.each([undefined, 1.5, 2.5])('completes the fetch, push, loop, roof and catch route (final turn %s rad/s; button rate when undefined), never braking', async turnRate => {
  const pilot = createClockworkWedgePilot({ turnRate });
  let maxAngle = 0, braked = false, maxTilt = 0, wedgeSettled = false, pushSpeed = 0, seatedAt = -1;
  let previous: Snapshot | undefined;
  const state = await ride(s => {
    const control = pilot(s);
    braked ||= control.brake; maxTilt = Math.max(maxTilt, Math.abs(control.tilt));
    return control;
  }, 150, level, s => {
    maxAngle = Math.max(maxAngle, s.worldAngle);
    if (!wedgeSettled && previous && s.bike.x > 0 && s.bike.y < 1) pushSpeed = Math.max(pushSpeed, (s.bike.x - previous.bike.x) * 120);
    if (!wedgeSettled && wedge(s).settled) seatedAt = s.elapsed;
    wedgeSettled ||= !!wedge(s).settled; previous = s;
  });
  expect(state.status).toBe('complete');
  expect(state.collected.sort()).toEqual(level.apples.map(apple => apple.id).sort());
  expect(wedgeSettled).toBe(true);
  expect(seatedAt).toBeGreaterThan(0);
  expect(pushSpeed).toBeLessThan(3); // a feathered push, never a charge
  expect(braked).toBe(false);
  expect(maxTilt).toBeLessThanOrEqual(1); // button rate
  expect(maxAngle).toBeGreaterThan(Math.PI); // inverted on the roof…
  expect(state.worldAngle).toBeCloseTo(2 * Math.PI, 1); // …and a full turn by the door
  expect(Math.abs(norm(frame(state).angle))).toBeLessThan(1); // lands upright-ish
  // The lifted weight is clear of the drop line when the rider lands.
  expect(weight(state).x - WEDGE.block.w / 2).toBeGreaterThanOrEqual(WEDGE.door.x + WEDGE.block.w / 2);
});

it('a rider caught at the stop under the roof who does not turn the world stays caught', async () => {
  const pilot = createClockworkWedgePilot();
  let caughtAt = -1;
  const state = await ride(s => {
    if (caughtAt < 0 && s.worldAngle > 2.9 && s.bike.y > WEDGE.roof.y - 1.5 && s.bike.x < CAUGHT_X + 1) caughtAt = s.elapsed;
    return caughtAt < 0 ? pilot(s) : hold(Math.PI)(s);
  }, 150);
  expect(caughtAt).toBeGreaterThan(0);
  expect(state.status).toBe('playing');
  expect(state.bike.y).toBeGreaterThan(WEDGE.roof.y - 1.5);
  expect(Math.abs(state.bike.x - CAUGHT_X)).toBeLessThan(1.5);
});

/** The pilot into the catch; once the rider is still there, the world is turned from π to a full
 *  turn at `rate` (button presses up to .95 rad/s, a phone's worldAngle target above), stopping
 *  for `pause` seconds when the turn reaches `pauseAt`. Returns the end state and where the
 *  rider first touched down in the bay. */
async function finale(rate: number, pauseAt: number, pause: number) {
  const game = await createPhysics(); game.load(level);
  const pilot = createClockworkWedgePilot();
  const end = 2 * Math.PI;
  let state = game.snapshot(), previous = state.bike.x, still = 0, caught = false, target = Math.PI, pausedUntil = -1, landed: Snapshot | undefined;
  while (state.elapsed < 150 && state.status === 'playing') {
    let control: Controls;
    if (!caught) {
      control = pilot(state);
      if (state.worldAngle > 2.9 && state.bike.y > WEDGE.roof.y - 1.5 && state.bike.x < CAUGHT_X + 1) still = Math.abs(state.bike.x - previous) * 120 < .05 ? still + 1 : 0;
      previous = state.bike.x;
      if (still > 12) { caught = true; target = state.worldAngle; }
      state = game.step(1 / 120, control);
      continue;
    }
    if (pausedUntil < 0 && target >= pauseAt) pausedUntil = state.elapsed + pause;
    const advancing = !(pausedUntil >= 0 && state.elapsed < pausedUntil);
    if (advancing) target = Math.min(end, target + rate / 120);
    control = rate <= .95 ? { tilt: advancing && target < end - 1e-6 ? 1 : 0, brake: false } : { tilt: 0, brake: false, worldAngle: target };
    state = game.step(1 / 120, control);
    if (!landed && state.bike.y < 3) landed = state;
    if (landed && state.elapsed > landed.elapsed + 5) break;
  }
  game.destroy();
  return { caught, state, landed };
}

it.each([.95, 1.5, 2.5])('hesitating at the catch: a 3 s pause anywhere on the way round (3.3 … 6.2 rad, every .2) then turning on at %f rad/s still lands on the door', async rate => {
  for (let pauseAt = 3.3; pauseAt < 6.21; pauseAt += .2) {
    const { caught, state, landed } = await finale(rate, pauseAt, 3);
    expect(caught, `pause at ${pauseAt.toFixed(1)}`).toBe(true);
    expect(state.status, `pause at ${pauseAt.toFixed(1)}`).toBe('complete');
    expect(state.collected.length, `pause at ${pauseAt.toFixed(1)}`).toBe(level.apples.length);
    // Touches down in the bay between the post and the wall, wheels first.
    expect(landed!.bike.x, `pause at ${pauseAt.toFixed(1)}`).toBeGreaterThan(WEDGE.stop.x1 + .5);
    expect(landed!.bike.x, `pause at ${pauseAt.toFixed(1)}`).toBeLessThan(WEDGE.wall.x0 - .5);
    expect(Math.abs(norm(frame(state).angle)), `pause at ${pauseAt.toFixed(1)}`).toBeLessThan(1);
  }
}, 120000);

it('a naive ride right stays on the deck: the wedge never moves and the door is out of reach', async () => {
  let lowest = Infinity;
  const state = await ride(cruise(2), 40, level, s => { lowest = Math.min(lowest, s.bike.y); });
  expect(state.status).toBe('playing');
  expect(lowest).toBeGreaterThan(WEDGE.deck.y);
  expect(Math.abs(wedge(state).x - prop.x)).toBeLessThan(.1);
});

it.each([.6, 1])('holding the world at %f rad from the spawn, the rider rocks in the deck’s curl without crashing', async angle => {
  let lowest = Infinity, east = -Infinity;
  const state = await ride(hold(angle), 20, level, s => { lowest = Math.min(lowest, s.bike.y); east = Math.max(east, s.bike.x); });
  expect(state.status).toBe('playing');
  expect(lowest).toBeGreaterThan(WEDGE.deck.y);
  expect(east).toBeLessThan(WEDGE.deck.x1 + 2);
});

it.each([.6, 1])('a fast floor rider (world held at %f rad) finds the weight already seated on the door', async angle => {
  // From the foot of the west quarter-pipe with the weight fully raised, and
  // the wedge taken out of the way: the race is the floor against the clock.
  let seatedAhead: boolean | undefined;
  const state = await ride(hold(angle), 20, { ...level, spawn: { x: WEDGE.westPipe.x + 3, y: .72 }, props: [] }, s => {
    if (seatedAhead === undefined && s.bike.x > WEDGE.door.x - 20) seatedAhead = seated(weight(s));
  });
  expect(seatedAhead).toBe(true);
  expect(state.status).not.toBe('complete');
});

it.each([-.3, -.6, -1, -1.2])('the door cannot be entered from the east: back from the half-pipe at %f rad, the wall stops the rider', async angle => {
  // The worst case: no apples to collect, the wedge seated and the weight raised (the door open).
  let west = Infinity;
  const state = await ride(hold(angle), 20, wedgeSeated({ x: 50, y: .72 }), s => { west = Math.min(west, s.bike.x); });
  expect(state.status).not.toBe('complete');
  expect(west).toBeGreaterThan(WEDGE.wall.x1);
});

it('riding left on the floor lifts the weight clear of the drop line, and riding back right lowers it again', async () => {
  const game = await createPhysics(); game.load({ ...level, spawn: { x: 10, y: .72 }, apples: [] });
  let state = game.snapshot(), stage = 0, seatedFirst = false, cleared = false;
  const right = cruise(2), left = cruise(-2);
  for (let i = 0; i < 120 * 90 && state.status === 'playing' && stage < 3; i++) {
    // Right to x = 30 (20 m: the weight seats), back left to x = 12, then right again.
    if (stage === 0 && state.bike.x > 30) { stage = 1; seatedFirst = seated(weight(state)); }
    if (stage === 1 && state.bike.x < 12) stage = 2;
    if (stage === 2 && state.bike.x > 30) stage = 3;
    if (stage === 2) cleared ||= weight(state).x - WEDGE.block.w / 2 >= WEDGE.door.x + WEDGE.block.w / 2;
    state = game.step(1 / 120, stage === 1 ? left(state) : right(state));
  }
  for (let i = 0; i < 120 * 3; i++) state = game.step(1 / 120, hold(0)(state));
  game.destroy();
  expect(stage).toBe(3);
  expect(seatedFirst).toBe(true);
  expect(cleared).toBe(true);
  expect(covers(weight(state))).toBe(true);
});

it('the weight’s path clears the seated wedge, the one-way wall, the ramp rider and the roof rider; nothing hangs low over the crossing', () => {
  const path = level.timePlatforms![0], { w, h } = WEDGE.block, rider = 1.9; // wheels to helmet, with margin
  for (let i = 0; i <= 200; i++) {
    const c = pathPoint(path, i / 200), x0 = c.x - w / 2, x1 = c.x + w / 2, bottom = c.y - h / 2, top = c.y + h / 2;
    expect(x0).toBeGreaterThanOrEqual(WEDGE.stop.x1 - 1e-9); // east of the seated wedge and its post
    if (x1 > WEDGE.wall.x0) expect(bottom).toBeGreaterThan(WEDGE.wall.top);
    if (x1 > WEDGE.ramp.from.x) expect(bottom).toBeGreaterThan(WEDGE.ramp.from.y + rider);
    expect(top).toBeLessThan(WEDGE.roof.y - rider);
    // Under the catch the rider hangs from the recess ceiling, `lift` above the roof.
    if (x1 > WEDGE.catch.x - .3 && x0 < CAUGHT_X + WEDGE.bike.frame / 2 + .3) expect(top).toBeLessThan(WEDGE.roof.y + WEDGE.catch.lift - rider);
  }
  // Raised, it is off the drop line beneath the catch.
  expect(WEDGE.raised.x - w / 2).toBeGreaterThan(WEDGE.door.x + w / 2);
  // Over the crossing (the seated wedge's top, the weight and the wall), no stone lower than 3.3 m above the weight's top.
  const weightTop = WEDGE.door.y + h / 2;
  for (const surface of level.surfaces) {
    const c = Math.abs(Math.cos(surface.angle ?? 0)), sn = Math.abs(Math.sin(surface.angle ?? 0));
    const hw = (surface.w * c + surface.h * sn) / 2, hh = (surface.w * sn + surface.h * c) / 2;
    if (surface.x + hw <= WEDGE.seat.x0 || surface.x - hw >= WEDGE.wall.x1 || surface.y + hh <= weightTop + .01) continue;
    if (surface.id === 'wedge-wheel-stop' || surface.id === 'wedge-east-wall') continue; // the post and wall, below the crossing
    expect(surface.y - hh, surface.id).toBeGreaterThanOrEqual(weightTop + 3.3);
  }
});

it.each([3, 6, 8, 10])('crossing the seated wedge and the weight at %f m/s never crashes', async speed => {
  // A player tilts as far as it takes (up to .7 rad) to climb the wedge, then keeps the pace.
  let east = -Infinity;
  // Ends at the foot of the down-ramp, before the half-pipe.
  const state = await ride(cruise(speed, .7), 25, wedgeSeated({ x: 14, y: .72 }, lowered), s => { east = Math.max(east, s.bike.x); return s.bike.x > WEDGE.ramp.to.x + 2; });
  expect(state.status).not.toBe('crashed');
  expect(east).toBeGreaterThan(WEDGE.ramp.to.x); // over the wall and down the ramp
});

it.each([.05, .1, .15])('a slow roll off the weight’s top (world held at %f rad) lands on the down-ramp without crashing', async angle => {
  let east = -Infinity;
  const state = await ride(hold(angle), 12, wedgeSeated({ x: WEDGE.door.x - .5, y: WEDGE.block.h + .72 }, lowered), s => { east = Math.max(east, s.bike.x); return s.bike.x > WEDGE.ramp.to.x + 2; });
  expect(state.status).not.toBe('crashed');
  expect(east).toBeGreaterThan(WEDGE.ramp.from.x + 2);
});

it.each([.3, .45, .6])('the wedge stays put (moves < .3 m) with the world held at %f rad for 20 s from the spawn', async angle => {
  const state = await ride(hold(angle), 20);
  expect(state.status).toBe('playing');
  expect(Math.hypot(wedge(state).x - prop.x, wedge(state).y - prop.y)).toBeLessThan(.3);
});

it.each([.8, 1])('a wedge loosed by the world held at %f rad never escapes the approach lane or tumbles', async angle => {
  let east = -Infinity, maxTurn = 0;
  const state = await ride(hold(angle), 20, level, s => {
    const body = wedge(s); east = Math.max(east, body.x + body.w / 2); maxTurn = Math.max(maxTurn, Math.abs(body.angle));
  });
  expect(state.status).toBe('playing'); // the rider rocks in the deck's curl meanwhile
  expect(east).toBeLessThan(WEDGE.stop.x0 + .01); // never past the post into the door bay
  expect(maxTurn).toBeLessThan(.4);
});

it.each([[.3, 3], [.4, 3], [.5, 3], [.3, 8], [.5, 8], [.8, 3], [.8, 8], [.8, 10]])('a plain push with the world held at %f rad from %f m behind the wedge seats it without crashing', async (angle, back) => {
  let seatedAt = -1;
  const state = await ride(s => { if (seatedAt < 0 && wedge(s).settled) seatedAt = s.elapsed; return hold(seatedAt < 0 ? angle : 0)(s); },
    70, { ...level, apples: [], spawn: { x: prop.x - prop.w / 2 - back, y: .72 } }, s => seatedAt > 0 && s.elapsed > seatedAt + 3);
  expect(seatedAt).toBeGreaterThan(0);
  expect(state.status).toBe('playing');
  expect(wedge(state).x).toBeCloseTo(prop.socket!.x, 0);
});

it('charging the wedge from the west quarter-pipe with the world held at .3 rad seats it without crashing', async () => {
  // The pilot's fetch (west along the deck, down the slide, into the pipe); from the turn a player
  // holds .3 rad all the way to the wedge and leans on it until it seats.
  const pilot = createClockworkWedgePilot();
  let charging = false, seatedAt = -1, previous = level.spawn.x;
  const state = await ride(s => {
    if (!charging && s.bike.x < WEDGE.westPipe.x + 2 && s.bike.x > previous) charging = true;
    previous = s.bike.x;
    if (seatedAt < 0 && wedge(s).settled) seatedAt = s.elapsed;
    return !charging ? pilot(s) : hold(seatedAt < 0 ? .3 : 0)(s);
  }, 90, level, s => seatedAt > 0 && s.elapsed > seatedAt + 3);
  expect(charging).toBe(true);
  expect(seatedAt).toBeGreaterThan(0);
  expect(state.status).toBe('playing');
  expect(wedge(state).x).toBeCloseTo(prop.socket!.x, 0);
});

it.each([[39.2, 2.6], [40, 2.6], [40.8, 2.6], [40, 5.5], [39.5, 7.6]])('a rider dropped into the door bay at (%f, %f) without every apple crashes instead of being stranded', async (x, y) => {
  const state = await ride(hold(0), 10, { ...level, spawn: { x, y } });
  expect(state.status).toBe('crashed');
});

it.each<Controls>([{ tilt: 0, brake: false }, { tilt: 1, brake: false }, { tilt: -1, brake: false }])('is not completed by fixed controls (%o)', async control => {
  const state = await ride(() => control, 40);
  expect(state.status).not.toBe('complete');
});
