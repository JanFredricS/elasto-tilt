import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { CRATE_SEAT, createPascalsPressesPilot, PASCAL, pascalsPressesLevel as level, pressSchedule, ramSchedule } from '../src/levels/pascals-presses';
import { levels } from '../src/levels';
import { createReplayPilot } from '../src/dev/replay';
import { paletteFor } from '../src/art-direction';
import type { BodyView, Controls, Level, Snapshot } from '../src/types';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const body = (state: Snapshot, id: string) => state.bodies.find(b => b.id === id)!;
const crate = (state: Snapshot) => body(state, 'pascal-crate');
const top = (plate: BodyView) => plate.y + plate.h / 2;
const P = PASCAL;
/** The visible head's top above the frame's centre on level ground (src/physics.ts: head at .795, radius .231). */
const HEAD_TOP = .795 + .231;
async function ride(pilot: (state: Snapshot) => Controls, seconds: number, map: Level = level, watch?: (state: Snapshot) => void | boolean) {
  const game = await createPhysics(); game.load(map);
  let state = game.snapshot();
  for (let i = 0; i < 120 * seconds && state.status === 'playing'; i++) { state = game.step(1 / 120, pilot(state)); if (watch?.(state) === true) break; }
  game.destroy();
  return state;
}
/** Ride along x at a steady speed with the world kept within ±.3 rad of level. */
const cruise = (speed: number) => {
  let previous: Snapshot | undefined;
  return (state: Snapshot): Controls => {
    const vx = previous ? (state.bike.x - previous.bike.x) * 120 : 0; previous = state;
    return { tilt: clamp((clamp((speed - vx) * .22, -.3, .3) - state.worldAngle) * 8, -1, 1), brake: false };
  };
};
const held = (control: Controls) => () => control;

it('sits between Switchback Scaffold and The Hidden Way Home at difficulty 13.5, in the sand palette', () => {
  const index = levels.indexOf(level);
  expect(levels[index - 1].id).toBe('switchback-scaffold');
  expect(levels[index + 1].id).toBe('the-hidden-way-home');
  expect(level.difficulty).toBe(13.5);
  expect(paletteFor(level.id)).toBe(paletteFor('newtons-attic'));
  expect(level.subtitle).toBe('Press here, rise there.');
  expect(level.routeHints!.map(hint => hint.label)).toEqual(['WAIT', 'LOAD', 'TIP IN', 'UNDER']);
});

it('two press plates run in antiphase on one 12 s cycle; A meets the sill as B meets the ledge', () => {
  const A = level.timePlatforms!.find(p => p.id === 'pascal-press-a')!, B = level.timePlatforms!.find(p => p.id === 'pascal-press-b')!;
  expect(A.period).toBe(B.period);
  expect(A.period).toBeGreaterThanOrEqual(10); expect(A.period).toBeLessThanOrEqual(12);
  expect(Math.abs((B.offset ?? 0) - (A.offset ?? 0))).toBe(.5);
  // Press here, rise there: A tops out at the upper floor exactly as B bottoms out there.
  expect(P.pressA.high).toBe(P.ledge.y); expect(P.pressB.low).toBe(P.ledge.y);
  for (const t of [0, 1.5, 3, 6, 7.7, 11]) {
    const a = pressSchedule(P.pressA, t), b = pressSchedule(P.pressB, t);
    const gap = ((a.toHigh - b.toLow) % A.period! + A.period!) % A.period!;
    expect(Math.min(gap, A.period! - gap)).toBeCloseTo(0, 9);
    // Equal strokes, opposite ways: their tops always sum to the same height.
    expect(a.top + b.top).toBeCloseTo(P.pressA.low - P.over.low + P.pressB.high + P.over.high, 9);
  }
  // Both strokes over-travel their floors by .1 m, as the Piston Works' lifts do.
  expect(A.from.y + A.h / 2).toBeCloseTo(P.pressA.low - .1, 9); expect(A.to.y + A.h / 2).toBeCloseTo(P.pressA.high + .1, 9);
  expect(B.from.y + B.h / 2).toBeCloseTo(P.pressB.low - .1, 9); expect(B.to.y + B.h / 2).toBeCloseTo(P.pressB.high + .1, 9);
  // A's plate holds the crate and the bike end to end.
  expect(A.w).toBeGreaterThan(P.crate.w + 2.08 + 1);
  // Each press is a solid ram: risen, its column still reaches below the floor it left, so its
  // shaft is never open, and the slots beside it are too narrow for the crate or a wheel.
  expect(A.to.y - A.h / 2).toBeLessThan(P.start.y); expect(B.to.y - B.h / 2).toBeLessThan(P.ledge.y);
  expect(A.from.y - A.h / 2).toBeGreaterThan(P.shaftA.floor); expect(B.from.y - B.h / 2).toBeGreaterThan(P.shaftB.floor);
  for (const gap of [P.pressA.x0 - P.start.x1, P.shaftA.face.x0 - P.pressA.x1, P.pressB.x0 - P.ledge.x1, P.hall.x0 - P.pressB.x1])
    expect(gap).toBeLessThan(Math.min(P.crate.h, .68) / 2);
});

it('the crate is a box that seats only level in a pit beside A’s shaft, flush with the floor', () => {
  const prop = level.props!.find(p => p.id === 'pascal-crate')!;
  expect(prop.shape).toBe('box');
  expect(prop.socket!.angle).toBeGreaterThan(0); expect(prop.socket!.angle).toBeLessThanOrEqual(.05);
  expect(CRATE_SEAT.y + P.crate.h / 2).toBeCloseTo(P.ledge.y, 9); // seated, its top is flush with the upper floor
  // The pit is .2 longer than the crate: the socket's tolerance covers every flat resting place in it.
  expect(P.pit.x1 - P.pit.x0 - P.crate.w).toBeCloseTo(.2, 9);
  expect(prop.socket!.tolerance).toBeGreaterThanOrEqual((P.pit.x1 - P.pit.x0 - P.crate.w) / 2);
  // ...and keeps a seated crate clear of the sill and of A's shaft.
  expect(CRATE_SEAT.x - P.crate.w / 2 - prop.socket!.tolerance).toBeGreaterThan(P.sill.x0);
  // Without the crate the pit is a gap far longer than the bike's wheelbase, floored with a hazard.
  expect(P.pit.x1 - P.sill.x1).toBeGreaterThan(2);
  const floor = level.surfaces.find(surface => surface.id === 'pascal-pit-floor')!;
  expect(floor.kind).toBe('hazard');
  expect(floor.y + floor.h / 2).toBeCloseTo(P.pit.floor, 9);
  expect(floor.w).toBeCloseTo(P.pit.x1 - P.pit.x0, 9);
});

it('a rider who drops into the empty pit crashes; nobody is stranded alive in it', async () => {
  const inPit: Level = { ...level, id: 'pascal-in-pit', spawn: { x: (P.pit.x0 + P.pit.x1) / 2, y: P.ledge.y + .5 } };
  for (const control of [{ tilt: 0, brake: false }, { tilt: 0, brake: true }, { tilt: .5, brake: true }, { tilt: -.5, brake: true }]) {
    const state = await ride(held(control), 5, inPit);
    expect(state.status).toBe('crashed');
    expect(state.elapsed).toBeLessThan(1.5);
  }
}, 60000);

it.each([[(P.pressA.x0 + P.pressA.x1) / 2], [P.shaftA.face.x0 - P.crate.w / 2]])('a crate left on A rides six full cycles without creeping, tipping or lifting off (crate at x %f)', async x => {
  const parked: Level = { ...level, id: 'pascal-idle', props: level.props!.map(prop => ({ ...prop, x, y: P.pressA.low - P.over.low + P.crate.h / 2 })) };
  let lift = 0, tip = 0, west = Infinity, east = -Infinity;
  const state = await ride(held({ tilt: 0, brake: true }), 6 * P.pressA.period, parked, s => {
    if (s.elapsed < .5) return;
    const c = crate(s);
    lift = Math.max(lift, Math.abs(c.y - c.h / 2 - top(body(s, 'pascal-press-a'))));
    tip = Math.max(tip, Math.abs(c.angle)); west = Math.min(west, c.x); east = Math.max(east, c.x);
  });
  expect(state.status).toBe('playing');
  expect(lift).toBeLessThan(.02);
  expect(tip).toBeLessThan(.01);
  expect(east - west).toBeLessThan(.02);
}, 60000);

it('the crush presses bottom out above the frame but well into the helmet; the hall is tunnel height', () => {
  const floor = P.hall.y, frameTop = .72 + .12;
  expect(P.ceiling.y - floor).toBeGreaterThanOrEqual(2.4);
  expect(P.ram.up).toBeGreaterThan(P.ceiling.y); // retracted, a ram hides in its slot
  expect(P.ram.down - floor).toBeGreaterThan(frameTop); // never pins the frame...
  expect(P.ram.down - floor).toBeLessThan(.72 + .795 - .231 - .3); // ...always buries the head's lower half
  for (const ram of level.timePlatforms!.filter(p => p.id.startsWith('pascal-ram-'))) {
    expect(ram.period).toBe(P.ram.period);
    expect(ram.from.x).toBe(ram.to.x);
  }
  // Wide enough gaps between rams to stop and wait in (the bike is 2.08 m long).
  for (let i = 1; i < P.rams.length; i++) expect(P.rams[i].x - P.rams[i - 1].x - P.ram.w).toBeGreaterThan(3.5);
});

it('completes Pascal’s Presses with player controls: load the crate at A’s low, ride it up, seat it, ride B, pass under the rams', async () => {
  let crateRose = -Infinity, seatedAt = -1, seatedAngle = NaN, minClearance = Infinity, onBTop = -Infinity, crossedAtTop = NaN;
  const state = await ride(createPascalsPressesPilot(), 120, level, s => {
    const c = crate(s);
    // Carried by A: the loose crate rises on the plate while still over its shaft.
    if (!c.settled && c.x < P.pressA.x1) crateRose = Math.max(crateRose, c.y - c.h / 2);
    if (c.settled && seatedAt < 0) { seatedAt = s.elapsed; seatedAngle = c.angle; }
    if (Number.isNaN(crossedAtTop) && s.bike.x > P.sill.x1) crossedAtTop = top(body(s, 'pascal-press-a'));
    if (Math.abs(s.bike.x - (P.pressB.x0 + P.pressB.x1) / 2) < .5) onBTop = Math.max(onBTop, s.bike.y);
    // How far above the rider's head is every ram while the head is actually under it? (Measured
    // from the head itself: a frame-centred window also counts a ram still low ahead of the rider.)
    const head = body(s, 'head');
    for (const [i, ram] of P.rams.entries()) if (Math.abs(head.x - ram.x) < P.ram.w / 2 + head.w / 2) {
      const view = body(s, `pascal-ram-${i}`);
      minClearance = Math.min(minClearance, view.y - view.h / 2 - (head.y + head.h / 2));
    }
  });
  expect(state.status).toBe('complete');
  expect(state.collected.sort()).toEqual(level.apples.map(apple => apple.id).sort());
  expect(crateRose).toBeGreaterThan(P.ledge.y - .2); // a prop rides a kinematic press up a floor
  expect(seatedAt).toBeGreaterThan(0);
  expect(Math.abs(seatedAngle)).toBeLessThan(.05);
  const c = crate(state);
  expect(c.settled).toBe(true);
  expect(Math.abs(c.x - CRATE_SEAT.x)).toBeLessThan(.13); expect(c.y).toBeCloseTo(CRATE_SEAT.y, 2);
  expect(crossedAtTop).toBeGreaterThan(P.ledge.y - .1); // rolled off A onto the step at the top of its stroke
  expect(onBTop).toBeGreaterThan(P.hall.y + .5); // carried up to the hall on B
  expect(minClearance).toBeGreaterThan(.3); // never under a ram that was low enough to touch the head
  expect(Math.hypot(state.bike.x - level.exit.x, state.bike.y - level.exit.y)).toBeLessThan(2);
}, 60000);

it.each([[.8, 1, .8], [1.2, 2.5, 1.8], [1.5, 1.4, 3]])('tolerates the pilot’s timing (lead %f s, push %f s, under %f s)', async (lead, push, under) => {
  const state = await ride(createPascalsPressesPilot({ lead, push, under }), 120);
  expect(state.status).toBe('complete');
}, 60000);

it('frozen presses: with A and B stopped, the same pilot never completes', async () => {
  const frozen: Level = { ...level, id: 'pascal-frozen',
    timePlatforms: level.timePlatforms!.map(p => p.id.startsWith('pascal-press-') ? { ...p, period: 1e9 } : p) };
  const state = await ride(createPascalsPressesPilot(), 120, frozen);
  expect(state.status).not.toBe('complete');
  expect(state.collected).not.toContain('pascal-rise');
  expect(state.collected).not.toContain('pascal-step');
}, 60000);

it('no crate: the pit is impassable, and the pilot never reaches the ledge', async () => {
  const bare: Level = { ...level, id: 'pascal-bare', props: [] };
  let east = -Infinity;
  const state = await ride(createPascalsPressesPilot(), 120, bare, s => { east = Math.max(east, s.bike.x); });
  expect(state.status).not.toBe('complete');
  expect(state.collected).not.toContain('pascal-step');
  expect(east).toBeLessThan(P.pit.x1);
  // Nor does riding straight off A's plate at the top of its stroke carry a rider over the pit.
  const atTop: Level = { ...bare, id: 'pascal-bare-top', spawn: { x: P.pressA.x0 + 1.3, y: P.pressA.high + P.over.high + .72 },
    apples: level.apples.filter(apple => apple.id === 'pascal-step'),
    timePlatforms: level.timePlatforms!.map(p => p.id === 'pascal-press-a' ? { ...p, offset: .5 } : p) };
  let reached = -Infinity;
  const leap = await ride(cruise(3), 12, atTop, s => { if (s.bike.y > P.ledge.y + .5) reached = Math.max(reached, s.bike.x); });
  expect(leap.collected).not.toContain('pascal-step');
  expect(reached).toBeLessThan(P.pit.x1);
}, 60000);

it('shoving the crate on while A is still up cannot lose it: A’s risen column stops it at the lip', async () => {
  let lowest = Infinity, againstColumn = false;
  const state = await ride(createPascalsPressesPilot({ lead: 4 }), 120, level, s => {
    const c = crate(s);
    lowest = Math.min(lowest, c.y - c.h / 2);
    // Pushed while A is up, it rests on the start floor against the risen column.
    if (c.x + c.w / 2 > P.start.x1 - .05 && Math.abs(c.y - c.h / 2 - P.start.y) < .05 && top(body(s, 'pascal-press-a')) > 1) againstColumn = true;
  });
  expect(againstColumn).toBe(true);
  expect(lowest).toBeGreaterThan(P.start.y - P.over.low - .05); // never below A's lowest plate
  // ...and is loaded at the next low, carried up and seated after all. (This pilot's `lead` also
  // sets it off early for B, so it is judged on the crate, not on the rest of the run.)
  expect(crate(state).settled).toBe(true);
  expect(state.collected).toContain('pascal-step');
}, 60000);

it('lingering under a descending ram crashes the rider: the helmet is struck, the rider is not pinned alive', async () => {
  const [ram] = P.rams;
  const under: Level = { ...level, id: 'pascal-linger', spawn: { x: ram.x, y: P.hall.y + .72 }, apples: [] };
  expect(ramSchedule(ram, 0).bottom).toBeCloseTo(P.ram.up, 9); // it starts retracted, then comes down
  let lowest = Infinity;
  const state = await ride(held({ tilt: 0, brake: true }), 8, under, s => { lowest = Math.min(lowest, s.bike.y); });
  expect(state.status).toBe('crashed');
  // The crash comes while the ram is still on its way down, as it reaches the helmet, with the
  // rider standing upright where they stopped (not shoved through the floor or out of bounds).
  expect(state.elapsed).toBeLessThan(P.ram.period / 2);
  expect(top(body(state, 'pascal-ram-0')) - P.ram.h).toBeGreaterThan(P.ram.down);
  expect(top(body(state, 'pascal-ram-0')) - P.ram.h).toBeLessThan(state.bike.y + HEAD_TOP + .05);
  expect(Math.abs(state.bike.x - ram.x)).toBeLessThan(.2);
  expect(lowest).toBeGreaterThan(P.hall.y + .6);
  // Going under at the wrong moment ends the same way.
  const late = await ride(createPascalsPressesPilot({ under: 5 }), 120);
  expect(late.status).toBe('crashed');
  expect(late.bike.x).toBeGreaterThan(P.ceiling.x0);
}, 60000);

it.each<Controls>([{ tilt: 0, brake: false }, { tilt: 1, brake: false }, { tilt: -1, brake: false }])('is not completed by fixed controls (%o)', async control => {
  const state = await ride(held(control), 40);
  expect(state.status).not.toBe('complete');
});

it('the campaign replay table drives Pascal’s Presses at its own index', async () => {
  const index = levels.indexOf(level);
  expect(index).toBeGreaterThan(0);
  expect((await ride(createReplayPilot(index), 120)).status).toBe('complete');
}, 60000);

it('documented residual: a crate-less rider can tumble from A’s top across the pit, through the step apple', async () => {
  // Accepted as a rare advanced skip (docs/pascals-presses.md, Residuals): about 35 of 2,592
  // open-loop tilt/hold/brake runs from A's top end upright east of the pit, and every one of
  // them passes through the step apple, so the skip wins the whole map. This pins one known case
  // so a physics or geometry change that closes (or widens) it is noticed and the docs updated.
  const bare: Level = { ...level, id: 'pascal-tumble', props: [], spawn: { x: 1.5, y: P.pressA.high + P.over.high + .72 },
    timePlatforms: level.timePlatforms!.map(p => p.id === 'pascal-press-a' ? { ...p, offset: .45 } : p) };
  const hold = 1.5, theta = 1.6;
  const state = await ride(s => ({ tilt: clamp(((s.elapsed < hold ? theta : 0) - s.worldAngle) * 8, -1, 1),
    brake: s.elapsed < hold / 2 || s.elapsed >= hold }), hold + 6, bare);
  expect(state.status).toBe('playing');
  expect(state.bike.x).toBeGreaterThan(P.pit.x1);
  expect(state.bike.y).toBeGreaterThan(P.ledge.y + .4);
  expect(Math.abs(body(state, 'frame').angle)).toBeLessThan(.4); // upright, riding on
  expect(state.collected).toContain('pascal-step');
}, 60000);
