import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { createEarlyReplayPilot, earlyLevels, profileAt, wonderProfile } from '../src/levels/early';
import type { BodyView, Controls, Snapshot, Surface } from '../src/types';

const level = earlyLevels[1];
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** Distance to the actual rotated collision rectangle, not its decorative extrusion. */
function wheelTouches(wheel: BodyView, surface: Surface) {
  const c = Math.cos(surface.angle ?? 0), s = Math.sin(surface.angle ?? 0);
  const dx = wheel.x - surface.x, dy = wheel.y - surface.y;
  const distance = Math.hypot(Math.max(Math.abs(c * dx + s * dy) - surface.w / 2, 0),
    Math.max(Math.abs(-s * dx + c * dy) - surface.h / 2, 0));
  return Math.abs(distance - wheel.w / 2) < .04;
}
function support(state: Snapshot) {
  const wheels = state.bodies.filter(body => body.kind === 'wheel');
  return {
    rear: level.surfaces.some(surface => wheelTouches(wheels[0], surface)),
    front: level.surfaces.some(surface => wheelTouches(wheels[1], surface)),
    cradle: level.surfaces.some(surface => surface.kind === 'cradle' && wheelTouches(wheels[0], surface)),
    frontClearance: wheels[1].y - wheels[1].w / 2 - 5,
  };
}

it('collects the crest apple during a braked rear-wheel catch, lowers safely, and completes map 2', async () => {
  const game = await createPhysics();
  try {
    game.load(level);
    const pilot = createEarlyReplayPilot(1);
    let state = game.snapshot(), run = 0, longest = 0, minAngle = Infinity, maxAngle = -Infinity, pivotRange = 0;
    let collectedDuringCatch = false;
    for (let frame = 0; frame < 120 * 90 && state.status === 'playing'; frame++) {
      const controls = pilot(state), hadHighApple = state.collected.includes('wonder-1');
      state = game.step(1 / 120, controls);
      const contact = support(state), angle = state.bodies.find(body => body.id === 'frame')!.angle;
      if (controls.brake && contact.rear && contact.cradle && !contact.front) {
        longest = Math.max(longest, ++run);
        minAngle = Math.min(minAngle, angle); maxAngle = Math.max(maxAngle, angle);
        pivotRange = Math.max(pivotRange, maxAngle - minAngle);
      } else { run = 0; minAngle = Infinity; maxAngle = -Infinity; }
      if (!hadHighApple && state.collected.includes('wonder-1')) {
        expect(controls.brake).toBe(true);
        expect(contact).toMatchObject({ rear: true, front: false, cradle: true });
        expect(contact.frontClearance).toBeGreaterThan(.5);
        expect(angle).toBeGreaterThan(.35);
        expect(run).toBeGreaterThan(30);
        collectedDuringCatch = true;
      }
    }
    expect(collectedDuringCatch).toBe(true);
    expect(longest).toBeGreaterThan(120);
    expect(pivotRange).toBeGreaterThan(.5);
    expect(state.status).toBe('complete');
    expect(state.collected).toHaveLength(6);
    expect(state.elapsed).toBeGreaterThan(45);
    expect(state.elapsed).toBeLessThan(90);
  } finally { game.destroy(); }
});

it('ordinary rolling through the route cannot collect the high apple', async () => {
  const game = await createPhysics();
  try {
    game.load(level);
    let state = game.snapshot(), previous: Snapshot | undefined, returning = false;
    for (let frame = 0; frame < 120 * 70 && state.status === 'playing'; frame++) {
      const vx = previous ? (state.bike.x - previous.bike.x) * 120 : 0;
      const vy = previous ? (state.bike.y - previous.bike.y) * 120 : 0;
      const theta = profileAt(wonderProfile, state.bike.x).angle;
      if (state.bike.x > 51.5) returning = true;
      const speed = (returning ? -1 : 1) * 2.4;
      const target = theta + clamp((speed - vx * Math.cos(theta) - vy * Math.sin(theta)) * .23, -.3, .3);
      const controls: Controls = { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake: returning && vx > .7 };
      previous = state;
      state = game.step(1 / 120, controls);
    }
    expect(returning).toBe(true);
    expect(state.collected.sort()).toEqual(['wonder-0', 'wonder-2', 'wonder-3', 'wonder-4', 'wonder-5']);
    expect(state.status).not.toBe('complete');
  } finally { game.destroy(); }
});

it('removing the brake from the catch strategy loses the controlled recovery', async () => {
  const game = await createPhysics();
  try {
    game.load(level);
    const pilot = createEarlyReplayPilot(1);
    let state = game.snapshot();
    for (let frame = 0; frame < 120 * 25 && state.status === 'playing'; frame++) {
      state = game.step(1 / 120, { ...pilot(state), brake: false });
    }
    // Apple collection remains physical: airborne stunts are allowed. The brake
    // provides controlled support/recovery; it is not an artificial apple gate.
    expect(state.collected).toContain('wonder-1');
    expect(state.status).toBe('crashed');
  } finally { game.destroy(); }
});
