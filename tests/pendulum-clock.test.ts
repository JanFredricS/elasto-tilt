import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { cyclePhase, pathPoint } from '../src/physics-time';
import {
  CLOCK, CLOCK_FACE as F, createPendulumClockPilot, escapeSchedule, palletSchedule, pendulumClockLevel as level,
} from '../src/levels/pendulum-clock';
import { levels } from '../src/levels';
import { createReplayPilot } from '../src/dev/replay';
import type { BodyView, Controls, Level, Snapshot, TimePlatform } from '../src/types';

const body = (state: Snapshot, id: string) => state.bodies.find(b => b.id === id)!;
const top = (piston: BodyView) => piston.y + piston.h / 2;
const lift = (id: string) => level.timePlatforms!.filter(platform => platform.id.startsWith(`${id}-`));
const bars = ['clock-tick', 'clock-tock'] as const;
const pallet = (id: string) => level.timePlatforms!.find(platform => platform.id === id)!;
/** Height of a pallet bar's underside above the dial floor. */
const clearance = (state: Snapshot, id: string) => { const bar = body(state, id); return bar.y - bar.h / 2 - CLOCK.dial.y; };
async function ride(pilot: (state: Snapshot) => Controls, seconds: number, map: Level = level, watch?: (state: Snapshot) => void | boolean) {
  const game = await createPhysics(); game.load(map);
  let state = game.snapshot();
  for (let i = 0; i < 120 * seconds && state.status === 'playing'; i++) { state = game.step(1 / 120, pilot(state)); if (watch?.(state) === true) break; }
  game.destroy();
  return state;
}

it('builds an escapement of antiphase lifts, two antiphase red pallets on a 6 s beat and a heavy-damped hand', () => {
  expect(level.difficulty).toBe(11.75);
  const ids = [...level.surfaces, ...level.apples, ...level.timePlatforms!, ...level.swings!].map(item => item.id);
  expect(new Set(ids).size).toBe(ids.length);
  // Two lifts, each a pair of tyre-wide pistons a wheelbase apart, in antiphase; their tops meet as E1 peaks.
  const [low0, low1] = lift('clock-escape-1'), [high0] = lift('clock-escape-2');
  expect(lift('clock-escape-1')).toHaveLength(2); expect(lift('clock-escape-2')).toHaveLength(2);
  expect(Math.abs((low1.from.x - low0.from.x) - 1.4)).toBeLessThan(.2);
  expect(low0.period).toBe(high0.period);
  expect(Math.abs(((high0.offset ?? 0) - (low0.offset ?? 0) + 1) % 1 - .5)).toBeLessThan(1e-9);
  expect(CLOCK.escapeLow.high).toBe(CLOCK.escapeHigh.low);
  expect(CLOCK.escapeLow.low).toBe(CLOCK.start.y); expect(CLOCK.escapeHigh.high).toBe(CLOCK.dial.y);
  // Both over-travel their floors, so a rider steps down onto them.
  expect(CLOCK.over.low).toBeGreaterThan(0); expect(CLOCK.over.high).toBeGreaterThan(0);
  expect(escapeSchedule(CLOCK.escapeLow, 0).top).toBeCloseTo(cyclePhase(0, 12, CLOCK.escapeLow.offset) * 3.2 - .1, 9);
  // The pallets (tick, tock): moving hazards on their own 6 s cycle, in antiphase, each dropping to
  // within a wheel of the dial floor and rising clear of a rider's helmet (≈ 1.75 m) during its dwell.
  for (const [id, schedule] of [['clock-tick', CLOCK.tick], ['clock-tock', CLOCK.tock]] as const) {
    const bar = pallet(id);
    expect(bar.kind).toBe('hazard');
    expect(bar.period).toBe(6);
    expect(bar.to.y - bar.h / 2 - CLOCK.dial.y).toBeLessThan(.34);
    expect(bar.from.y - bar.h / 2 - CLOCK.dial.y).toBeGreaterThan(3);
    for (const t of [0, 1.7, 4.2]) expect(palletSchedule(t, schedule).clearance).toBeCloseTo(pathPoint(bar, cyclePhase(t, 6, bar.offset)).y - bar.h / 2 - CLOCK.dial.y, 9);
    expect(level.apples.find(apple => apple.id === `${id}-jaws`)!.x).toBe(bar.from.x);
  }
  expect(Math.abs(((pallet('clock-tock').offset ?? 0) - (pallet('clock-tick').offset ?? 0) + 1) % 1 - .5)).toBeLessThan(1e-9);
  // A stopped bike (wheels at ±1.04) fits between the bars with room to spare.
  expect(CLOCK.tock.x - CLOCK.tick.x - CLOCK.pallet.w).toBeGreaterThan(2.08 + 2);
  // The hour marks are signage set wholly inside the dial's stone, below its floor.
  const dial = level.surfaces.find(surface => surface.id === 'clock-dial')!;
  const marks = level.surfaces.filter(surface => surface.id.startsWith('clock-hour-'));
  expect(marks).toHaveLength(12);
  for (const mark of marks) {
    expect(mark.kind).toBe('cradle');
    const reach = Math.hypot(mark.w, mark.h) / 2;
    expect(mark.x - reach).toBeGreaterThan(dial.x - dial.w / 2); expect(mark.x + reach).toBeLessThan(dial.x + dial.w / 2);
    expect(mark.y - reach).toBeGreaterThan(dial.y - dial.h / 2); expect(mark.y + reach).toBeLessThan(CLOCK.dial.y - .5);
  }
  // The hand: Huygens' grammar, light on a heavily damped bearing.
  const [hand] = level.swings!;
  expect(level.swings).toHaveLength(1);
  expect(hand.mass).toBe(.1); expect(hand.damping).toBe(400);
  // At rest its plank continues the dial floor; swung a quarter turn its face continues the tower's west face.
  expect(hand.anchor.y - hand.length + .12).toBeCloseTo(CLOCK.dial.y, 9);
  expect(hand.anchor.x - hand.width / 2).toBeGreaterThan(F.dialEnd);
  expect(hand.anchor.x + hand.length - .12).toBeCloseTo(F.westFace, 9);
  expect(F.footY).toBeGreaterThan(hand.anchor.y + hand.width / 2);
  // The door is on the 12, above everything else.
  expect(level.exit.y).toBeGreaterThan(F.ledgeY);
  expect(level.routeHints!.map(hint => hint.label)).toEqual(expect.arrayContaining(['WAIT', 'CROSS', 'TICK', 'TOCK', 'BRAKE', 'RIDE THE HAND']));
  // The BRAKE arrow points down at the middle of the safe parking span on the plank (−.4…+1.2 m from the anchor).
  const brake = level.routeHints!.find(hint => hint.label === 'BRAKE')!;
  expect(brake.angle).toBeCloseTo(-Math.PI / 2, 9);
  expect(brake.x - hand.anchor.x).toBeCloseTo(.4, 9);
});

it('completes the Pendulum Clock: up the escapement, beneath both pallets, up on the hand and round onto the 12', async () => {
  let seamGap = Infinity, crossedAt = -1, minClearanceUnder = Infinity, maxTheta = 0, onWall = false, stoppedBetween = false;
  const state = await ride(createPendulumClockPilot(), 90, level, s => {
    const { x, y } = s.bike;
    if (crossedAt < 0 && x > (CLOCK.escapeLow.x + CLOCK.escapeHigh.x) / 2 && y > 2) {
      crossedAt = s.elapsed; seamGap = Math.abs(top(body(s, 'clock-escape-1-1')) - top(body(s, 'clock-escape-2-0')));
    }
    // Any part of the bike (wheels at ±1.04) beneath a bar.
    for (const id of bars) {
      if (Math.abs(x - body(s, id).x) < 1.04 + CLOCK.pallet.w / 2 && y < CLOCK.dial.y + 1.5) minClearanceUnder = Math.min(minClearanceUnder, clearance(s, id));
    }
    // Waited between the bars while TICK was down behind and TOCK down ahead.
    if (Math.abs(x - (CLOCK.tick.x + CLOCK.tock.x) / 2) < .3 && clearance(s, 'clock-tick') < .5) stoppedBetween = true;
    maxTheta = Math.max(maxTheta, body(s, 'clock-hand').angle);
    if (x < F.westFace && y > F.footY + 1) onWall = true;
  });
  expect(state.status).toBe('complete');
  expect(state.collected.sort()).toEqual(level.apples.map(apple => apple.id).sort());
  expect(seamGap).toBeLessThan(.35); // crossed as the tops met
  expect(minClearanceUnder).toBeGreaterThan(1.9); // under each bar only while it hung clear of the helmet
  expect(stoppedBetween).toBe(true);
  expect(maxTheta).toBeGreaterThan(Math.PI / 2 - .05); // the hand was ridden a quarter turn
  expect(onWall).toBe(true);
  expect(state.elapsed).toBeLessThan(60);
}, 20_000);

// Early and late ends of each window (each alone spans about lead .4–2.3, cross .6–1.7, leave .1–2.1,
// tick .5–2.9, tock .5–2.7 s).
it.each([[.6, .3, .7, .7, .7], [2.1, 2, 1.6, 2.7, 2.5]])('tolerates the pilot’s timing (lead %f s, leave %f s, cross %f s, tick %f s, tock %f s)', async (lead, leave, cross, go, tock) => {
  const state = await ride(createPendulumClockPilot({ lead, leave, cross, pallet: go, tock }), 90);
  expect(state.status).toBe('complete');
}, 20_000);

// Where the rider parks on the plank, how far it leads the swing and how fast it climbs off. Over the
// whole parking span (−.4…+1.2 m) the climb needs about .9 m/s; under the BRAKE arrow (+.4) even .3 m/s works.
it.each([[-.4, .8, .9], [1.2, .8, 2.5], [.4, .3, 1.4], [.4, .55, .3]])('tolerates the hand technique (park %f m, lead %f rad, climb %f m/s)', async (park, swing, climb) => {
  const state = await ride(createPendulumClockPilot({ park, swing, climb }), 90);
  expect(state.status).toBe('complete');
}, 20_000);

it.each([1.3, 2])('the crown tolerates rounding it at %f m/s', async rounding => {
  const state = await ride(createPendulumClockPilot({ rounding }), 90);
  expect(state.status).toBe('complete');
}, 20_000);

it.each([['clock-tick', { pallet: 4.5 }], ['clock-tock', { tock: 4.5 }]] as const)('setting off as %s drops ends the ride on that red bar', async (id, timing) => {
  // Setting off 4.5 s before the bar is fully raised: it is coming down as the rider reaches it.
  let last: Snapshot | undefined;
  const state = await ride(createPendulumClockPilot(timing), 60, level, s => { last = s; });
  expect(state.status).toBe('crashed');
  expect(state.collected).not.toContain('clock-hand-face');
  // Crashed at the bar, with the bar low enough to touch the bike.
  expect(Math.abs(last!.bike.x - body(last!, id).x)).toBeLessThan(1.6);
  expect(clearance(last!, id)).toBeLessThan(1.8);
}, 20_000);

it('the escapement pit is a dead end: turning the world up the dial’s west face from it never climbs out', async () => {
  // A rider who drops into the pit under the lifts and turns gravity toward the dial's 7.2 m west face
  // (at any lift phase, however hard) noses into the sharp corner and topples; E2's pistons also cover
  // the top of that face. The pit cannot skip the escapement.
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
  const pit: Level = { ...level, id: 'clock-pit', spawn: { x: 3.4, y: -1.2 + .72 } };
  for (const [delay, rate, final] of [[0, .3, Math.PI / 2 + .3], [3, .7, Math.PI / 2 + .6], [6, 2.5, Math.PI / 2], [9, 1.5, Math.PI / 2 + .3]]) {
    let highest = -Infinity;
    const state = await ride(s => {
      const target = s.elapsed < delay ? 0 : Math.min(final, (s.elapsed - delay) * rate);
      return { tilt: clamp((target - s.worldAngle) * 8, -1, 1), brake: s.elapsed < delay };
    }, 20, pit, s => { highest = Math.max(highest, s.bike.y); });
    expect(state.status).not.toBe('complete');
    expect(highest).toBeLessThan(1);
  }
}, 20_000);

it('a moving hazard bar ends the ride on any touch; the same bar as a plain time platform only shoves', async () => {
  // A low bar slides along the floor into a braked bike's front wheel (frame and helmet untouched).
  const bar: TimePlatform = { id: 'bar', kind: 'hazard', from: { x: 4, y: .45 }, to: { x: 1.15, y: .45 }, w: .3, h: .3, period: 4 };
  const bench: Level = { id: 'hazard-bench', name: 'Bench', subtitle: '', mechanic: '', hint: '', difficulty: 0,
    spawn: { x: 0, y: .72 }, exit: { x: -6, y: 1 }, apples: [{ id: 'far', x: -6, y: 3 }],
    bounds: { min: { x: -8, y: -3 }, max: { x: 8, y: 5 } },
    surfaces: [{ id: 'floor', x: 0, y: -.5, w: 16, h: 1, kind: 'ground' }], timePlatforms: [bar] };
  const hold = (): Controls => ({ tilt: 0, brake: true });
  const hit = await ride(hold, 4, bench);
  expect(hit.status).toBe('crashed');
  expect(hit.elapsed).toBeGreaterThan(1); expect(hit.elapsed).toBeLessThan(2.1); // as the bar arrives
  const plain = await ride(hold, 4, { ...bench, timePlatforms: [{ ...bar, kind: undefined }] });
  expect(plain.status).toBe('playing');
});

it('frozen escapement lifts leave the rider stranded on the start floor', async () => {
  const frozen: Level = { ...level, id: 'clock-frozen',
    timePlatforms: level.timePlatforms!.map(platform => platform.id.startsWith('clock-escape') ? { ...platform, period: 1e9 } : platform) };
  let highest = -Infinity;
  const state = await ride(createPendulumClockPilot(), 40, frozen, s => { highest = Math.max(highest, s.bike.y); });
  expect(state.status).not.toBe('complete');
  expect(state.collected).not.toContain('clock-tick-jaws');
  expect(highest).toBeLessThan(CLOCK.dial.y);
}, 20_000);

it.each<Controls>([{ tilt: 0, brake: false }, { tilt: 1, brake: false }, { tilt: -1, brake: false }, { tilt: 1, brake: true }])('is not completed by fixed controls (%o)', async control => {
  const state = await ride(() => control, 30);
  expect(state.status).not.toBe('complete');
});

it('the campaign replay table drives the Pendulum Clock at its own index, between Huygens’ Return and Spiral Sanctuary', async () => {
  const index = levels.indexOf(level);
  expect(levels[index - 1].id).toBe('huygens-return');
  expect(levels[index + 1].id).toBe('spiral-sanctuary');
  expect((await ride(createReplayPilot(index), 90)).status).toBe('complete');
}, 20_000);
