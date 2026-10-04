import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { earlyLevels, createEarlyReplayPilot } from '../src/levels/early';
import type { Controls, Snapshot } from '../src/types';

const mill = earlyLevels[3];
const swings = mill.swings!;

function supported(state: Snapshot, id: string): boolean {
  const deck = state.bodies.find(body => body.id === id)!;
  return state.bodies.filter(body => body.kind === 'wheel').every(wheel => {
    const dx = wheel.x - deck.x, dy = wheel.y - deck.y;
    const along = dx * Math.cos(deck.angle) + dy * Math.sin(deck.angle);
    const above = -dx * Math.sin(deck.angle) + dy * Math.cos(deck.angle);
    return Math.abs(along) < deck.w / 2 && Math.abs(above - .46) < .09;
  });
}

it('leaves two moderate chasms wider than the seats with different slow suspensions', () => {
  for (const swing of swings) {
    const banks = mill.surfaces.filter(surface => /^mill-\d+-\d+$/.test(surface.id));
    const left = Math.max(...banks.filter(surface => surface.x < swing.anchor.x).map(surface => surface.x + surface.w / 2));
    const right = Math.min(...banks.filter(surface => surface.x > swing.anchor.x).map(surface => surface.x - surface.w / 2));
    expect(right - left).toBeCloseTo(4.975);
    expect(right - left).toBeLessThan(7);
    expect(right - left - swing.width).toBeGreaterThan(2);
    expect(swing.width).toBe(2.8);
    expect(swing.mass).toBe(20);
    expect(swing.damping).toBeGreaterThanOrEqual(15);
    const x = swing.anchor.x + Math.sin(swing.angle!) * swing.length;
    const reach = Math.cos(swing.angle!) * swing.width / 2 + Math.abs(Math.sin(swing.angle!)) * .12;
    expect(x - reach).toBeGreaterThan(left);
    expect(x + reach).toBeLessThan(right);
  }
  expect(swings[1].length).toBeGreaterThan(swings[0].length);
  expect(swings[1].damping).toBeGreaterThan(swings[0].damping!);
});

it('carries both wheels continuously on each braked cradle before collecting all six apples and reaching the upper door', async () => {
  const game = await createPhysics(); game.load(mill);
  const pilot = createEarlyReplayPilot(3);
  const rides = swings.map(() => ({ start: undefined as number | undefined, travel: 0, brakeSeconds: 0 }));
  let state = game.snapshot();
  for (let step = 0; step < 120 * 100 && state.status === 'playing'; step++) {
    const controls = pilot(state);
    expect(controls.worldAngle).toBeUndefined();
    expect(Math.abs(controls.tilt)).toBeLessThanOrEqual(1);
    state = game.step(1 / 120, controls);
    swings.forEach((swing, index) => {
      const ride = rides[index], deck = state.bodies.find(body => body.id === swing.id)!;
      if (supported(state, swing.id)) {
        ride.start ??= deck.x;
        ride.travel = Math.max(ride.travel, deck.x - ride.start);
        if (controls.brake) ride.brakeSeconds += 1 / 120;
      } else ride.start = undefined;
    });
  }
  game.destroy();
  expect(state.status).toBe('complete');
  expect(state.collected).toHaveLength(6);
  expect(state.elapsed).toBeLessThan(100);
  for (const ride of rides) {
    expect(ride.travel).toBeGreaterThan(1.6);
    expect(ride.brakeSeconds).toBeGreaterThan(4);
  }
});

it.each(swings)('needs $id motion under the same successful recorded inputs', async swing => {
  const game = await createPhysics(); game.load(mill);
  const pilot = createEarlyReplayPilot(3), recorded: Controls[] = [];
  let state = game.snapshot();
  for (let step = 0; step < 120 * 100 && state.status === 'playing'; step++) {
    const controls = pilot(state); recorded.push(controls);
    state = game.step(1 / 120, controls);
  }
  expect(state.status).toBe('complete');
  const angle = swing.angle!;
  game.load({ ...mill, swings: swings.filter(candidate => candidate.id !== swing.id), surfaces: [...mill.surfaces, {
    id: `frozen-${swing.id}`, kind: 'ground', w: swing.width, h: .24, angle,
    x: swing.anchor.x + Math.sin(angle) * swing.length,
    y: swing.anchor.y - Math.cos(angle) * swing.length,
  }] });
  state = game.snapshot();
  for (const controls of recorded) {
    if (state.status !== 'playing') break;
    state = game.step(1 / 120, controls);
  }
  game.destroy();
  expect(state.status).not.toBe('complete');
  expect(state.collected.length).toBeLessThan(mill.apples.length);
  expect(state.bike.x).toBeLessThan(swing.anchor.x + 3.5);
});
