import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { earlyLevels, createEarlyReplayPilot } from '../src/levels/early';
import type { Controls, Snapshot } from '../src/types';

const garden = earlyLevels[2];
const swing = garden.swings![0];

function wheelsOnDeck(state: Snapshot): boolean {
  const deck = state.bodies.find(body => body.id === swing.id);
  if (!deck) return false;
  return state.bodies.filter(body => body.kind === 'wheel').every(wheel => {
    const dx = wheel.x - deck.x, dy = wheel.y - deck.y;
    const localX = dx * Math.cos(deck.angle) + dy * Math.sin(deck.angle);
    const localY = -dx * Math.sin(deck.angle) + dy * Math.cos(deck.angle);
    return Math.abs(localX) < deck.w / 2 && Math.abs(localY - .46) < .09;
  });
}

it('leaves a genuinely wide garden chasm for a bicycle-sized 7 m pendulum', () => {
  const banks = garden.surfaces.filter(surface => surface.id.startsWith('garden-'));
  const leftEdge = Math.max(...banks.filter(surface => surface.x < swing.anchor.x).map(surface => surface.x + surface.w / 2));
  const rightEdge = Math.min(...banks.filter(surface => surface.x > swing.anchor.x).map(surface => surface.x - surface.w / 2));
  const angle = swing.angle ?? 0;
  const centreX = swing.anchor.x + Math.sin(angle) * swing.length;
  const leftDeckEdge = centreX - Math.abs(Math.cos(angle)) * swing.width / 2 - Math.abs(Math.sin(angle)) * .12;
  const rightDeckEdge = centreX + Math.abs(Math.cos(angle)) * swing.width / 2 + Math.abs(Math.sin(angle)) * .12;
  expect(rightEdge - leftEdge).toBeGreaterThan(6.8);
  expect(swing.length).toBeGreaterThanOrEqual(7);
  expect(swing.width).toBeLessThanOrEqual(2.8);
  expect(rightEdge - leftEdge).toBeGreaterThan(2 * swing.width);
  expect(leftDeckEdge).toBeGreaterThan(leftEdge);
  expect(rightDeckEdge).toBeLessThan(rightEdge - 4);
});

it('carries both wheels on the loaded cradle outward and back, then returns all apples to the door', async () => {
  const game = await createPhysics();
  game.load(garden);
  const pilot = createEarlyReplayPilot(2);
  let state = game.snapshot();
  let rideStart: number | undefined;
  let rideDirection: 'outbound' | 'return' = 'outbound';
  let outboundTravel = 0, returnTravel = 0, brakeSeconds = 0;
  let firstRightBank = false;
  for (let step = 0; step < 120 * 100 && state.status === 'playing'; step++) {
    const controls = pilot(state);
    expect(controls.worldAngle).toBeUndefined();
    expect(Math.abs(controls.tilt)).toBeLessThanOrEqual(1);
    state = game.step(1 / 120, controls);
    if (state.bike.x > 35) firstRightBank = true;
    const deck = state.bodies.find(body => body.id === swing.id)!;
    if (wheelsOnDeck(state)) {
      const direction = state.collected.length === garden.apples.length ? 'return' : 'outbound';
      if (rideStart === undefined || direction !== rideDirection) rideStart = deck.x;
      rideDirection = direction;
      if (direction === 'outbound') outboundTravel = Math.max(outboundTravel, deck.x - rideStart);
      else returnTravel = Math.max(returnTravel, rideStart - deck.x);
      if (controls.brake) brakeSeconds += 1 / 120;
    } else rideStart = undefined;
  }
  game.destroy();
  expect(state.status).toBe('complete');
  expect(state.collected).toHaveLength(5);
  expect(state.elapsed).toBeLessThan(100);
  expect(firstRightBank).toBe(true);
  expect(outboundTravel).toBeGreaterThan(3);
  expect(returnTravel).toBeGreaterThan(3);
  expect(brakeSeconds).toBeGreaterThan(1);
});

it('needs pendulum motion under the same recorded successful controls', async () => {
  const baseline = await createPhysics();
  baseline.load(garden);
  const pilot = createEarlyReplayPilot(2);
  const recorded: Controls[] = [];
  let successful = baseline.snapshot();
  for (let step = 0; step < 120 * 100 && successful.status === 'playing'; step++) {
    const controls = pilot(successful);
    recorded.push(controls);
    successful = baseline.step(1 / 120, controls);
  }
  baseline.destroy();
  expect(successful.status).toBe('complete');

  const angle = swing.angle ?? 0;
  const seat = { x: swing.anchor.x + Math.sin(angle) * swing.length,
    y: swing.anchor.y - Math.cos(angle) * swing.length };
  const fixed = await createPhysics();
  fixed.load({ ...garden, swings: [], surfaces: [...garden.surfaces,
    { id: 'fixed-garden-deck', ...seat, w: swing.width, h: .24, angle, kind: 'ground' as const }] });
  let state = fixed.snapshot();
  for (const controls of recorded) {
    if (state.status !== 'playing') break;
    state = fixed.step(1 / 120, controls);
  }
  fixed.destroy();
  expect(state.status).not.toBe('complete');
  expect(state.collected.length).toBeLessThan(garden.apples.length);
});

it('lets the heavily damped empty cradle reach the right bank under held tilt', async () => {
  const game = await createPhysics();
  game.load(garden);
  let state = game.snapshot();
  for (let step = 0; step < 120 * 30 && state.status === 'playing'; step++) {
    state = game.step(1 / 120, { tilt: state.worldAngle < .3 ? 1 : 0, brake: true });
  }
  const deck = state.bodies.find(body => body.id === swing.id)!;
  game.destroy();
  expect(state.status).toBe('playing');
  expect(deck.x).toBeGreaterThan(32.45);
});
